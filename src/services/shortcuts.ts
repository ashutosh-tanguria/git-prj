export const defaultShortcuts = {
  newRepository: "Alt+n",
  newFolder: "Alt+m",
  push: "Alt+p",
  uploadFiles: "u",
  cut: "Control+x",
  copy: "Control+c",
  paste: "Control+v",
  rename: "F2",
  delete: "Delete",
};
export const paletteShortcuts = {
  commandPalette: "Control+k",
  folderSearch: "Control+f",
  reviewPending: "Alt+Shift+p",
  discardPending: "Alt+Shift+d",
  moveTo: "Alt+Shift+m",
  copyTo: "Alt+Shift+c",
  splitPdf: "Alt+Shift+s",
  switchView: "Alt+Shift+v",
  sizeLedger: "Alt+Shift+l",
  connectProvider: "Alt+Shift+o",
  goLocation: "Control+l",
  toggleTheme: "Alt+Shift+t",
  toggleDensity: "Alt+Shift+y",
  exportSelection: "Alt+Shift+x",
  settings: "Alt+Shift+g",
  storageWipe: "Alt+Shift+w",
};

export const paletteCommands = [
  "push",
  "reviewPending",
  "discardPending",
  "moveTo",
  "copyTo",
  "splitPdf",
  "switchView",
  "viewList",
  "viewGrid",
  "viewColumns",
  "sizeLedger",
  "connectProvider",
  "goLocation",
  "toggleTheme",
  "toggleDensity",
  "exportSelection",
  "exportCollection",
  "duplicateFinder",
  "settings",
  "storageWipe",
] as const;

export function commandBinding(
  command: (typeof paletteCommands)[number],
  bindings: typeof defaultShortcuts,
) {
  return command === "push"
    ? bindings.push
    : command in paletteShortcuts
      ? paletteShortcuts[command as keyof typeof paletteShortcuts]
      : "";
}

export type ShortcutAction = keyof typeof defaultShortcuts;
function normalized(binding: string) {
  const parts = binding.toLowerCase().trim().split("+"),
    key = parts.pop();
  if (
    !key ||
    !/^(?:[a-z0-9]|delete|f(?:[1-9]|1[0-2]))$/.test(key) ||
    new Set(parts).size !== parts.length ||
    parts.some((part) => !["alt", "control", "shift"].includes(part))
  )
    return undefined;
  return [
    ...["control", "alt", "shift"].filter((part) => parts.includes(part)),
    key,
  ].join("+");
}
export function validShortcuts(bindings: typeof defaultShortcuts) {
  const values = Object.values(bindings).map(normalized);
  return (
    new Set(values).size === values.length &&
    !Object.values(paletteShortcuts)
      .map(normalized)
      .some((binding) => values.includes(binding)) &&
    values.every(
      (value) =>
        !!value &&
        !/^(?:control\+(?:shift\+)?[lnpwtrb]|control\+alt\+b)$/.test(value) &&
        !["x", "c", "v", "z"].includes(value),
    )
  );
}
export function shortcutMatches(event: KeyboardEvent, binding: string) {
  const value = normalized(binding);
  if (!value) return false;
  const parts = value.split("+"),
    key = parts.pop();
  return (
    event.key.toLowerCase() === key &&
    event.altKey === parts.includes("alt") &&
    (event.ctrlKey || event.metaKey) === parts.includes("control") &&
    event.shiftKey === parts.includes("shift")
  );
}
export function editableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest('input,textarea,select,[contenteditable="true"]')
  );
}
