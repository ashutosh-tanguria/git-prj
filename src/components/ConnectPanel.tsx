import styles from "./Library.module.css";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { t } from "../i18n";
export function ConnectPanel({
  token,
  onToken,
  onConnect,
  loading,
}: {
  token: string;
  onToken: (token: string) => void;
  onConnect: () => void;
  loading: boolean;
}) {
  return (
    <section className={styles.connect}>
      <h2>{t("connectTitle")}</h2>
      <p>{t("patHelp")}</p>
      <Input
        label={t("token")}
        type="password"
        value={token}
        onChange={(e) => onToken(e.target.value)}
        autoComplete="off"
      />
      <Button
        variant="primary"
        onPress={onConnect}
        isDisabled={!token || loading}
      >
        {t("validate")}
      </Button>
    </section>
  );
}
