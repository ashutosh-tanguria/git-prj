export function relativeTime(timestamp: string, now = Date.now()) {
  const delta = new Date(timestamp).getTime() - now;
  if (!Number.isFinite(delta)) return timestamp;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000000],
    ["month", 2592000000],
    ["day", 86400000],
    ["hour", 3600000],
    ["minute", 60000],
    ["second", 1000],
  ];
  const [unit, size] =
    units.find(([, size]) => Math.abs(delta) >= size) ||
    units[units.length - 1];
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
    Math.round(delta / size),
    unit,
  );
}
