import type { LabelColor } from "../services/organizer";
import styles from "./Organizer.module.css";

export function LabelMark({ color }: { color: LabelColor }) {
  return <span aria-hidden="true" className={styles.mark} data-color={color} />;
}
