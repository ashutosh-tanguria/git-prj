export type PreviewState =
  | "default"
  | "hover"
  | "focus-visible"
  | "active"
  | "disabled"
  | "loading"
  | "error"
  | "selected";
export interface PreviewProps {
  previewState?: PreviewState;
}
