/* Native X columns: keep React, virtual scrolling and post actions inside each document. */
(() => {
  const KEY = 'xhub_vertical_v1';
  const MAX_COLUMNS = 8;
  const DEFAULTS = [
    { title: '홈', path: '/home' },
    { title: '알림', path: '/notifications' },
    { title: '북마크', path: '/i/bookmarks' },
    { title: '탐색', path: '/explore' },
  ];
  const isColumn = window !== window.top && window.frameElement?.hasAttribute('data-xhub-column');
  globalThis.XHubVertical = { isColumn, open, close };
  if (window !== window.top) {
    if (isColumn) prepareColumn();
    return;
  }

  let host, root, deck, config, priorOverflow, priorInert, returnFocus, frameToken;
  let saving = Promise.resolve();
  const frames = new Map();

  function normalizePath(value) {
    const url = new URL(value, 'https://x.com');
    if (!['https://x.com', 'https://twitter.com'].includes(url.origin) || url.username || url.password) throw new Error('X 주소만 사용할 수 있습니다.');
    if (!/^\/(home|explore|notifications(?:\/mentions)?|i\/bookmarks|i\/lists\/\d+|search|[a-zA-Z0-9_]{1,15})\/?$/.test(url.pathname)) throw new Error('홈, 알림, 북마크, 검색, 프로필 또는 리스트 주소를 입력하세요.');
    return url.pathname + url.search;
  }

  function button(text, label, action) {
    const el = document.createElement('button');
    el.type = 'button'; el.textContent = text; el.title = label; el.setAttribute('aria-label', label);
    el.onclick = action;
    return el;
  }

  async function open() {
    if (host) return;
    host = document.createElement('div');
    host.id = 'xhub-vertical';
    const version = chrome.runtime.getManifest?.().version || '3.3.1';
    host.dataset.xhubVersion = version;
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#000000;color:#f0f0f0;';
    root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host {
        --xh-bg: #000000;
        --xh-surface: #0a0a0a;
        --xh-border: #333333;
        --xh-text: #f0f0f0;
        --xh-secondary: #cccccc;
        --xh-muted: #888888;
        --xh-highlight: #C73DD9;
        --xh-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        --xh-mono: 'JetBrains Mono', ui-monospace, monospace;
        font: 14px var(--xh-sans);
        color: var(--xh-text);
        color-scheme: dark;
        -webkit-font-smoothing: antialiased;
      }
      * { box-sizing: border-box; border-radius: 0; }
      [hidden] { display: none !important; }
      .workspace { height: 100%; display: flex; flex-direction: column; background: var(--xh-bg); }
      .toolbar {
        display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
        padding: 14px 20px; border-bottom: 1px solid var(--xh-border); background: var(--xh-bg);
      }
      .brand { display: flex; align-items: center; gap: 12px; font-size: 18px; font-weight: 600; letter-spacing: .08em; white-space: nowrap; }
      .mode-label { border: 1px solid var(--xh-highlight); padding: 5px 10px; color: var(--xh-highlight); font: 700 12px var(--xh-mono); letter-spacing: .05em; }
      .version { color: var(--xh-muted); font: 11px var(--xh-mono); letter-spacing: 0; }
      .tag { padding-left: 16px; border-left: 1px solid var(--xh-border); font-size: 12px; color: var(--xh-muted); }
      .spacer { flex: 1; }
      button, a, input, select { font: inherit; }
      button, a { color: var(--xh-text); }
      button {
        padding: 8px 14px; border: 1px solid var(--xh-border); background: transparent;
        color: var(--xh-secondary); cursor: pointer; white-space: nowrap;
        font: 700 12px var(--xh-mono); letter-spacing: .05em;
        transition: color .15s, border-color .15s, background-color .15s;
      }
      button:hover, .column header a:hover { background: #ffffff; border-color: #ffffff; color: #000000; }
      button:disabled { opacity: .35; cursor: default; pointer-events: none; }
      button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible {
        outline: 2px solid var(--xh-highlight); outline-offset: 2px;
      }
      .primary { border-color: var(--xh-highlight); color: var(--xh-highlight); }
      .primary:hover { background: var(--xh-highlight); border-color: var(--xh-highlight); color: #000000; }
      .toolbar label { display: flex; align-items: center; gap: 8px; color: var(--xh-muted); font-size: 12px; white-space: nowrap; }
      .toolbar select { width: auto; padding: 7px 10px; }
      .deck { display: flex; gap: 10px; padding: 10px; flex: 1; min-height: 0; overflow-x: auto; align-items: stretch; overscroll-behavior: contain; scrollbar-color: #333333 #000000; }
      .column {
        flex: 1 0 var(--column-width,380px); min-width: 360px; border: 1px solid var(--xh-border);
        display: flex; flex-direction: column; background: var(--xh-bg); overflow: hidden;
      }
      .column:focus-within { border-color: var(--xh-highlight); }
      .column header { padding: 9px; display: flex; align-items: center; gap: 4px; background: var(--xh-bg); border-bottom: 1px solid var(--xh-border); min-height: 52px; }
      .column h2 { margin: 0 5px; font-size: 14px; font-weight: 600; letter-spacing: .04em; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .column header button, .column header a { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; padding: 4px 6px; font: 14px var(--xh-mono); }
      .column header a { border: 1px solid var(--xh-border); text-decoration: none; color: var(--xh-secondary); }
      iframe { display: block; width: 100%; flex: 1; min-height: 0; border: 0; background: var(--xh-bg); color-scheme: dark; }
      .status { font: 12px var(--xh-mono); line-height: 1.6; color: var(--xh-secondary); padding: 8px 12px; background: var(--xh-surface); border-bottom: 1px solid var(--xh-border); }
      .status[hidden] { display: none; }
      .deck.focused .column { display: none; }
      .deck.focused .column.focus { display: flex; max-width: 850px; margin: auto; flex-basis: 100%; height: 100%; border-color: var(--xh-highlight); }
      dialog { color: var(--xh-text); background: var(--xh-bg); border: 1px solid var(--xh-border); border-top: 2px solid var(--xh-highlight); width: min(440px,calc(100vw - 32px)); padding: 20px; box-shadow: 0 8px 32px rgba(0,0,0,.6); }
      dialog::backdrop { background: rgba(0,0,0,.8); }
      form { display: grid; gap: 16px; }
      form h2 { margin: 0; padding-bottom: 12px; border-bottom: 1px solid var(--xh-border); font-size: 18px; font-weight: 600; letter-spacing: .04em; }
      label { display: grid; gap: 8px; color: var(--xh-secondary); font-size: 12px; }
      input, select { width: 100%; min-width: 0; padding: 10px; border: 1px solid var(--xh-border); background: var(--xh-bg); color: var(--xh-text); accent-color: var(--xh-highlight); }
      input:hover, select:hover { border-color: var(--xh-muted); }
      p { line-height: 1.6; margin: 0; color: var(--xh-muted); font-size: 12px; }
      .error { color: var(--xh-highlight); }
      .error:empty { display: none; }
      .actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 12px; border-top: 1px solid var(--xh-border); }
      @media(max-width:600px) {
        .tag { display: none; }
        .toolbar { padding: 10px; gap: 8px; }
        .brand { font-size: 16px; gap: 8px; }
        .column { min-width: calc(100vw - 22px); flex-basis: calc(100vw - 22px); }
      }
      @media(prefers-reduced-motion:reduce) { button { transition: none; } }
    </style><section class="workspace" aria-label="X HUB Vertical">
      <div class="toolbar"><span class="brand">X HUB <span class="mode-label">VERTICAL</span></span><span class="tag">여러 타임라인, 한 화면</span><span class="spacer"></span><label>열 너비 <select aria-label="열 너비"><option value="360">좁게</option><option value="420">보통</option><option value="520">넓게</option></select></label><button class="primary" id="add">+ 열 추가</button><button id="exit">기본 화면으로</button></div>
      <div class="deck"></div>
      <dialog><form><h2>타임라인 추가</h2><label>종류<select name="type"><option value="home">홈</option><option value="notifications">알림</option><option value="bookmarks">북마크</option><option value="explore">탐색</option><option value="search">검색</option><option value="profile">프로필</option><option value="list">리스트</option></select></label><label id="value-label">검색어 / @아이디 / 리스트 URL<input name="value" maxlength="500" autocomplete="off"></label><label>열 이름 (선택)<input name="title" maxlength="40" autocomplete="off"></label><p>각 열에서 X의 좋아요, 재게시, 답글을 그대로 사용할 수 있습니다. 대화창이 좁으면 열 확대를 누르세요.</p><p class="error" role="alert"></p><div class="actions"><button type="button" id="cancel">취소</button><button class="primary" type="submit">추가</button></div></form></dialog>
    </section>`;
    const versionLabel = document.createElement('span');
    versionLabel.className = 'version';
    versionLabel.textContent = `v${version}`;
    root.querySelector('.brand').append(versionLabel);
    returnFocus = document.activeElement;
    priorOverflow = document.documentElement.style.overflow;
    priorInert = document.body.inert;
    document.body.inert = true;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.append(host);
    const thisHost = host;
    deck = root.querySelector('.deck');
    root.querySelector('#exit').onclick = close;
    root.querySelector('#add').onclick = () => root.querySelector('dialog').showModal();
    root.querySelector('#cancel').onclick = () => root.querySelector('dialog').close();
    root.querySelector('form').onsubmit = addColumn;
    const type = root.querySelector('[name=type]');
    type.onchange = () => { root.querySelector('#value-label').hidden = !['search', 'profile', 'list'].includes(type.value); };
    type.onchange();
    root.querySelector('[aria-label="열 너비"]').onchange = e => { config.width = Number(e.target.value); resize(); save(); };
    window.addEventListener('resize', resize);
    root.querySelector('#exit').focus();
    try {
      const session = await chrome.runtime.sendMessage({ action: 'startVertical' });
      if (host !== thisHost) return;
      if (!session?.token) throw new Error('Vertical 초기화 실패');
      frameToken = session.token;
      const stored = (await chrome.storage.local.get(KEY))[KEY];
      if (host !== thisHost) return;
      config = { width: [360,420,520].includes(stored?.width) ? stored.width : 360, columns: [] };
      for (const item of (Array.isArray(stored?.columns) ? stored.columns : DEFAULTS).slice(0, MAX_COLUMNS)) {
        try { config.columns.push({ title: String(item.title || '타임라인').slice(0,40), path: normalizePath(item.path), id: crypto.randomUUID() }); } catch { /* Ignore invalid saved columns. */ }
      }
      if (!config.columns.length && stored?.columns?.length !== 0) config.columns = DEFAULTS.map(c => ({ ...c, id: crypto.randomUUID() }));
      root.querySelector('[aria-label="열 너비"]').value = String(config.width);
      render();
    } catch {
      if (host !== thisHost) return;
      root.querySelector('.tag').textContent = '초기화 실패 · 확장 프로그램을 새로고침한 뒤 다시 열어주세요.';
      root.querySelector('#add').disabled = true;
    }
  }

  function resize() {
    if (!deck || !config) return;
    const count = Math.max(1, Math.min(config.columns.length, 5, Math.floor((host.clientWidth - 10) / (config.width + 10))));
    deck.style.setProperty('--column-width', `${Math.max(config.width, (host.clientWidth - 10) / count - 10)}px`);
  }
  function save() {
    const snapshot = JSON.parse(JSON.stringify(config));
    saving = saving.catch(() => {}).then(() => chrome.storage.local.set({ [KEY]: snapshot })).catch(() => {
      if (root) root.querySelector('.tag').textContent = '설정 저장 실패 · 확장 프로그램을 다시 로드하세요';
    });
  }
  function render() {
    const ids = new Set(config.columns.map(c => c.id));
    for (const [id, item] of frames) if (!ids.has(id)) { clearTimeout(item.timer); item.node.remove(); frames.delete(id); }
    config.columns.forEach((column, index) => {
      if (!frames.has(column.id)) frames.set(column.id, createColumn(column));
      const item = frames.get(column.id);
      // Moving an iframe in the DOM reloads it. CSS order preserves its scroll,
      // draft text and native post state while changing the visual column order.
      if (!item.node.isConnected) deck.append(item.node);
      item.node.style.order = index;
      item.left.disabled = index === 0; item.right.disabled = index === config.columns.length - 1;
    });
    root.querySelector('#add').disabled = config.columns.length >= MAX_COLUMNS;
    resize();
  }
  function createColumn(column) {
    const node = document.createElement('section'); node.className = 'column';
    const header = document.createElement('header');
    const title = document.createElement('h2'); title.textContent = column.title; title.title = column.title;
    const status = document.createElement('div'); status.className = 'status'; status.setAttribute('role', 'status');
    const frame = document.createElement('iframe'); frame.setAttribute('data-xhub-column', '1'); frame.title = `${column.title} 타임라인`;
    frame.allow = 'fullscreen';
    const item = { node, frame, timer: null };
    function load() {
      clearTimeout(item.timer); status.hidden = false; status.textContent = 'X 타임라인 불러오는 중…';
      // X's service worker serves /home, /notifications and /explore from a shell
      // cache; DNR cannot modify responses supplied by that cache. Bootstrap via
      // the uncached bookmarks route, then let X's router navigate in this frame.
      const url = new URL('/i/bookmarks', location.origin);
      url.searchParams.set('xhub_column', frameToken);
      url.searchParams.set('xhub_target', column.path);
      frame.src = url.href;
      item.timer = setTimeout(() => { status.textContent = '로드가 지연되거나 X가 임베딩을 차단했습니다. ↗로 원본을 열거나 ↻로 다시 시도하세요.'; status.hidden = false; }, 25000);
    }
    const move = direction => {
      const i = config.columns.indexOf(column), j = i + direction;
      if (j < 0 || j >= config.columns.length) return;
      [config.columns[i], config.columns[j]] = [config.columns[j], config.columns[i]]; render(); save();
    };
    item.left = button('‹', `${column.title} 왼쪽으로 이동`, () => move(-1));
    item.right = button('›', `${column.title} 오른쪽으로 이동`, () => move(1));
    const focus = button('⛶', `${column.title} 열 확대 / 복귀`, () => { const on = !node.classList.contains('focus'); deck.querySelectorAll('.focus').forEach(n => n.classList.remove('focus')); node.classList.toggle('focus', on); deck.classList.toggle('focused', on); });
    const external = document.createElement('a'); external.textContent = '↗'; external.href = new URL(column.path, location.origin).href; external.target = '_blank'; external.rel = 'noopener noreferrer'; external.title = `${column.title} 새 탭에서 열기`;
    header.append(title, item.left, item.right, button('↻', `${column.title} 새로고침`, load), focus, external, button('×', `${column.title} 열 삭제`, () => {
      if (node.classList.contains('focus')) deck.classList.remove('focused');
      config.columns = config.columns.filter(c => c !== column); render(); save();
    }));
    node.append(header, status, frame); load(); return item;
  }
  function addColumn(event) {
    event.preventDefault();
    if (!config || config.columns.length >= MAX_COLUMNS) return;
    const form = event.currentTarget, type = form.elements.type.value, value = form.elements.value.value.trim();
    try {
      let path = ({ home:'/home', notifications:'/notifications', bookmarks:'/i/bookmarks', explore:'/explore' })[type];
      if (type === 'search') { if (!value) throw new Error('검색어를 입력하세요.'); path = `/search?q=${encodeURIComponent(value)}&f=live`; }
      if (type === 'profile') { if (!/^@?[a-zA-Z0-9_]{1,15}$/.test(value)) throw new Error('올바른 @아이디를 입력하세요.'); path = '/' + value.replace(/^@/, ''); }
      if (type === 'list') { path = /^\d+$/.test(value) ? `/i/lists/${value}` : normalizePath(value); if (!/^\/i\/lists\/\d+\/?$/.test(path)) throw new Error('리스트 ID 또는 X 리스트 URL을 입력하세요.'); }
      config.columns.push({ id: crypto.randomUUID(), title: form.elements.title.value.trim() || value || form.elements.type.selectedOptions[0].textContent, path: normalizePath(path) });
      render(); save(); root.querySelector('dialog').close(); form.reset(); form.elements.type.onchange(); root.querySelector('.error').textContent = '';
      deck.scrollLeft = deck.scrollWidth;
    } catch (error) { root.querySelector('.error').textContent = error.message; }
  }
  function close() {
    if (!host) return;
    frames.forEach(item => clearTimeout(item.timer)); frames.clear();
    window.removeEventListener('resize', resize);
    host.remove(); host = root = deck = null;
    chrome.runtime.sendMessage({ action: 'stopVertical' }).catch(() => {});
    document.documentElement.style.overflow = priorOverflow;
    document.body.inert = priorInert;
    returnFocus?.focus();
    window.dispatchEvent(new Event('xhub-vertical-close'));
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.data?.type !== 'XHUB_COLUMN_READY') return;
    for (const item of frames.values()) if (event.source === item.frame.contentWindow) { clearTimeout(item.timer); item.node.querySelector('.status').hidden = true; }
  });

  function prepareColumn() {
    const requested = new URLSearchParams(location.search).get('xhub_target');
    let target;
    try { target = requested && normalizePath(requested); } catch { target = null; }
    let routed = !target;
    document.documentElement.setAttribute('data-xhub-column', '1');
    const css = document.createElement('style');
    css.textContent = `
      html[data-xhub-column] body{min-width:0!important}
      html[data-xhub-column] header[role="banner"],html[data-xhub-column] [data-testid="sidebarColumn"],html[data-xhub-column] [data-testid="BottomBar"],html[data-xhub-column] [data-testid="DMDrawer"]{display:none!important}
      html[data-xhub-column] main[role="main"]{width:100%!important;min-width:0!important;align-items:stretch!important}
      html[data-xhub-column] main[role="main"]>div{width:100%!important;max-width:none!important}
      html[data-xhub-column] [data-testid="primaryColumn"]{width:100%!important;max-width:none!important;min-width:0!important;border:0!important}
      html[data-xhub-column] article [role="group"]{flex-wrap:wrap!important;column-gap:4px!important;row-gap:8px!important}
      html[data-xhub-column] [role="dialog"]{min-width:0!important;max-width:100vw!important}
    `;
    document.documentElement.append(css);
    const ready = () => {
      if (!document.querySelector('[data-testid="primaryColumn"]')) return false;
      if (!routed) {
        routed = true;
        const anchor = Array.from(document.querySelectorAll('a[href]')).find(a => a.getAttribute('href') === target);
        if (anchor) anchor.click();
        else {
          // A synthetic popstate is ignored by X's router. A real history
          // traversal gives it a native event, including for custom search/list URLs.
          const bootstrap = location.href;
          history.replaceState({ key: crypto.randomUUID() }, '', target);
          history.pushState({ key: crypto.randomUUID() }, '', bootstrap);
          history.back();
        }
      }
      window.parent.postMessage({ type: 'XHUB_COLUMN_READY' }, location.origin); return true;
    };
    if (!ready()) {
      const observer = new MutationObserver(() => { if (ready()) observer.disconnect(); });
      observer.observe(document.body, { childList:true, subtree:true });
      setTimeout(() => observer.disconnect(), 30000);
    }
  }
})();
