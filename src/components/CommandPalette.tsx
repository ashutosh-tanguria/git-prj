import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Dialog, Heading, Modal } from "react-aria-components";
import { t } from "../i18n";
import {
  loadNames,
  findNames,
  type NamedEntry,
} from "../services/filenameSearch";
import { nameMatches, paletteQuery } from "../services/paletteQuery";
import {
  paletteCommands,
  commandBinding,
  type defaultShortcuts,
} from "../services/shortcuts";
import { ProviderMark, type Provider } from "../ui/ProviderMark";
import { Kbd } from "../ui/Kbd";
import { TextResult } from "./TextResult";
import { useTextResults } from "./useTextResults";
import type { TextMatch } from "../services/textSearch";
import "../i18n/search";
import styles from "./Search.module.css";

export interface PaletteOption {
  id: string;
  content: ReactNode;
  reason?: string;
  choose: () => void;
}

export function PaletteBox({
  value,
  onChange,
  options,
  status,
  onClose,
  focusOnMount = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: PaletteOption[];
  status: string;
  onClose?: () => void;
  focusOnMount?: boolean;
}) {
  const list = useId();
  const field = useRef<HTMLInputElement>(null);
  const [cursor, setCursor] = useState(-1);
  const active = Math.min(Math.max(cursor, 0), options.length - 1);
  const activeId = active >= 0 ? list + "-" + active : undefined;

  useEffect(() => {
    if (focusOnMount) field.current?.focus();
  }, [focusOnMount]);
  useEffect(() => {
    if (focusOnMount && activeId && cursor >= 0)
      document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId, focusOnMount, cursor]);

  function choose(option: PaletteOption) {
    if (option.reason) return;
    if (onClose) {
      onClose();
      requestAnimationFrame(option.choose);
    } else option.choose();
  }
  return (
    <div className={styles.box}>
      <label>
        {t("paletteInput")}
        <input
          ref={field}
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={list}
          aria-expanded={true}
          aria-activedescendant={activeId}
          value={value}
          onChange={(event) => {
            setCursor(-1);
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter" && active >= 0) {
              event.preventDefault();
              choose(options[active]);
            } else if (
              options.length &&
              ["ArrowDown", "ArrowUp"].includes(event.key)
            ) {
              event.preventDefault();
              setCursor(
                event.key === "ArrowDown"
                  ? (cursor + 1) % options.length
                  : cursor <= 0
                    ? options.length - 1
                    : cursor - 1,
              );
            }
          }}
        />
      </label>
      <p className={styles.hint}>{t("palettePrefixes")}</p>
      <div role="status" className={styles.status}>
        {status}
      </div>
      <ul
        id={list}
        className={styles.results}
        role="listbox"
        aria-label={t("paletteResults")}
      >
        {options.map((row, index) => (
          <PaletteRow
            key={row.id}
            row={row}
            id={list + "-" + index}
            active={index === active}
            onPick={() => choose(row)}
          />
        ))}
      </ul>
    </div>
  );
}

function PaletteRow({
  row,
  id,
  active,
  onPick,
}: {
  row: PaletteOption;
  id: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <li
      role="option"
      aria-selected={active}
      aria-disabled={!!row.reason || undefined}
      id={id}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(); } }}
    >
      {row.content}
      {row.reason && <small>{row.reason}</small>}
    </li>
  );
}

export function NamedResult({ item }: { item: NamedEntry }) {
  const provider = item.scope.split(":")[0] as Provider;
  return (
    <>
      <ProviderMark provider={provider} label={t(provider)} />
      <span>{item.path}</span>
    </>
  );
}

export function CommandPalette({
  bindings,
  scopes,
  roots,
  onClose,
  onCommand,
  onOpen,
  onTextResult,
  unavailable,
}: {
  bindings: typeof defaultShortcuts;
  scopes: string[];
  roots: NamedEntry[];
  onClose: () => void;
  onCommand: (command: string) => void;
  onOpen: (entry: NamedEntry) => void;
  onTextResult: (result: TextMatch) => void;
  unavailable: (command: string) => string | undefined;
}) {
  const [value, setValue] = useState("");
  const [names, setNames] = useState<NamedEntry[]>([]);
  const scopeKey = JSON.stringify(scopes);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void loadNames(scopes).then(
        (items) => {
          if (active) setNames(items);
        },
        () => {},
      );
    };
    refresh();
    window.addEventListener("shelf-cache-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("shelf-cache-changed", refresh);
    };
  }, [scopeKey]);
  const { mode, query } = paletteQuery(value);
  const { matches, loading } = useTextResults(
    scopes,
    mode === "text" ? query : "",
  );
  const label = (command: string) =>
    t(
      command === "sizeLedger"
        ? "paletteOpenLedger"
        : command === "settings"
          ? "paletteOpenSettings"
          : command,
    );
  const commandRows = (limit: number) =>
    paletteCommands
      .filter((command) => nameMatches(label(command), query))
      .slice(0, limit)
      .map((command) => ({
        id: command,
        content: (
          <>
            <span>{label(command)}</span>
            <Kbd>
              {commandBinding(command, bindings).replace("Control", "Ctrl")}
            </Kbd>
          </>
        ),
        reason: unavailable(command),
        choose: () => onCommand(command),
      }));
  const entryRows = (items: NamedEntry[]) =>
    items.map((item) => ({
      id: JSON.stringify([item.scope, item.ref]),
      content: <NamedResult item={item} />,
      choose: () => onOpen(item),
    }));
  let options: PaletteOption[] = [];
  if (mode === "commands") options = commandRows(50);
  if (mode === "names")
    options = entryRows(findNames(names, query, "file").slice(0, 40));
  if (mode === "locations") {
    const dirs = new Map(
      [...roots, ...names.filter((item) => item.kind === "dir")].map((item) => [
        JSON.stringify([item.scope, item.ref]),
        item,
      ]),
    );
    options = entryRows(
      findNames([...dirs.values()], query, "dir").slice(0, 40),
    );
  }
  if (mode === "mixed")
    options = [
      ...commandRows(query ? 12 : 5),
      ...entryRows(findNames(names, query, "file").slice(0, 20)),
    ];
  if (mode === "text")
    options = matches.map((item) => ({
      id: JSON.stringify([item.scope, item.ref, item.page]),
      content: <TextResult item={item} />,
      choose: () => onTextResult(item),
    }));
  const status =
    mode === "tags"
      ? t("paletteNoTags")
      : loading
        ? t("searchingCache")
        : options.length
          ? t("paletteCount", { count: options.length })
          : mode === "text" && !query
            ? t("textSearch")
            : t("searchNoMatches");
  return (
    <Modal
      isOpen
      isDismissable
      className={styles.palette}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog>
        <Heading slot="title">{t("commandPalette")}</Heading>
        <PaletteBox
          value={value}
          onChange={setValue}
          options={options}
          status={status}
          onClose={onClose}
          focusOnMount
        />
      </Dialog>
    </Modal>
  );
}
