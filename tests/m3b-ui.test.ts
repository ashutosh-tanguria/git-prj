// @vitest-environment jsdom
import { createElement } from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import "../src/i18n";
import { en, hi } from "../src/i18n/m3b";
import { RepositoryAccess } from "../src/components/RepositoryAccess";
import { ShortcutSettings } from "../src/components/ShortcutSettings";
import {
  defaultShortcuts,
  shortcutMatches,
  validShortcuts,
  editableTarget,
} from "../src/services/shortcuts";
import { prepareFileCommand } from "../src/services/fileCommands";
import { retargetAdds } from "../src/services/retarget";
afterEach(cleanup);
it("has parity for every repository, destination and shortcut locale key", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(hi).sort());
});
it("keeps public consent explicit and resets it after visibility changes", () => {
  let checked = true;
  const view = render(
    createElement(RepositoryAccess, {
      privateRepo: false,
      confirmed: false,
      readme: true,
      onPrivate: () => {},
      onReadme: () => {},
      onConfirm: (value) => {
        checked = value;
      },
    }),
  );
  expect((view.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(
    false,
  );
  fireEvent.change(view.getByRole("combobox"), {
    target: { value: "private" },
  });
  expect(checked).toBe(false);
});
it("remaps shortcuts, rejects collisions and leaves text editing untouched", () => {
  expect(validShortcuts(defaultShortcuts)).toBe(true);
  expect(validShortcuts({ ...defaultShortcuts, push: "Alt+n" })).toBe(false);
  expect(validShortcuts({ ...defaultShortcuts, push: "Control+p" })).toBe(
    false,
  );
  expect(validShortcuts({ ...defaultShortcuts, push: "unknown" })).toBe(false);
  expect(validShortcuts({ ...defaultShortcuts, push: "Alt+Alt+k" })).toBe(
    false,
  );
  expect(
    validShortcuts({
      ...defaultShortcuts,
      push: "Shift+Alt+k",
      newRepository: "Alt+Shift+k",
    }),
  ).toBe(false);
  expect(
    shortcutMatches(
      new KeyboardEvent("keydown", { key: "K", ctrlKey: true, shiftKey: true }),
      "Control+Shift+k",
    ),
  ).toBe(true);
  expect(
    shortcutMatches(
      new KeyboardEvent("keydown", { key: "n", altKey: true, shiftKey: true }),
      "Alt+n",
    ),
  ).toBe(false);
  expect(editableTarget(document.createElement("textarea"))).toBe(true);
  const view = render(
    createElement(ShortcutSettings, {
      bindings: defaultShortcuts,
      onSave: () => {},
    }),
  );
  fireEvent.change(view.getByLabelText("Push"), { target: { value: "Alt+n" } });
  fireEvent.click(view.getByRole("button", { name: "Save shortcuts" }));
  expect(view.getByRole("alert").textContent).toContain("unique");
});
it("builds a durable folder marker and retargets adds without losing bytes", () => {
  const target = {
    owner: "ada",
    repo: "notes",
    branch: "main",
    path: "semester-5",
  };
  const plan = prepareFileCommand("newFolder", target, [], "week-2");
  expect(plan[0].target.path).toBe("semester-5/week-2/.gitkeep");
  expect(plan[0].blob?.size).toBe(0);
  const moved = retargetAdds([{ ...plan[0], blobKey: "bytes" }], {
    ...target,
    path: "semester-6/week-2",
  });
  expect(moved[0].blobKey).toBe("bytes");
  expect(moved[0].target.path).toBe("semester-6/week-2/.gitkeep");
  expect(() =>
    retargetAdds([{ ...plan[0], kind: "rename" }], target),
  ).toThrow();
  expect(() => retargetAdds([plan[0], plan[0]], target)).toThrow();
});
it("previews file rename and delete without uploading bytes or changing the remote", () => {
  const target = { owner: "ada", repo: "notes", branch: "main", path: "week" };
  const entry = {
    name: "before.pdf",
    path: "week/before.pdf",
    ref: "gh:ada/notes@main/week/before.pdf",
    sha: "existing-blob",
    size: 42,
    kind: "file" as const,
  };
  expect(
    prepareFileCommand("rename", target, [entry], "after.pdf")[0],
  ).toMatchObject({
    kind: "rename",
    oldPath: "week/before.pdf",
    baseVersion: "existing-blob",
    target: { path: "week/after.pdf" },
  });
  expect(prepareFileCommand("delete", target, [entry], "")[0]).toMatchObject({
    kind: "delete",
    size: 42,
    baseVersion: "existing-blob",
  });
  expect(() =>
    prepareFileCommand("rename", target, [{ ...entry, kind: "dir" }], "new"),
  ).toThrow("clipboardFilesOnly");
});
