export const defaultShortcuts = {
  newRepository: "Alt+n",
  newFolder: "Alt+m",
  push: "Alt+p",
  uploadFiles: "u",
  cut: "Control+x",
  copy: "Control+c",
  paste: "Control+v",
};
export type ShortcutAction = keyof typeof defaultShortcuts;
export function shortcutMatches(event: KeyboardEvent, binding: string) {
  const parts = binding.toLowerCase().split("+"),
    key = parts.pop();
  return (
    event.key.toLowerCase() === key &&
    event.altKey === parts.includes("alt") &&
    (event.ctrlKey || event.metaKey) === parts.includes("control") &&
    !event.shiftKey
  );
}
export function editableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest('input,textarea,select,[contenteditable="true"]')
  );
}
