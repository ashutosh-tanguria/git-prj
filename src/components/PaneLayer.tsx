import { Modal, Dialog, Heading } from "react-aria-components";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Panels.module.css";
export function PaneLayer({
  kind,
  onClose,
  children,
}: {
  kind: "locations" | "inspector";
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={kind === "locations" ? styles.drawer : styles.sheet}
    >
      <Dialog aria-label={t(kind)}>
        <Heading slot="title">{t(kind)}</Heading>
        <Button onPress={onClose}>{t("close")}</Button>
        {children}
      </Dialog>
    </Modal>
  );
}
