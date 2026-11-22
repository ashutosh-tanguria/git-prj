/* global BUILD_ID, SHELL_ASSETS */
const prefix = "shelf-shell-";
const cacheName = prefix + BUILD_ID;
const scope = new URL(self.registration.scope);
const entry = new URL("index.html", scope).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) =>
        cache.addAll(SHELL_ASSETS.map((path) => new URL(path, scope).href)),
      ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (names) => {
      await Promise.all(
        names
          .filter((name) => name.startsWith(prefix) && name !== cacheName)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== scope.origin ||
    !url.href.startsWith(scope.href)
  )
    return;
  if (
    request.mode === "navigate" &&
    (url.pathname === scope.pathname || url.href === entry)
  ) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok)
            await (await caches.open(cacheName)).put(entry, response.clone());
          return response;
        })
        .catch(
          async () =>
            (await caches.match(entry, { cacheName })) ?? Response.error(),
        ),
    );
  } else if (url.pathname.startsWith(new URL("assets/", scope).pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(cacheName);
        // Vite and static hosts may vary on Origin even for immutable build assets.
        const cached = await cache.match(request, { ignoreVary: true });
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok)
          await cache.put(request, response.clone()).catch(() => {});
        return response;
      })(),
    );
  }
});
