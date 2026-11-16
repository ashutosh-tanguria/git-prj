import { Tree, TreeItem, TreeItemContent } from "react-aria-components";
import type { Repo } from "../services/library";
import { explorerRoute } from "../lib/refs";
import { t } from "../i18n";
export function Locations({ repos }: { repos: Repo[] }) {
  return (
    <nav aria-label={t("locations")}>
      <h2>{t("locations")}</h2>
      <Tree
        aria-label={t("locations")}
        selectionMode="single"
        onAction={(key) => {
          const repo = repos.find((r) => r.full_name === key);
          if (repo) {
            const [owner, name] = repo.full_name.split("/");
            location.hash = explorerRoute({
              owner,
              repo: name,
              branch: repo.default_branch,
              path: "",
            });
          }
        }}
      >
        {repos.map((repo) => (
          <TreeItem
            id={repo.full_name}
            key={repo.full_name}
            textValue={repo.full_name}
          >
            <TreeItemContent>{repo.full_name}</TreeItemContent>
          </TreeItem>
        ))}
      </Tree>
    </nav>
  );
}
