import type { Repo, Entry } from "../services/library";
import { useState } from "react";
import { Button } from "../ui/Button";
import { evaluateRepo } from "../services/guards";
import { MiB } from "../lib/limits";
import { t } from "../i18n";
import styles from "./Guards.module.css";
export function RepoMeter({ repo, added = 0 }: { repo: Repo; added?: number }) {
  const verdict = evaluateRepo(repo.size ?? null, added);
  return (
    <div className={styles.repo} data-level={verdict.level}>
      <strong>{repo.full_name}</strong>
      <p>{t(verdict.code)}</p>
      {repo.size !== undefined && (
        <>
          <meter
            aria-label={t("repoSize")}
            min={0}
            max={5120}
            value={repo.size / 1024 + added / MiB}
          />
          <div className={styles.segments} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.ticks}>
            <span>500 MB</span>
            <span>1 GB</span>
            <span>5 GB</span>
          </div>
          <p>
            {new Intl.NumberFormat(undefined, {
              maximumFractionDigits: 1,
            }).format(repo.size / 1024 + added / MiB)}{" "}
            MB
          </p>
        </>
      )}
      <p>{t("historySize")}</p>
    </div>
  );
}
export function SizeLedger({
  repo,
  entries,
  onMove,
}: {
  repo: Repo;
  entries: Entry[];
  onMove?(entries: Entry[]): void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const files = entries
    .filter((e) => e.kind === "file")
    .sort((a, b) => b.size - a.size)
    .slice(0, 20);
  return (
    <section className={styles.ledger}>
      <RepoMeter repo={repo} />
      <h3>{t("largestFiles")}</h3>
      <p>{t("ledgerScope")}</p>
      <div className={styles.axis}>
        <span>50 MB</span>
        <strong>100 MB</strong>
      </div>
      {files.map((file) => (
        <div key={file.ref} className={styles.ledgerRow}>
          <label>
            <input type="checkbox" disabled={!onMove} checked={selected.includes(file.ref)}
              onChange={(event) => {
                const checked = event.target.checked;
                setSelected((old) => checked ? [...old, file.ref] : old.filter((ref) => ref !== file.ref));
              }} />
            {file.name}
          </label>
          <div className={styles.bar}>
            <span
              style={{ width: Math.min(100, file.size / MiB) + "%" }}
              data-tier={
                file.size >= 95 * MiB
                  ? "block"
                  : file.size >= 50 * MiB
                    ? "warn"
                    : "ok"
              }
            />
          </div>
          <span>
            {new Intl.NumberFormat(undefined, {
              maximumFractionDigits: 1,
            }).format(file.size / MiB)}{" "}
            MB
          </span>
        </div>
      ))}
      {onMove ? <Button isDisabled={!selected.length}
        onPress={() => onMove(files.filter((file) => selected.includes(file.ref)))}>
        {t("moveSelected")}
      </Button> : <p>{t("ledgerReadOnly")}</p>}
    </section>
  );
}
