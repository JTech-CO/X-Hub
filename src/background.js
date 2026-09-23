// Persist ownership across MV3 service-worker suspension. Never close ordinary user tabs.
const COLLECT_TABS = 'xhub_collect_tabs';
let queue = Promise.resolve();
const validHandle = value => typeof value === 'string' && /^[a-z0-9_]{1,15}$/i.test(value);
const isX = value => { try { return ['https://x.com', 'https://twitter.com'].includes(new URL(value).origin); } catch { return false; } };

chrome.action.onClicked.addListener(tab => {
  if (tab.id && isX(tab.url)) chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (sender.frameId !== 0 || !sender.tab?.id || !isX(sender.url)) return;
  if (!['autoCollect', 'isCollectTab', 'closeCollectTab', 'finishCollect', 'startVertical', 'stopVertical'].includes(msg?.action)) return;
  queue = queue.catch(() => {}).then(async () => {
    if (msg.action === 'startVertical' || msg.action === 'stopVertical') {
      const id = sender.tab.id;
      const token = crypto.randomUUID();
      await chrome.declarativeNetRequest.updateSessionRules({
        removeRuleIds: [id],
        addRules: msg.action === 'stopVertical' ? [] : [{
          id, priority: 1,
          action: { type: 'modifyHeaders', responseHeaders: [{ header: 'x-frame-options', operation: 'set', value: 'SAMEORIGIN' }] },
          condition: {
            tabIds: [id], resourceTypes: ['sub_frame'],
            initiatorDomains: [new URL(sender.url).hostname],
            regexFilter: '^https://(x|twitter)[.]com/.*[?&]xhub_column=' + token + '(&|$)',
          },
        }],
      });
      return { token };
    }
    const tabs = (await chrome.storage.session.get(COLLECT_TABS))[COLLECT_TABS] || {};
    const owned = tabs[sender.tab.id];
    if (msg.action === 'isCollectTab') return Boolean(owned);
    if (msg.action === 'autoCollect' && validHandle(msg.handle)) {
      for (const kind of ['followers', 'following']) {
        if (Object.values(tabs).some(t => t.handle === msg.handle && t.kind === kind)) continue;
        const tab = await chrome.tabs.create({ url: `https://x.com/${msg.handle}/${kind}`, active: false });
        tabs[tab.id] = { handle: msg.handle, kind };
      }
      await chrome.storage.session.set({ [COLLECT_TABS]: tabs });
      return true;
    }
    if (!owned) return false;
    if (msg.action === 'finishCollect') {
      const isFollowers = owned.kind === 'followers';
      if (msg.handle !== owned.handle || msg.isFollowers !== isFollowers || !Array.isArray(msg.handles)) return false;
      const jobKey = isFollowers ? 'xfp_collectJob' : 'xfp_collectJob_2';
      const st = await chrome.storage.local.get(['xfp_currentUser', 'xfp_whitelist', jobKey]);
      if (st.xfp_currentUser !== owned.handle || st[jobKey]?.state !== 'running') return false;
      const handles = [...new Set(msg.handles.filter(validHandle).map(h => h.toLowerCase()))];
      await chrome.storage.local.set({
        xfp_whitelist: [...new Set([...(st.xfp_whitelist || []), ...handles])],
        [jobKey]: { handle: owned.handle, state: 'done', count: handles.length },
        [isFollowers ? 'xfp_followersCnt' : 'xfp_followingCnt']: handles.length,
      });
      return true;
    }
    if (msg.action === 'closeCollectTab') {
      delete tabs[sender.tab.id];
      await chrome.storage.session.set({ [COLLECT_TABS]: tabs });
      await chrome.tabs.remove(sender.tab.id).catch(() => {});
      return true;
    }
    return false;
  });
  queue.then(respond, () => respond(false));
  return true;
});

chrome.tabs.onRemoved.addListener(tabId => {
  chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] }).catch(() => {});
  queue = queue.catch(() => {}).then(async () => {
    const tabs = (await chrome.storage.session.get(COLLECT_TABS))[COLLECT_TABS] || {};
    if (!tabs[tabId]) return;
    delete tabs[tabId];
    await chrome.storage.session.set({ [COLLECT_TABS]: tabs });
  });
});

chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.url) chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [tabId] }).catch(() => {});
});
