import { MiB } from "../lib/limits";

export const PDF_PART_BYTES = 90 * MiB;
export const PDF_INPUT_BYTES = 300 * MiB;
export function checkPdfSplitSize(size: number) {
  if (size > PDF_INPUT_BYTES) throw Error("splitPdfTooLarge");
}
