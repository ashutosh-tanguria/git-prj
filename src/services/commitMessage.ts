export interface MessageChange {
  kind: "add" | "modify" | "delete" | "rename";
  target: { path: string };
  oldPath?: string;
  movedFrom?: string;
}
export function commitMessage(
  changes: readonly MessageChange[],
  folder = "",
): string {
  if (!changes.length) return "Update working copy";
  const name = (path: string) => path.split("/").at(-1) || path,
    where = folder || "repository";
  let subject: string;
  const one = changes[0];
  if (changes.length === 1) {
    subject =
      one.kind === "add"
        ? `Add ${name(one.target.path)}${one.movedFrom ? ` (moved from ${one.movedFrom})` : ""}`
        : one.kind === "delete"
          ? `Delete ${name(one.target.path)}`
          : one.kind === "rename"
            ? `Rename ${name(one.oldPath || "")} to ${name(one.target.path)}`
            : `Update ${name(one.target.path)}`;
  } else if (changes.every((c) => c.kind === "add")) {
    const families = new Map<string, number>();
    for (const c of changes) {
      const ext = name(c.target.path).split(".").at(-1)?.toLowerCase();
      const type =
        ext === "pdf"
          ? "PDF"
          : ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext || "")
            ? "image"
            : "file";
      families.set(type, (families.get(type) || 0) + 1);
    }
    const summary = [...families]
      .map(([type, count]) => `${count} ${type}${count === 1 ? "" : "s"}`)
      .join(", ");
    subject = `Add ${changes.length} files to ${where} (${summary})`;
  } else {
    const counts = new Map<string, number>();
    for (const c of changes) counts.set(c.kind, (counts.get(c.kind) || 0) + 1);
    subject =
      `Update ${where}: ` +
      [...counts]
        .map(
          ([kind, count]) =>
            `${kind} ${count}${kind === "add" ? " files" : ""}`,
        )
        .join(", ");
  }
  const chars = [...subject];
  if (chars.length > 72) subject = chars.slice(0, 71).join("") + "…";
  if (changes.length > 8)
    subject +=
      "\n\n" +
      changes
        .map(
          (c) =>
            ({ add: "A", modify: "M", delete: "D", rename: "R" })[c.kind] +
            " " +
            (c.kind === "rename" ? c.oldPath + " -> " : "") +
            c.target.path,
        )
        .join("\n");
  return subject;
}
