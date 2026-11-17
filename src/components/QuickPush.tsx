import { Modal, Dialog, Heading } from "react-aria-components";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import type { Change } from "../services/staging";
import styles from "./Library.module.css";
export function QuickPush({
  rows,
  message,
  onMessage,
  onPush,
  onClose,
  onChange,
  busy,
  anchor,
  onCancel,
  finishing,
}: {
  rows: Change[];
  message: string;
  onMessage: (value: string) => void;
  onPush: () => void;
  onClose: () => void;
  onChange: () => void;
  busy: boolean;
  anchor?: DOMRect;
  onCancel?: () => void;
  finishing?: boolean;
}) {
  const first = rows[0]?.target;
  return (
    <Modal
      isOpen
      isDismissable={!busy}
      data-quick-push
      className={styles.workingPanel + " " + styles.quickPopover}
      style={
        anchor
          ? {
              left: Math.max(8, Math.min(anchor.left, innerWidth - 568)),
              top:
                anchor.top > innerHeight / 2
                  ? Math.max(8, anchor.top - 260)
                  : anchor.bottom + 8,
            }
          : undefined
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog>
        <Heading slot="title">{t("quickPush")}</Heading>
        <p>
          {first?.owner}/{first?.repo}@{first?.branch}/
          {first?.path.split("/").slice(0, -1).join("/")}
        </p>
        <Button variant="quiet" isDisabled={busy} onPress={onChange}>
          {t("destinationChange")}
        </Button>
        <label>
          {t("workingMessage")}
          <textarea
            disabled={busy}
            value={message}
            onChange={(e) => onMessage(e.target.value)}
          />
        </label>
        <Button
          variant="primary"
          isDisabled={busy || !message.trim()}
          onPress={onPush}
        >
          {t("pushTo")} {first?.owner}/{first?.repo}/
          {first?.path.split("/").slice(0, -1).join("/")}
        </Button>
        <Button
          isDisabled={busy && (!onCancel || finishing)}
          onPress={busy ? onCancel : onClose}
        >
          {t(finishing ? "workingRef" : "workingCancel")}
        </Button>
      </Dialog>
    </Modal>
  );
}
