// fetch-interceptor.js
(() => {
  const MSG = {
    BADGE_DATA: 'XFP_BADGE_DATA',
    FOLLOW_DATA: 'XFP_FOLLOW_DATA',
  };
  const GQL_PATHS = ['/i/api/graphql/', '/i/api/2/'];
  const origFetch = window.fetch;

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const resp = await origFetch.call(window, input, init);
    const isGQL = GQL_PATHS.some(p => url.includes(p));
    if (!isGQL) return resp;

    try {
      const clone = resp.clone();
      const data = await clone.json();

      const users = [];
      findUsers(data, users);
      if (users.length) {
        window.postMessage({ type: MSG.BADGE_DATA, users }, '*');
      }

      if (url.toLowerCase().includes('follow')) {
        const handles = [];
        findFollowHandles(data, handles);
        if (handles.length) {
          window.postMessage({ type: MSG.FOLLOW_DATA, handles }, '*');
        }
      }
    } catch { /* parse failure — SVG fallback handles it */ }
    return resp;
  };

  function findUsers(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.rest_id && typeof obj.is_blue_verified === 'boolean') {
      out.push({
        rest_id: obj.rest_id,
        is_blue_verified: obj.is_blue_verified,
        verified_type: obj.verified_type,
        legacy: obj.legacy,
      });
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) v.forEach(i => findUsers(i, out));
      else if (typeof v === 'object') findUsers(v, out);
    }
  }

  function findFollowHandles(obj, out) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.user_results) {
      const sn = obj.user_results?.result?.legacy?.screen_name;
      if (typeof sn === 'string') out.push(sn.toLowerCase());
    }
    for (const v of Object.values(obj)) {
      if (Array.isArray(v)) v.forEach(i => findFollowHandles(i, out));
      else if (typeof v === 'object') findFollowHandles(v, out);
    }
  }
})();
