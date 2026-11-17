import { Button, type ButtonProps } from "./Button";
import { Tooltip } from "./Tooltip";
import styles from "./Polish.module.css";
export const iconPaths: Record<string, string> = {
  newFolder: "M2 4h5l2 2h5v8H2ZM9 8v4M7 10h4",
  newRepository: "M3 2h9v12H3ZM3 11h9M5 4h4",
  rename: "m10 2 4 4-7 7-5 1 1-5ZM9 3l4 4",
  settings: "M2 4h12M2 12h12M5 2v4M11 10v4",
  back: "m9 3-5 5 5 5M4 8h9",
  forward: "m7 3 5 5-5 5M3 8h9",
  parent: "M8 13V3m-4 4 4-4 4 4",
  refresh: "M13 6a5 5 0 1 0 0 4M13 2v4H9",
  locations: "M2 2h12v12H2ZM6 2v12M6 6h8",
  inspector: "M2 2h12v12H2ZM10 2v12M3 6h5",
  recent: "M8 3v5l3 2M8 1a7 7 0 1 0 0 14 7 7 0 0 0 0-14",
  favorites: "m8 1 2 4 5 1-3 4 1 5-5-3-5 3 1-5-3-4 5-1Z",
  pending: "M2 6h12v8H2ZM2 9h4l1 2h2l1-2h4M5 2h6",
  collections: "M1 3h5l2 2h5v8H1ZM4 1h4l2 2h5v8",
  limit: "M1 12h14M11 2v12M4 8v4M7 6v6",
  folder: "M2 4h5l2 2h5v8H2Z",
  expand: "m6 3 5 5-5 5",
  collapse: "m3 6 5 5 5-5",
  sort: "M3 3h10M3 8h7M3 13h4",
};
export function Glyph({ name }: { name: string }) {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
      <path d={iconPaths[name] || iconPaths.folder} />
    </svg>
  );
}
export function ActionIcon({
  name,
  label,
  ...props
}: Omit<ButtonProps, "children"> & { name: string; label: string }) {
  return (
    <Tooltip content={label}>
      <Button {...props} variant="quiet" aria-label={label}>
        <Glyph name={name} />
      </Button>
    </Tooltip>
  );
}
