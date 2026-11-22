import type { CloudLocations } from "./cloudTypes";
import { Glyph } from "../ui/ActionIcon";
import { ProviderMark } from "../ui/ProviderMark";
import { initial, visible, type Node } from "./locationsModel";
import { useState, useRef, useId } from "react";
import { library, type Repo } from "../services/library";
import { explorerRoute, parseRef } from "../lib/refs";
import { t } from "../i18n";
import styles from "./Locations.module.css";
import { LaterAction } from "./CommandBar";
import v2 from "./ExplorerV2.module.css";
import {
  dragReference,
  type Label,
  type LibraryItem,
} from "../services/organizer";
import { LabelMark } from "./LabelMark";
import { Button } from "../ui/Button";
export interface VirtualLocations {
  active: string;
  collections: Label[];
  tags: Label[];
  open(id: string): void;
  create(): void;
  add(id: string, items: LibraryItem[]): void;
  exportLabels(): void;
  importLabels?: () => void;
}
export function Locations({
  repos,
  clouds,
  account,
  virtual,
}: {
  repos: Repo[];
  clouds?: CloudLocations;
  account?: string;
  virtual?: VirtualLocations;
}) {
  return (
    <LocationTree
      key={
        repos.map((repo) => repo.full_name).join("|") +
        (clouds?.roots.map((root) => root.id).join("|") ?? "") +
        (clouds?.refresh ?? "")
      }
      repos={repos}
      clouds={clouds}
      account={account}
      virtual={virtual}
    />
  );
}
function LocationTree({
  repos,
  clouds,
  account,
  virtual,
}: {
  repos: Repo[];
  clouds?: CloudLocations;
  account?: string;
  virtual?: VirtualLocations;
}) {
  const prefix = useId();
  const [nodes, setNodes] = useState(() => initial(repos, clouds?.roots)),
    [focus, setFocus] = useState("github"),
    [error, setError] = useState("");
  const host = useRef<HTMLDivElement>(null),
    typed = useRef({ text: "", time: 0 });
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const groups: Node[] = virtual
    ? [
        virtualGroup(
          "quickAccess",
          ["recent", "favorites"].map((id) => ({ id, name: t(id) })),
        ),
        ...nodes,
        virtualGroup("collections", virtual.collections),
        virtualGroup("tags", virtual.tags, "tag:"),
      ]
    : nodes;
  function virtualGroup(
    id: string,
    children: { id: string; name: string }[],
    namespace = "",
  ): Node {
    return {
      id,
      label: t(id),
      virtual: true,
      level: 1,
      expanded: !collapsed.includes(id),
      loaded: true,
      children: children.map((child) => ({
        id: namespace + child.id,
        label: child.name,
        virtual: true,
        parent: id,
        level: 2,
        expanded: false,
        loaded: true,
        children: [],
      })),
    };
  }
  const rows = visible(groups);
  function activate(node: Node) {
    if (node.virtual && node.parent) virtual?.open(node.id);
    else if (node.ref && node.provider) clouds?.open(node.ref);
    else if (node.ref) location.hash = explorerRoute(parseRef(node.ref));
    else void toggle(node);
  }
  function move(id: string) {
    setFocus(id);
    requestAnimationFrame(() =>
      host.current
        ?.querySelector<HTMLElement>('[data-tree-id="' + CSS.escape(id) + '"]')
        ?.focus(),
    );
  }
  async function toggle(node: Node, expand = !node.expanded) {
    if (node.virtual) {
      if (!node.parent)
        setCollapsed((old) =>
          expand
            ? old.filter((id) => id !== node.id)
            : [...new Set([...old, node.id])],
        );
      return;
    }
    if (!node.loaded && node.ref && expand) {
      try {
        const entries =
          node.provider && clouds
            ? await clouds.list(node.ref)
            : account
              ? await import("../services/githubCache").then((cache) =>
                  cache.listGitHub(account, parseRef(node.ref!)),
                )
              : await library.list(parseRef(node.ref));
        node.children = entries
          .filter((entry) => entry.kind === "dir")
          .map((entry) => ({
            id: entry.ref,
            parent: node.id,
            label: entry.name,
            ref: entry.ref,
            provider: node.provider,
            level: node.level + 1,
            expanded: false,
            loaded: false,
            children: [],
          }));
        node.loaded = true;
      } catch {
        setError(t("readError"));
        return;
      }
    }
    node.expanded = expand;
    setNodes([...nodes]);
  }
  function render(list: Node[]) {
    return list.map((node) => {
      const label =
        virtual?.collections.find((item) => item.id === node.id) ??
        virtual?.tags.find((item) => "tag:" + item.id === node.id);
      return (
        <div key={node.id} role="none">
          <div
            role="treeitem"
            data-tree-id={node.id}
            aria-label={node.label}
            aria-selected={
              node.virtual
                ? virtual?.active === node.id
                : node.ref
                  ? node.provider
                    ? clouds?.active === node.ref
                    : explorerRoute(parseRef(node.ref)) === location.hash
                  : false
            }
            aria-level={node.level}
            aria-owns={
              node.expanded && node.children.length
                ? prefix + node.id
                : undefined
            }
            aria-expanded={
              !node.loaded || node.children.length > 0
                ? node.expanded
                : undefined
            }
            tabIndex={node.id === focus ? 0 : -1}
            className={styles.item}
            onDragOver={(event) => {
              if (
                node.parent === "collections" &&
                event.dataTransfer.types.includes(dragReference)
              ) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "link";
              }
            }}
            onDrop={(event) => {
              if (
                node.parent !== "collections" ||
                !event.dataTransfer.types.includes(dragReference)
              )
                return;
              event.preventDefault();
              const refs = event.dataTransfer.getData(dragReference);
              void import("../services/organizerValidation")
                .then(({ parseDraggedReferences }) =>
                  virtual?.add(node.id, parseDraggedReferences(refs)),
                )
                .catch(() => setError(t("organizerInvalid")));
            }}
            onFocus={() => setFocus(node.id)}
            onClick={() => {
              move(node.id);
              activate(node);
            }}
            onKeyDown={(e) => {
              const i = rows.findIndex((row) => row.id === node.id);
              if (
                [
                  "ArrowDown",
                  "ArrowUp",
                  "Home",
                  "End",
                  "ArrowRight",
                  "ArrowLeft",
                  "Enter",
                  " ",
                ].includes(e.key)
              ) {
                e.preventDefault();
                e.stopPropagation();
                if (e.key === "ArrowDown")
                  move(rows[Math.min(rows.length - 1, i + 1)].id);
                if (e.key === "ArrowUp") move(rows[Math.max(0, i - 1)].id);
                if (e.key === "Home") move(rows[0].id);
                if (e.key === "End") move(rows[rows.length - 1].id);
                if (e.key === "ArrowRight") {
                  if (!node.expanded) void toggle(node, true);
                  else if (node.children[0]) move(node.children[0].id);
                }
                if (e.key === "ArrowLeft") {
                  if (node.expanded) void toggle(node, false);
                  else {
                    const parent = rows
                      .slice(0, i)
                      .reverse()
                      .find((row) => row.level < node.level);
                    if (parent) move(parent.id);
                  }
                }
                if (e.key === "Enter" || e.key === " ") {
                  activate(node);
                }
              } else if (e.key === "*") {
                e.preventDefault();
                rows
                  .filter((row) => row.parent === node.parent)
                  .forEach((row) => {
                    void toggle(row, true);
                  });
              } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                const time = Date.now();
                typed.current = {
                  text:
                    (time - typed.current.time < 800
                      ? typed.current.text
                      : "") + e.key.toLowerCase(),
                  time,
                };
                const match = rows.find((row) =>
                  row.label.toLowerCase().startsWith(typed.current.text),
                );
                if (match) move(match.id);
              }
            }}
          >
            {label ? (
              <LabelMark color={label.color} />
            ) : (
              (!node.virtual || !node.parent) && (
                <Glyph name={node.expanded ? "collapse" : "expand"} />
              )
            )}
            {node.id === "github" || (node.level === 1 && node.provider) ? (
              <ProviderMark
                provider={node.provider ?? "github"}
                label={node.provider ? t(node.provider) : node.label}
              />
            ) : (
              node.label
            )}
          </div>
          {node.expanded && node.children.length > 0 && (
            <div id={prefix + node.id} role="group">
              {render(node.children)}
            </div>
          )}
        </div>
      );
    });
  }
  return (
    <nav aria-label={t("locations")}>
      <h2>{t("locations")}</h2>
      <LaterAction action="pending" />
      <section className={v2.navGroup}>
        <h3>{t("thisLibrary")}</h3>
      </section>
      <div
        ref={host}
        className={styles.tree}
        role="tree"
        aria-label={t("locations")}
      >
        {render(groups)}
      </div>
      {error && <p role="alert">{error}</p>}
      {virtual && (
        <>
          <Button onPress={virtual.create}>{t("collectionCreate")}</Button>
          <details className={v2.navGroup}>
            <summary>{t("collectionsActions")}</summary>
            <p>{t("collectionsPortability")}</p>
            <Button onPress={virtual.exportLabels}>
              {t("collectionsExport")}
            </Button>
            <Button
              isDisabled={!virtual.importLabels}
              onPress={virtual.importLabels}
            >
              {t("collectionsImport")}
            </Button>
          </details>
        </>
      )}
    </nav>
  );
}
