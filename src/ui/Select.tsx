import { useId, type SelectHTMLAttributes } from "react";
import type { PreviewProps } from "./types";
import styles from "./Primitives.module.css";
export interface SelectProps
  extends SelectHTMLAttributes<HTMLSelectElement>, PreviewProps {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}
export function Select({
  label,
  error,
  options,
  previewState,
  ...props
}: SelectProps) {
  const id = useId();
  return (
    <div className={styles.field} data-preview={previewState}>
      <label htmlFor={id}>{label}</label>
      <select
        {...props}
        id={id}
        className={styles.input}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? id + "-error" : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={id + "-error"} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
