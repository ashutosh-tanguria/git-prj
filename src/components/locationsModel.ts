import type { Repo } from "../services/library";
import { refString } from "../lib/refs";
export interface Node {
  id: string;
  label: string;
  ref?: string;
  parent?: string;
  level: number;
  expanded: boolean;
  loaded: boolean;
  children: Node[];
}
export function initial(repos: Repo[]): Node[] {
  return [
    {
      id: "github",
      label: "GitHub",
      level: 1,
      expanded: true,
      loaded: true,
      children: repos.map((repo) => {
        const [owner, name] = repo.full_name.split("/");
        return {
          id: repo.full_name,
          parent: "github",
          label: repo.full_name,
          ref: refString({
            owner,
            repo: name,
            branch: repo.default_branch,
            path: "",
          }),
          level: 2,
          expanded: false,
          loaded: false,
          children: [],
        };
      }),
    },
  ];
}
export function visible(nodes: Node[]): Node[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.expanded ? visible(node.children) : []),
  ]);
}
