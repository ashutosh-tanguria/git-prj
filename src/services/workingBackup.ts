import type { Change } from "./staging";
// Store-only ZIP: interoperable backup without a compression dependency.
const encoder = new TextEncoder();
function crc(data: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of data) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
export async function exportWorking(
  rows: Change[],
  read: (c: Change) => Promise<Blob>,
): Promise<Blob> {
  const files = [
    {
      name: "shelf-working-copy.json",
      data: encoder.encode(JSON.stringify({ version: 1, changes: rows })),
    },
    ...(await Promise.all(
      rows
        .filter((c) => c.blobKey)
        .map(async (c) => ({
          name: c.blobKey!,
          data: new Uint8Array(await (await read(c)).arrayBuffer()),
        })),
    )),
  ];
  let offset = 0;
  const parts: BlobPart[] = [],
    central: BlobPart[] = [];
  let centralSize = 0;
  for (const file of files) {
    const name = encoder.encode(file.name),
      sum = crc(file.data),
      header = new Uint8Array(30 + name.length),
      v = new DataView(header.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint32(14, sum, true);
    v.setUint32(18, file.data.length, true);
    v.setUint32(22, file.data.length, true);
    v.setUint16(26, name.length, true);
    header.set(name, 30);
    parts.push(header, file.data);
    const entry = new Uint8Array(46 + name.length),
      d = new DataView(entry.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint32(16, sum, true);
    d.setUint32(20, file.data.length, true);
    d.setUint32(24, file.data.length, true);
    d.setUint16(28, name.length, true);
    d.setUint32(42, offset, true);
    entry.set(name, 46);
    central.push(entry);
    centralSize += entry.length;
    offset += header.length + file.data.length;
  }
  const end = new Uint8Array(22),
    d = new DataView(end.buffer);
  d.setUint32(0, 0x06054b50, true);
  d.setUint16(8, files.length, true);
  d.setUint16(10, files.length, true);
  d.setUint32(12, centralSize, true);
  d.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
export async function parseWorking(blob: Blob) {
  const data = new Uint8Array(await blob.arrayBuffer()),
    v = new DataView(data.buffer),
    files = new Map<string, Uint8Array>();
  let at = 0;
  while (at + 30 <= data.length && v.getUint32(at, true) === 0x04034b50) {
    if (v.getUint16(at + 8, true) !== 0) throw Error("workingInvalid");
    const size = v.getUint32(at + 18, true),
      nameLength = v.getUint16(at + 26, true),
      extra = v.getUint16(at + 28, true),
      start = at + 30 + nameLength + extra,
      end = start + size;
    if (end > data.length) throw Error("workingInvalid");
    const name = new TextDecoder().decode(
        data.subarray(at + 30, at + 30 + nameLength),
      ),
      bytes = data.slice(start, end);
    if (crc(bytes) !== v.getUint32(at + 14, true) || files.has(name))
      throw Error("workingInvalid");
    files.set(name, bytes);
    at = end;
  }
  const manifest = files.get("shelf-working-copy.json");
  if (!manifest) throw Error("workingInvalid");
  const parsed = JSON.parse(new TextDecoder().decode(manifest)) as {
    version: number;
    changes: Change[];
  };
  if (parsed.version !== 1 || !Array.isArray(parsed.changes))
    throw Error("workingInvalid");
  for (const c of parsed.changes)
    if (
      !c.id ||
      !c.target?.path ||
      !Number.isSafeInteger(c.size) ||
      c.size < 0 ||
      (c.blobKey && !files.has(c.blobKey))
    )
      throw Error("workingInvalid");
  return { rows: parsed.changes, files };
}
