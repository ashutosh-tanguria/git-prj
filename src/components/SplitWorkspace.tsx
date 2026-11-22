import { useEffect, useId, useRef, useState } from "react";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { ProviderMark } from "../ui/ProviderMark";
import type { Entry } from "../providers/types";
import { githubEndpoint, requestTransfer } from "../services/transferRequests";
import type {
  ResolveProvider,
  TransferEndpoint,
  TransferSource,
} from "../services/transferTypes";
import { useTransferAccess, type TransferAccess } from "./useTransferAccess";
import {
  transferLocationName,
  transferMessage,
  type TransferLocation,
} from "./TransferPicker";
import "../i18n/transfers";
import styles from "./SplitWorkspace.module.css";

interface Position extends TransferLocation {
  root: string;
}
interface Dragged {
  pane: string;
  sources: TransferSource[];
}
const dragType = "application/x-shelf-transfer";

export default function SplitWorkspace(props: TransferAccess) {
  const { resolve, locations } = useTransferAccess(props);
  const drag = useRef<Dragged>(null);
  const current =
    props.cloud?.transferDestination ??
    (props.account && props.current && !location.hash.startsWith("#/view/")
      ? githubEndpoint(props.account, props.current)
      : undefined);
  const leftRoot =
    locations.find((item) => item.endpoint.ref === current?.ref) ??
    locations.find(
      (item) => item.endpoint.locationId === current?.locationId,
    ) ??
    locations[0];
  const left =
    current && leftRoot
      ? {
          endpoint: current,
          label:
            current.ref === leftRoot.endpoint.ref
              ? leftRoot.label
              : (props.cloud?.locations.path?.(current.ref) ??
                transferLocationName(current)),
          root: leftRoot.endpoint.ref,
        }
      : leftRoot && { ...leftRoot, root: leftRoot.endpoint.ref };
  const right =
    locations.find(
      (item) => item.endpoint.locationId !== left?.endpoint.locationId,
    ) ?? leftRoot;
  return (
    <section className={styles.split} aria-label={t("splitView")}>
      <SplitPane
        title={t("splitLeft")}
        initial={left}
        locations={locations}
        resolve={resolve}
        drag={drag}
      />
      <SplitPane
        title={t("splitRight")}
        initial={right && { ...right, root: right.endpoint.ref }}
        locations={locations}
        resolve={resolve}
        drag={drag}
      />
    </section>
  );
}
function SplitPane({
  title,
  initial,
  locations,
  resolve,
  drag,
}: {
  title: string;
  initial?: Position;
  locations: TransferLocation[];
  resolve: ResolveProvider;
  drag: React.RefObject<Dragged | null>;
}) {
  const id = useId();
  const [timeline, setTimeline] = useState<{
    history: Position[];
    index: number;
  }>(() => ({ history: initial ? [initial] : [], index: 0 }));
  const position = timeline.history[timeline.index];
  const [rows, setRows] = useState<Entry[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [view, setView] = useState("list");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [drop, setDrop] = useState(false);
  useEffect(() => {
    setRows([]);
    setPicked([]);
    setError("");
    if (!position) return;
    const task = new AbortController();
    setLoading(true);
    void resolve(position.endpoint)
      .then((provider) =>
        provider.list(position.endpoint.ref, { signal: task.signal }),
      )
      .then((items) => {
        if (!task.signal.aborted) setRows(items);
      })
      .catch((failure: unknown) => {
        if (!task.signal.aborted && (failure as Error).message !== "EMPTY_REPO")
          setError(transferMessage(failure));
      })
      .finally(() => {
        if (!task.signal.aborted) setLoading(false);
      });
    return () => task.abort();
  }, [position, resolve]);
  const selected = rows.filter((item) => picked.includes(item.ref));
  const sources = (rows: Entry[]): TransferSource[] =>
    position
      ? rows.map((entry) => ({
          entry,
          endpoint: { ...position.endpoint, ref: entry.ref },
        }))
      : [];
  const navigate = (location: Position) =>
    setTimeline((old) => ({
      history: [...old.history.slice(0, old.index + 1), location],
      index: old.index + 1 - Number(!old.history.length),
    }));
  const step = (offset: number) =>
    setTimeline((old) => ({ ...old, index: old.index + offset }));
  const request = (
    items: TransferSource[],
    move: boolean,
    target?: TransferEndpoint,
  ) =>
    requestTransfer({
      move,
      target,
      items: items.map((source) => ({ source })),
    });
  return (
    <section
      className={styles.pane}
      aria-labelledby={id}
      data-drop={drop || undefined}
      onDragOver={(event) => {
        if (
          !position ||
          !drag.current ||
          drag.current.pane === id ||
          !event.dataTransfer.types.includes(dragType)
        )
          return;
        event.preventDefault();
        event.dataTransfer.dropEffect = event.shiftKey ? "move" : "copy";
        setDrop(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDrop(false);
      }}
      onDrop={(event) => {
        const grabbed = drag.current;
        if (
          !position ||
          !grabbed ||
          grabbed.pane === id ||
          !event.dataTransfer.types.includes(dragType)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        setDrop(false);
        drag.current = null;
        request(grabbed.sources, event.shiftKey, position.endpoint);
      }}
    >
      <header>
        <h2 id={id}>{title}</h2>
        {position && (
          <>
            <ProviderMark
              provider={position.endpoint.provider}
              label={t(position.endpoint.provider)}
            />
            <p className={styles.path}>{position.label}</p>
          </>
        )}
        <label>
          {t("locations")}{" "}
          <select
            value={position?.root ?? ""}
            onChange={(event) => {
              const chosen = locations.find(
                (item) => item.endpoint.ref === event.target.value,
              );
              if (chosen) navigate({ ...chosen, root: chosen.endpoint.ref });
            }}
          >
            <option value="">{t("transferChooseLocation")}</option>
            {locations.map((item) => (
              <option value={item.endpoint.ref} key={item.endpoint.ref}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.actions}>
          <Button isDisabled={!timeline.index} onPress={() => step(-1)}>
            {t("splitBack")}
          </Button>
          <Button
            isDisabled={timeline.index + 1 >= timeline.history.length}
            onPress={() => step(1)}
          >
            {t("splitForward")}
          </Button>
        </div>
        <label>
          {t("splitViewMode")}{" "}
          <select
            value={view}
            onChange={(event) => setView(event.target.value)}
          >
            <option value="list">{t("splitList")}</option>
            <option value="grid">{t("splitGrid")}</option>
          </select>
        </label>
      </header>
      {selected.length > 0 && (
        <div
          className={styles.actions}
          aria-label={t("transferActions")}
          role="group"
        >
          {[true, false].map((move) => (
            <Button
              key={String(move)}
              onPress={() => request(sources(selected), move)}
            >
              {t(move ? "moveTo" : "copyTo")}
            </Button>
          ))}
          {selected.every((entry) => entry.kind === "file") && (
            <Button
              onPress={() =>
                window.dispatchEvent(
                  new CustomEvent("shelf-local-export", {
                    detail: sources(selected),
                  }),
                )
              }
            >
              {t("localExport")}
            </Button>
          )}
        </div>
      )}
      {loading && <p role="status">{t("loadingRead")}</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && position && !rows.length && (
        <p>{t("emptyFolder")}</p>
      )}
      <ul className={styles.files} data-view={view} aria-label={t("files")}>
        {rows.map((row) => (
          <li
            key={row.ref}
            draggable={
              row.kind !== "special" && !matchMedia("(pointer: coarse)").matches
            }
            onDragStart={(event) => {
              if (row.kind === "special") return;
              drag.current = {
                pane: id,
                sources: sources(picked.includes(row.ref) ? selected : [row]),
              };
              event.dataTransfer.setData(dragType, id);
              event.dataTransfer.effectAllowed = "copyMove";
            }}
            onDragEnd={() => {
              drag.current = null;
              setDrop(false);
            }}
          >
            {row.kind !== "special" && (
              <input
                type="checkbox"
                checked={picked.includes(row.ref)}
                aria-label={row.name}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setPicked((old) =>
                    checked
                      ? [...old, row.ref]
                      : old.filter((ref) => ref !== row.ref),
                  );
                }}
              />
            )}
            {position && row.kind === "dir" ? (
              <Button
                variant="quiet"
                onPress={() =>
                  navigate({
                    ...position,
                    label: position.label + "/" + row.name,
                    endpoint: { ...position.endpoint, ref: row.ref },
                  })
                }
              >
                {row.name}
              </Button>
            ) : (
              <span>{row.name}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
