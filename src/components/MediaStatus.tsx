import { t } from "../i18n";
import type { MediaProgress } from "../services/mediaRead";
import { Button } from "../ui/Button";
export function MediaStatus({
  value,
  onCancel,
}: {
  value?: MediaProgress;
  onCancel?: () => void;
}) {
  if (!value) return null;
  return (
    <div role="status">
      <p>
        {t(
          value.cacheUnavailable
            ? "mediaNotCached"
            : value.cached
              ? "mediaCached"
              : "mediaDownloading",
        )}{" "}
        {Math.round((value.loaded / 1048576) * 10) / 10} /{" "}
        {Math.round((value.total / 1048576) * 10) / 10} MB
      </p>
      {value.loaded < value.total && (
        <progress
          aria-label={t("mediaDownloading")}
          value={value.loaded}
          max={value.total}
        />
      )}
      {value.loaded < value.total && onCancel && (
        <Button onPress={onCancel}>{t("mediaCancel")}</Button>
      )}
    </div>
  );
}
