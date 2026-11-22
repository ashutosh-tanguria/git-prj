import MiniSearch from "minisearch";

export interface TextPage {
  id: number;
  text: string;
}
export interface TextMatch {
  scope: string;
  ref: string;
  path: string;
  name: string;
  page: number;
  before: string;
  match: string;
  after: string;
  score: number;
}

const options = {
  fields: ["text"],
  searchOptions: { combineWith: "AND" as const },
};
export const normalizeText = (value: string) =>
  value.replace(/\s+/g, " ").trim();

export function buildTextIndex(pages: TextPage[]) {
  const index = new MiniSearch<TextPage>(options);
  index.addAll(pages);
  return JSON.stringify(index);
}

export function findText(
  pages: TextPage[],
  serialized: string,
  query: string,
): Omit<TextMatch, "scope" | "ref" | "path" | "name">[] {
  const phrase = normalizeText(query).replace(/^"|"$/g, "").toLocaleLowerCase();
  if (!phrase) return [];
  const index = MiniSearch.loadJSON<TextPage>(serialized, options);
  const byPage = new Map(pages.map((page) => [page.id, page.text]));
  return index.search(phrase).flatMap(({ id, score }) => {
    const text = byPage.get(Number(id)) ?? "";
    const start = text.toLocaleLowerCase().indexOf(phrase);
    if (start === -1) return [];
    const end = start + phrase.length;
    return [
      {
        page: Number(id),
        before:
          (start > 50 ? "…" : "") + text.slice(Math.max(0, start - 50), start),
        match: text.slice(start, end),
        after: text.slice(end, end + 65) + (end + 65 < text.length ? "…" : ""),
        score,
      },
    ];
  });
}
