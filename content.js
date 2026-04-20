(() => {
  // --- Utilities ---
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  if (window.__X_RAFFLE_PANEL__) return;
  window.__X_RAFFLE_PANEL__ = true;

  // --- Helpers ---
  function esc(s) {
    return (s || '').replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // --- Scope Detection ---
  const PRIMARY = document.querySelector('[data-testid="primaryColumn"]')
    || document.querySelector('main')
    || document.body;

  function detectRetweetsScope() {
    const labelSelectors = [
      '[role="region"][aria-label*="Retweets" i]',
      '[role="region"][aria-label*="리포스트"]',
      '[role="region"][aria-label*="재게시"]',
      '[role="region"][aria-label*="게시물 참여수"]'
    ];
    for (const sel of labelSelectors) {
      const el = PRIMARY.querySelector(sel);
      if (el) return el;
    }

    const regions = Array.from(PRIMARY.querySelectorAll('[role="region"]'));
    if (regions.length) {
      regions.sort((a, b) => ($$('[data-testid="UserCell"]', b).length - $$('[data-testid="UserCell"]', a).length));
      if ($$('[data-testid="UserCell"]', regions[0]).length > 0) return regions[0];
    }

    return PRIMARY;
  }
  const RETWEETS_SCOPE = detectRetweetsScope();

  function isInExcludedArea(el) {
    return !!el.closest(
      [
        '[data-testid="sidebarColumn"]',
        'aside',
        '[aria-label*="Who to follow"]',
        '[aria-label*="팔로우 추천"]',
        '[aria-label*="팔로우"]',
        '[data-testid="InlineFollow"]',
      ].join(',')
    );
  }

  function getScrollTarget(scopeEl) {
    if (!scopeEl) return window;
    const canScroll = (n) =>
      n && (n.scrollHeight > n.clientHeight + 20 || getComputedStyle(n).overflowY === 'auto');
    let p = scopeEl;
    while (p && p !== document.documentElement) {
      if (canScroll(p)) return p;
      p = p.parentElement;
    }
    return window;
  }

  function doScroll(scroller) {
    if (scroller === window) {
      window.scrollBy(0, Math.max(400, window.innerHeight * 0.9));
    } else {
      scroller.scrollTop += Math.max(400, (scroller.clientHeight || window.innerHeight) * 0.9);
    }
  }

  // --- Shadow Panel ---
  const host = document.createElement('div');
  Object.assign(host.style, {
    all: 'unset', position: 'fixed', top: '12px', right: '12px',
    zIndex: 2147483647, width: '440px', pointerEvents: 'auto'
  });
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // --- CSS ---
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&family=JetBrains+Mono:wght@400;700&display=swap');

    :host {
      all: initial;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* --- Card Container --- */
    .card {
      background: #000000;
      color: #f0f0f0;
      border: 1px solid #333333;
      border-radius: 0;
      box-shadow: 0 8px 32px rgba(0,0,0,.6);
    }
    .card-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* --- Header --- */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #333333;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    h3 {
      margin: 0;
      font-family: 'Inter', sans-serif;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #ffffff;
    }

    /* --- Section Separator --- */
    .separator {
      width: 100%;
      height: 1px;
      background: #333333;
      margin: 0;
    }

    /* --- Rows & Columns --- */
    .row { display: flex; gap: 8px; align-items: center; }
    .col { display: flex; flex-direction: column; gap: 10px; }

    /* --- Buttons --- */
    .btn {
      display: inline-block;
      padding: 8px 14px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
      color: #ffffff;
      background: transparent;
      border: 1px solid #ffffff;
      border-radius: 0;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: #ffffff;
      color: #000000;
    }
    .btn.secondary {
      border-color: #333333;
      color: #cccccc;
    }
    .btn.secondary:hover {
      background: #333333;
      color: #ffffff;
      border-color: #333333;
    }
    .btn.accent {
      border-color: #ffffff;
      color: #000000;
      background: #ffffff;
    }
    .btn.accent:hover {
      background: transparent;
      color: #ffffff;
    }
    .btn.green {
      border-color: #22c55e;
      color: #22c55e;
      background: transparent;
    }
    .btn.green:hover {
      background: #22c55e;
      color: #000000;
    }
    .btn.orange {
      border-color: #C73DD9;
      color: #C73DD9;
      background: transparent;
      font-size: 12px;
      padding: 5px 10px;
    }
    .btn.orange:hover {
      background: #C73DD9;
      color: #000000;
    }
    .btn.close-btn {
      padding: 4px 10px;
      font-size: 20px;
      font-family: 'Inter', sans-serif;
      line-height: 1;
      border-color: #333333;
      color: #cccccc;
    }
    .btn.close-btn:hover {
      border-color: #ffffff;
      color: #ffffff;
      background: transparent;
    }
    .btn:disabled {
      opacity: 0.35;
      cursor: default;
      pointer-events: none;
    }

    /* --- Status Badges --- */
    .badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 400;
      padding: 4px 10px;
      border: 1px solid #333333;
      background: #0a0a0a;
      color: #cccccc;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge b {
      color: #ffffff;
      font-weight: 700;
    }

    /* --- Inputs & Selects --- */
    input, select {
      width: 100%;
      padding: 8px 12px;
      background: #111111;
      border: 1px solid #333333;
      border-radius: 0;
      color: #f0f0f0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      transition: border-color 0.2s ease;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #ffffff;
    }
    input::placeholder {
      color: #999999;
    }
    select option {
      background: #111111;
      color: #f0f0f0;
    }

    /* --- User List --- */
    .list {
      max-height: 320px;
      overflow: auto;
      border: 1px solid #333333;
      padding: 0;
      background: #0a0a0a;
    }
    .list::-webkit-scrollbar { width: 4px; }
    .list::-webkit-scrollbar-track { background: #0a0a0a; }
    .list::-webkit-scrollbar-thumb { background: #333333; }
    .list::-webkit-scrollbar-thumb:hover { background: #555555; }

    .user {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid #1a1a1a;
      transition: background 0.15s ease;
    }
    .user:last-child { border-bottom: none; }
    .user:hover {
      background: #111111;
    }
    .user b {
      font-weight: 600;
      color: #ffffff;
      font-size: 15px;
    }
    .tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 400;
      padding: 2px 6px;
      border: 1px solid #333333;
      background: transparent;
      color: #cccccc;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-left: 6px;
    }
    .user-desc {
      font-size: 14px;
      color: #cccccc;
      font-weight: 300;
      line-height: 1.5;
      white-space: pre-wrap;
      margin-top: 3px;
    }
    a.link {
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      text-decoration: none;
      text-transform: uppercase;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s ease;
      white-space: nowrap;
    }
    a.link:hover {
      border-bottom-color: #ffffff;
    }

    /* --- Footer Note --- */
    .footnote {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #aaaaaa;
      letter-spacing: 0.02em;
    }

    /* --- Button Group (Copy) --- */
    .btn-group {
      display: flex;
      align-items: stretch;
      border: 1px solid #333333;
      min-width: 0;
      flex: 1;
    }
    .btn-group-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #cccccc;
      padding: 8px 10px;
      background: #0a0a0a;
      white-space: nowrap;
      border-right: 1px solid #333333;
      display: flex;
      align-items: center;
    }
    .btn-group .btn {
      border: none;
      border-right: 1px solid #333333;
      padding: 8px 10px;
      flex: 1;
      text-align: center;
      min-width: 0;
    }
    .btn-group .btn:last-child {
      border-right: none;
    }

    /* --- Placeholder --- */
    .placeholder {
      padding: 40px 0;
      text-align: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 14px;
      color: #888888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* --- Filter Mode: Checkbox Labels --- */
    .xrr-flbl {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #cccccc;
      user-select: none;
    }
    .xrr-flbl:hover {
      color: #ffffff;
    }
    .xrr-flbl input[type="checkbox"] {
      width: 14px;
      height: 14px;
      min-width: 14px;
      padding: 0;
      accent-color: #ffffff;
      cursor: pointer;
    }

    /* --- Mini (Collapsed) State --- */
    .xhub-mini {
      display: none;
      align-items: center;
      gap: 9px;
      padding: 8px 16px;
      background: #000000;
      border: 1px solid #C73DD9;
      cursor: pointer;
      user-select: none;
      transition: background 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .xhub-mini:hover {
      background: #110014;
      border-color: #e055f5;
      box-shadow: 0 0 18px rgba(199,61,217,0.4);
    }
    .xhub-mini-logo {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #C73DD9;
    }
    .xhub-mini-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #C73DD9;
      flex-shrink: 0;
      animation: xhub-pulse 2.4s ease-in-out infinite;
    }
    @keyframes xhub-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.65); }
    }
  `;

  // --- HTML Shell ---
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `
    <div class="card-body">
      <div class="header">
        <h3>X HUB</h3>
        <div class="header-right">
          <button id="mode-btn" class="btn orange" title="Switch mode">Raffle</button>
          <button id="collapse-btn" class="btn close-btn" title="Minimize">&#8722;</button>
          <button id="close" class="btn close-btn" title="Close">&#215;</button>
        </div>
      </div>
      <div id="mode-body"></div>
    </div>
  `;
  // --- Mini element ---
  const miniWrap = document.createElement('div');
  miniWrap.className = 'xhub-mini';
  miniWrap.innerHTML = '<div class="xhub-mini-dot"></div><span class="xhub-mini-logo">X HUB</span>';
  shadow.append(styleEl, miniWrap, wrap);

  // --- Collapse / Expand ---
  let isPanelCollapsed = false;
  function collapsePanel() {
    isPanelCollapsed = true;
    wrap.style.display = 'none';
    host.style.width = '220px';
    miniWrap.style.display = 'flex';
  }
  function expandPanel(switchToMode) {
    isPanelCollapsed = false;
    miniWrap.style.display = 'none';
    host.style.width = '440px';
    wrap.style.display = '';
    if (switchToMode && switchToMode !== currentMode) {
      raffleRunning = false;
      followRunning = false;
      currentMode = switchToMode;
      modeBtn.textContent = MODE_LABELS[currentMode];
      renderModeBody();
    }
  }
  miniWrap.onclick = () => expandPanel('raffle');

  const modeBtn = shadow.getElementById('mode-btn');
  const modeBody = shadow.getElementById('mode-body');

  shadow.getElementById('collapse-btn').onclick = collapsePanel;
  shadow.getElementById('close').onclick = () => {
    raffleRunning = false;
    followRunning = false;
    filterStopObs();
    host.remove();
    window.__X_RAFFLE_PANEL__ = false;
  };

  // --- Mode System ---
  let currentMode = 'raffle';
  const MODES = ['raffle', 'follow', 'filter'];
  const MODE_LABELS = { raffle: 'Raffle', follow: 'Follow', filter: 'Filter' };

  modeBtn.onclick = () => {

    raffleRunning = false;
    followRunning = false;
    const idx = MODES.indexOf(currentMode);
    currentMode = MODES[(idx + 1) % MODES.length];
    modeBtn.textContent = MODE_LABELS[currentMode];
    renderModeBody();
  };

  function renderModeBody() {
    switch (currentMode) {
      case 'raffle': renderRaffleMode(); break;
      case 'follow': renderFollowMode(); break;
      case 'filter': renderFilterMode(); break;
    }
  }

  // --- MODE 1: Raffle ---
  let raffleRunning = false;
  let raffleExtracted = false;
  let raffleUsers = [];
  let raffleSeen = new Set();
  let raffleLastCount = 0;
  let raffleStableTicks = 0;
  const RAFFLE_MAX_STABLE = 3;
  const RAFFLE_PAUSE = 300;
  const RAFFLE_MAX_TICKS = 500;
  const RAFFLE_SCROLLER = getScrollTarget(RETWEETS_SCOPE);

  const FOLLOW_LABELS = [
    'Follows you',
    '나를 팔로우합니다',
    '나를 팔로우함',
    '나를 팔로우 중',
    '팔로우합니다',
    '팔로우함'
  ];

  function isFollowerCell(cell) {
    if (cell.querySelector('[aria-label*="Follows you" i]')) return true;
    if (cell.querySelector('[aria-label*="나를 팔로우합니다"]')) return true;
    const text = (cell.innerText || cell.textContent || '').trim();
    return FOLLOW_LABELS.some(lbl => text.toLowerCase().includes(lbl.toLowerCase()));
  }

  function raffleParseRT() {
    const cells = $$('[data-testid="UserCell"]', RETWEETS_SCOPE);
    let added = 0;
    for (const c of cells) {
      if (isInExcludedArea(c)) continue;
      try {
        let handle = '';
        const links = $$('a[href^="/"], a[href^="https://x.com/"]', c);
        for (const a of links) {
          const href = a.getAttribute('href') || '';
          if (/^https?:\/\/x\.com\//.test(href)) {
            const seg = href.split('x.com/')[1].split('?')[0];
            if (seg && !seg.startsWith('i/') && !seg.includes('/status/')) { handle = seg.replace(/\/+$/, ''); break; }
          } else if (href.startsWith('/')) {
            const seg = href.slice(1).split('?')[0];
            if (seg && !seg.startsWith('i/') && !seg.includes('/status/')) { handle = seg.replace(/\/+$/, ''); break; }
          }
        }
        if (!handle) continue;
        let nickname = '';
        const nameEl = c.querySelector('div[dir="ltr"] span');
        if (nameEl) nickname = nameEl.textContent.trim();
        else nickname = (c.textContent || '').split('\n')[0].trim();
        let description = '';
        const descEl = c.querySelector('div[dir="auto"][lang]');
        if (descEl) description = descEl.textContent.trim();
        const followsMe = isFollowerCell(c);
        if (!raffleSeen.has(handle)) {
          raffleUsers.push({ handle, nickname, description, followsMe });
          raffleSeen.add(handle);
          added++;
        }
      } catch (e) { }
    }
    return added;
  }

  function renderRaffleMode() {
    modeBody.innerHTML = `
      <div class="col">
        <div class="row" style="flex-wrap:wrap">
          <button id="r-start" class="btn accent" title="Auto scroll & collect">Start</button>
          <button id="r-stop"  class="btn secondary" disabled>Stop</button>
          <button id="r-clear" class="btn secondary">Clear</button>
          <button id="r-fo" class="btn secondary" title="Show only users who follow me" disabled>Follower Only</button>
        </div>
        <div class="row" style="flex-wrap:wrap">
          <span class="badge">Found: <b id="r-count">${raffleUsers.length}</b></span>
          <span class="badge">New: <b id="r-delta">0</b></span>
          <span class="badge">Status: <b id="r-status">idle</b></span>
        </div>
      </div>

      <div class="separator"></div>

      <div class="col">
        <div class="row">
          <select id="r-sort">
            <option value="handle">Sort: Handle</option>
            <option value="nickname">Sort: Nickname</option>
          </select>
          <input id="r-filter" placeholder="Search (handle / nickname / bio)" />
        </div>
        <div class="row" style="gap:8px">
          <input id="r-winners" type="number" min="1" value="1" style="width:80px; flex-shrink:0"/>
          <button id="r-draw" class="btn green" style="flex-shrink:0">Raffle</button>
          <div class="btn-group">
            <span class="btn-group-label">Copy</span>
            <button id="r-copy" class="btn">Text</button>
            <button id="r-csv" class="btn">CSV</button>
            <button id="r-json" class="btn">JSON</button>
          </div>
        </div>
      </div>

      <div id="r-list" class="list"></div>
      <span class="footnote">Data is not transmitted to external servers.</span>
      <span class="footnote">Scope: ${RETWEETS_SCOPE === PRIMARY ? 'PRIMARY' : 'RETWEETS_SCOPE'}</span>
    `;
    wireRaffle();
    raffleRenderList();
  }

  function wireRaffle() {
    const el = (id) => shadow.getElementById(id);
    el('r-start').onclick = raffleAutoScroll;
    el('r-stop').onclick = () => { raffleRunning = false; };
    el('r-clear').onclick = raffleClear;
    el('r-fo').onclick = raffleFollowersOnly;
    el('r-sort').onchange = raffleRenderList;
    el('r-filter').oninput = raffleRenderList;
    el('r-draw').onclick = raffleDrawWinners;
    el('r-copy').onclick = () => raffleCopyText(raffleUsers.map(u => `${u.nickname} (@${u.handle})`).join('\n'));
    el('r-csv').onclick = () => raffleCopyText(raffleToCSV(raffleUsers));
    el('r-json').onclick = () => raffleCopyText(JSON.stringify({ count: raffleUsers.length, users: raffleUsers }, null, 2));
  }

  function raffleRenderList() {
    const filterEl = shadow.getElementById('r-filter');
    const sortEl = shadow.getElementById('r-sort');
    const listEl = shadow.getElementById('r-list');
    const countEl = shadow.getElementById('r-count');
    if (!listEl) return;
    const q = (filterEl?.value || '').trim().toLowerCase();
    const sorted = [...raffleUsers];
    if (sortEl?.value === 'handle') sorted.sort((a, b) => a.handle.localeCompare(b.handle));
    else sorted.sort((a, b) => (a.nickname || '').localeCompare(b.nickname || ''));
    const filtered = q
      ? sorted.filter(u =>
        (u.handle || '').toLowerCase().includes(q) ||
        (u.nickname || '').toLowerCase().includes(q) ||
        (u.description || '').toLowerCase().includes(q))
      : sorted;
    listEl.innerHTML = filtered.map(u => `
      <div class="user">
        <div>
          <div>
            <b>${esc(u.nickname || '(no name)')}</b>
            <span class="tag">@${esc(u.handle)}</span>
            ${u.followsMe ? '<span class="tag">Follows you</span>' : ''}
          </div>
          <div class="user-desc">${esc(u.description || '')}</div>
        </div>
        <a class="link" href="https://x.com/${encodeURIComponent(u.handle)}" target="_blank">Open</a>
      </div>
    `).join('');
    if (countEl) countEl.textContent = raffleUsers.length;
  }

  async function raffleAutoScroll() {
    raffleRunning = true; raffleExtracted = false; raffleStableTicks = 0; raffleLastCount = raffleUsers.length;
    const statusEl = shadow.getElementById('r-status');
    const deltaEl = shadow.getElementById('r-delta');
    const startBtn = shadow.getElementById('r-start');
    const stopBtn = shadow.getElementById('r-stop');
    const foBtn = shadow.getElementById('r-fo');
    if (statusEl) statusEl.textContent = 'running';
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (foBtn) foBtn.disabled = true;

    for (let tick = 0; raffleRunning && tick < RAFFLE_MAX_TICKS; tick++) {
      const added = raffleParseRT();
      if (deltaEl) deltaEl.textContent = String(added);
      raffleRenderList();
      if (raffleUsers.length === raffleLastCount) {
        raffleStableTicks++;
        if (raffleStableTicks >= RAFFLE_MAX_STABLE) break;
      } else {
        raffleLastCount = raffleUsers.length; raffleStableTicks = 0;
      }
      doScroll(RAFFLE_SCROLLER);
      await sleep(RAFFLE_PAUSE);
    }

    if (statusEl) statusEl.textContent = 'stopped';
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    raffleRunning = false; raffleExtracted = true;
    if (foBtn) foBtn.disabled = raffleUsers.length === 0;
  }

  function raffleClear() {
    raffleUsers = []; raffleSeen = new Set(); raffleExtracted = false;
    const deltaEl = shadow.getElementById('r-delta');
    const statusEl = shadow.getElementById('r-status');
    const foBtn = shadow.getElementById('r-fo');
    if (deltaEl) deltaEl.textContent = '0';
    if (statusEl) statusEl.textContent = 'idle';
    if (foBtn) foBtn.disabled = true;
    raffleRenderList();
  }

  function raffleFollowersOnly() {
    if (!raffleExtracted || raffleUsers.length === 0) return;
    raffleUsers = raffleUsers.filter(u => u.followsMe === true);
    raffleRenderList();
    const foBtn = shadow.getElementById('r-fo');
    const statusEl = shadow.getElementById('r-status');
    if (foBtn) foBtn.disabled = true;
    if (statusEl) { statusEl.textContent = 'followers-only'; setTimeout(() => statusEl.textContent = 'idle', 1200); }
  }

  function raffleDrawWinners() {
    const winnersEl = shadow.getElementById('r-winners');
    const n = Math.max(1, Math.min(parseInt(winnersEl?.value || '1', 10), raffleUsers.length || 1));
    const pool = [...raffleUsers];
    const picked = new Set();
    while (picked.size < n && pool.length) picked.add(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const res = Array.from(picked);
    alert(`Winners (${n})\n` + res.map(u => `${u.nickname} (@${u.handle})`).join('\n'));
  }

  function raffleToCSV(rows) {
    const header = ['handle', 'nickname', 'description'];
    const escCSV = (s = '') => `"${String(s).replace(/"/g, '""')}"`;
    return [header.join(','), ...rows.map(r => [r.handle, r.nickname, r.description].map(escCSV).join(','))].join('\n');
  }

  function raffleCopyText(txt) {
    const statusEl = shadow.getElementById('r-status');
    navigator.clipboard.writeText(txt).then(() => {
      if (statusEl) { statusEl.textContent = 'copied'; setTimeout(() => statusEl.textContent = 'idle', 1200); }
    });
  }

  // --- MODE 2: Follow ---
  let followRunning = false;
  let followUsers = [];
  let followSeen = new Set();
  let followLastCount = 0;
  let followStableTicks = 0;
  const FOLLOW_MAX_STABLE = 3;
  const FOLLOW_PAUSE = 300;
  const FOLLOW_MAX_TICKS = 500;

  function getPageType() {
    const path = location.pathname;
    if (path.endsWith('/followers') || path.includes('/followers/')) return 'followers';
    if (path.endsWith('/following') || path.includes('/following/')) return 'following';
    if (path.includes('/verified_followers')) return 'followers';
    return null;
  }

  function isRafflePage() {
    const p = location.pathname;
    return p.includes('/status/') && (
      p.endsWith('/retweets') || p.endsWith('/likes') || p.endsWith('/quotes')
    );
  }

  function panelAutoState() {
    const pg = getPageType();
    const rl = isRafflePage();
    if (rl) {
      if (isPanelCollapsed) {
        isPanelCollapsed = false;
        miniWrap.style.display = 'none';
        wrap.style.display = '';
      }
      if (currentMode !== 'raffle') {
        raffleRunning = false; followRunning = false;
        currentMode = 'raffle';
        modeBtn.textContent = MODE_LABELS.raffle;
        renderModeBody();
      }
    } else if (pg) {
      if (isPanelCollapsed) {
        isPanelCollapsed = false;
        miniWrap.style.display = 'none';
        wrap.style.display = '';
      }
      if (currentMode !== 'follow') {
        raffleRunning = false; followRunning = false;
        currentMode = 'follow';
        modeBtn.textContent = MODE_LABELS.follow;
        renderModeBody();
      }
    } else {
      if (!isPanelCollapsed) collapsePanel();
    }
  }

  function parseFollowCell(cell) {
    let username = '';
    const links = $$('a[href^="/"]', cell);
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      const seg = href.slice(1).split('?')[0];
      if (seg && !seg.startsWith('i/') && !seg.includes('/')) {
        username = seg;
        break;
      }
    }
    if (!username) return null;


    let displayName = '';
    const nameEl = cell.querySelector('div[dir="ltr"] span');
    if (nameEl) displayName = nameEl.textContent.trim();


    const cellText = (cell.innerText || cell.textContent || '').trim();
    const hasFollowsYou =
      cellText.includes('Follows you') ||
      cellText.includes('나를 팔로우합니다') ||
      cellText.includes('나를 팔로우함') ||
      cellText.includes('나를 팔로우 중');


    let isMyFollowing = false;
    const buttons = $$('button[role="button"], button', cell);
    for (const btn of buttons) {
      const btnText = (btn.textContent || '').trim();
      const testid = btn.getAttribute('data-testid') || '';
      if (testid.toLowerCase().includes('unfollow') ||
        btnText === '팔로잉' || btnText === 'Following') {
        isMyFollowing = true;
        break;
      }
    }

    return { username, displayName, hasFollowsYou, isMyFollowing };
  }

  function followParseCells() {
    const pageType = getPageType();
    if (!pageType) return 0;
    const cells = $$('[data-testid="UserCell"]');
    let added = 0;
    for (const cell of cells) {
      if (isInExcludedArea(cell)) continue;
      const info = parseFollowCell(cell);
      if (!info) continue;

      let isTarget = false;
      if (pageType === 'followers') {
        isTarget = !info.isMyFollowing;
      } else if (pageType === 'following') {
        isTarget = info.isMyFollowing && !info.hasFollowsYou;
      }

      if (isTarget && !followSeen.has(info.username)) {
        followUsers.push(info);
        followSeen.add(info.username);
        added++;
      }
    }
    return added;
  }

  function renderFollowMode() {
    const pageType = getPageType();
    const pageLabel = pageType === 'followers' ? 'Not Following Back'
      : pageType === 'following' ? 'Not Followed Back'
        : 'N/A';

    modeBody.innerHTML = `
      <div class="col">
        <div class="row" style="flex-wrap:wrap">
          <span class="badge">Page: <b id="f-page">${pageType || 'unknown'}</b></span>
          <span class="badge">Type: <b id="f-type">${pageLabel}</b></span>
        </div>
        <div class="row" style="flex-wrap:wrap">
          <button id="f-start" class="btn accent" title="Auto scroll & scan">Start Scan</button>
          <button id="f-stop"  class="btn secondary" disabled>Stop</button>
          <button id="f-clear" class="btn secondary">Clear</button>
        </div>
        <div class="row" style="flex-wrap:wrap">
          <span class="badge">Found: <b id="f-count">${followUsers.length}</b></span>
          <span class="badge">New: <b id="f-delta">0</b></span>
          <span class="badge">Status: <b id="f-status">idle</b></span>
        </div>
      </div>

      <div class="separator"></div>

      <div class="col">
        <div class="row">
          <input id="f-filter" placeholder="Search (username / display name)" />
        </div>
        <div class="row" style="gap:8px">
          <div class="btn-group" style="flex:1">
            <span class="btn-group-label">Copy</span>
            <button id="f-copy" class="btn">Text</button>
            <button id="f-csv" class="btn">CSV</button>
            <button id="f-json" class="btn">JSON</button>
          </div>
        </div>
      </div>

      <div id="f-list" class="list"></div>
      <span class="footnote">Data is not transmitted to external servers.</span>
      <span class="footnote">${pageType ? `Scanning: /${pageType}` : 'Navigate to a followers/following page to use this mode.'}</span>
    `;
    wireFollow();
    followRenderList();
  }

  function wireFollow() {
    const el = (id) => shadow.getElementById(id);
    el('f-start').onclick = followAutoScroll;
    el('f-stop').onclick = () => { followRunning = false; };
    el('f-clear').onclick = followClear;
    el('f-filter').oninput = followRenderList;
    el('f-copy').onclick = () => followCopyText(followUsers.map(u => `${u.displayName} (@${u.username})`).join('\n'));
    el('f-csv').onclick = () => followCopyText(followToCSV(followUsers));
    el('f-json').onclick = () => followCopyText(JSON.stringify({ count: followUsers.length, pageType: getPageType(), users: followUsers }, null, 2));

    if (!getPageType()) {
      el('f-start').disabled = true;
    }
  }

  function followRenderList() {
    const filterEl = shadow.getElementById('f-filter');
    const listEl = shadow.getElementById('f-list');
    const countEl = shadow.getElementById('f-count');
    if (!listEl) return;
    const q = (filterEl?.value || '').trim().toLowerCase();
    const sorted = [...followUsers].sort((a, b) => a.username.localeCompare(b.username));
    const filtered = q
      ? sorted.filter(u =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q))
      : sorted;

    const pageType = getPageType();
    listEl.innerHTML = filtered.map(u => `
      <div class="user">
        <div>
          <div>
            <b>${esc(u.displayName || '(no name)')}</b>
            <span class="tag">@${esc(u.username)}</span>
            ${pageType === 'followers' ? '<span class="tag">Not followed</span>' : ''}
            ${pageType === 'following' ? '<span class="tag">No followback</span>' : ''}
          </div>
        </div>
        <a class="link" href="https://x.com/${encodeURIComponent(u.username)}" target="_blank">Open</a>
      </div>
    `).join('');
    if (countEl) countEl.textContent = followUsers.length;
  }

  async function followAutoScroll() {
    if (!getPageType()) return;
    followRunning = true; followStableTicks = 0; followLastCount = followUsers.length;
    const statusEl = shadow.getElementById('f-status');
    const deltaEl = shadow.getElementById('f-delta');
    const startBtn = shadow.getElementById('f-start');
    const stopBtn = shadow.getElementById('f-stop');
    if (statusEl) statusEl.textContent = 'scanning';
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;

    const followScroller = window;

    let endOfPageCount = 0;

    for (let tick = 0; followRunning && tick < FOLLOW_MAX_TICKS; tick++) {
      const added = followParseCells();
      if (deltaEl) deltaEl.textContent = String(added);

      if (tick % 3 === 0 || added > 0) followRenderList();

      if (followUsers.length === followLastCount) {
        followStableTicks++;


        if (followUsers.length > 0 && followStableTicks >= FOLLOW_MAX_STABLE) {

          doScroll(followScroller);
          await sleep(800);
          const retryAdded = followParseCells();
          if (retryAdded > 0) {
            followStableTicks = 0;
            followLastCount = followUsers.length;
            followRenderList();
            continue;
          }
          break;
        }


        if (followUsers.length === 0) {
          const prevScroll = window.scrollY;
          doScroll(followScroller);
          await sleep(500);
          const curScroll = window.scrollY;

          if (Math.abs(curScroll - prevScroll) < 5) {
            endOfPageCount++;
            if (endOfPageCount >= 3) break; // confirm 3 times to be sure
          } else {
            endOfPageCount = 0;
          }
          await sleep(FOLLOW_PAUSE);
          continue;
        }
      } else {
        followLastCount = followUsers.length; followStableTicks = 0;
      }
      doScroll(followScroller);
      await sleep(FOLLOW_PAUSE);
    }


    if (statusEl) {
      statusEl.textContent = followUsers.length === 0 ? 'no results' : 'stopped';
    }
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    followRunning = false;
    followRenderList();
  }

  function followClear() {
    followUsers = []; followSeen = new Set();
    const deltaEl = shadow.getElementById('f-delta');
    const statusEl = shadow.getElementById('f-status');
    if (deltaEl) deltaEl.textContent = '0';
    if (statusEl) statusEl.textContent = 'idle';
    followRenderList();
  }

  function followToCSV(rows) {
    const header = ['username', 'displayName', 'profileUrl'];
    const escCSV = (s = '') => `"${String(s).replace(/"/g, '""')}"`;
    return [header.join(','), ...rows.map(r => [r.username, r.displayName, `https://x.com/${r.username}`].map(escCSV).join(','))].join('\n');
  }

  function followCopyText(txt) {
    const statusEl = shadow.getElementById('f-status');
    navigator.clipboard.writeText(txt).then(() => {
      if (statusEl) { statusEl.textContent = 'copied'; setTimeout(() => statusEl.textContent = 'idle', 1200); }
    });
  }

  // --- MODE 3: Filter ---

  // --- English Strings ---
  const FTR = {
    mAll:'ALL', mVer:'VERIFIED', mNon:'NON-VER',
    dAll:'All posts/replies are shown',
    dVer:'Only Blue+Gold+Gray badge accounts shown\n(Follow/following exempt)',
    dNon:'Paid Premium accounts hidden\nGold+Gray always shown (follow/following exempt)',
    scope:'SCOPE', tl:'Timeline', re:'Detail/Replies', se:'Search',
    rp:'REPOST', hRP:'Hide reposts',
    qt:'QUOTE', qOff:'Off', qOnly:'Quote', qAll:'All',
    fs:'FOLLOW SYNC', syncOk:'Sync complete',
    acct:'Account: @{a}', noAcct:'Not detected',
    fCnt:'Followers: <span>{f}</span> · Following: <span>{g}</span>',
    syncing:'Syncing... {n}',
    clrF:'Reset', clrOk:'Done',
    dbg:'DEBUG',
  };
  const filterTr = (k, p) => {
    let m = FTR[k] ?? k;
    if (p) Object.entries(p).forEach(([pk, pv]) => { m = m.replace(`{${pk}}`, pv); });
    return m;
  };

  // --- Storage Keys & Defaults ---
  const FSK = {
    S:   'xfp_settings',
    WL:  'xfp_whitelist',
    FL:  'xfp_followList',
    FC:  'xfp_followCache',
    CU:  'xfp_currentUser',
    LS:  'xfp_lastSync',
    CJ:  'xfp_collectJob',
    CJ2: 'xfp_collectJob_2',
    FRC: 'xfp_followersCnt',
    FGC: 'xfp_followingCnt',
    AS:  'xfp_autoSynced',
  };
  const FDEF = { mode: 'all', filter: { timeline: true, replies: true, search: true }, repostFilter: false, quoteMode: 'off', debugMode: false };
  let fS = { ...FDEF };
  let fFollowSet = new Set();
  let fWlSet    = new Set();
  const fBc     = new Map();
  let fObs = null, fPend = [], fRafQ = false;

  // --- Badge Detection ---
  function fParseBadge(u) {
    if (!u?.rest_id || typeof u.is_blue_verified !== 'boolean' || !u.is_blue_verified) return null;
    return { id: u.rest_id, prem: u.verified_type !== 'Business' && u.legacy?.verified !== true };
  }
  function fSvgBadge(el) {
    const b = el.querySelector('[data-testid="icon-verified"]');
    if (!b) return false;
    const svg = b.closest('svg') || b;
    const f = svg.getAttribute('fill') || '', s = svg.getAttribute('style') || '';
    if (f.includes('#E8B829') || f.includes('#F4D03F') || s.includes('gold')) return false;
    if (f.includes('#829AAB') || f.includes('grey') || f.includes('gray')) return false;
    return true;
  }
  function fAnyBadge(el) {
    return el.querySelector('[data-testid="icon-verified"],svg[aria-label*="Verified"],[data-testid="UserName"] svg[aria-label="Verified account"],[data-testid="User-Name"] svg[aria-label="Verified account"]') !== null;
  }
  function fChkPrem(uid, el) {
    let v = fBc.get(uid);
    if (v !== undefined) return v;
    v = fSvgBadge(el);
    if (fBc.size >= 10000) fBc.delete(fBc.keys().next().value);
    fBc.set(uid, v);
    return v;
  }

  // --- Tweet Parsing ---
  function fGetAuthor(tw) {
    for (const l of tw.querySelectorAll('a[role="link"][href^="/"]')) {
      if (/재게시함|Retweeted|reposted/i.test(l.textContent || '')) continue;
      const href = l.getAttribute('href');
      if (!href) continue;
      const h = href.slice(1).split('/')[0];
      if (h && h !== 'i' && h !== 'hashtag' && !href.includes('/status/') && !href.includes('/photo/')) return h;
    }
    return null;
  }
  function fGetQBlock(tw) {
    for (const n of tw.querySelectorAll('div,span'))
      if (n.childNodes.length === 1 && (n.textContent?.trim() === '인용' || n.textContent?.trim() === 'Quote') && n.nextElementSibling) return n.nextElementSibling;
    return null;
  }
  function fGetQAuthor(b) {
    const m = (b.textContent || '').match(/^(.+?)@([A-Za-z0-9_]+)/);
    if (m?.[2]) return m[2].toLowerCase();
    for (const l of b.querySelectorAll('a[href^="/"]')) {
      const t = l.textContent || '';
      if (t.startsWith('@')) return t.slice(1).toLowerCase();
      const h = (l.getAttribute('href') || '').slice(1).split('/')[0];
      if (h && !l.getAttribute('href').includes('/status/') && !l.getAttribute('href').includes('/photo/')) return h.toLowerCase();
    }
    return null;
  }

  // --- Filter Apply ---
  const F_AH = 'data-xrr-fh';
  function filterHide(el) { if (el.hasAttribute(F_AH)) return; el.setAttribute(F_AH, '1'); el.style.setProperty('display', 'none', 'important'); }
  function filterShow(el) { el.style.display = ''; el.removeAttribute(F_AH); }
  function filterShowAll() { document.querySelectorAll(`article[${F_AH}]`).forEach(filterShow); }
  function fPageOk() {
    const p = location.pathname;
    return fS.filter[p.includes('/search') ? 'search' : p.includes('/status/') ? 'replies' : 'timeline'] ?? true;
  }
  function fInNet(h) { return fFollowSet.has(h.toLowerCase()) || fWlSet.has(h.toLowerCase()); }
  function fShouldHide(handle, tw) {
    if (fS.mode === 'verified') return !fAnyBadge(tw) && (!handle || !fInNet(handle));
    return handle && fChkPrem(handle, tw) && !fInNet(handle);
  }

  function filterProc(tw) {
    if (tw.hasAttribute(F_AH) || fS.mode === 'all' || !fPageOk()) return;
    const handle = fGetAuthor(tw);
    const isRT = tw.querySelector('[data-testid="socialContext"]') !== null;
    if (isRT) {
      if (fS.repostFilter && handle && fShouldHide(handle, tw)) filterHide(tw);
      return;
    }
    if (fShouldHide(handle, tw)) { filterHide(tw); return; }
    if (fS.quoteMode !== 'off') {
      const qb = fGetQBlock(tw);
      if (qb) {
        const qh = fGetQAuthor(qb);
        let qHide = false;
        if (fS.mode === 'verified') qHide = !fAnyBadge(qb) && (!qh || !fInNet(qh));
        else qHide = qh ? fChkPrem(qh, qb) && !fInNet(qh) : fSvgBadge(qb);
        if (qHide) {
          if (fS.quoteMode === 'entire') { filterHide(tw); return; }
          if (fS.quoteMode === 'quote-only') {
            if (!qb.hasAttribute('data-xrr-qh')) { qb.setAttribute('data-xrr-qh', '1'); qb.style.setProperty('display', 'none', 'important'); }
          }
        }
      }
    }
  }

  function filterSched() {
    if (fRafQ) return;
    fRafQ = true;
    requestAnimationFrame(() => {
      const b = fPend.splice(0);
      for (const t of b) { try { filterProc(t); } catch {} }
      fRafQ = false;
    });
  }

  function filterStartObs() {
    filterStopObs();
    fObs = new MutationObserver(ms => {
      for (const m of ms)
        for (const n of m.addedNodes) {
          if (!(n instanceof HTMLElement)) continue;
          if (n.matches?.('article[data-testid="tweet"]')) fPend.push(n);
          n.querySelectorAll?.('article[data-testid="tweet"]').forEach(t => fPend.push(t));
        }
      if (fPend.length) filterSched();
    });
    fObs.observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  }
  function filterStopObs() {
    if (fObs) { fObs.disconnect(); fObs = null; }
    fPend = []; fRafQ = false;
  }
  function filterReprocess() {
    (document.querySelector('main') || document.body)
      .querySelectorAll('article[data-testid="tweet"]')
      .forEach(t => { if (!t.hasAttribute(F_AH)) { try { filterProc(t); } catch {} } });
  }

  // --- Navigation listener (SPA) ---
  (() => {
    const _push = history.pushState;
    history.pushState = function (...a) { _push.apply(this, a); filterOnNav(); panelAutoState(); };
    window.addEventListener('popstate', () => { filterOnNav(); panelAutoState(); });
  })();
  function filterOnNav() {
    filterStopObs();
    requestAnimationFrame(() => { filterStartObs(); filterReprocess(); });
  }

  // --- Storage / Account / Sync ---
  async function filterSaveFollows(handles) {
    if (!handles.length) return;
    const st = await chrome.storage.local.get([FSK.FC, FSK.CU]);
    const acct = st[FSK.CU] || '', cache = st[FSK.FC] || {};
    const merged = [...new Set([...(acct ? (cache[acct] || []) : []), ...handles])];
    if (acct) cache[acct] = merged;
    await chrome.storage.local.set({ [FSK.FC]: cache, [FSK.FL]: merged, [FSK.LS]: new Date().toISOString() });
    fFollowSet = new Set(merged);
  }
  function filterCollectDOM() {
    if (!location.pathname.includes('/following')) return;
    const scrape = () => {
      const h = [];
      document.querySelectorAll('button[aria-label]').forEach(b => {
        const m = (b.getAttribute('aria-label') || '').match(/(?:팔로잉|Following)\s*@(\S+)/i);
        if (m?.[1]) h.push(m[1].toLowerCase());
      });
      if (h.length) filterSaveFollows(h);
    };
    new MutationObserver(scrape).observe(document.body, { childList: true, subtree: true });
    setTimeout(scrape, 2000);
  }
  async function filterDetectAcct() {
    const el = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]'); if (!el) return;
    const handle = (el.getAttribute('href') || '').slice(1).toLowerCase(); if (!handle) return;
    const st = await chrome.storage.local.get([FSK.CU, FSK.FC, FSK.AS]);
    if (st[FSK.CU] !== handle) {
      const follows = (st[FSK.FC] || {})[handle] || [];
      await chrome.storage.local.set({ [FSK.CU]: handle, [FSK.FL]: follows });
      fFollowSet = new Set(follows);
    }
    if (!st[FSK.AS] || st[FSK.AS] !== handle) {
      await chrome.storage.local.set({ [FSK.AS]: handle, [FSK.CJ]: { handle, state: 'running', count: 0 }, [FSK.CJ2]: { handle, state: 'running', count: 0 } });
      chrome.runtime.sendMessage({ action: 'autoCollect', handle });
    }
    filterRenderSyncSection();
  }
  async function filterRunCollect() {
    const path = location.pathname;
    if (!path.endsWith('/followers') && !path.endsWith('/following') && !path.endsWith('/verified_followers')) return;
    const isFr = path.endsWith('/followers') || path.endsWith('/verified_followers');
    const jobKey = isFr ? FSK.CJ : FSK.CJ2;
    const st = await chrome.storage.local.get([jobKey]);
    const job = st[jobKey]; if (!job || job.state !== 'running') return;
    const expected = `/${job.handle}/${isFr ? 'followers' : 'following'}`;
    if (!path.startsWith(expected)) return;
    let prev = 0, stable = 0;
    const coll = new Set();
    const scrape = () => {
      document.querySelectorAll('[data-testid="UserCell"] a[role="link"][href^="/"]').forEach(l => {
        const h = (l.getAttribute('href') || '').slice(1).split('/')[0]?.toLowerCase();
        if (h && h !== 'i' && /^[a-z0-9_]{1,15}$/.test(h)) coll.add(h);
      });
    };
    const tick = async () => {
      scrape();
      await chrome.storage.local.set({ [jobKey]: { ...job, state: 'running', count: coll.size } });
      if (coll.size === prev) stable++; else { stable = 0; prev = coll.size; }
      if (stable >= 3) {
        const wl = (await chrome.storage.local.get([FSK.WL]))[FSK.WL] || [];
        const merged = [...new Set([...wl, ...coll])];
        const cntKey = isFr ? FSK.FRC : FSK.FGC;
        await chrome.storage.local.set({ [FSK.WL]: merged, [jobKey]: { ...job, state: 'done', count: coll.size }, [cntKey]: coll.size });
        fWlSet = new Set(merged);
        chrome.runtime.sendMessage({ action: 'closeCollectTab' }); return;
      }
      window.scrollBy(0, 1200); setTimeout(tick, 1500);
    };
    setTimeout(tick, 2500);
  }

  // --- Intercept / Message / Settings listeners ---
  function filterInjectIntercept() {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('fetch-interceptor.js');
    (document.head || document.documentElement).appendChild(s);
    s.onload = () => s.remove();
  }
  function filterListenMsg() {
    window.addEventListener('message', e => {
      if (e.source !== window || e.origin !== location.origin) return;
      if (e.data?.type === 'XFP_BADGE_DATA') {
        for (const u of e.data.users) {
          const info = fParseBadge(u);
          if (info) { if (fBc.size >= 10000) fBc.delete(fBc.keys().next().value); fBc.set(info.id, info.prem); }
        }
      }
      if (e.data?.type === 'XFP_FOLLOW_DATA' && e.data.handles?.length) filterSaveFollows(e.data.handles);
    });
  }
  function filterListenSettings() {
    chrome.storage.onChanged.addListener(ch => {
      if (ch[FSK.S]) {
        const prev = fS.mode;
        fS = { ...FDEF, ...ch[FSK.S].newValue };
        if (prev !== fS.mode || fS.mode === 'all') { filterShowAll(); if (fS.mode !== 'all') filterReprocess(); }
        if (currentMode === 'filter') renderFilterMode();
      }
      if (ch[FSK.FL]) fFollowSet = new Set(ch[FSK.FL].newValue || []);
      if (ch[FSK.WL]) fWlSet = new Set(ch[FSK.WL].newValue || []);
    });
  }

  // --- Render Sync Section (used inside Filter panel) ---
  async function filterRenderSyncSection() {
    if (currentMode !== 'filter') return;
    const st = await chrome.storage.local.get([FSK.CU, FSK.FRC, FSK.FGC, FSK.CJ, FSK.CJ2]);
    const acct = st[FSK.CU];
    const acctEl = shadow.getElementById('xrr-f-acct');
    const cntEl  = shadow.getElementById('xrr-f-fcnt');
    const stEl   = shadow.getElementById('xrr-f-syncst');
    const doneEl = shadow.getElementById('xrr-f-syncdone');
    if (acctEl) acctEl.textContent = acct ? filterTr('acct', { a: acct }) : filterTr('noAcct');
    if (cntEl)  cntEl.innerHTML   = filterTr('fCnt', { f: String(st[FSK.FRC] || 0), g: String(st[FSK.FGC] || 0) });
    const j1 = st[FSK.CJ], j2 = st[FSK.CJ2];
    if (j1?.state === 'running' || j2?.state === 'running') {
      if (stEl)   { stEl.textContent = filterTr('syncing', { n: String((j1?.count || 0) + (j2?.count || 0)) }); stEl.style.display = ''; }
      if (doneEl)   doneEl.style.display = 'none';
    } else if (j1?.state === 'done' || j2?.state === 'done') {
      if (stEl)   stEl.style.display = 'none';
      if (doneEl) { doneEl.textContent = filterTr('syncOk'); doneEl.style.display = ''; setTimeout(() => { if (doneEl) doneEl.style.display = 'none'; }, 4000); }
    } else {
      if (stEl)   stEl.style.display = 'none';
    }
  }

  // --- Render Filter Mode UI ---
  function renderFilterMode() {
    // Start observer when entering Filter mode
    filterStartObs();
    if (fS.mode !== 'all') filterReprocess();

    const modeDesc = filterTr({ all: 'dAll', verified: 'dVer', 'non-verified': 'dNon' }[fS.mode] || 'dAll');
    const isVer = fS.mode === 'verified';
    const isNon = fS.mode === 'non-verified';
    const showSync = fS.mode !== 'all';

    modeBody.innerHTML = `
      <div class="col" style="gap:10px">

        <!-- Mode selector -->
        <div class="row" style="gap:0">
          <button id="xrr-fm-all"  class="btn${fS.mode==='all'?' accent':''}" style="flex:1;border-right:none;font-size:11px;padding:7px 6px">${filterTr('mAll')}</button>
          <button id="xrr-fm-ver"  class="btn${isVer?' accent':''}" style="flex:1;border-right:none;font-size:11px;padding:7px 6px">${filterTr('mVer')}</button>
          <button id="xrr-fm-non"  class="btn${isNon?' accent':''}" style="flex:1;font-size:11px;padding:7px 6px">${filterTr('mNon')}</button>
        </div>
        <div class="badge" style="font-size:11px;white-space:pre-wrap;line-height:1.5;padding:6px 10px">${modeDesc}</div>

        <div class="separator"></div>

        <!-- Scope + Repost row -->
        <div class="row" style="align-items:flex-start;gap:16px">
          <div class="col" style="gap:6px;flex:1">
            <span class="footnote" style="color:#aaa;text-transform:uppercase;font-size:10px;letter-spacing:0.08em">${filterTr('scope')}</span>
            <label class="xrr-flbl"><input type="checkbox" id="xrr-ftl" ${fS.filter.timeline?'checked':''}><span>${filterTr('tl')}</span></label>
            <label class="xrr-flbl"><input type="checkbox" id="xrr-fre" ${fS.filter.replies?'checked':''}><span>${filterTr('re')}</span></label>
            <label class="xrr-flbl"><input type="checkbox" id="xrr-fse" ${fS.filter.search?'checked':''}><span>${filterTr('se')}</span></label>
          </div>
          <div class="col" style="gap:6px;flex:1">
            <span class="footnote" style="color:#aaa;text-transform:uppercase;font-size:10px;letter-spacing:0.08em">${filterTr('rp')}</span>
            <label class="xrr-flbl"><input type="checkbox" id="xrr-frpf" ${fS.repostFilter?'checked':''}><span>${filterTr('hRP')}</span></label>
          </div>
        </div>

        <div class="separator"></div>

        <!-- Quote filter -->
        <div class="col" style="gap:6px">
          <span class="footnote" style="color:#aaa;text-transform:uppercase;font-size:10px;letter-spacing:0.08em">${filterTr('qt')}</span>
          <div class="row" style="gap:0">
            <button id="xrr-fq-off"   class="btn${fS.quoteMode==='off'?' accent':''}" style="flex:1;border-right:none;font-size:11px;padding:6px 4px">${filterTr('qOff')}</button>
            <button id="xrr-fq-quote" class="btn${fS.quoteMode==='quote-only'?' accent':''}" style="flex:1;border-right:none;font-size:11px;padding:6px 4px">${filterTr('qOnly')}</button>
            <button id="xrr-fq-all"   class="btn${fS.quoteMode==='entire'?' accent':''}" style="flex:1;font-size:11px;padding:6px 4px">${filterTr('qAll')}</button>
          </div>
        </div>

        <!-- Follow Sync (shown only in ver/non-ver mode) -->
        <div id="xrr-fsync-sec" style="display:${showSync?'flex':'none'};flex-direction:column;gap:8px">
          <div class="separator"></div>
          <div class="col" style="gap:6px">
            <span class="footnote" style="color:#aaa;text-transform:uppercase;font-size:10px;letter-spacing:0.08em">${filterTr('fs')}</span>
            <div class="badge" id="xrr-f-acct" style="font-size:11px">${filterTr('noAcct')}</div>
            <div class="badge" id="xrr-f-fcnt" style="font-size:11px">${filterTr('fCnt',{f:'0',g:'0'})}</div>
            <div id="xrr-f-syncst"  style="display:none;font-family:'JetBrains Mono',monospace;font-size:11px;color:#f97316"></div>
            <div id="xrr-f-syncdone" style="display:none;font-family:'JetBrains Mono',monospace;font-size:11px;color:#22c55e"></div>
            <button id="xrr-f-clrf" class="btn secondary" style="font-size:11px;padding:5px 10px;align-self:flex-start">${filterTr('clrF')}</button>
          </div>
        </div>

        <div class="separator"></div>

        <!-- Debug -->
        <div class="row">
          <label class="xrr-flbl"><input type="checkbox" id="xrr-fdbg" ${fS.debugMode?'checked':''}><span>${filterTr('dbg')}</span></label>
        </div>
        <div id="xrr-fdcon" class="list" style="display:${fS.debugMode?'block':'none'};max-height:120px;font-family:'JetBrains Mono',monospace;font-size:10px;padding:6px"></div>

        <span class="footnote">Filter runs locally. No data is sent externally.</span>
      </div>
    `;
    wireFilterMode();
    filterRenderSyncSection();
    // Poll sync status
    filterSyncPoller();
  }

  let _filterSyncPollerTimer = null;
  function filterSyncPoller() {
    clearInterval(_filterSyncPollerTimer);
    if (currentMode !== 'filter') return;
    _filterSyncPollerTimer = setInterval(async () => {
      if (currentMode !== 'filter') { clearInterval(_filterSyncPollerTimer); return; }
      const st = await chrome.storage.local.get([FSK.CJ, FSK.CJ2]);
      if (st[FSK.CJ]?.state === 'running' || st[FSK.CJ2]?.state === 'running') filterRenderSyncSection();
    }, 1500);
  }

  function wireFilterMode() {
    const el = id => shadow.getElementById(id);

    const saveF = async () => {
      await chrome.storage.local.set({ [FSK.S]: fS });
    };

    // Mode buttons
    const setFMode = async (mode) => {
      fS.mode = mode;
      filterShowAll();
      await saveF();
      renderFilterMode();
      if (fS.mode !== 'all') filterReprocess();
    };
    el('xrr-fm-all')?.addEventListener('click', () => setFMode('all'));
    el('xrr-fm-ver')?.addEventListener('click', () => setFMode('verified'));
    el('xrr-fm-non')?.addEventListener('click', () => setFMode('non-verified'));

    // Scope checkboxes
    el('xrr-ftl')?.addEventListener('change', async e => { fS.filter.timeline = e.target.checked; await saveF(); filterShowAll(); if (fS.mode !== 'all') filterReprocess(); });
    el('xrr-fre')?.addEventListener('change', async e => { fS.filter.replies  = e.target.checked; await saveF(); filterShowAll(); if (fS.mode !== 'all') filterReprocess(); });
    el('xrr-fse')?.addEventListener('change', async e => { fS.filter.search   = e.target.checked; await saveF(); filterShowAll(); if (fS.mode !== 'all') filterReprocess(); });

    // Repost checkbox
    el('xrr-frpf')?.addEventListener('change', async e => { fS.repostFilter = e.target.checked; await saveF(); filterShowAll(); if (fS.mode !== 'all') filterReprocess(); });

    // Quote buttons
    const setQMode = async (mode) => { fS.quoteMode = mode; await saveF(); renderFilterMode(); };
    el('xrr-fq-off')?.addEventListener('click', () => setQMode('off'));
    el('xrr-fq-quote')?.addEventListener('click', () => setQMode('quote-only'));
    el('xrr-fq-all')?.addEventListener('click', () => setQMode('entire'));

    // Debug toggle
    el('xrr-fdbg')?.addEventListener('change', async e => {
      fS.debugMode = e.target.checked;
      await saveF();
      const con = el('xrr-fdcon');
      if (con) con.style.display = fS.debugMode ? 'block' : 'none';
    });


    // Clear follows
    el('xrr-f-clrf')?.addEventListener('click', async () => {
      const st = await chrome.storage.local.get([FSK.CU, FSK.FC]);
      const acct = st[FSK.CU]; if (!acct) return;
      const cache = st[FSK.FC] || {}; delete cache[acct];
      await chrome.storage.local.set({ [FSK.FC]: cache, [FSK.FL]: [], [FSK.WL]: [], [FSK.LS]: null, [FSK.FRC]: 0, [FSK.FGC]: 0, [FSK.AS]: null, [FSK.CJ]: null, [FSK.CJ2]: null });
      fFollowSet = new Set(); fWlSet = new Set();
      const btn = el('xrr-f-clrf');
      if (btn) { btn.textContent = filterTr('clrOk'); setTimeout(() => { if (btn) btn.textContent = filterTr('clrF'); }, 2000); }
      filterRenderSyncSection();
    });
  }

  // --- Filter Init (runs once at startup) ---
  async function filterInit() {
    const st = await chrome.storage.local.get([FSK.S, FSK.FL, FSK.WL, FSK.FC, FSK.CU]);
    fS = { ...FDEF, ...(st[FSK.S] || {}) };
    const acct = st[FSK.CU] || '', cache = st[FSK.FC] || {};
    fFollowSet = new Set(acct ? (cache[acct] || []) : (st[FSK.FL] || []));
    fWlSet     = new Set(st[FSK.WL] || []);
    filterInjectIntercept();
    filterListenMsg();
    filterListenSettings();
    filterCollectDOM();
    setTimeout(filterDetectAcct, 3000);
    filterRunCollect();
    // Start observer only if Filter mode is active
    if (currentMode === 'filter') {
      filterStartObs();
      if (fS.mode !== 'all') filterReprocess();
    }
  }

  // ========= Initial Render =========
  const _initPage = getPageType();
  const _initRaffle = isRafflePage();

  if (_initRaffle) {
    // 재게시 / 마음에 들어요 → MODE 1 전체 표시
    currentMode = 'raffle';
    modeBtn.textContent = MODE_LABELS['raffle'];
    renderModeBody();
    raffleParseRT();
    raffleRenderList();
  } else if (_initPage) {
    // 팔로워 / 팔로잉 → MODE 2 전체 표시
    currentMode = 'follow';
    modeBtn.textContent = MODE_LABELS['follow'];
    renderModeBody();
  } else {
    // 그 외 메인/Grok 등 → MODE 1 렌더 후 최소화
    currentMode = 'raffle';
    modeBtn.textContent = MODE_LABELS['raffle'];
    renderModeBody();
    collapsePanel();
  }

  // Initialise Filter Pro logic
  filterInit();
})();
