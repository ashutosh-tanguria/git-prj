import { readFileSync } from "node:fs";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
export let mode = "normal";
let release: (() => void) | undefined;
export function setMode(value: string) {
  mode = value;
}
export function releaseConnect() {
  release?.();
}
const items = [
  ["empty", "tree", "empty-tree", 0],
  ["seminars", "tree", "seminar-tree", 0],
  ["distributed-systems.pdf", "blob", "pdf", Math.round(14.2 * 1048576)],
  [
    "operating-systems.week-03.memory-and-concurrency-reading-notes.pdf",
    "blob",
    "long-pdf",
    63 * 1048576,
  ],
  ["operating-systems.md", "blob", "markdown", 12800],
  ["replication-notes.ts", "blob", "code", 7400],
  ["replication-diagram.svg", "blob", "svg", 23000],
  ["research-archive.zip", "blob", "archive", Math.round(92.8 * 1048576)],
  ["reading-list.csv", "blob", "csv", 10240],
  ["seminar-recording.wav", "blob", "audio", 32044],
] as const;
export const markdown =
  "# Sample reading room notes\n\nA reading list for the distributed systems seminar. These are labelled sample documents for visual review.\n\n## This week\n\nRead the replication chapter before Friday's discussion. Compare leader-based replication with a quorum-based design.\n\n- Review failure detection and leases.\n- Sketch the write path for a three-node cluster.\n- Keep a note of the assumptions behind each guarantee.\n\n> A useful question: what can a reader observe while a replica is recovering?\n\n| Reading | Pages | Preparation |\n| --- | --- | --- |\n| Replication | 12 to 36 | Annotate two examples |\n| Consensus | 37 to 58 | List safety assumptions |\n\n## Reading notes\n\nUse the code sample to trace a quorum write. [Sample code](replication-notes.ts) stays in the same repository.\n\n```ts\nconst requiredAcknowledgements = 2;\n```\n";
export const code = [
  "// Sample: quorum acknowledgement tracking",
  "type Replica = { id: string; acknowledged: boolean };",
  "",
  "export function hasQuorum(replicas: Replica[]): boolean {",
  "  const acknowledgements = replicas.filter(replica => replica.acknowledged);",
  "  return acknowledgements.length >= Math.floor(replicas.length / 2) + 1;",
  "}",
  "",
  "const sampleReplicas: Replica[] = [",
  '  { id: "north-campus", acknowledged: true },',
  '  { id: "south-campus", acknowledged: true },',
  '  { id: "archive-room", acknowledged: false },',
  "];",
  "",
  "// A deliberately long sample line checks scrolling and wrapped alignment.",
  'const readingNote = "A quorum confirms a write only after the required number of replicas have acknowledged the same version of the document.";',
  "",
  "export const confirmed = hasQuorum(sampleReplicas);",
].join("\n");
export const uiServer = setupServer(
  http.get("https://api.github.com/*", async ({ request }) => {
    const url = new URL(request.url);
    if (url.pathname === "/user") {
      if (mode === "busy")
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      if (mode === "auth-error") return new HttpResponse(null, { status: 401 });
      return HttpResponse.json({ login: "ada (sample)" });
    }
    if (url.pathname === "/user/repos")
      return HttpResponse.json([
        {
          full_name: "ada/sample-reading-library",
          size: 612 * 1024,
          default_branch: "main",
          private: true,
        },
      ]);
    if (url.pathname.endsWith("/commits"))
      return HttpResponse.json([
        {
          commit: {
            message: "Sample: add seminar reading notes",
            author: { date: "2026-11-15T08:00:00Z" },
          },
        },
      ]);
    if (url.pathname.includes("/git/trees/")) {
      if (mode === "list-error") return new HttpResponse(null, { status: 403 });
      const tree = url.pathname.endsWith("/main")
        ? items.map(([path, type, sha, size]) => ({
            path,
            type,
            sha,
            size,
            mode: type === "tree" ? "040000" : "100644",
          }))
        : [];
      return HttpResponse.json({ tree, truncated: false });
    }
    if (url.pathname.includes("/contents/")) {
      const name = decodeURIComponent(url.pathname.split("/contents/")[1]);
      if (name === "corrupt.pdf") return new HttpResponse("Sample damaged PDF");
      if (name.endsWith(".pdf"))
        return new HttpResponse(
          new Uint8Array(readFileSync("fixtures/sample-complete.pdf")),
          { headers: { "Content-Type": "application/pdf" } },
        );
      if (name.endsWith(".md")) return new HttpResponse(markdown);
      if (name.endsWith(".ts")) return new HttpResponse(code);
      if (name.endsWith(".csv"))
        return new HttpResponse(
          "Sample chapter,Pages,Preparation\nReplication,24,Annotate the write path\nConsensus,18,List safety assumptions\nFailure detection,12,Compare timeout choices",
        );
      if (name.endsWith(".html"))
        return new HttpResponse(
          "<h1>Sample seminar notes</h1><p>Replication and consensus reading list.</p>",
        );
      if (name.endsWith(".wav"))
        return new HttpResponse(
          new Uint8Array(readFileSync("fixtures/sample-reading-note.wav")),
          { headers: { "Content-Type": "audio/wav" } },
        );
      if (name.endsWith(".svg"))
        return new HttpResponse(
          '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><title>Sample replication diagram</title><path d="M80 200h480M320 80v240" stroke="currentColor"/><text x="80" y="160">Sample: quorum replication</text></svg>',
          { headers: { "Content-Type": "image/svg+xml" } },
        );
      return new HttpResponse("Sample document bytes");
    }
    return new HttpResponse(null, { status: 404 });
  }),
);
