import { base64, hex } from "../digest";

export interface OneDriveHashes {
  sha1Hash?: string;
  quickXorHash?: string;
}

export async function quickXorHash(blob: Blob) {
  const hash = new Uint8Array(20);
  let shift = 0;
  for await (const chunk of blob.stream() as ReadableStream<Uint8Array> &
    AsyncIterable<Uint8Array>) {
    for (const value of chunk) {
      const index = shift >> 3;
      const bits = shift & 7;
      hash[index] ^= value << bits;
      hash[(index + 1) % hash.length] ^= value >> (8 - bits);
      shift = (shift + 11) % 160;
    }
  }
  let length = BigInt(blob.size);
  for (let index = 12; index < hash.length; index++) {
    hash[index] ^= Number(length & 255n);
    length >>= 8n;
  }
  return base64(hash);
}

async function digest(blob: Blob, algorithm: "SHA-1" | "SHA-256") {
  return hex(
    new Uint8Array(
      await crypto.subtle.digest(algorithm, await blob.arrayBuffer()),
    ),
  );
}

export async function verifyOneDriveBytes(
  source: Blob,
  hashes: OneDriveHashes,
  download: () => Promise<Blob>,
) {
  if (hashes.sha1Hash)
    return (await digest(source, "SHA-1")) === hashes.sha1Hash.toLowerCase();
  if (hashes.quickXorHash)
    return (await quickXorHash(source)) === hashes.quickXorHash;
  const target = await download();
  return (
    source.size === target.size &&
    (await digest(source, "SHA-256")) === (await digest(target, "SHA-256"))
  );
}
