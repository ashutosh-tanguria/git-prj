import { useEffect, useRef } from "react";
import {
  defaultShortcuts,
  editableTarget,
  shortcutMatches,
  type ShortcutAction,
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
        editableTarget(event.target) ||
        (event.target as HTMLElement).closest('[role="dialog"]')
      )
        return;
      for (const action of Object.keys(bindings) as ShortcutAction[]) {
        if (!shortcutMatches(event, bindings[action])) continue;
        if (
          ["cut", "copy", "paste", "uploadFiles", "rename", "delete"].includes(
            action,
          ) &&
          !(event.target as HTMLElement).closest('[role="grid"]')
        )
          return;
        event.preventDefault();
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
