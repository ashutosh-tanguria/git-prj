import { useEffect, useState } from "react";
import { Dialog, Heading, Modal } from "react-aria-components";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { parseRef } from "../lib/refs";
import type { Entry } from "../providers/types";
import { FolderCollision, type CollisionChoice } from "../services/folderTypes";
import { planTransfers } from "../services/transferPlan";
import { transfers } from "../services/transfers";
import { evaluateFile } from "../services/guards";
import type { TransferRequest } from "../services/transferRequests";
import type {
  ResolveProvider,
  TransferDraft,
  TransferEndpoint,
} from "../services/transferTypes";
import styles from "./Library.module.css";

export interface TransferLocation {
  label: string;
  endpoint: TransferEndpoint;
}
export function transferMessage(error: unknown) {
  const key =
    error instanceof Error
      ? "userMessage" in error
        ? String(error.userMessage)
        : error.message
      : "transferFailed";
  return t(key) === key ? t("transferFailed") : t(key);
}
export function transferLocationName(endpoint: TransferEndpoint) {
  if (endpoint.provider !== "github") return t(endpoint.provider);
  const { owner, repo, branch, path } = parseRef(endpoint.ref);
  return owner + "/" + repo + " · " + branch + "/" + path;
}
export function TransferPicker({
  request,
  locations,
  resolve,
  onClose,
  onStaged,
}: {
  request: TransferRequest;
  locations: TransferLocation[];
  resolve: ResolveProvider;
  onClose(): void;
  onStaged(): void;
}) {
  const [trail, setTrail] = useState<TransferLocation[]>(() =>
    request.target
      ? [
          {
            label: transferLocationName(request.target),
            endpoint: request.target,
          },
        ]
      : [],
  );
  const [folders, setFolders] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [collisions, setCollisions] = useState<string[]>([]);
  const [plan, setPlan] = useState<{ draft: TransferDraft; bytes?: Blob }[]>();
  const selected = trail.at(-1);
  const target = selected?.endpoint;
  useEffect(() => {
    if (!target || request.target) return;
    const controller = new AbortController();
    setFolders([]);
    setError("");
    void resolve(target)
      .then((provider) =>
        provider.list(target.ref, { signal: controller.signal }),
      )
      .then((rows) => {
        if (!controller.signal.aborted)
          setFolders(rows.filter((row) => row.kind === "dir"));
      })
      .catch((failure: unknown) => {
        if (
          !controller.signal.aborted &&
          (failure as Error).message !== "EMPTY_REPO"
        )
          setError(transferMessage(failure));
      });
    return () => controller.abort();
  }, [target, request.target, resolve]);
  const clearPlan = () => {
    setPlan(undefined);
    setCollisions([]);
    setError("");
  };
  async function prepare(choice?: CollisionChoice) {
    if (!target) return;
    setBusy(true);
    clearPlan();
    try {
      if (target.provider === "github")
        for (const { source } of request.items) {
          const size = source.entry.size;
          if (size !== null && evaluateFile(size).level === "block")
            throw Error("guardFileBlock");
        }
      const drafts = await planTransfers(
        request,
        target,
        await resolve(target),
        await transfers.load(),
        choice,
      );
      if (
        target.provider === "github" &&
        drafts.some(
          ({ draft }) =>
            draft.source.entry.size !== null &&
            evaluateFile(draft.source.entry.size).level === "block",
        )
      )
        throw Error("guardFileBlock");
      setPlan(drafts);
    } catch (failure) {
      if (failure instanceof FolderCollision) setCollisions(failure.paths);
      else setError(transferMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function stage() {
    if (!plan) return;
    setBusy(true);
    try {
      await transfers.stage(plan);
      onStaged();
    } catch (failure) {
      setError(transferMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      isOpen
      className={styles.workingPanel}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog>
        <Heading slot="title">{t(request.move ? "moveTo" : "copyTo")}</Heading>
        {!request.target && (
          <>
            <label>
              {t("transferDestination")}{" "}
              <select
                disabled={busy}
                value={locations.findIndex(
                  (item) =>
                    item.endpoint.ref === trail[0]?.endpoint.ref &&
                    item.endpoint.locationId === trail[0]?.endpoint.locationId,
                )}
                onChange={(event) => {
                  const chosen = locations[Number(event.target.value)];
                  setTrail(chosen ? [chosen] : []);
                  clearPlan();
                }}
              >
                <option value={-1}>{t("transferChooseLocation")}</option>
                {locations.map((item, index) => (
                  <option key={item.endpoint.ref} value={index}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {!locations.length && <p>{t("transferNoLocations")}</p>}
          </>
        )}
        {selected && <p>{trail.map((item) => item.label).join(" / ")}</p>}
        {!request.target && trail.length > 1 && (
          <Button
            isDisabled={busy}
            onPress={() => {
              setTrail(trail.slice(0, -1));
              clearPlan();
            }}
          >
            {t("cloudParent")}
          </Button>
        )}
        {!plan &&
          !collisions.length &&
          folders.map((folder) => (
            <Button
              key={folder.ref}
              isDisabled={busy}
              onPress={() => {
                if (target)
                  setTrail([
                    ...trail,
                    {
                      label: folder.name,
                      endpoint: { ...target, ref: folder.ref },
                    },
                  ]);
                clearPlan();
              }}
            >
              {folder.name}
            </Button>
          ))}
        {collisions.length > 0 && (
          <>
            <p role="alert">
              {t("folderCollision")} · {collisions.join(", ")}
            </p>
            <Button isDisabled={busy} onPress={() => void prepare("both")}>
              {t("folderKeepBoth")}
            </Button>
            <Button isDisabled={busy} onPress={() => void prepare("replace")}>
              {t("folderReplace")}
            </Button>
          </>
        )}
        {plan && (
          <>
            <ul>
              {plan.map(({ draft }, index) => (
                <li key={index}>
                  {draft.source.entry.name} →{" "}
                  {[...(draft.folders ?? []), draft.name].join("/")}
                  {draft.replace && " (" + t("folderReplace") + ")"}
                </li>
              ))}
            </ul>
            <Button isDisabled={busy} onPress={() => void stage()}>
              {t("workingStage")}
            </Button>
          </>
        )}
        {!plan && !collisions.length && (
          <Button isDisabled={!target || busy} onPress={() => void prepare()}>
            {t("commandPreview")}
          </Button>
        )}
        <Button isDisabled={busy} onPress={onClose}>
          {t("cancel")}
        </Button>
        {error && <p role="alert">{error}</p>}
      </Dialog>
    </Modal>
  );
}
