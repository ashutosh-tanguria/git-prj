import {
  Checkbox as AriaCheckbox,
  type CheckboxProps,
} from "react-aria-components";
import type { ReactNode } from "react";
import type { PreviewProps } from "./types";
import styles from "./Primitives.module.css";
export function Checkbox({
  children,
  previewState,
  ...props
}: Omit<CheckboxProps, "children"> & PreviewProps & { children: ReactNode }) {
  return (
    <AriaCheckbox
      {...props}
      className={styles.checkbox}
      data-preview={previewState}
    >
      {({ isSelected, isIndeterminate }) => (
        <>
          <span className={styles.check} aria-hidden="true">
            {isIndeterminate ? "−" : isSelected ? "✓" : ""}
          </span>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}
