const url = new URL(location.href);
history.replaceState(null, "", url.pathname);
const state = url.searchParams.get("state");
if (state && /^[0-9a-f]{64}$/.test(state)) {
  const channel = new BroadcastChannel("shelf-dropbox-" + state);
  channel.postMessage(url.searchParams.get("code"));
  channel.close();
  window.close();
}
