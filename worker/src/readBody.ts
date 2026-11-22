export async function readBody(request: Request, maxBody: number) {
  if (!request.body) return "";
  if (Number(request.headers.get("Content-Length")) > maxBody) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) return body + decoder.decode();
      size += chunk.value.byteLength;
      if (size > maxBody) return null;
      body += decoder.decode(chunk.value, { stream: true });
    }
  } finally {
    void reader.cancel().catch(() => {});
  }
}
