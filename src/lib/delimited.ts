export function delimited(text: string, separator: string, limit = 5000) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    total = 0;
  function finish() {
    row.push(cell);
    if (total < limit) rows.push(row);
    total++;
    row = [];
    cell = "";
  }
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && char === separator) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      finish();
    } else cell += char;
  }
  if (cell || row.length) finish();
  return { rows, total };
}
