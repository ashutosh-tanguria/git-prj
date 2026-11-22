import type { CloudId } from "../providers/types";
import { Button } from "../ui/Button";
import { ProviderMark } from "../ui/ProviderMark";
import { t } from "../i18n";
import styles from "./Library.module.css";

export function CloudProviderRows({
  ids,
  connected,
  busy,
  onToggle,
  settings = false,
}: {
  ids: readonly CloudId[];
  connected: ReadonlySet<CloudId>;
  busy?: boolean;
  onToggle(id: CloudId): void;
  settings?: boolean;
}) {
  return ids.map((id) => (
    <div className={styles.providerRow} key={id}>
      <ProviderMark provider={id} label={t(id)} />
      <span>
        {t(
          settings
            ? connected.has(id)
              ? "cloudConnected"
              : "cloudDisconnected"
            : id + "ConnectDetail",
        )}
      </span>
      <Button
        variant={settings ? "quiet" : "primary"}
        isDisabled={busy}
        aria-label={
          t(connected.has(id) ? "disconnect" : "connectAction") + " " + t(id)
        }
        onPress={() => onToggle(id)}
      >
        {t(connected.has(id) ? "disconnect" : "connectAction")}
      </Button>
    </div>
  ));
}

export function CloudQuota({
  quota,
}: {
  quota: { used: number; total: number } | null;
}) {
  if (!quota || !Number.isFinite(quota.total) || quota.total <= 0)
    return <span>{t("cloudUnknownQuota")}</span>;
  const remaining = Math.max(0, quota.total - quota.used);
  const size = new Intl.NumberFormat(document.documentElement.lang, {
    maximumFractionDigits: 1,
  }).format(remaining / 1048576);
  return (
    <>
      <span>{t("cloudQuota", { size })}</span>
      {remaining / quota.total < 0.05 && (
        <strong role="status">{t("cloudQuotaWarning")}</strong>
      )}
    </>
  );
}
