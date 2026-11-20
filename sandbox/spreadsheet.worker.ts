import { read, utils } from "xlsx";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_ROWS = 5000;
const MAX_COLUMNS = 256;

self.onmessage = (event: MessageEvent<unknown>) => {
  const bytes = event.data;
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > MAX_BYTES) {
    self.postMessage({ error: "limit" });
    return;
  }
  try {
    const header = new Uint8Array(bytes, 0, Math.min(8, bytes.byteLength));
    const compound =
      header[0] === 0xd0 &&
      header[1] === 0xcf &&
      header[2] === 0x11 &&
      header[3] === 0xe0;
    if (compound) {
      const directory = new TextDecoder("utf-16le").decode(bytes);
      if (
        directory.includes("EncryptionInfo") &&
        directory.includes("EncryptedPackage")
      )
        throw Error("password-protected");
    }
    if (
      header[0] !== 0x50 ||
      header[1] !== 0x4b ||
      header[2] !== 3 ||
      header[3] !== 4
    ) {
      if (!compound) throw Error("corrupt");
    }
    const workbook = read(bytes, {
      type: "array",
      sheetRows: MAX_ROWS + 1,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      cellNF: false,
      bookVBA: false,
      bookFiles: false,
      bookDeps: false,
    });
    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const range = utils.decode_range(sheet["!ref"] || "A1:A1");
      const rows: string[][] = [];
      for (
        let row = range.s.r;
        row <= Math.min(range.e.r, MAX_ROWS - 1);
        row++
      ) {
        const cells: string[] = [];
        for (
          let col = range.s.c;
          col <= Math.min(range.e.c, MAX_COLUMNS - 1);
          col++
        ) {
          const cell = sheet[utils.encode_cell({ r: row, c: col })];
          cells.push(cell ? String(cell.w ?? cell.v ?? "") : "");
        }
        rows.push(cells);
      }
      return {
        name,
        rows,
        truncated:
          Boolean(sheet["!fullref"]) ||
          range.e.r >= MAX_ROWS ||
          range.e.c >= MAX_COLUMNS,
      };
    });
    self.postMessage({ sheets });
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error && /password|encrypt/i.test(error.message)
          ? "password"
          : "corrupt",
    });
  }
};
