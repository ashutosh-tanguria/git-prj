(() => {
  const app = "__SHELF_APP_URL__";
  let link;
  let scheduled = false;
  const encode = encodeURIComponent;

  function repoPage() {
    const [owner, repo, mode, ...rest] = location.pathname
      .split("/")
      .slice(1)
      .map(decodeURIComponent);
    if (!owner || !repo || (mode && !["blob", "tree"].includes(mode))) return;
    const meta = (name) =>
      document.querySelector('meta[name="' + name + '"]')?.content;
    const declaredRepo = meta("octolytics-dimension-repository_nwo");
    const data = document.querySelector(
      'script[data-target="react-app.embeddedData"]',
    );
    const payload = data ? JSON.parse(data.textContent).payload : undefined;
    if (
      declaredRepo !== owner + "/" + repo &&
      (payload?.repo?.ownerLogin !== owner || payload.repo.name !== repo)
    )
      return;
    const branch = mode
      ? payload?.refInfo?.name
      : payload?.repo?.defaultBranch ||
        meta("octolytics-dimension-repository_default_branch");
    if (!branch) return;
    const prefix = branch.split("/");
    if (mode && !prefix.every((part, index) => part === rest[index])) return;
    const path = mode ? rest.slice(prefix.length).map(encode).join("/") : "";
    if (mode === "blob" && !path) return;
    return (
      app +
      "/#/gh/" +
      encode(owner) +
      "/" +
      encode(repo) +
      "@" +
      encode(branch) +
      "/" +
      path
    );
  }

  function mount() {
    scheduled = false;
    let url;
    try {
      url = repoPage();
    } catch {
      // GitHub may replace the embedded data during navigation.
    }
    if (!url) {
      link?.remove();
      return;
    }
    const parent =
      document.querySelector("#repository-container-header") ||
      document.querySelector("main");
    if (!parent) return;
    if (!link) {
      link = document.createElement("a");
      link.className = "shelf-open-link";
      link.textContent = "Open in Shelf";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    if (link.href !== url) link.href = url;
    if (link.parentElement !== parent) parent.prepend(link);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(mount);
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true,
    childList: true,
  });
  addEventListener("popstate", schedule);
  document.addEventListener("turbo:load", schedule);
  schedule();
})();
