import { Modal, Dialog, Heading } from "react-aria-components";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function QuickLook({
  title,
  onClose,
  children,
}: {
  title: string;
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
      className={styles.modal}
    >
      <Dialog>
        <Heading slot="title">{title}</Heading>
        <Button onPress={onClose}>{t("close")}</Button>
        {children}
      </Dialog>
    </Modal>
  );
}
