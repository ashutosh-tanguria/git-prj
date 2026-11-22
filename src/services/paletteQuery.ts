export const palettePrefixes = {
  ">": "commands",
  "/": "names",
  "?": "text",
  "@": "locations",
  "#": "tags",
} as const;

export function paletteQuery(input: string) {
  const prefix = input.at(0);
  const mode =
    prefix && Object.hasOwn(palettePrefixes, prefix)
      ? palettePrefixes[prefix as keyof typeof palettePrefixes]
      : "mixed";
  return { mode, query: (mode === "mixed" ? input : input.slice(1)).trim() };
}

export const searchKey = (value: string) =>
  value.normalize("NFC").trim().toLocaleLowerCase();

export function nameMatches(name: string, query: string) {
  return searchKey(name).includes(searchKey(query));
}
