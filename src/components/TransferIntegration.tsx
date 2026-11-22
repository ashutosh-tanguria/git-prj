import { useCallback, useEffect, useState } from "react";
import { t } from "../i18n";
import "../i18n/cloud";
import "../i18n/transfers";
import "../i18n/m3c";
import type { TransferRequest } from "../services/transferRequests";
import { transferPending } from "../services/transferJournal";
import type { Approvals, Transfer } from "../services/transferTypes";
import { transfers } from "../services/transfers";
import { Button } from "../ui/Button";
import { TransferPicker, transferMessage } from "./TransferPicker";
import { TransferReview } from "./TransferReview";
import { useTransferAccess, type TransferAccess } from "./useTransferAccess";
import styles from "./Library.module.css";

export default function TransferIntegration({
  account,
  roots,
  current,
  cloud,
  refreshed,
}: TransferAccess & { refreshed(): void }) {
  const { resolve, locations } = useTransferAccess({
    account,
    roots,
    current,
    cloud,
  });
  const [rows, setRows] = useState<Transfer[]>([]);
  const [request, setRequest] = useState<TransferRequest>();
  const [review, setReview] = useState(false);
  const [running, setRunning] = useState<string>();
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [failure, setFailure] = useState("");
  const [notice, setNotice] = useState("");
  const pending = rows.filter(transferPending);
  const refresh = useCallback(() => {
    void transfers
      .load()
      .then(setRows)
      .catch((error: unknown) => setFailure(transferMessage(error)));
  }, []);
  useEffect(() => {
    const pick = (event: Event) => {
      setNotice("");
      setRequest((event as CustomEvent<TransferRequest>).detail);
    };
    window.addEventListener("shelf-transfer", pick);
    window.addEventListener("focus", refresh);
    refresh();
    return () => {
      window.removeEventListener("shelf-transfer", pick);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);
  useEffect(() => {
    if (!pending.length) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [pending.length]);
  async function run(ids: string[], approvals: Record<string, Approvals>) {
    setRunning(ids[0]);
    setFailure("");
    setProgress({});
    try {
      await transfers.run(ids, {
        resolve,
        approvals: (endpoint) => approvals[endpoint.locationId],
        changed: (row) => {
          setRunning(row.id);
          setRows((old) =>
            old.map((item) => (item.id === row.id ? row : item)),
          );
          setProgress((old) => ({ ...old, [row.id]: 0 }));
        },
        progress: (row, bytes) =>
          setProgress((old) => ({ ...old, [row.id]: bytes })),
      });
      refreshed();
    } catch (error) {
      setFailure(transferMessage(error));
    } finally {
      setRunning(undefined);
      refresh();
    }
  }
  const visible = review
    ? rows
        .filter((row) => transferPending(row) || row.id === running)
        .concat(
          rows
            .filter((row) => !transferPending(row) && row.id !== running)
            .slice(-5),
        )
    : [];
  return (
    <>
      {(rows.length > 0 || notice) && (
        <section
          className={styles.pendingStrip}
          aria-label={t("transferPending")}
        >
          <Button
            onPress={() => {
              refresh();
              setReview(true);
            }}
          >
            {t("transferReview")} ({pending.length})
          </Button>
          {pending.length > 0 && <span>{t("workingNotice")}</span>}
          {pending.some((row) => Date.now() - row.createdAt > 86400000) && (
            <span>{t("workingOld")}</span>
          )}
          {notice && <span role="status">{notice}</span>}
        </section>
      )}
      {failure && <p role="alert">{failure}</p>}
      {request && (
        <TransferPicker
          request={request}
          resolve={resolve}
          locations={
            request.cloudOnly
              ? locations.filter((item) => item.endpoint.provider !== "github")
              : locations
          }
          onClose={() => setRequest(undefined)}
          onStaged={() => {
            request.onStaged?.();
            setRequest(undefined);
            setNotice(t("transferStaged"));
            refresh();
          }}
        />
      )}
      {review && (
        <TransferReview
          rows={visible}
          roots={roots}
          progress={progress}
          running={running}
          onClose={() => setReview(false)}
          onRun={(ids, approvals) => void run(ids, approvals)}
          onCancel={(id) => {
            void transfers
              .cancel(id)
              .then(refresh)
              .catch((error: unknown) => setFailure(transferMessage(error)));
          }}
        />
      )}
    </>
  );
}
