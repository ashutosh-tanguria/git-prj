import {
  Tooltip as AriaTooltip,
  TooltipTrigger,
  type TooltipProps,
} from "react-aria-components";
import type { ReactElement } from "react";
import styles from "./Primitives.module.css";
export function Tooltip({
  children,
  content,
  isOpen,
}: {
  children: ReactElement;
  content: string;
  isOpen?: boolean;
}) {
  return (
    <TooltipTrigger delay={0} isOpen={isOpen}>
      {children}
      <AriaTooltip
        className={styles.tooltip}
        placement={"top" satisfies TooltipProps["placement"]}
      >
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
}
