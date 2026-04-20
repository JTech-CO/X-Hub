// background.js
let collectTabIds = [];

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id && tab.url?.startsWith('https://x.com'))
    chrome.tabs.sendMessage(tab.id, { action: 'togglePanel' });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'openCollectTab' && msg.url)
    chrome.tabs.create({ url: msg.url, active: false }, tab => { collectTabIds.push(tab.id); });
  if (msg.action === 'closeCollectTab') {
    const tabId = sender.tab?.id;
    if (tabId) { chrome.tabs.remove(tabId).catch(() => { }); collectTabIds = collectTabIds.filter(id => id !== tabId); }
  }
  if (msg.action === 'autoCollect' && msg.handle) {
    chrome.tabs.create({ url: `https://x.com/${msg.handle}/followers`, active: false }, tab => { collectTabIds.push(tab.id); });
    chrome.tabs.create({ url: `https://x.com/${msg.handle}/following`, active: false }, tab => { collectTabIds.push(tab.id); });
  }
});
