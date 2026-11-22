import { useEffect, useRef } from "react";
import {
  defaultShortcuts,
  editableTarget,
  shortcutMatches,
  paletteShortcuts,
} from "../services/shortcuts";
export function useCommandRegistry(
  bindings: typeof defaultShortcuts,
  dispatch: (action: string) => Promise<void>,
) {
  const handler = useRef(dispatch);
  handler.current = dispatch;
  useEffect(() => {
    const command = (event: Event) => {
      void handler.current(
        (event as CustomEvent<{ action: string }>).detail.action,
      );
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !(event.target instanceof HTMLElement) ||
        event.target.closest('[role="dialog"]')
      )
        return;
      for (const [action, binding] of Object.entries({
        ...paletteShortcuts,
        ...bindings,
      })) {
        if (!shortcutMatches(event, binding)) continue;
        if (
          editableTarget(event.target) &&
          !["commandPalette", "goLocation"].includes(action)
        )
          return;
        if (
          action === "folderSearch" &&
          !event.target.closest('[role="grid"], [data-file-command-scope]')
        )
          return;
        if (
          ["cut", "copy", "paste", "uploadFiles", "rename", "delete"].includes(
            action,
          ) &&
          !(event.target as HTMLElement).closest(
            '[role="grid"], [data-file-command-scope]',
          )
        )
          return;
        event.preventDefault();
        if (event.repeat) return;
        void handler.current(action);
        break;
      }
    };
    window.addEventListener("shelf-command", command);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("shelf-command", command);
      window.removeEventListener("keydown", key);
    };
  }, [bindings]);
}
