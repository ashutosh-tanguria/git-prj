import { useId, type InputHTMLAttributes } from "react";
import type { PreviewProps } from "./types";
import styles from "./Primitives.module.css";
export interface InputProps
  extends InputHTMLAttributes<HTMLInputElement>, PreviewProps {
  label: string;
  error?: string;
  help?: string;
}
export function Input({
  label,
  error,
  help,
  previewState,
  ...props
}: InputProps) {
  const id = useId();
  return (
    <div className={styles.field} data-preview={previewState}>
      <label htmlFor={id}>{label}</label>
      <input
        {...props}
        id={id}
        className={styles.input}
        aria-invalid={Boolean(error)}
        aria-describedby={error || help ? id + "-help" : undefined}
      />
      {(error || help) && (
        <span id={id + "-help"} className={error ? styles.error : styles.meta}>
          {error || help}
        </span>
      )}
    </div>
  );
}
