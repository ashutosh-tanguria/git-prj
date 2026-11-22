import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { t } from "../i18n";
import {
  cacheCap,
  cacheUsage,
  changeCacheCap,
  clearCache,
  MEGABYTE,
} from "../services/fileCache";
import { wipeLocalData } from "../services/wipeLocalData";
import "../i18n/storage";

export function StorageSettings({
  startWipe = false,
  specimen = false,
  beforeWipe,
}: {
  startWipe?: boolean;
  specimen?: boolean;
  beforeWipe?: () => Promise<void>;
}) {
  const [usage, setUsage] = useState(0);
  const [cap, setCap] = useState("500");
  const [confirming, setConfirming] = useState(startWipe);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (specimen) return;
    let active = true;
    const update = () => {
      void cacheUsage().then(
        (bytes) => {
          if (active) setUsage(bytes);
        },
        () => {},
      );
    };
    update();
    void cacheCap().then(
      (bytes) => {
        if (active) setCap(String(bytes / MEGABYTE));
      },
      () => {},
    );
    window.addEventListener("shelf-cache-changed", update);
    return () => {
      active = false;
      window.removeEventListener("shelf-cache-changed", update);
    };
  }, [specimen]);
  async function run(operation: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (error) {
      setError(
        t(
          error instanceof Error &&
            ["storageCap", "storageBlocked"].includes(error.message)
            ? error.message
            : "storageFailed",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label={t("storage")}>
      <h3>{t("storage")}</h3>
      <p>
        {t("storageUsage", {
          size: new Intl.NumberFormat(document.documentElement.lang, {
            maximumFractionDigits: 2,
          }).format(usage / MEGABYTE),
        })}
      </p>
      <label>
        {t("storageCapLabel")}
        <input
          type="number"
          min="1"
          step="1"
          value={cap}
          onChange={(event) => setCap(event.target.value)}
        />
      </label>
      <Button
        isDisabled={busy || specimen}
        onPress={() => void run(() => changeCacheCap(Number(cap) * MEGABYTE))}
      >
        {t("storageSave")}
      </Button>
      <Button
        isDisabled={busy || specimen}
        onPress={() => void run(clearCache)}
      >
        {t("storageClear")}
      </Button>
      <Button isDisabled={busy || specimen} onPress={() => setConfirming(true)}>
        {t("storageWipe")}
      </Button>
      {confirming && (
        <div>
          <p role="alert">{t("storageConfirm")}</p>
          <Button isDisabled={busy} onPress={() => setConfirming(false)}>
            {t("cancel")}
          </Button>
          <Button
            variant="primary"
            isDisabled={busy}
            onPress={() =>
              void run(async () => {
                await beforeWipe?.();
                await wipeLocalData();
                history.replaceState(
                  null,
                  "",
                  location.pathname + location.search,
                );
                location.reload();
              })
            }
          >
            {t("storageWipeConfirm")}
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
