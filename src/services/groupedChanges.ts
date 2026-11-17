import type { Change } from "./staging";
export function filterLinkedChanges(rows: Change[], filter: string) {
  const matches = (c: Change) =>
    filter === "all" ||
    c.kind === filter ||
    (filter === "blocked" && c.verdict.level === "block");
  const groups = new Set(
    rows
      .filter(matches)
      .map((c) => c.groupId)
      .filter(Boolean),
  );
  return rows.filter(
    (c) => matches(c) || (!!c.groupId && groups.has(c.groupId)),
  );
}
