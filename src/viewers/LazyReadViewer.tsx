import { lazy, Suspense, type ComponentProps } from "react";
import { t } from "../i18n";

const Viewer = lazy(() =>
  import("./ReadViewer").then(({ ReadViewer }) => ({ default: ReadViewer })),
);

export function ReadViewer(props: ComponentProps<typeof Viewer>) {
  return (
    <Suspense fallback={<p role="status">{t("loadingRead")}</p>}>
      <Viewer {...props} />
    </Suspense>
  );
}
