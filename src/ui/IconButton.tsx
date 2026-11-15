import { Button, type ButtonProps } from "./Button";
import styles from "./Primitives.module.css";
export function IconButton(
  props: Omit<ButtonProps, "children"> & { "aria-label": string },
) {
  return (
    <Button {...props}>
      <svg
        className={styles.icon}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path d="M8 3v10M3 8h10" />
      </svg>
    </Button>
  );
}
