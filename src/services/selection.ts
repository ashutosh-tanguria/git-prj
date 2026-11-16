export function selectRange(length: number, anchor: number, index: number) {
  return Array.from(
    {
      length: Math.max(
        0,
        Math.min(length - 1, Math.max(anchor, index)) -
          Math.max(0, Math.min(anchor, index)) +
          1,
      ),
    },
    (_, i) => i + Math.max(0, Math.min(anchor, index)),
  );
}
export function selectionClick(
  current: number[],
  index: number,
  anchor: number,
  length: number,
  toggle = false,
  range = false,
) {
  if (range) return selectRange(length, anchor, index);
  if (toggle)
    return current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index];
  return [index];
}
