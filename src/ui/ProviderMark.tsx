import styles from "./Primitives.module.css";
export const providers = [
  "github",
  "gdrive",
  "dropbox",
  "onedrive",
  "local",
] as const;
export type Provider = (typeof providers)[number];
export function ProviderMark({
  provider,
  label,
}: {
  provider: Provider;
  label: string;
}) {
  return (
    <span className={styles.provider}>
      <svg
        className={styles.icon}
        data-provider={provider}
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        {provider === "github" ? (
          <rect x="3" y="3" width="10" height="10" />
        ) : provider === "gdrive" ? (
          <path d="M8 2 14 14H2Z" />
        ) : provider === "dropbox" ? (
          <path d="m8 1 7 7-7 7-7-7Z" />
        ) : provider === "onedrive" ? (
          <circle cx="8" cy="8" r="6" />
        ) : (
          <path
            fill="none"
            stroke="currentColor"
            d="m8 1 6 3.5v7L8 15l-6-3.5v-7Z"
          />
        )}
      </svg>
      {label}
    </span>
  );
}
