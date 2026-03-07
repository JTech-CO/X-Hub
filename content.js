(() => {
  // ========= Utilities =========
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  if (window.__X_RAFFLE_PANEL__) return;
  window.__X_RAFFLE_PANEL__ = true;

  // ========= Common Helpers =========
  function esc(s) {
    return (s || '').replace(/[&<>"']/g, m =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // ========= Scope Detection (Raffle) =========
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
    // Find region with most UserCells
    const regions = Array.from(PRIMARY.querySelectorAll('[role="region"]'));
    if (regions.length) {
      regions.sort((a, b) => ($$('[data-testid="UserCell"]', b).length - $$('[data-testid="UserCell"]', a).length));
      if ($$('[data-testid="UserCell"]', regions[0]).length > 0) return regions[0];
    }
    // Fallback
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

  // ========= Shadow Panel =========
  const host = document.createElement('div');
  Object.assign(host.style, {
    all: 'unset', position: 'fixed', top: '12px', right: '12px',
    zIndex: 2147483647, width: '440px', pointerEvents: 'auto'
  });
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });

  // ========= CSS =========
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
      color: #e0e0e0;
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
      font-size: 16px;
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
      font-size: 13px;
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
      color: #aaaaaa;
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
      border-color: #f97316;
      color: #f97316;
      background: transparent;
      font-size: 11px;
      padding: 5px 10px;
    }
    .btn.orange:hover {
      background: #f97316;
      color: #000000;
    }
    .btn.close-btn {
      padding: 4px 10px;
      font-size: 18px;
      font-family: 'Inter', sans-serif;
      line-height: 1;
      border-color: #333333;
      color: #aaaaaa;
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
      font-size: 13px;
      font-weight: 400;
      padding: 4px 10px;
      border: 1px solid #333333;
      background: #0a0a0a;
      color: #aaaaaa;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge b {
      color: #e0e0e0;
      font-weight: 700;
    }

    /* --- Inputs & Selects --- */
    input, select {
      width: 100%;
      padding: 8px 12px;
      background: #111111;
      border: 1px solid #333333;
      border-radius: 0;
      color: #e0e0e0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      transition: border-color 0.2s ease;
    }
    input:focus, select:focus {
      outline: none;
      border-color: #ffffff;
    }
    input::placeholder {
      color: #777777;
    }
    select option {
      background: #111111;
      color: #e0e0e0;
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
      font-size: 14px;
    }
    .tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 400;
      padding: 2px 6px;
      border: 1px solid #333333;
      background: transparent;
      color: #aaaaaa;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-left: 6px;
    }
    .user-desc {
      font-size: 13px;
      color: #aaaaaa;
      font-weight: 300;
      line-height: 1.5;
      white-space: pre-wrap;
      margin-top: 3px;
    }
    a.link {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
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
      font-size: 11px;
      color: #777777;
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
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #aaaaaa;
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
      font-size: 13px;
      color: #555555;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `;

  // ========= HTML Shell =========
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `
    <div class="card-body">
      <div class="header">
        <h3>X Reposts Raffle</h3>
        <div class="header-right">
          <button id="mode-btn" class="btn orange" title="Switch mode">Raffle</button>
          <button id="close" class="btn close-btn" title="Close">×</button>
        </div>
      </div>
      <div id="mode-body"></div>
    </div>
  `;
  shadow.append(styleEl, wrap);

  const modeBtn = shadow.getElementById('mode-btn');
  const modeBody = shadow.getElementById('mode-body');

  shadow.getElementById('close').onclick = () => {
    raffleRunning = false;
    followRunning = false;
    host.remove();
    window.__X_RAFFLE_PANEL__ = false;
  };

  // ========= Mode System =========
  let currentMode = 'raffle';
  const MODES = ['raffle', 'follow', 'cleaner'];
  const MODE_LABELS = { raffle: 'Raffle', follow: 'Follow', cleaner: 'Cleaner' };

  modeBtn.onclick = () => {
    // Stop running processes before switching
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
      case 'cleaner': renderCleanerMode(); break;
    }
  }

  // ================================================================
  //  MODE 1 — RAFFLE
  // ================================================================
  let raffleRunning = false;
  let raffleExtracted = false;
  let raffleUsers = [];
  let raffleSeen = new Set();
  let raffleLastCount = 0;
  let raffleStableTicks = 0;
  const RAFFLE_MAX_STABLE = 3;
  const RAFFLE_PAUSE = 700;
  const RAFFLE_MAX_TICKS = 200;
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

  // ================================================================
  //  MODE 2 — FOLLOW (Mutual Follow Check)
  // ================================================================
  let followRunning = false;
  let followUsers = [];
  let followSeen = new Set();
  let followLastCount = 0;
  let followStableTicks = 0;
  const FOLLOW_MAX_STABLE = 5;
  const FOLLOW_PAUSE = 800;
  const FOLLOW_MAX_TICKS = 200;

  function getPageType() {
    const path = location.pathname;
    if (path.endsWith('/followers') || path.includes('/followers/')) return 'followers';
    if (path.endsWith('/following') || path.includes('/following/')) return 'following';
    if (path.includes('/verified_followers')) return 'followers';
    return null;
  }

  function parseFollowCell(cell) {
    // Extract username from links
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

    // Extract display name
    let displayName = '';
    const nameEl = cell.querySelector('div[dir="ltr"] span');
    if (nameEl) displayName = nameEl.textContent.trim();

    // Check "Follows you" badge
    const cellText = (cell.innerText || cell.textContent || '').trim();
    const hasFollowsYou =
      cellText.includes('Follows you') ||
      cellText.includes('나를 팔로우합니다') ||
      cellText.includes('나를 팔로우함') ||
      cellText.includes('나를 팔로우 중');

    // Check if I'm following them (button state)
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
        // Case 1: They follow me, but I don't follow them back
        isTarget = !info.isMyFollowing;
      } else if (pageType === 'following') {
        // Case 2: I follow them, but they don't follow me back
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

    // Disable start if not on a valid page
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

    for (let tick = 0; followRunning && tick < FOLLOW_MAX_TICKS; tick++) {
      const added = followParseCells();
      if (deltaEl) deltaEl.textContent = String(added);
      followRenderList();
      if (followUsers.length === followLastCount) {
        followStableTicks++;
        if (followStableTicks >= FOLLOW_MAX_STABLE) break;
      } else {
        followLastCount = followUsers.length; followStableTicks = 0;
      }
      window.scrollBy(0, Math.max(400, window.innerHeight * 0.8));
      await sleep(FOLLOW_PAUSE);
    }

    if (statusEl) statusEl.textContent = 'stopped';
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    followRunning = false;
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

  // ================================================================
  //  MODE 3 — CLEANER (Placeholder)
  // ================================================================
  function renderCleanerMode() {
    modeBody.innerHTML = `
      <div class="placeholder">
        Cleaner mode — Coming soon
      </div>
    `;
  }

  // ========= Initial Render =========
  // Auto-detect best starting mode based on page
  const detectedPage = getPageType();
  if (detectedPage) {
    currentMode = 'follow';
    modeBtn.textContent = MODE_LABELS['follow'];
  }
  renderModeBody();

  // If on raffle page, do initial parse
  if (currentMode === 'raffle') {
    raffleParseRT();
    raffleRenderList();
  }
})();
