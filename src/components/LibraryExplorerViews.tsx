import { useMemo } from "react";
import ExplorerViews from "./ExplorerViews";
import { useTransferAccess, type TransferAccess } from "./useTransferAccess";
import { listGitHub } from "../services/githubCache";
import { githubTransferSource } from "../services/transferRequests";
import { parseRef } from "../lib/refs";
import type { LibraryItem } from "../services/organizer";
import type { Entry } from "../services/library";
import type { FileView } from "./ViewMenu";

interface Props extends TransferAccess {
  view: Exclude<FileView, "viewList">;
  rows: Entry[];
  locationKey: string;
  onSelect(rows: Entry[]): void;
  onOpen(entry: Entry): void;
  onPreview(entry: Entry): void;
  mixed?: {
    items: LibraryItem[];
    open(item: LibraryItem): void;
    select(items: LibraryItem[]): void;
  };
}
export default function LibraryExplorerViews(props: Props) {
  const { resolve } = useTransferAccess(props);
  const cloud =
    props.cloud?.active && !props.mixed ? props.cloud.explorer : undefined;
  const githubRows = useMemo(
    () =>
      props.rows
        .filter((entry) => entry.kind !== "special")
        .map((entry) => githubTransferSource(props.account, entry)),
    [props.rows, props.account],
  );
  const cloudRows = useMemo(
    () =>
      cloud?.rows
        .filter((entry) => entry.kind !== "special")
        .map((entry) => ({
          entry,
          endpoint: { ...cloud.endpoint, ref: entry.ref },
        })),
    [cloud?.rows, cloud?.endpoint.ref],
  );
  const githubEntry = (item: LibraryItem): Entry => ({
    ...item.entry,
    path: parseRef(item.entry.ref).path,
    size: item.entry.size ?? 0,
    sha: item.entry.version ?? "",
  });
  async function list(
    folder: LibraryItem,
    signal: AbortSignal,
  ): Promise<LibraryItem[]> {
    if (folder.endpoint.provider === "github") {
      const rows = await listGitHub(props.account, parseRef(folder.entry.ref), {
        signal,
      });
      return rows
        .filter((entry) => entry.kind !== "special")
        .map((entry) => githubTransferSource(props.account, entry));
    }
    const rows =
      cloud && cloud.endpoint.locationId === folder.endpoint.locationId
        ? await cloud.list(folder.entry.ref, signal)
        : ((await props.cloud?.locations.list(folder.entry.ref)) ?? []);
    signal.throwIfAborted();
    return rows
      .filter((entry) => entry.kind !== "special")
      .map((entry) => ({
        entry,
        endpoint: { ...folder.endpoint, ref: entry.ref },
      }));
  }
  const open =
    props.mixed?.open ??
    cloud?.open ??
    ((item: LibraryItem) => props.onOpen(githubEntry(item)));
  return (
    <ExplorerViews
      view={props.view}
      data={{
        resolve,
        list,
        rows: props.mixed?.items ?? cloudRows ?? githubRows,
        location: cloud?.endpoint.ref ?? props.locationKey,
        title: cloud
          ? props.cloud?.locations.path?.(cloud.endpoint.ref)
          : props.current?.path.split("/").at(-1) || undefined,
        mixed: !!props.mixed,
        onSelect:
          props.mixed?.select ??
          cloud?.select ??
          ((items) => props.onSelect(items.map(githubEntry))),
        onOpen: open,
        onPreview:
          props.mixed || cloud
            ? open
            : (item) => props.onPreview(githubEntry(item)),
      }}
    />
  );
}
