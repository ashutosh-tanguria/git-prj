import type { ReactNode } from "react";
import { LabelMark } from "./LabelMark";
import { t } from "../i18n";
import { itemKey, type LibraryItem } from "../services/organizer";
import type { OrganizerControls } from "./Organizer";
export function ItemActions({
  organizer,
  items,
  onClose,
}: {
  organizer: OrganizerControls;
  items: LibraryItem[];
  onClose(): void;
}) {
  const action = (label: ReactNode, execute: () => void, key?: string) => (
    <button
      type="button"
      role="menuitem"
      key={key}
      onClick={() => {
        onClose();
        execute();
      }}
    >
      {label}
    </button>
  );
  if (!items.length) return null;
  return (
    <>
      {action(t(organizer.favoriteLabel(items)), () =>
        organizer.favorite(items),
      )}
      {organizer.value.collections.map((label) =>
        action(
          <>
            <LabelMark color={label.color} />
            {t("collectionAdd")} {label.name}
          </>,
          () => organizer.apply("collections", label.id, items),
          label.id,
        ),
      )}
      {action(t("collectionCreate"), () =>
        organizer.setEditor({ kind: "collections", items }),
      )}
      {organizer.value.tags.map((label) =>
        action(
          <>
            <LabelMark color={label.color} />
            {t(
              items.every((item) =>
                label.items.some((row) => itemKey(row) === itemKey(item)),
              )
                ? "tagRemove"
                : "tagAdd",
            )}{" "}
            {label.name}
          </>,
          () => organizer.apply("tags", label.id, items, true),
          label.id,
        ),
      )}
      {action(t("tagCreate"), () =>
        organizer.setEditor({ kind: "tags", items }),
      )}
    </>
  );
}
