const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = file => fs.readFileSync(path.join(__dirname,'..','dist',file),'utf8');
function worker(session={}, local={}) {
 const events={}, removed=[], rules=[];
 let id=100;
 const area = data=>({get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(data[k])])),set:async values=>Object.assign(data,structuredClone(values))});
 const chrome={storage:{session:area(session),local:area(local)},action:{onClicked:{addListener:fn=>events.action=fn}},runtime:{onMessage:{addListener:fn=>events.message=fn}},tabs:{create:async()=>({id:id++}),remove:async id=>removed.push(id),sendMessage:async()=>{},onRemoved:{addListener:fn=>events.removed=fn},onUpdated:{addListener:fn=>events.updated=fn}},declarativeNetRequest:{updateSessionRules:async rule=>rules.push(structuredClone(rule))}};
 vm.runInNewContext(source('background.js'),{chrome,URL,crypto});
 const send=(msg,tabId=1,url='https://x.com/home',frameId=0)=>new Promise(resolve=>{if(!events.message(msg,{tab:{id:tabId},url,frameId},resolve))resolve(undefined)});
 return {send,removed,rules,session,local,events};
}
test('ordinary tabs cannot be closed by stale collection jobs',async()=>{
 const w=worker(); assert.equal(await w.send({action:'closeCollectTab'}),false); assert.deepEqual(w.removed,[]);
});
test('collector ownership persists after worker restart',async()=>{
 const session={}; const w=worker(session); await w.send({action:'autoCollect',handle:'tester'});
 assert.equal(Object.keys(session.xhub_collect_tabs).length,2);
 const restarted=worker(session); assert.equal(await restarted.send({action:'isCollectTab'},100),true);
 await restarted.send({action:'closeCollectTab'},100); assert.deepEqual(restarted.removed,[100]);
});
test('duplicate collection requests do not open duplicate tabs',async()=>{
 const w=worker(); await Promise.all([w.send({action:'autoCollect',handle:'tester'}),w.send({action:'autoCollect',handle:'tester'})]); assert.equal(Object.keys(w.session.xhub_collect_tabs).length,2);
});
test('reject collection URL injection and non-X or child senders',async()=>{
 const w=worker(); assert.equal(await w.send({action:'autoCollect',handle:'../settings'}),false);
 assert.equal(await w.send({action:'autoCollect',handle:'tester'},1,'https://x.com.evil.test/home'),undefined);
 assert.equal(await w.send({action:'autoCollect',handle:'tester'},1,'https://x.com/home',2),undefined);
 assert.equal(w.session.xhub_collect_tabs,undefined);
});
test('parallel follower results merge without losing one list',async()=>{
 const local={xfp_currentUser:'tester',xfp_collectJob:{state:'running'},xfp_collectJob_2:{state:'running'}};
 const w=worker({},local); await w.send({action:'autoCollect',handle:'tester'});
 await Promise.all([w.send({action:'finishCollect',handle:'tester',isFollowers:true,handles:['Alice','bad/name']},100),w.send({action:'finishCollect',handle:'tester',isFollowers:false,handles:['Bob','ALICE']},101)]);
 assert.deepEqual(local.xfp_whitelist,['alice','bob']); assert.equal(local.xfp_followersCnt,1); assert.equal(local.xfp_followingCnt,2);
});
test('an old account collector cannot contaminate the active account',async()=>{
 const w=worker({xhub_collect_tabs:{100:{handle:'old',kind:'followers'}}},{xfp_currentUser:'new',xfp_collectJob:{state:'running'}});
 assert.equal(await w.send({action:'finishCollect',handle:'old',isFollowers:true,handles:['alice']},100),false); assert.equal(w.local.xfp_whitelist,undefined);
});
test('Vertical rule is temporary and scoped to tab, initiator and token',async()=>{
 const w=worker(); const {token}=await w.send({action:'startVertical'}); const rule=w.rules[0].addRules[0];
 assert.deepEqual(rule.condition.tabIds,[1]); assert.deepEqual(rule.condition.resourceTypes,['sub_frame']); assert.deepEqual(rule.condition.initiatorDomains,['x.com']);
 const re=new RegExp(rule.condition.regexFilter);
 assert.ok(re.test('https://x.com/home?xhub_column='+token)); assert.ok(!re.test('https://x.com/home')); assert.ok(!re.test('https://evil.test/home?xhub_column='+token));
 assert.deepEqual(rule.action.responseHeaders,[{header:'x-frame-options',operation:'set',value:'SAMEORIGIN'}]);
 await w.send({action:'stopVertical'}); assert.deepEqual(w.rules.at(-1).addRules,[]);
});
test('frame loading does not remove the active Vertical rule',async()=>{
 const w=worker(); await w.send({action:'startVertical'}); w.events.updated(1,{status:'loading'}); assert.equal(w.rules.length,1);
 w.events.updated(1,{url:'https://x.com/explore'}); assert.equal(w.rules.length,2);
});
function intercept(original) {
 const posted=[]; const win={fetch:original,postMessage:message=>posted.push(message)};
 vm.runInNewContext(source('fetch-interceptor.js'),{window:win,location:{origin:'https://x.com'},URL}); return {win,posted};
}
test('badge parser does not hold up the original network response',async()=>{
 let finish; const parsing=new Promise(resolve=>finish=resolve); const response={clone:()=>({json:()=>parsing})}; const {win,posted}=intercept(async()=>response);
 assert.equal(await win.fetch('/i/api/graphql/id/HomeTimeline'),response); assert.equal(posted.length,0);
 finish({user:{core:{screen_name:'Tester'},is_blue_verified:false}}); await new Promise(setImmediate);
 assert.equal(posted[0].users[0].legacy.screen_name,'Tester'); assert.equal(posted[0].users[0].is_blue_verified,false);
});
test('fetch parser keeps legacy and core handles, deduplicates users',async()=>{
 const u={legacy:{screen_name:'A'},is_blue_verified:true}; const {win,posted}=intercept(async()=>({clone:()=>({json:async()=>({users:[u,u,{core:{screen_name:'B'},is_blue_verified:true}]})})}));
 await win.fetch(new URL('https://x.com/i/api/graphql/id/Feed')); await new Promise(setImmediate); assert.equal(posted[0].users.length,2);
});
test('unrelated requests are not cloned',async()=>{
 let clones=0; const response={clone:()=>{clones++;throw new Error()}}; const {win}=intercept(async()=>response);
 assert.equal(await win.fetch('https://external.test/i/api/graphql/id/Feed'),response); assert.equal(clones,0);
});
test('network rejections remain rejections',async()=>{
 const {win}=intercept(async()=>{throw new Error('offline')}); await assert.rejects(win.fetch('/home'),/offline/);
});
function extract(file,start,end,expression) {const s=source(file);return vm.runInNewContext(s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)))+'\n'+expression,{URL});}
test('column URLs reject other origins, credentials and executable URLs',()=>{
 const normalize=extract('vertical.js','  function normalizePath(', '  function button(', 'normalizePath');
 for(const url of ['https://evil.test/home','javascript:alert(1)','https://user:pass@x.com/home','https://x.com/settings/account'])assert.throws(()=>normalize(url));
 assert.equal(normalize('https://twitter.com/i/lists/123'),'/i/lists/123'); assert.equal(normalize('/search?q=hello&f=live'),'/search?q=hello&f=live');
});
test('CSV escapes quotes and prevents spreadsheet formula execution',()=>{
 const csv=extract('content.js','  function csvCell(', '  // --- Scope Detection', 'csvCell');
 assert.equal(csv('a"b'),'"a""b"'); assert.equal(csv('=1+1'),'"\'=1+1"'); assert.equal(csv('한글'),'"한글"');
});
test('badge cache keys use handles and preserve negative verification',()=>{
 const parse=extract('content.js','  function fParseBadge(', '  function fSvgBadge(', 'fParseBadge');
 assert.equal(parse({core:{screen_name:'Tester'},is_blue_verified:false}).prem,false);
 assert.equal(parse({legacy:{screen_name:'TESTER'},is_blue_verified:true}).id,'tester');
 assert.equal(parse({legacy:{screen_name:'Org'},is_blue_verified:true,verified_type:'Business'}).prem,false);
});
