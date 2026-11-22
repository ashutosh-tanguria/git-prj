import { useCallback, useEffect, useMemo, useState } from "react";
import { githubProvider } from "../providers/github/adapter";
import { isConnectedAs } from "../providers/github/client";
import { parseRef, type GitRef } from "../lib/refs";
import { t } from "../i18n";
import "../i18n/cloud";
import "../i18n/transfers";
import "../i18n/m3c";
import type { Repo } from "../services/library";
import {
  githubEndpoint,
  type TransferRequest,
} from "../services/transferRequests";
import { transferPending } from "../services/transferJournal";
import type {
  Approvals,
  ResolveProvider,
  Transfer,
} from "../services/transferTypes";
import { transfers } from "../services/transfers";
import { Button } from "../ui/Button";
import {
  TransferPicker,
  transferMessage,
  type TransferLocation,
} from "./TransferPicker";
import { TransferReview } from "./TransferReview";
import type { CloudLibrary } from "./cloudTypes";
import styles from "./Library.module.css";

const github = githubProvider(async () => {
  throw Error("transferAccountChanged");
});
export default function TransferIntegration({
  account,
  roots,
  current,
  cloud,
  refreshed,
}: {
  account: string;
  roots: Repo[];
  current: GitRef | null;
  cloud?: CloudLibrary;
  refreshed(): void;
}) {
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
  const resolve = useCallback<ResolveProvider>(
    async (endpoint) => {
      if (endpoint.provider === "github") {
        const { owner, repo } = parseRef(endpoint.ref);
        if (
          endpoint.locationId === account + ":" + owner + "/" + repo &&
          isConnectedAs(account)
        )
          return github;
      } else {
        const provider = cloud?.transferProvider(endpoint);
        if (provider) return provider;
      }
      throw Error("transferAccountChanged");
    },
    [account, cloud],
  );
  const locations = useMemo<TransferLocation[]>(() => {
    const result: TransferLocation[] = [];
    for (const root of cloud?.locations.roots ?? []) {
      if (root.provider === "github" || root.provider === "local") continue;
      const endpoint = {
        provider: root.provider,
        locationId: root.id,
        ref: root.root,
      };
      if (cloud?.transferProvider(endpoint))
        result.push({ label: t(root.provider), endpoint });
    }
    if (account && !request?.cloudOnly)
      for (const repo of roots) {
        const [owner, name] = repo.full_name.split("/");
        result.push({
          endpoint: githubEndpoint(account, {
            owner,
            repo: name,
            branch: repo.default_branch,
            path: "",
          }),
          label: repo.full_name + " · " + repo.default_branch,
        });
        if (
          current &&
          current.owner === owner &&
          current.repo === name &&
          current.branch !== repo.default_branch
        )
          result.push({
            endpoint: githubEndpoint(account, { ...current, path: "" }),
            label: repo.full_name + " · " + current.branch,
          });
      }
    return result;
  }, [account, roots, cloud, current, request?.cloudOnly]);
  async function run(id: string, approvals: Record<string, Approvals>) {
    setRunning(id);
    setFailure("");
    setProgress({});
    try {
      await transfers.run([id], {
        resolve,
        approvals: (endpoint) => approvals[endpoint.locationId],
        changed: (row) => {
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
          locations={locations}
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
          onRun={(id, approvals) => void run(id, approvals)}
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
