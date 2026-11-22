import { useEffect, useState } from "react";
import "../i18n/platform";
import { t } from "../i18n";
import { Button } from "../ui/Button";
import { whenDeliveryIdle } from "../services/updateGate";

export default function PwaUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [problem, setProblem] = useState("");
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void navigator.serviceWorker
      .register("/offline-app.js")
      .then((registration) => {
        if (disposed) return;
        const inspect = () => {
          if (navigator.serviceWorker.controller)
            setWaiting(registration.waiting ?? undefined);
        };
        const found = () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", inspect);
        };
        registration.addEventListener("updatefound", found);
        navigator.serviceWorker.addEventListener("controllerchange", inspect);
        cleanup = () => {
          registration.removeEventListener("updatefound", found);
          navigator.serviceWorker.removeEventListener(
            "controllerchange",
            inspect,
          );
        };
        found();
        inspect();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
  if (!waiting) return null;

  async function reload(worker: ServiceWorker) {
    setUpdating(true);
    setProblem("");
    try {
      const started = await whenDeliveryIdle(async () => {
        await new Promise<void>((resolve, reject) => {
          const finish = () => {
            clearTimeout(timer);
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              finish,
            );
            location.reload();
            resolve();
          };
          const timer = setTimeout(() => {
            navigator.serviceWorker.removeEventListener(
              "controllerchange",
              finish,
            );
            reject(Error("update"));
          }, 15000);
          navigator.serviceWorker.addEventListener("controllerchange", finish);
          worker.postMessage({ type: "SKIP_WAITING" });
        });
      });
      if (!started) setProblem("pwaWaitDelivery");
    } catch {
      setProblem("pwaUpdateFailed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <aside>
      <p role="status">{t("pwaUpdateReady")}</p>
      <Button isDisabled={updating} onPress={() => void reload(waiting)}>
        {t("pwaReload")}
      </Button>
      {problem && <p role="status">{t(problem)}</p>}
    </aside>
  );
}
