import {
  hashSha256Stream,
  hashTransferBlob,
  type HashKind,
} from "./transferHash";

self.onmessage = async ({
  data,
}: MessageEvent<
  { blob: Blob; kinds: HashKind[] } | { stream: ReadableStream<Uint8Array> }
>) => {
  try {
    self.postMessage(
      "stream" in data
        ? { sha256: await hashSha256Stream(data.stream) }
        : await hashTransferBlob(data.blob, data.kinds),
    );
  } catch {
    self.postMessage(null);
  }
};
