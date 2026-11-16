import { Modal, Dialog, Heading } from "react-aria-components";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function QuickLook({
  title,
  onClose,
  children,
  onPrevious,
  onNext,
  onOpen,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  onPrevious?: () => void;
  onNext?: () => void;
  onOpen?: () => void;
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
        <div
          onKeyDownCapture={(e) => {
            if ((e.target as HTMLElement).closest("input,select,textarea"))
              return;
            if (e.key === "ArrowLeft" && onPrevious) {
              e.preventDefault();
              onPrevious();
            }
            if (e.key === "ArrowRight" && onNext) {
              e.preventDefault();
              onNext();
            }
            if (
              e.key === "Enter" &&
              onOpen &&
              !(e.target as HTMLElement).closest("button,a")
            ) {
              e.preventDefault();
              onOpen();
            }
          }}
        >
          <Heading slot="title">{title}</Heading>
          <Button onPress={onClose}>{t("close")}</Button>
          {children}
        </div>
      </Dialog>
    </Modal>
  );
}
