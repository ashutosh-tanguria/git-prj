import { metadata, clearMetadata } from "./metadata";
import type { GitRef } from "../lib/refs";
import { parseRef } from "../lib/refs";
import * as github from "../providers/github/client";
import type { MediaProgress } from "./mediaRead";
export { type Entry, type Repo } from "../providers/github/client";
export const library = {
  async imageSibling(ref: GitRef, direction: number) {
    const entries = (
      await github.list({
        ...ref,
        path: ref.path.split("/").slice(0, -1).join("/"),
      })
    )
      .filter(
        (item) =>
          item.kind === "file" &&
          /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(item.name),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const index = entries.findIndex((item) => item.path === ref.path);
    const entry =
      entries[(index + direction + entries.length) % entries.length];
    return entry ? parseRef(entry.ref) : undefined;
  },
  connect: github.connect,
  disconnect: () => {
    github.clearToken();
    clearMetadata();
  },
  metadata,
  roots: github.repos,
  list: github.list,
  read: (
    ref: GitRef,
    signal?: AbortSignal,
    progress?: (value: MediaProgress) => void,
  ) =>
    /\.(mp4|webm|mp3|wav|ogg|m4a)$/i.test(ref.path)
      ? import("./mediaRead").then((module) =>
          module.readMedia(ref, signal, progress),
        )
      : github.read(ref, signal),
};
