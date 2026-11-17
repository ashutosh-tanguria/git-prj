import "../i18n/working";
import { GuardReview } from "./GuardReview";
import type { Repo } from "../services/library";
import { Button } from "../ui/Button";
import { useState } from "react";
import { request, read } from "../providers/github/client";
import { parseRef } from "../lib/refs";
import type { Entry } from "../services/library";
import { staging } from "../services/workingStorage";
import { evaluateFile } from "../services/guards";
import { t } from "../i18n";
interface Version {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
}
export function FileHistory({ entry }: { entry: Entry }) {
  const [items, setItems] = useState<Version[]>([]),
    [error, setError] = useState(false);
  const [candidate, setCandidate] = useState<{ blob: Blob; repo: Repo }>();
  const target = parseRef(entry.ref);
  const load = async () => {
    try {
      const res = await request(
        "/repos/" +
          encodeURIComponent(target.owner) +
          "/" +
          encodeURIComponent(target.repo) +
          "/commits?path=" +
          encodeURIComponent(target.path) +
          "&sha=" +
          encodeURIComponent(target.branch),
      );
      setItems((await res.json()) as Version[]);
    } catch {
      setError(true);
    }
  };
  const restore = async (sha: string) => {
    try {
      const blob = await read({ ...target, branch: sha });
      const repo = (await (
        await request(
          "/repos/" +
            encodeURIComponent(target.owner) +
            "/" +
            encodeURIComponent(target.repo),
        )
      ).json()) as Repo;
      setCandidate({ blob, repo });
    } catch {
      setError(true);
    }
  };
  return (
    <section>
      <Button onPress={() => void load()}>{t("workingHistory")}</Button>
      <Button
        variant="danger"
        onPress={() => {
          void staging
            .stage([
              {
                id: crypto.randomUUID(),
                target,
                kind: "delete",
                baseVersion: entry.sha,
                size: entry.size,
                createdAt: Date.now(),
                verdict: evaluateFile(0),
              },
            ])
            .catch(() => setError(true));
        }}
      >
        {t("workingDelete")}
      </Button>
      {items.map((item) => (
        <article key={item.sha}>
          <p>
            {item.commit.message} {item.commit.author.name}{" "}
            {item.commit.author.date}
          </p>
          <Button onPress={() => void restore(item.sha)}>
            {t("workingRestoreVersion")}
          </Button>
        </article>
      ))}
      {candidate && (
        <>
          <GuardReview
            files={[{ name: entry.name, size: candidate.blob.size }]}
            repo={candidate.repo}
            onStage={async () => {
              const blob = candidate.blob;
              await staging.stage([
                {
                  id: crypto.randomUUID(),
                  target,
                  kind: "modify",
                  baseVersion: entry.sha,
                  size: blob.size,
                  blob,
                  createdAt: Date.now(),
                  verdict: evaluateFile(blob.size),
                },
              ]);
              setCandidate(undefined);
            }}
          />
          <Button onPress={() => setCandidate(undefined)}>
            {t("workingCancel")}
          </Button>
        </>
      )}
      {error && <p role="alert">{t("workingError")}</p>}
    </section>
  );
}
