import { hashTransferBlob, type HashKind } from "./transferHash";

self.onmessage = async ({
  data,
}: MessageEvent<{ blob: Blob; kinds: HashKind[] }>) => {
  try {
    self.postMessage(await hashTransferBlob(data.blob, data.kinds));
  } catch {
    self.postMessage(null);
  }
};
