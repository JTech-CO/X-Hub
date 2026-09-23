// MAIN world, document_start: observe responses without delaying X's own fetch callers.
(() => {
  if (window.__XHUB_FETCH__) return;
  window.__XHUB_FETCH__ = true;
  const original = window.fetch;
  window.fetch = async function (input, init) {
    const response = await original.call(this, input, init);
    const value = typeof input === 'string' ? input : input?.url || input?.href;
    let url;
    try { url = new URL(value, location.origin); } catch { return response; }
    if (!['x.com', 'twitter.com', 'api.x.com'].includes(url.hostname) || !/\/i\/api\/(graphql|2)\//.test(url.pathname)) return response;
    try {
      response.clone().json().then(data => {
        const users = new Map(), stack = [data];
        while (stack.length) {
          const item = stack.pop();
          if (!item || typeof item !== 'object') continue;
          const handle = item.core?.screen_name || item.legacy?.screen_name;
          if (handle && typeof item.is_blue_verified === 'boolean') users.set(handle, {
            is_blue_verified: item.is_blue_verified,
            verified_type: item.verified_type || item.legacy?.verified_type,
            legacy: { screen_name: handle },
          });
          for (const child of Object.values(item)) if (child && typeof child === 'object') stack.push(child);
        }
        if (users.size) window.postMessage({ type: 'XFP_BADGE_DATA', users: [...users.values()] }, location.origin);
      }).catch(() => {});
    } catch { /* A non-cloneable response must still be returned to X. */ }
    return response;
  };
})();
