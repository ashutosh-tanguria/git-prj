export function highlightMatches(container: HTMLElement, query: string) {
  const needle = query.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (!needle) return 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT),
    nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  let source = "";
  const mapping: ({ node: Text; offset: number } | null)[] = [];
  for (const node of nodes) {
    if (source && !source.endsWith(" ")) {
      source += " ";
      mapping.push(null);
    }
    for (let offset = 0; offset < node.data.length; offset++) {
      const char = node.data[offset];
      if (/\s/.test(char)) {
        if (!source.endsWith(" ")) {
          source += " ";
          mapping.push({ node, offset });
        }
      } else {
        const lower = char.toLocaleLowerCase();
        source += lower;
        for (let i = 0; i < lower.length; i++) mapping.push({ node, offset });
      }
    }
  }
  const ranges = new Map<
    Text,
    { start: number; end: number; match: number }[]
  >();
  let index = source.indexOf(needle),
    match = 0;
  while (index >= 0) {
    const parts = new Map<Text, { start: number; end: number }>();
    for (let i = index; i < index + needle.length; i++) {
      const point = mapping[i];
      if (point) {
        const range = parts.get(point.node);
        parts.set(point.node, {
          start: Math.min(range?.start ?? point.offset, point.offset),
          end: Math.max(range?.end ?? 0, point.offset + 1),
        });
      }
    }
    for (const [node, range] of parts)
      ranges.set(node, [...(ranges.get(node) || []), { ...range, match }]);
    match++;
    index = source.indexOf(needle, index + needle.length);
  }
  for (const [node, spans] of ranges) {
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const span of spans) {
      fragment.append(
        document.createTextNode(node.data.slice(offset, span.start)),
      );
      const mark = document.createElement("mark");
      mark.dataset.match = String(span.match);
      mark.textContent = node.data.slice(span.start, span.end);
      fragment.append(mark);
      offset = span.end;
    }
    fragment.append(document.createTextNode(node.data.slice(offset)));
    node.replaceWith(fragment);
  }
  return match;
}
