import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog, Heading, Modal } from "react-aria-components";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import { DriveProvider } from "../providers/gdrive/client";
import { DropboxProvider } from "../providers/dropbox/client";
import { OneDriveProvider } from "../providers/onedrive/client";
import { googleAuth, type Auth } from "../providers/auth";
import { dropboxAuth } from "../providers/dropbox/auth";
import { oneDriveAuth } from "../providers/onedrive/auth";
import { clientIds, mockProviders, providerIds } from "../providers/flags";
import {
  ProviderError,
  type CloudId,
  type Entry,
  type Location,
  type StorageProvider,
  type VersionInfo,
} from "../providers/types";
import { cloudStaging, type CloudChange } from "../services/cloudStaging";
import { evaluateName } from "../services/guards";
import { CloudProviderRows, CloudQuota } from "./CloudProviderRows";
import type { CloudLibrary } from "./cloudTypes";
import "../i18n/cloud";
import styles from "./Library.module.css";
import cloudStyles from "./Cloud.module.css";

const adapters = {
  gdrive: DriveProvider,
  dropbox: DropboxProvider,
  onedrive: OneDriveProvider,
};
const authorizers = {
  gdrive: googleAuth,
  dropbox: dropboxAuth,
  onedrive: oneDriveAuth,
};
const enabled = providerIds.filter((id) => mockProviders || clientIds[id]);
const cloudPrefix = { gdrive: "gd:", dropbox: "db:", onedrive: "od:" };
type Session = { root: Location; provider: StorageProvider };
type Operation =
  | "uploadFiles"
  | "newFolder"
  | "rename"
  | "delete"
  | "push"
  | "versions"
  | "cloudReplace";
