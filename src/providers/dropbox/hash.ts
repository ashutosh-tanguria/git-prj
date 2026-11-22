import { hex } from "../digest";
const BLOCK_BYTES = 4 * 1024 * 1024;

export async function dropboxContentHash(blob: Blob) {
  const hashes = new Uint8Array(Math.ceil(blob.size / BLOCK_BYTES) * 32);
  for (let offset = 0; offset < blob.size; offset += BLOCK_BYTES) {
    const block = await blob.slice(offset, offset + BLOCK_BYTES).arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", block);
    hashes.set(new Uint8Array(digest), (offset / BLOCK_BYTES) * 32);
  }
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", hashes)));
}
