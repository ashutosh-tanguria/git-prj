import { useEffect, useRef, useState } from "react";
import {
  conflictingPaths,
  type RemoteTree,
} from "../services/conflictingPaths";
import { request } from "../providers/github/client";
import { preference } from "../services/preferences";
import { staging } from "../services/workingStorage";
import { canQuickPush, destinationKey } from "../services/destinations";
import { evaluateFile, evaluateName, evaluateRepo } from "../services/guards";
import type { Change } from "../services/staging";
export function usePushChoice(
  rows: Change[],
  onOpen: () => void,
  conflict: boolean,
) {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const [quick, setQuick] = useState(false),
    [anchor, setAnchor] = useState<DOMRect>();
  useEffect(() => {
    setQuick(false);
  }, [rows]);
  useEffect(() => {
    let active = true;
    const open = () => {
      setQuick(false);
      void (async () => {
        const first = rows[0];
        if (!first || !navigator.onLine) {
          setQuick(false);
          onOpenRef.current();
          return;
        }
        const destination = {
          ...first.target,
          path: first.target.path.split("/").slice(0, -1).join("/"),
        };
        try {
          const repo = (await (
            await request(
              "/repos/" +
                encodeURIComponent(destination.owner) +
                "/" +
                encodeURIComponent(destination.repo),
            )
          ).json()) as { private: boolean; size: number };
          const last = await preference<typeof destination | undefined>(
              "lastDestination",
              undefined,
            ),
            pinned = await preference<typeof destination | undefined>(
              "pinnedDestination",
              undefined,
            ),
            used = await preference<string[]>("usedDestinations", []),
            sizes = await Promise.all(
              rows.map(async (c) =>
                c.blobKey ? (await staging.read(c)).size : 0,
              ),
            );
          const verdicts = [
            evaluateRepo(
              repo.size,
              sizes.reduce((a, b) => a + b, 0),
            ),
            ...rows.flatMap((c, i) => [
              evaluateFile(sizes[i]),
              evaluateName(c.target.path, repo.private ? "private" : "public"),
            ]),
          ];
          if (!active || staging.snapshot() !== rows) return;
          setAnchor(
            document
              .querySelector('[data-action="push"]')
              ?.getBoundingClientRect(),
          );
          const root =
            "/repos/" +
            encodeURIComponent(destination.owner) +
            "/" +
            encodeURIComponent(destination.repo);
          let remoteConflict = false;
          if (
            last &&
            repo.private &&
            used.includes(destinationKey(destination)) &&
            verdicts.every((v) => v.level === "ok")
          ) {
            const head = (await (
              await request(
                root +
                  "/git/ref/heads/" +
                  encodeURIComponent(destination.branch),
              )
            ).json()) as { object: { sha: string } };
            const commit = (await (
              await request(root + "/git/commits/" + head.object.sha)
            ).json()) as { tree: { sha: string } };
            const tree = (await (
              await request(
                root + "/git/trees/" + commit.tree.sha + "?recursive=1",
              )
            ).json()) as RemoteTree;
            remoteConflict = conflictingPaths(rows, tree).length > 0;
          }
          if (!active || staging.snapshot() !== rows) return;
          setQuick(
            !!last &&
              destinationKey(last) === destinationKey(destination) &&
              rows.every(
                (c) =>
                  destinationKey({
                    ...c.target,
                    path: c.target.path.split("/").slice(0, -1).join("/"),
                  }) === destinationKey(destination),
              ) &&
              canQuickPush({
                privateRepo: repo.private,
                used: used.includes(destinationKey(destination)),
                verdicts,
                conflict: conflict || remoteConflict,
                destination,
                pinned,
                lastUsed: last,
              }),
          );
          onOpenRef.current();
        } catch {
          if (active) {
            setQuick(false);
            onOpenRef.current();
          }
        }
      })();
    };
    window.addEventListener("working-review", open);
    return () => {
      active = false;
      window.removeEventListener("working-review", open);
    };
  }, [rows, conflict]);
  return { quick, setQuick, anchor };
}
