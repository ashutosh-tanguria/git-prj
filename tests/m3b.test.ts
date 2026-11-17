import { expect, it } from "vitest";
import {
  commitMessage,
  type MessageChange,
} from "../src/services/commitMessage";
import { canQuickPush, folderPath } from "../src/services/destinations";
import { evaluateFile } from "../src/services/guards";
import { validRepositoryName } from "../src/services/repositories";
const add = (path: string): MessageChange => ({
  kind: "add",
  target: { path },
});
it("generates every README message form", () => {
  expect(commitMessage([add("algorithms-week3.pdf")])).toBe(
    "Add algorithms-week3.pdf",
  );
  expect(
    commitMessage([add("a.pdf"), add("b.pdf"), add("c.png")], "semester-5"),
  ).toBe("Add 3 files to semester-5 (2 PDFs, 1 image)");
  expect(
    commitMessage([
      {
        kind: "rename",
        oldPath: "os-notes.pdf",
        target: { path: "os-notes-v2.pdf" },
      },
    ]),
  ).toBe("Rename os-notes.pdf to os-notes-v2.pdf");
  expect(
    commitMessage([{ kind: "delete", target: { path: "old-draft.pdf" } }]),
  ).toBe("Delete old-draft.pdf");
  expect(
    commitMessage(
      [
        add("a"),
        add("b"),
        { kind: "rename", target: { path: "c" } },
        { kind: "delete", target: { path: "d" } },
      ],
      "semester-5",
    ),
  ).toBe("Update semester-5: add 2 files, rename 1, delete 1");
  expect(
    commitMessage(
      Array.from({ length: 9 }, (_, i) => add("a" + i)),
      "notes",
    )
      .split("\n\n")[1]
      .split("\n"),
  ).toHaveLength(9);
  expect(
    commitMessage([{ ...add("algorithms.pdf"), movedFrom: "Google Drive" }]),
  ).toBe("Add algorithms.pdf (moved from Google Drive)");
  expect([...commitMessage([add("a".repeat(100) + ".pdf")])]).toHaveLength(72);
});
it.each([
  {
    label: "one add",
    changes: [add("algorithms-week3.pdf")],
    folder: "",
    expected: "Add algorithms-week3.pdf",
  },
  {
    label: "several adds",
    changes: [add("a.pdf"), add("b.pdf"), add("c.png")],
    folder: "semester-5",
    expected: "Add 3 files to semester-5 (2 PDFs, 1 image)",
  },
  {
    label: "rename",
    changes: [
      {
        kind: "rename",
        oldPath: "os-notes.pdf",
        target: { path: "os-notes-v2.pdf" },
      },
    ],
    folder: "",
    expected: "Rename os-notes.pdf to os-notes-v2.pdf",
  },
  {
    label: "delete",
    changes: [{ kind: "delete", target: { path: "old-draft.pdf" } }],
    folder: "",
    expected: "Delete old-draft.pdf",
  },
  {
    label: "mixed",
    changes: [
      { kind: "delete", target: { path: "old" } },
      add("a"),
      add("b"),
      { kind: "rename", target: { path: "new" } },
    ],
    folder: "semester-5",
    expected: "Update semester-5: add 2 files, rename 1, delete 1",
  },
  {
    label: "moved provider",
    changes: [{ ...add("algorithms.pdf"), movedFrom: "Google Drive" }],
    folder: "",
    expected: "Add algorithms.pdf (moved from Google Drive)",
  },
] satisfies {
  label: string;
  changes: MessageChange[];
  folder: string;
  expected: string;
}[])("message table: $label", ({ changes, folder, expected }) => {
  expect(commitMessage(changes, folder)).toBe(expected);
});
it("lists every operation over eight changes and truncates a Unicode subject to 72 characters", () => {
  const changes: MessageChange[] = [
    ...Array.from({ length: 6 }, (_, i) => add("a" + i)),
    { kind: "modify", target: { path: "notes.txt" } },
    { kind: "delete", target: { path: "old.txt" } },
    { kind: "rename", oldPath: "before.txt", target: { path: "after.txt" } },
  ];
  expect(commitMessage(changes).split("\n\n")[1]).toContain(
    "M notes.txt\nD old.txt\nR before.txt -> after.txt",
  );
  expect([...commitMessage([add("😀".repeat(90))])]).toHaveLength(72);
  expect(commitMessage([add("draft.")])).toBe("Add draft");
});
it("validates names and folder paths", () => {
  for (const value of ["", ".", "..", ".git", "bad name", "a".repeat(101)])
    expect(validRepositoryName(value)).toBe(false);
  expect(validRepositoryName("notes-v2.0")).toBe(true);
  for (const path of ["/bad", "bad/", "a/../b", ".git/secret"])
    expect(() => folderPath(path)).toThrow();
  expect(folderPath("semester-5/week-2")).toBe("semester-5/week-2");
});
it("excludes public, first use, warnings, blocks and conflicts from quick push", () => {
  const destination = {
      owner: "ada",
      repo: "notes",
      branch: "main",
      path: "semester-5",
    },
    args = {
      privateRepo: true,
      used: true,
      verdicts: [evaluateFile(1)],
      conflict: false,
      destination,
      lastUsed: destination,
    };
  expect(canQuickPush(args)).toBe(true);
  expect(canQuickPush({ ...args, privateRepo: false })).toBe(false);
  expect(canQuickPush({ ...args, used: false })).toBe(false);
  expect(canQuickPush({ ...args, conflict: true })).toBe(false);
  for (const size of [30, 70, 150])
    expect(
      canQuickPush({ ...args, verdicts: [evaluateFile(size * 1048576)] }),
    ).toBe(false);
});
