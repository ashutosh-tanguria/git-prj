import { QuickLook } from "./QuickLook";
import { ReadViewer } from "../viewers/LazyReadViewer";
import { t } from "../i18n";
import { MediaStatus } from "./MediaStatus";
import type { useLibrary } from "../screens/useLibrary";
export function LibraryPreview({
  state,
}: {
  state: ReturnType<typeof useLibrary>;
}) {
  const {
    preview,
    previewOrder,
    previewRequest,
    quick,
    setPreview,
    setBlob,
    open,
    previewError,
    blob,
  } = state;
  return (
    <>
      {preview && (
        <QuickLook
          title={preview.name}
          onPrevious={() => {
            const i = previewOrder.findIndex(
              (item) => item.ref === preview.ref,
            );
            const next =
              previewOrder[(i - 1 + previewOrder.length) % previewOrder.length];
            if (next) void quick(next);
          }}
          onNext={() => {
            const i = previewOrder.findIndex(
              (item) => item.ref === preview.ref,
            );
            const next = previewOrder[(i + 1) % previewOrder.length];
            if (next) void quick(next);
          }}
          onOpen={() => {
            previewRequest.current?.abort();
            setPreview(undefined);
            setBlob(undefined);
            open(preview);
          }}
          onClose={() => {
            previewRequest.current?.abort();
            setPreview(undefined);
            setBlob(undefined);
          }}
        >
          <MediaStatus
            value={state.mediaProgress}
            onCancel={state.cancelMedia}
          />
          {previewError ? (
            <p role="alert">{previewError}</p>
          ) : blob ? (
            <ReadViewer blob={blob} name={preview.name} fileKey={preview.ref} />
          ) : (
            <p role="status">{t("loadingRead")}</p>
          )}
        </QuickLook>
      )}
    </>
  );
}
