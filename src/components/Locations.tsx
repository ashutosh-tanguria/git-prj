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
export function Locations({ repos }: { repos: Repo[] }) {
  return (
    <LocationTree
      key={repos.map((repo) => repo.full_name).join("|")}
      repos={repos}
    />
  );
}
function LocationTree({ repos }: { repos: Repo[] }) {
  const prefix = useId();
  const [nodes, setNodes] = useState(() => initial(repos)),
    [focus, setFocus] = useState("github"),
    [error, setError] = useState("");
  const host = useRef<HTMLDivElement>(null),
    typed = useRef({ text: "", time: 0 });
  const rows = visible(nodes);
  function move(id: string) {
    setFocus(id);
    requestAnimationFrame(() =>
      host.current
        ?.querySelector<HTMLElement>('[data-tree-id="' + CSS.escape(id) + '"]')
        ?.focus(),
    );
  }
  async function toggle(node: Node, expand = !node.expanded) {
    if (!node.loaded && node.ref && expand) {
      try {
        const entries = await library.list(parseRef(node.ref));
        node.children = entries
          .filter((entry) => entry.kind === "dir")
          .map((entry) => ({
            id: entry.ref,
            parent: node.id,
            label: entry.name,
            ref: entry.ref,
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
    return list.map((node) => (
      <div key={node.id} role="none">
        <div
          role="treeitem"
          data-tree-id={node.id}
          aria-label={node.label}
          aria-selected={
            node.ref
              ? explorerRoute(parseRef(node.ref)) === location.hash
              : false
          }
          aria-level={node.level}
          aria-owns={
            node.expanded && node.children.length ? prefix + node.id : undefined
          }
          aria-expanded={
            !node.loaded || node.children.length > 0 ? node.expanded : undefined
          }
          tabIndex={node.id === focus ? 0 : -1}
          className={styles.item}
          onFocus={() => setFocus(node.id)}
          onClick={() => {
            move(node.id);
            if (node.ref) location.hash = explorerRoute(parseRef(node.ref));
            else void toggle(node);
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
                if (node.ref) location.hash = explorerRoute(parseRef(node.ref));
                else void toggle(node);
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
                  (time - typed.current.time < 800 ? typed.current.text : "") +
                  e.key.toLowerCase(),
                time,
              };
              const match = rows.find((row) =>
                row.label.toLowerCase().startsWith(typed.current.text),
              );
              if (match) move(match.id);
            }
          }}
        >
          <Glyph name={node.expanded ? "collapse" : "expand"} />
          {node.id === "github" ? (
            <ProviderMark provider="github" label={node.label} />
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
    ));
  }
  return (
    <nav aria-label={t("locations")}>
      <h2>{t("locations")}</h2>
      <section className={v2.navGroup}>
        <h3>{t("quickAccess")}</h3>
        <LaterAction action="recent" milestone="M5" />
        <LaterAction action="favorites" milestone="M5" />
        <LaterAction action="pending" />
      </section>
      <section className={v2.navGroup}>
        <h3>{t("thisLibrary")}</h3>
      </section>
      <div
        ref={host}
        className={styles.tree}
        role="tree"
        aria-label={t("locations")}
      >
        {render(nodes)}
      </div>
      {error && <p role="alert">{error}</p>}
      <section className={v2.navGroup}>
        <h3>{t("collections")}</h3>
        <LaterAction action="collections" milestone="M5" />
      </section>
    </nav>
  );
}