type Progress = { id: string; sent: number; total: number };
function route(ref: string) {
  return "#/cloud/" + encodeURIComponent(ref);
}
function currentRef() {
  if (!location.hash.startsWith("#/cloud/")) return "";
  try {
    return decodeURIComponent(location.hash.slice(8));
  } catch {
    return "";
  }
}
function message(error: unknown) {
  if (!(error instanceof ProviderError)) return t("providerUNKNOWN");
  if (error.details.uncertain) return t("cloudUncertain");
  const copy = t(error.userMessage);
  return error.details.retryAfter === undefined
    ? copy
    : copy +
        " " +
        t("cloudRetryAfter", { count: Math.ceil(error.details.retryAfter) });
}
async function mockAuth(id: CloudId): Promise<Auth> {
  if (
    (import.meta.env.DEV || __STYLEGUIDE__) &&
    import.meta.env.VITE_MOCK_PROVIDERS === "1"
  ) {
    const { providerMock } = await import("../../mocks/providers");
    return providerMock(id);
  }
  throw new ProviderError("PERMISSION");
}
function saveDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function CloudIntegration({
  children,
}: {
  children(cloud: CloudLibrary): ReactNode;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [folder, setFolder] = useState(currentRef);
  const [rows, setRows] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<Entry>();
  const [pending, setPending] = useState<CloudChange[]>([]);
  const [operation, setOperation] = useState<Operation>();
  const [move, setMove] = useState<{ location: string; item: Entry }>();
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [progress, setProgress] = useState<Progress>();
  const [quota, setQuota] = useState<{ used: number; total: number } | null>(
    null,
  );
  const [revision, setRevision] = useState(0);
  const paths = useRef(new Map<string, string>());
  const serial = useRef(false);

  const session = sessions.find(({ provider }) =>
    folder.startsWith(cloudPrefix[provider.id as CloudId]),
  );
  const queued = pending.filter((item) => item.locationId === session?.root.id);
  const connected = new Set(
    sessions
      .filter(({ provider }) => provider.isConnected())
      .map(({ provider }) => provider.id as CloudId),
  );
  const active = !!folder && !!session;
  const refresh = () => setRevision((value) => value + 1);
  function open(ref: string) {
    location.hash = route(ref);
  }
  function parent() {
    if (!session) return;
    open(paths.current.get(folder) ?? session.root.root);
  }

  useEffect(() => {
    const navigate = () => {
      if (location.hash.startsWith("#/settings/")) return;
      setFolder(currentRef());
      setOperation(undefined);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void cloudStaging
      .load()
      .then((items) => {
        if (!cancelled) setPending(items);
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(message(error));
      });
    return () => {
      cancelled = true;
    };
  }, [folder, revision]);
  useEffect(() => {
    setRows([]);
    setSelected(undefined);
    setQuota(null);
    if (!session?.provider.isConnected() || !folder) return;
    const controller = new AbortController();
    const { provider } = session;
    void provider
      .list(folder, { signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;
        for (const item of items)
          if (item.kind === "dir") paths.current.set(item.ref, folder);
        setRows(items);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setFailure(message(error));
      });
    void provider
      .quota()
      .then((value) => {
        if (!controller.signal.aborted) setQuota(value);
      })
      .catch((error: unknown) => {
        if (
          !controller.signal.aborted &&
          error instanceof ProviderError &&
          error.code === "AUTH_EXPIRED"
        )
          setFailure(message(error));
      });
    return () => controller.abort();
  }, [session, folder, revision]);

  async function run(action: () => Promise<void>) {
    if (serial.current) return;
    serial.current = true;
    setBusy(true);
    setFailure("");
    try {
      await action();
    } catch (error) {
      setFailure(message(error));
    } finally {
      serial.current = false;
      setBusy(false);
    }
  }
  function toggle(id: CloudId) {
    void run(async () => {
      const old = sessions.find(({ provider }) => provider.id === id);
      if (old?.provider.isConnected()) {
        await old.provider.disconnect();
        setSessions((items) => items.filter((item) => item !== old));
        if (old === session) location.hash = "#/";
        return;
      }
      const auth = mockProviders
        ? await mockAuth(id)
        : authorizers[id](clientIds[id] ?? "");
      const provider = new adapters[id](auth);
      await provider.connect();
      try {
        const [root] = await provider.listRoots();
        if (!root) throw new ProviderError("NOT_FOUND");
        setSessions((items) => [
          ...items.filter((item) => item !== old),
          { provider, root },
        ]);
        open(root.root);
      } catch (error) {
        await provider.disconnect();
        throw error;
      }
    });
  }
  function command(action: string) {
    if (!session || !active || action === "settings") return false;
    if (busy) return true;
    if (!session.provider.isConnected()) {
      setFailure(t("providerAUTH_EXPIRED"));
      return true;
    }
    if (action === "cut") {
      if (!selected?.version) setFailure(t("cloudSelectVersioned"));
      else {
        setMove({ location: session.root.id, item: selected });
        setFailure("");
      }
      return true;
    }
    if (action === "paste") {
      if (move?.location !== session.root.id || !move.item.version)
        setFailure(t("cloudUnsupported"));
      else {
        const { item } = move;
        const baseVersion = move.item.version;
        void run(async () => {
          setPending(
            await cloudStaging.stage(session.root, [
              {
                change: {
                  id: crypto.randomUUID(),
                  locationId: session.root.id,
                  op: "rename",
                  ref: item.ref,
                  parent: folder,
                  name: item.name,
                  baseVersion,
                  label: item.name,
                },
              },
            ]),
          );
          setMove(undefined);
        });
      }
      return true;
    }
    if (
      [
        "uploadFiles",
        "newFolder",
        "push",
        "rename",
        "delete",
        "cloudReplace",
      ].includes(action)
    ) {
      if (
        (action === "rename" ||
          action === "delete" ||
          action === "cloudReplace") &&
        !selected?.version
      ) {
        setFailure(t("cloudSelectVersioned"));
        return true;
      }
      setFailure("");
      setName(action === "rename" ? (selected?.name ?? "") : "");
      setProgress(undefined);
      setOperation(action as Operation);
    } else if (action !== "previewSite") setFailure(t("cloudUnsupported"));
    return true;
  }
  async function stage(files?: FileList) {
    if (!session || !operation) return;
    const locationId = session.root.id;
    const common = { locationId, parent: folder };
    const changes: { change: CloudChange; bytes?: Blob }[] = [];
    const valid = (value: string) =>
      value.trim() &&
      !/[\x00-\x1f/\\]/.test(value) &&
      ![".", ".."].includes(value);
    if (operation === "uploadFiles" && files) {
      for (const file of files) {
        if (!valid(file.name)) throw new ProviderError("PERMISSION");
        const same = rows.find(
          (entry) =>
            entry.name.normalize("NFC").toLowerCase() ===
            file.name.normalize("NFC").toLowerCase(),
        );
        if (same) throw new ProviderError("CONFLICT");
        changes.push({
          change: {
            ...common,
            id: crypto.randomUUID(),
            op: "add",
            ref: folder,
            name: file.name,
            label: file.name,
          },
          bytes: file,
        });
      }
    } else if (
      operation === "cloudReplace" &&
      selected?.version &&
      files?.[0]
    ) {
      changes.push({
        change: {
          ...common,
          id: crypto.randomUUID(),
          op: "modify",
          ref: selected.ref,
          baseVersion: selected.version,
          label: selected.name,
        },
        bytes: files[0],
      });
    } else if (operation === "newFolder" && valid(name)) {
      changes.push({
        change: {
          ...common,
          id: crypto.randomUUID(),
          op: "mkdir",
          ref: folder,
          name: name.trim(),
          label: name.trim(),
        },
      });
    } else if (
      selected?.version &&
      (operation === "delete" || (operation === "rename" && valid(name)))
    ) {
      changes.push({
        change: {
          ...common,
          id: crypto.randomUUID(),
          op: operation,
          ref: selected.ref,
          baseVersion: selected.version,
          name: operation === "rename" ? name.trim() : undefined,
          label: selected.name,
        },
      });
    }
    if (!changes.length) throw new ProviderError("PERMISSION");
    setPending(await cloudStaging.stage(session.root, changes));
    setOperation(undefined);
  }
  function push() {
    if (!session) return;
    void run(async () => {
      const result = await cloudStaging.push(session.provider, session.root, {
        onProgress: (id, sent, total) => setProgress({ id, sent, total }),
      });
      setPending(await cloudStaging.load());
      refresh();
      if (result.failed) {
        const item = queued.find((row) => row.id === result.failed?.id);
        setFailure(
          (item ? item.label + " · " : "") + message(result.failed.error),
        );
      } else setOperation(undefined);
    });
  }
  function download(item: Entry, version?: string) {
    if (session)
      void run(async () =>
        saveDownload(
          await session.provider.read(item.ref, { version }),
          item.name,
        ),
      );
  }
  function history() {
    if (!session || !selected) return;
    void run(async () => {
      setVersions(await session.provider.history(selected.ref));
      setOperation("versions");
    });
  }

  const inputs = (
    <>
      {(operation === "uploadFiles" || operation === "cloudReplace") && (
        <label>
          {t(operation)}{" "}
          <input
            type="file"
            multiple={operation === "uploadFiles"}
            disabled={busy}
            onChange={(event) => {
              const files = event.currentTarget.files;
              void run(() => stage(files ?? undefined));
            }}
          />
        </label>
      )}
      {(operation === "rename" || operation === "newFolder") && (
        <label>
          {t("commandName")}{" "}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      )}
      {operation === "delete" && session && (
        <p>{t(session.provider.id + "Trash")}</p>
      )}
      {operation !== "uploadFiles" && operation !== "cloudReplace" && (
        <Button isDisabled={busy} onPress={() => void run(() => stage())}>
          {t("cloudStage")}
        </Button>
      )}
    </>
  );

  return children({
    active,
    refresh,
    parent,
    command,
    locations: {
      active: folder,
      roots: sessions.map(({ root }) => root),
      refresh: revision,
      open,
      list: async (ref) => {
        const current = sessions.find(({ provider }) =>
          ref.startsWith(cloudPrefix[provider.id as CloudId]),
        );
        if (!current) return [];
        const items = await current.provider.list(ref);
        for (const item of items)
          if (item.kind === "dir") paths.current.set(item.ref, ref);
        return items;
      },
    },
    connectRows: (
      <>
        <CloudProviderRows
          ids={enabled}
          connected={connected}
          busy={busy}
          onToggle={toggle}
        />
        {failure && !active && <p role="alert">{failure}</p>}
      </>
    ),
    settings: (
      <section>
        <h3>{t("cloudProviders")}</h3>
        <CloudProviderRows
          ids={enabled}
          connected={connected}
          busy={busy}
          onToggle={toggle}
          settings
        />
        <p>{t("cloudMemory")}</p>
        {failure && <p role="alert">{failure}</p>}
      </section>
    ),
    status: session && (
      <>
        <span>
          {t(session.provider.id)} ·{" "}
          {t(
            session.provider.isConnected()
              ? "cloudConnected"
              : "cloudDisconnected",
          )}
        </span>
        <CloudQuota quota={quota} />
      </>
    ),
    content: session && (
      <section
        className={cloudStyles.workspace}
        aria-label={t(session.provider.id)}
      >
        <h2>{t(session.provider.id)}</h2>
        {move?.location === session.root.id && (
          <p role="status">
            {t("cloudMove")} · {move.item.name}
          </p>
        )}
        {folder !== session.root.root && (
          <Button onPress={parent}>{t("cloudParent")}</Button>
        )}
        {session.provider.isConnected() ? (
          <>
            <table className={cloudStyles.files}>
              <thead>
                <tr>
                  <th scope="col">{t("name")}</th>
                  <th scope="col">{t("size")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.ref}>
                    <td>
                      {item.kind === "dir" ? (
                        <Button variant="quiet" onPress={() => open(item.ref)}>
                          {item.name}
                        </Button>
                      ) : (
                        <Button
                          variant="quiet"
                          aria-pressed={selected?.ref === item.ref}
                          onPress={() => setSelected(item)}
                        >
                          {item.name}
                        </Button>
                      )}
                    </td>
                    <td>
                      {item.size === null
                        ? t("unknown")
                        : new Intl.NumberFormat(
                            document.documentElement.lang,
                          ).format(item.size) + " B"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p>{t("emptyFolder")}</p>}
            {selected && (
              <div className={cloudStyles.actions}>
                <Button isDisabled={busy} onPress={() => download(selected)}>
                  {t("download")}
                </Button>
                <Button
                  isDisabled={busy || !selected.version}
                  onPress={() => command("cloudReplace")}
                >
                  {t("cloudReplace")}
                </Button>
                <Button isDisabled={busy} onPress={history}>
                  {t("cloudVersions")}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Button
            isDisabled={busy}
            onPress={() => toggle(session.provider.id as CloudId)}
          >
            {t("connectAction")}
          </Button>
        )}
        {failure && !operation && <p role="alert">{failure}</p>}
        <section aria-label={t("pending")}>
          <h3>
            {t("pending")} {queued.length}
          </h3>
          <ul>
            {queued.map((item) => (
              <li key={item.id}>
                {item.label}{" "}
                {item.attempted && <strong>{t("cloudNeedsReview")}</strong>}
                <Button
                  variant="quiet"
                  isDisabled={busy}
                  onPress={() =>
                    void run(async () =>
                      setPending(await cloudStaging.discard(item.id)),
                    )
                  }
                >
                  {t("cloudDiscard")}
                </Button>
              </li>
            ))}
          </ul>
          <Button
            isDisabled={!queued.length || busy}
            onPress={() => command("push")}
          >
            {t("push")}
          </Button>
        </section>
      </section>
    ),
    dialogs: operation && (
      <Modal
        isOpen
        className={styles.workingPanel + " " + styles.formPanel}
        onOpenChange={(open) => {
          if (!open && !busy) setOperation(undefined);
        }}
      >
        <Dialog>
          <Heading slot="title">
            {t(operation === "versions" ? "cloudVersions" : operation)}
          </Heading>
          {operation === "push" ? (
            <>
              <p>{t("cloudSequential")}</p>
              <ul>
                {queued.map((item) => (
                  <li key={item.id}>
                    {t(
                      item.op === "add"
                        ? "uploadFiles"
                        : item.op === "mkdir"
                          ? "newFolder"
                          : item.op === "modify"
                            ? "cloudReplace"
                            : item.op,
                    )}{" "}
                    · {item.label}
                    {evaluateName(item.name ?? item.label, "unknown").level ===
                      "warn" && <p>{t("cloudSensitive")}</p>}
                    {progress?.id === item.id && (
                      <progress
                        aria-label={item.label}
                        value={progress.sent}
                        max={progress.total || 1}
                      />
                    )}
                  </li>
                ))}
              </ul>
              <Button
                variant="primary"
                isDisabled={
                  busy || !queued.length || !session?.provider.isConnected()
                }
                onPress={push}
              >
                {t("push")}
              </Button>
            </>
          ) : operation === "versions" ? (
            <ul>
              {versions.map((version) => (
                <li key={version.id}>
                  {version.label} {version.modified}
                  <Button
                    isDisabled={busy}
                    onPress={() => selected && download(selected, version.id)}
                  >
                    {t("download")}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            inputs
          )}
          {failure && <p role="alert">{failure}</p>}
          <Button isDisabled={busy} onPress={() => setOperation(undefined)}>
            {t("cancel")}
          </Button>
        </Dialog>
      </Modal>
    ),
  });
}
