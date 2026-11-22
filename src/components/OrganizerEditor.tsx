import { useState } from "react";
import { Modal, Dialog, Heading } from "react-aria-components";
import { Button } from "../ui/Button";
import { LabelMark } from "./LabelMark";
import { t } from "../i18n";
import { labelColors, uniqueItems, type LabelColor } from "../services/organizer";
import type { LabelEditor, OrganizerControls } from "./Organizer";
import styles from "./Organizer.module.css";
import libraryStyles from "./Library.module.css";
export function OrganizerEditor({
  organizer,
  editor,
}: {
  organizer: OrganizerControls;
  editor: LabelEditor;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>(labelColors[0]);
  const title = t(
    editor.kind === "collections" ? "collectionCreate" : "tagCreate",
  );
  const close = () => organizer.setEditor(undefined);
  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open) close();
      }}
      className={libraryStyles.formPanel + " " + libraryStyles.workingPanel}
    >
      <Dialog>
        <Heading slot="title">{title}</Heading>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            const label = {
              id: crypto.randomUUID(),
              name: name.trim(),
              color,
              items: uniqueItems(editor.items),
            };
            organizer.change((old) => ({
              ...old,
              [editor.kind]: [...old[editor.kind], label],
            }));
            close();
          }}
        >
          <label>
            {t("name")}{" "}
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            {t("labelColor")}{" "}
            <select
              value={color}
              onChange={(event) => setColor(event.target.value as LabelColor)}
            >
              {labelColors.map((color) => (
                <option key={color} value={color}>
                  {t("label_" + color)}
                </option>
              ))}
            </select>
          </label>
          <LabelMark color={color} />
          <div className={styles.actions}>
            <Button type="submit" variant="primary">
              {t("save")}
            </Button>
            <Button onPress={close}>{t("cancel")}</Button>
          </div>
        </form>
      </Dialog>
    </Modal>
  );
}
