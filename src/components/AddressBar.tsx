import { useState } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import styles from "./Library.module.css";
export function AddressBar({
  value,
  onGo,
}: {
  value: string;
  onGo: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <form
      className={styles.toolbar}
      onSubmit={(e) => {
        e.preventDefault();
        onGo(draft);
      }}
    >
      <Button onPress={() => history.back()}>{t("back")}</Button>
      <Input
        label={t("address")}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
      <Button type="submit">{t("go")}</Button>
    </form>
  );
}
