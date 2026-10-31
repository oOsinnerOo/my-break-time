const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=__dirname,read=f=>fs.readFileSync(path.join(root,f),'utf8');
const runtime={URL};vm.createContext(runtime);vm.runInContext(read('farm-systems.js'),runtime);vm.runInContext(read('farm-room.js'),runtime);
const {Network,cleanSnapshot,layout,canStand,TTL}=runtime.FarmRoom;
const ME='00000000-0000-4000-8000-000000000001',OTHER='00000000-0000-4000-8000-000000000002',THIRD='00000000-0000-4000-8000-000000000003';
const ROOM='ABC234',NOW=1900000000000;
const player=(id,name='เพื่อน',presence)=>({id,name,farm:{lv:8,presence}});
const packet=(extra={})=>({v:1,r:ROOM,id:OTHER,s:'aaaaaaaaaaaaaaaa',n:1,h:1,x:12,y:6,d:'down',a:[2,1,1],...extra});
function setup(){
    let now=NOW,id=0,unknown=0,changes=0;
    const timers=new Map(),sockets=[];
    class Socket{constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);}send(s){this.sent.push(JSON.parse(s));}close(){this.readyState=3;if(this.onclose)this.onclose();}open(){this.readyState=1;this.onopen();}receive(m){this.onmessage({data:JSON.stringify(m)});}}
    const net=new Network({origin:'https://test-project.supabase.co',apiKey:'public-test-key',Socket,now:()=>now,random:()=>String(++id).padStart(16,'0'),
        every:(fn,ms)=>{const n=++id;timers.set(n,{fn,ms,repeat:true});return n;},after:(fn,ms)=>{const n=++id;timers.set(n,{fn,ms});return n;},clearEvery:n=>timers.delete(n),clearAfter:n=>timers.delete(n),
        onUnknown:()=>unknown++,onChange:()=>changes++});
    const sync=(members=[player(ME),player(OTHER)])=>net.sync({room:ROOM,player:ME,members});sync();
    const join=()=>{net.setActive(true);const s=sockets.at(-1);s.open();s.receive({topic:'realtime:bt-courtyard-v1:'+ROOM,event:'phx_reply',payload:{status:'ok'}});return s;};
    return {net,timers,sockets,sync,join,time:n=>now=n,advance:n=>now+=n,unknown:()=>unknown,changes:()=>changes};
}
test('fallback snapshots reject invalid positions, directions and appearance values',()=>{
    assert(cleanSnapshot([1,12,6,0,2,1,1,NOW]));
    for(const s of [[0],[1,NaN,6,0,0,0,0,NOW],[1,12,6,9,0,0,0,NOW],[1,12,6,0,999,0,0,NOW],[1,12,6,0,0,0,0,-1]])assert.equal(cleanSnapshot(s),null);
});
test('only verified room members with valid walkable coordinates are rendered',()=>{
    const {net}=setup();assert(net.receive(packet()));assert.equal(net.players().length,1);
    for(const p of [packet({r:'ZZZ234'}),packet({id:ME}),packet({x:10,y:8}),packet({x:Infinity}),packet({a:[99,0,0]}),packet({n:-1}),packet({id:'<img>'})])assert.equal(net.receive(p),false);
    assert.equal(net.players().length,1);
});
test('new members wait for RPC verification before their avatars appear',()=>{
    const x=setup();x.sync([player(ME)]);assert.equal(x.net.receive(packet()),false);assert.equal(x.net.players().length,0);assert.equal(x.unknown(),1);
    x.sync([player(ME),player(OTHER)]);assert.equal(x.net.players().length,1);
    x.sync([player(ME)]);assert.equal(x.net.players().length,0);
});
test('reordered packets and retired sessions cannot rewind a character or remove a new session',()=>{
    const {net}=setup();assert(net.receive(packet({n:3,x:13})));assert.equal(net.receive(packet({n:2,x:12})),false);
    assert(net.receive(packet({s:'bbbbbbbbbbbbbbbb',n:1,x:14})));assert.equal(net.receive(packet({n:4,x:12})),false);
    assert.equal(net.receive(packet({h:0,n:5})),false);assert.equal(net.players().length,1);
    assert(net.receive(packet({s:'bbbbbbbbbbbbbbbb',n:2,h:0,x:14})));assert.equal(net.players().length,0);
});
test('remote movement interpolates and expired presence disappears',()=>{
    const x=setup();x.net.receive(packet());x.advance(500);x.net.receive(packet({n:2,x:14}));x.advance(250);
    assert.equal(x.net.players()[0].x,13);assert(x.net.hasMotion());x.advance(300);assert.equal(x.net.players()[0].x,14);
    x.advance(TTL+1);assert.equal(x.net.players().length,0);
});
test('fallback data is visibly distinct, expires, and cannot overwrite a fresh live update',()=>{
    const x=setup(),s=cleanSnapshot([1,12,6,0,0,0,1,NOW]);x.sync([player(ME),player(OTHER,'Alice',s)]);
    assert.equal(x.net.players()[0].source,'snapshot');x.net.receive(packet({n:2,x:14}));x.advance(500);
    x.sync([player(ME),player(OTHER,'Alice',{...s,x:13,at:NOW+1})]);assert.equal(x.net.players()[0].x,14);assert.equal(x.net.players()[0].source,'live');
    const y=setup();y.sync([player(ME),player(OTHER,'Alice',s)]);y.sync([player(ME),{...player(OTHER),farm:{presence:null,presenceHere:false}}]);assert.equal(y.net.players().length,0);
});
test('WebSocket handshake uses matching join references and the documented public broadcast protocol',()=>{
    const x=setup(),socket=x.join();assert(socket.url.startsWith('wss://test-project.supabase.co/realtime/v1/websocket?'));
    const join=socket.sent[0];assert.equal(join.event,'phx_join');assert.equal(join.ref,join.join_ref);assert.equal(join.payload.config.private,false);assert.equal(x.net.status,'live');
    assert(socket.sent.some(m=>m.event==='broadcast'&&m.payload.event==='move'));
    assert([...x.timers.values()].some(t=>t.ms===25000));
});
test('position sends are throttled and contain no credentials, inventory, coins or personal records',()=>{
    const x=setup(),socket=x.join(),before=socket.sent.length;
    x.net.update(13,6,'right',[1,2,0]);x.advance(100);assert.equal(x.net.publish(),false);assert.equal(socket.sent.length,before);
    x.advance(400);assert(x.net.publish());const p=socket.sent.at(-1).payload.payload;
    assert.deepEqual(Object.keys(p).sort(),['a','d','h','id','n','r','s','v','x','y']);
    assert(!JSON.stringify(p).includes('public-test-key'));assert.equal(p.x,13);assert.equal(x.net.snapshot()[0],1);
});
test('leaving sends a departure and cleans every timer and socket',()=>{
    const x=setup(),socket=x.join();x.net.setActive(false);
    assert.equal(socket.sent.at(-1).payload.payload.h,0);assert.equal(socket.readyState,3);assert.equal(x.timers.size,0);assert.equal(x.net.snapshot()[0],0);
});
test('room switches isolate avatars and ignore late messages from the previous socket',()=>{
    const x=setup(),old=x.join();x.net.receive(packet());
    x.net.sync({room:'DEF234',player:ME,members:[player(ME)]});assert.equal(x.net.players().length,0);assert.equal(old.readyState,3);
    old.receive({topic:'realtime:bt-courtyard-v1:'+ROOM,event:'broadcast',payload:{event:'move',payload:packet()}});assert.equal(x.net.players().length,0);
});
test('a rejected channel does not loop through repeated joins on the UI refresh timer',()=>{
    const x=setup();x.net.setActive(true);const socket=x.sockets[0];socket.open();socket.receive({topic:'realtime:bt-courtyard-v1:'+ROOM,event:'phx_reply',payload:{status:'error'}});
    for(let i=0;i<10;i++){x.advance(1000);x.sync();}assert.equal(x.sockets.length,1);assert.equal(x.net.status,'snapshot');
});
test('heartbeat acknowledgements clear the watchdog; missing acknowledgements reconnect',()=>{
    const x=setup(),socket=x.join();x.net.ping();const ping=socket.sent.at(-1);
    assert.equal(ping.topic,'phoenix');assert.equal(ping.event,'heartbeat');
    socket.receive({topic:'phoenix',event:'phx_reply',ref:ping.ref,payload:{status:'ok'}});
    assert.equal(x.net.heartbeatTimeout,0);assert.equal(x.net.heartbeatRef,'');
    x.net.ping();const watchdog=x.timers.get(x.net.heartbeatTimeout);x.advance(12000);watchdog.fn();
    assert.equal(socket.readyState,3);assert.equal(x.net.status,'snapshot');assert(x.net.retry);
    x.timers.get(x.net.retry).fn();assert.equal(x.sockets.length,2);
});
test('a connection that never opens times out instead of getting stuck forever',()=>{
    const x=setup();x.net.setActive(true);const socket=x.sockets[0],timeout=x.timers.get(x.net.watchdog);
    assert.equal(timeout.ms,12000);timeout.fn();assert.equal(socket.readyState,3);assert(x.net.retry);
});
test('resuming after a long pause replaces a stale connection and retains local position',()=>{
    const x=setup(),old=x.join();x.net.update(13,6,'left',[3,1,2]);x.advance(31000);x.net.resume();
    assert.equal(old.readyState,3);assert.equal(x.sockets.length,2);assert.equal(x.net.local.x,13);assert.equal(x.net.local.look[0],3);
    x.net.setActive(false);assert.equal(x.timers.size,0);
});
test('a departure removes a fallback avatar immediately',()=>{
    const x=setup();x.sync([player(ME),player(OTHER,'Alice',cleanSnapshot([1,12,6,0,0,0,1,NOW]))]);
    assert.equal(x.net.players().length,1);assert(x.net.receive(packet({h:0})));assert.equal(x.net.players().length,0);
});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function roomRpcGame(){
    const source=read('index.html'),calls=new Map(),events=[];
    const c={friends:{room:ROOM,player:ME,secret:'test-a',roomName:''},mp:{state:null,at:0,skew:0,loading:false,refreshId:0},Date,
        mpPush:async()=>{},mpAuth:()=>({p_player:c.friends.player,p_secret:c.friends.secret}),mpCleanState:s=>s,
        mpCall:(fn,args)=>{if(fn==='bt_claim_events')return Promise.resolve({events:[args.p_player]});const d=deferred();calls.set(args.p_player,d);return d.promise;},
        mpApplyInbox:e=>events.push(...e),mkApplySales(){},saveFriends(){},mpErr:()=>'',mpForget:()=>{c.forgotten=true;},mpTabOpen:()=>false,mpMarkSeen(){},mpRender(){}};
    vm.createContext(c);vm.runInContext(source.slice(source.indexOf('        async function mpRefresh() {'),source.indexOf('        function mpSchedule(')),c);
    return {c,calls,events};
}
test('late room RPC replies cannot replace a new room or apply its old inbox',async()=>{
    const {c,calls,events}=roomRpcGame(),old=c.mpRefresh();await new Promise(setImmediate);
    Object.assign(c.friends,{room:'DEF234',player:THIRD,secret:'test-b'});c.mp.refreshId++;c.mp.loading=false;
    c.mp.state={roomName:'new room'};calls.get(ME).resolve({roomName:'old room',now:NOW});await old;
    assert.equal(c.mp.state.roomName,'new room');assert.equal(events.length,0);
});
test('an old failed request cannot log out the new room or clear its loading state',async()=>{
    const {c,calls}=roomRpcGame(),old=c.mpRefresh();await new Promise(setImmediate);
    Object.assign(c.friends,{room:'DEF234',player:THIRD,secret:'test-b'});c.mp.refreshId++;c.mp.loading=false;
    const next=c.mpRefresh();await new Promise(setImmediate);
    calls.get(ME).reject(new Error('bad_player'));await old;assert.equal(c.forgotten,undefined);assert.equal(c.mp.loading,true);
    calls.get(THIRD).resolve({roomName:'current room',now:NOW});await next;assert.equal(c.mp.state.roomName,'current room');assert.equal(c.mp.loading,false);
});
test('an old farm push cannot overwrite the new room snapshot key or schedule retries',async()=>{
    const source=read('index.html'),pending=deferred();let retries=0;
    const c={friends:{room:ROOM,player:ME,secret:'test-a',name:'QA',avatar:''},mp:{lastPush:'before',retry:0},friendSnapshot:()=>({gn:{i:[]}}),
        mpAuth:()=>({p_player:c.friends.player,p_secret:c.friends.secret}),mpCall:()=>pending.promise,setTimeout:()=>{retries++;return 1;},mpRefresh(){}};
    vm.createContext(c);vm.runInContext(source.slice(source.indexOf('        async function mpPush() {'),source.indexOf('        async function mpRefresh() {')),c);
    const old=c.mpPush();c.friends.room='DEF234';c.friends.player=THIRD;c.friends.secret='test-b';c.mp.lastPush='new-key';
    pending.resolve({ok:true,wait:true});await old;assert.equal(c.mp.lastPush,'new-key');assert.equal(retries,0);
});
test('courtyard destinations share a reachable layout for every player',()=>{
    const G=runtime.FarmSystems,s=layout();assert(canStand(9,6));
    for(const e of G.entities(s,0,6).filter(e=>e.type==='building'))assert.notEqual(G.approach(s,0,6,{x:9,y:6},e),null,e.id);
    assert.equal(G.path(s,0,6,{x:9,y:6},{x:10,y:8}),null);
});
test('scripts and inline room adapters compile and all offline assets exist',()=>{
    for(const f of ['farm-room.js','farm-world.js','sw.js'])new vm.Script(read(f));
    for(const m of read('index.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
    for(const m of read('sw.js').matchAll(/'\.\/([^']+)'/g))assert(fs.existsSync(path.join(root,m[1].split('?')[0])),m[1]);
});
