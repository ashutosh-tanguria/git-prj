import styles from "./Primitives.module.css";
export function FileGlyph({
  extension,
  folder = false,
}: {
  extension?: string;
  folder?: boolean;
}) {
  return (
    <span className={styles.file}>
      <svg
        viewBox="0 0 32 36"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
      >
        {folder ? (
          <path d="M3 8h10l3 4h13v19H3Z" />
        ) : (
          <>
            <path d="M5 2h15l7 7v25H5Z" />
            <path d="M20 2v8h7" />
          </>
        )}
      </svg>
      {!folder && <span>{extension || "?"}</span>}
    </span>
  );
}
