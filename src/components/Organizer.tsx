import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { LabelMark } from "./LabelMark";
import { t } from "../i18n";
import {
  emptyOrganizer,
  itemKey,
  organizerChange,
  readOrganizer,
  refersToAccount,
  toggleFavorites,
  uniqueItems,
  updateOrganizer,
  isLibraryItem,
  type LibraryItem,
  type Organizer,
} from "../services/organizer";
import styles from "./Organizer.module.css";

export type LabelEditor = {
  kind: "collections" | "tags";
  items: LibraryItem[];
};
export function useOrganizer(account: string, roots: string[]) {
  const [value, setValue] = useState(emptyOrganizer);
  const [editor, setEditor] = useState<LabelEditor>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let revision = 0;
    function refresh() {
      const request = ++revision;
      void readOrganizer().then(
        (value) => {
          if (active && request === revision) setValue(value);
        },
        () => {
          if (active) setError("organizerStorage");
        },
      );
    }
    refresh();
    window.addEventListener(organizerChange, refresh);
    return () => {
      active = false;
      window.removeEventListener(organizerChange, refresh);
    };
  }, []);
  const accessible = (items: LibraryItem[]) =>
    items.filter((item) => refersToAccount(item, account, roots));
  function change(update: (value: Organizer) => Organizer) {
    setError("");
    void updateOrganizer(update).catch(() => setError("organizerStorage"));
  }
  function apply(
    kind: LabelEditor["kind"],
    id: string,
    items: LibraryItem[],
    toggle = false,
  ) {
    const clean = Array.isArray(items)
      ? accessible(items.filter(isLibraryItem))
      : [];
    if (!clean.length) return;
    const ids = new Set(clean.map(itemKey));
    change((old) => ({
      ...old,
      [kind]: old[kind].map((label) =>
        label.id === id
          ? {
              ...label,
              items:
                toggle &&
                clean.every((item) =>
                  label.items.some((row) => itemKey(row) === itemKey(item)),
                )
                  ? label.items.filter((item) => !ids.has(itemKey(item)))
                  : uniqueItems([...label.items, ...clean]),
            }
          : label,
      ),
    }));
  }
  const starred = new Set(value.favorites.map(itemKey));
  const favoriteLabel = (items: LibraryItem[]) =>
    items.every((item) => starred.has(itemKey(item)))
      ? "favoriteRemove"
      : "favoriteAdd";
  const favorite = (items: LibraryItem[]) => {
    if (items.length) change((old) => toggleFavorites(old, items));
  };
  return {
    value,
    accessible,
    apply,
    editor,
    setEditor,
    error,
    setError,
    change,
    favorite,
    favoriteLabel,
    starred,
  };
}
export type OrganizerControls = ReturnType<typeof useOrganizer>;

export function FavoriteButton({
  organizer,
  items,
}: {
  organizer: OrganizerControls;
  items: LibraryItem[];
}) {
  if (!items.length) return null;
  const label = organizer.favoriteLabel(items);
  return (
    <Button
      aria-label={t(label)}
      aria-pressed={label === "favoriteRemove"}
      onPress={() => organizer.favorite(items)}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
        <path
          d="m8 1 2 4.5 5 .5-3.7 3.5 1 5-4.3-2.6-4.3 2.6 1-5L1 6l5-.5Z"
          stroke="currentColor"
          fill={label === "favoriteRemove" ? "currentColor" : "none"}
        />
      </svg>
    </Button>
  );
}
export function renderItemTags(
  items: LibraryItem[],
  organizer: OrganizerControls,
) {
  const tags = organizer.value.tags.filter((label) =>
    items.some((item) =>
      label.items.some((tagged) => itemKey(tagged) === itemKey(item)),
    ),
  );
  return (
    tags.length > 0 && (
      <ul className={styles.tags} aria-label={t("tags")}>
        {tags.map((tag) => (
          <li key={tag.id}>
            <LabelMark color={tag.color} />
            {tag.name}
          </li>
        ))}
      </ul>
    )
  );
}
