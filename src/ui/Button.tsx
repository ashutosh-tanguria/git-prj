import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
} from "react-aria-components";
import type { ReactNode } from "react";
import type { PreviewProps } from "./types";
import styles from "./Primitives.module.css";
export interface ButtonProps
  extends Omit<AriaButtonProps, "children">, PreviewProps {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  loading?: boolean;
  selected?: boolean;
}
export function Button({
  variant = "secondary",
  loading,
  selected,
  previewState,
  children,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={styles.button}
      data-variant={variant}
      data-preview={previewState}
      aria-busy={loading || undefined}
      aria-pressed={selected}
      isDisabled={props.isDisabled || loading}
    >
      {selected && <span aria-hidden="true">✓</span>}
      {children}
    </AriaButton>
  );
}
