import { md5, sha1 } from "@noble/hashes/legacy.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base64, hex } from "../providers/digest";
import type { Capabilities } from "../providers/types";

export type HashKind = NonNullable<Capabilities["hashKind"]> | "sha256";
export type Hashes = Partial<Record<HashKind, string>>;
export async function hashSha256Stream(stream: ReadableStream<Uint8Array>) {
  const state = sha256.create();
  const reader = stream.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return hex(state.digest());
      state.update(value);
    }
  } finally {
    reader.releaseLock();
  }
}
export async function hashTransferBlob(
  blob: Blob,
  kinds: HashKind[],
): Promise<Hashes> {
  const algorithms = new Set(kinds);
  const result: Hashes = {};
  const states = {
    sha256: algorithms.has("sha256") ? sha256.create() : undefined,
    md5: algorithms.has("md5") ? md5.create() : undefined,
    sha1: algorithms.has("sha1") ? sha1.create() : undefined,
    "git-sha1": algorithms.has("git-sha1")
      ? sha1.create().update(new TextEncoder().encode(`blob ${blob.size}\0`))
      : undefined,
    "dropbox-sha256": algorithms.has("dropbox-sha256")
      ? sha256.create()
      : undefined,
  };
  const dropbox = states["dropbox-sha256"];
  const block = 4 * 1024 * 1024;
  const quick = algorithms.has("quickxor") ? new Uint8Array(20) : undefined;
  let shift = 0;
  for (let offset = 0; offset < blob.size; offset += block) {
    const bytes = new Uint8Array(
      await blob.slice(offset, offset + block).arrayBuffer(),
    );
    states.sha256?.update(bytes);
    states.md5?.update(bytes);
    states.sha1?.update(bytes);
    states["git-sha1"]?.update(bytes);
    dropbox?.update(sha256(bytes));
    if (quick) {
      for (const value of bytes) {
        const index = shift >> 3;
        const bits = shift & 7;
        quick[index] ^= value << bits;
        quick[(index + 1) % quick.length] ^= value >> (8 - bits);
        shift = (shift + 11) % 160;
      }
    }
  }
  if (quick) {
    let length = BigInt(blob.size);
    for (let index = 12; index < quick.length; index++) {
      quick[index] ^= Number(length & 255n);
      length >>= 8n;
    }
    result.quickxor = base64(quick);
  }
  for (const kind of Object.keys(states) as (keyof typeof states)[]) {
    const state = states[kind];
    if (state) result[kind] = hex(state.digest());
  }
  return result;
}
