(() => {
  const query = new URLSearchParams(location.search);
  history.replaceState(null, "", "/auth/github/");
  const key = "shelf-github-oauth";
  let route = "";
  try {
    const attempt = JSON.parse(sessionStorage.getItem(key) || "null");
    sessionStorage.removeItem(key);
    if (
      attempt &&
      typeof attempt.route === "string" &&
      attempt.route.startsWith("#/")
    ) {
      route = attempt.route;
    }
    if (
      attempt &&
      query.get("state") === attempt.state &&
      Date.now() - attempt.started < 600000 &&
      query.get("code")
    ) {
      sessionStorage.setItem(
        key,
        JSON.stringify({ ...attempt, code: query.get("code") }),
      );
    } else {
      sessionStorage.setItem(key, JSON.stringify({ failed: true }));
    }
  } finally {
    location.replace("/" + route);
  }
})();
