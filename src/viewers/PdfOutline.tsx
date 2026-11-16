import type { PDFDocumentProxy } from "pdfjs-dist";
import { Button } from "../ui/Button";
type Outline = Awaited<ReturnType<PDFDocumentProxy["getOutline"]>>;
export function PdfOutline({
  items,
  doc,
  onGo,
}: {
  items: Outline;
  doc: PDFDocumentProxy;
  onGo: (page: number) => void;
}) {
  return (
    <ul>
      {items.map((item, i) => (
        <li key={i}>
          <Button
            variant="quiet"
            onPress={() => {
              void (async () => {
                const dest =
                  typeof item.dest === "string"
                    ? await doc.getDestination(item.dest)
                    : item.dest;
                if (Array.isArray(dest)) {
                  const index =
                    typeof dest[0] === "number"
                      ? dest[0]
                      : await doc.getPageIndex(dest[0]);
                  onGo(index + 1);
                }
              })();
            }}
          >
            {item.title}
          </Button>
          {item.items.length > 0 && (
            <PdfOutline items={item.items} doc={doc} onGo={onGo} />
          )}
        </li>
      ))}
    </ul>
  );
}
