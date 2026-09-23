const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..', 'dist');
http.createServer((req,res) => {
 const pathname = new URL(req.url, 'http://localhost').pathname;
 if (['/vertical.js','/content.js'].includes(pathname)) { res.setHeader('Content-Type','text/javascript; charset=utf-8'); res.end(fs.readFileSync(path.join(root,pathname))); return; }
 res.setHeader('Content-Type','text/html; charset=utf-8');
 res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>X HUB 개발 검증</title><style>body{margin:0;background:#000;color:#e7e9ea;font:15px system-ui}main{display:flex;justify-content:center}main>div{width:600px}[data-testid=primaryColumn]{width:600px}article{padding:18px;border-bottom:1px solid #333;line-height:1.7}article [role=group]{display:flex;justify-content:space-between;gap:12px}button{background:#17202c;border:1px solid #344153;color:#ddd;padding:8px;border-radius:6px}header{padding:15px}</style>
 <header role="banner">X · 로컬 검증용 가상 타임라인</header><main role="main"><div><section data-testid="primaryColumn"><h2>${pathname === '/home' ? '홈' : pathname === '/notifications' ? '알림' : pathname === '/i/bookmarks' ? '북마크' : '탐색'}</h2>${Array.from({length:20},(_,i)=>`<article data-testid="tweet"><div data-testid="User-Name"><a role="link" href="/sample${i}">테스트 계정 ${i+1}</a>${i%2 ? '<svg data-testid="icon-verified" fill="#1d9bf0" width="14" height="14"><circle cx="7" cy="7" r="6"/></svg>':''}</div><p>각 열의 독립 스크롤과 게시물 액션 영역을 점검하는 가상 게시물입니다. 긴 본문과 숫자가 있어도 버튼이 잘리지 않아야 합니다.</p><div role="group"><button onclick="this.textContent='답글 열림'">답글 120</button><button onclick="this.textContent='재게시 메뉴'">재게시 1.2천</button><button onclick="this.textContent='좋아요 취소'">♡ 2.5만</button><button>북마크</button><button>공유</button></div></article>`).join('')}</section></div></main>
 <script>
 window.addEventListener('popstate',()=>{document.querySelector('h2').textContent=({ '/home':'홈', '/notifications':'알림', '/i/bookmarks':'북마크', '/explore':'탐색' })[location.pathname] || '검색';});
 const listeners=[];
 const data=JSON.parse(localStorage.getItem('xhub-test') || '{}');
 window.chrome={storage:{local:{get:async keys=>Object.fromEntries((typeof keys==='string'?[keys]:keys).map(k=>[k,data[k]])),set:async patch=>{const changes={};for(const [k,v] of Object.entries(patch)){changes[k]={oldValue:data[k],newValue:v};data[k]=v}localStorage.setItem('xhub-test',JSON.stringify(data));listeners.forEach(fn=>fn(changes,'local'));}},onChanged:{addListener:fn=>listeners.push(fn)}},runtime:{onMessage:{addListener:()=>{}},sendMessage:async msg=>msg.action==='startVertical'?{token:'local-fixture'}:false}};
 </script><script src="/vertical.js"></script><script src="/content.js"></script></html>`);
}).listen(8765,'127.0.0.1',()=>console.log('Fixture: http://127.0.0.1:8765/home'));
