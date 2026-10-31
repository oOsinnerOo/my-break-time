const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const cwd=__dirname;
const read=f=>fs.readFileSync(path.join(cwd,f),'utf8');
const runtime={};vm.createContext(runtime);vm.runInContext(read('farm-systems.js'),runtime);
const G=runtime.FarmSystems,plain=x=>JSON.parse(JSON.stringify(x));
const recipes=[{out:'flour',need:{wheat:3},mins:30,n:2},{out:'bread',need:{flour:2},mins:60}];
const NOW=1900000000000;
test('legacy jobs migrate without losing the original finish time',()=>{
    const m=G.cleanMachine({made:17,job:{r:0,end:NOW-60000}},recipes,NOW);
    assert.equal(m.made,17);assert.equal(m.job.end,NOW-60000);assert.equal(G.settle(m,recipes,NOW).completed,1);assert.deepEqual(plain(m.ready),[0]);
});
test('mixed queued recipes complete offline in order without restarting at login',()=>{
    const m=G.cleanMachine({},recipes,NOW);
    G.enqueue(m,recipes,0,[{wheat:3},{wheat:3}],NOW);
    G.enqueue(m,recipes,1,[{flour:2}],NOW);
    assert.equal(G.settle(m,recipes,NOW+95*60000).completed,2);
    assert.deepEqual(plain(m.ready),[0,0]);assert.equal(m.job.r,1);assert.equal(m.job.end,NOW+120*60000);
    G.settle(m,recipes,NOW+130*60000);assert.deepEqual(plain(m.ready),[0,0,1]);
    G.settle(m,recipes,NOW+999*60000);assert.equal(m.ready.length,3);
});
test('finished goods occupy capacity; enqueue cannot overflow ten reservations',()=>{
    const m=G.cleanMachine({ready:Array(9).fill(0)},recipes,NOW);
    assert.equal(G.enqueue(m,recipes,0,[{wheat:3},{wheat:3}],NOW),false);
    assert.equal(G.enqueue(m,recipes,0,[{wheat:3}],NOW),true);
    G.settle(m,recipes,NOW+31*60000);assert.equal(G.occupied(m),10);
});
test('invalid saved recipes, huge queues and arbitrary refund goods are rejected',()=>{
    const m=G.cleanMachine({job:{r:-1,end:Infinity},ready:[99,0,'0'],queue:Array(99).fill({r:0,paid:{'diamond~5':999,wheat:300}})},recipes,NOW);
    assert.equal(m.job,null);assert.equal(G.occupied(m),10);assert.deepEqual(plain(m.queue[0].paid),{wheat:3});
    assert.equal(G.cancel(m,-1),null);
});
function game(){
    const source=read('index.html'),ctx={FarmSystems:G,now:NOW,Date:class extends Date{static now(){return ctx.now;}},veg:{inv:{wheat:4,'wheat~3':5},machines:{}},shop:{coins:999},saves:[],notes:0,xp:0,
        playSound(){},showToast(){},renderFarmPanel(){},renderFarmStatus(){},updateBasketFood(){},updateCoinUI(){},farmTabIs(){return false;},farmNotify(){},
        itemInfo(k){return {name:k,e:k};},sellPrice(){return 1;},farmLevel(){return 10;},
        baseOf:k=>k.split('~')[0],qKey:(b,q)=>q===1?b:b+'~'+q,
        document:{querySelectorAll(){return [];}}};
    ctx.saveVeg=()=>ctx.saves.push(plain(ctx.veg));ctx.passNote=(k,n=1)=>{ctx.notes+=n;ctx.saveVeg();};ctx.addXP=n=>ctx.xp+=n;
    runtime.Date=ctx.Date;
    vm.createContext(ctx);
    const defs=source.slice(source.indexOf('        const MACHINES ='),source.indexOf('        const RECIPES ='));
    const items=source.slice(source.indexOf('        function giveItem('),source.indexOf('        function addXP('));
    const craft=source.slice(source.indexOf('        const machineReady ='),source.indexOf('        // --- ⚡ แรง'));
    vm.runInContext(defs+items+craft+'\nthis.MACHINES=MACHINES;',ctx);
    ctx.veg.machines.mill=G.cleanMachine({},ctx.MACHINES.mill.recipes,NOW);return ctx;
}
test('real enqueue reserves inventory once; cancel refunds exact quality once',()=>{
    const c=game();c.startCraft('mill',0,3);assert.deepEqual(plain(c.veg.inv),{});assert.equal(c.veg.machines.mill.queue.length,2);
    const token=c.veg.machines.mill.queue[1].id;
    c.cancelCraftQueue('mill',token);assert.deepEqual(plain(c.veg.inv),{'wheat~3':3});
    c.cancelCraftQueue('mill',token);assert.deepEqual(plain(c.veg.inv),{'wheat~3':3});
    c.startCraft('mill',0,0);assert.equal(G.occupied(c.veg.machines.mill),2);
});
test('real collection saves consumed ready jobs before pass rewards and never pays twice',()=>{
    const c=game();c.startCraft('mill',0,3);c.now+=100*60000;c.collectCraft('mill');
    assert.equal(c.veg.inv.flour,6);assert.equal(c.notes,3);assert.equal(c.xp,18);assert.equal(c.veg.machines.mill.made,6);
    const snapshot=c.saves.find(s=>s.inv.flour===6);assert.equal(snapshot.machines.mill.ready.length,0);
    c.collectCraft('mill');assert.equal(c.veg.inv.flour,6);assert.equal(c.xp,18);
});
test('a stale cancel button cannot refund a job that has started or cancel a different recipe',()=>{
    const c=game();c.veg.inv.strawberry=9;c.veg.machines.juicer=G.cleanMachine({},c.MACHINES.juicer.recipes,NOW);
    c.veg.inv.carrot=4;c.veg.inv.tomato=4;c.startCraft('juicer',0,1);c.startCraft('juicer',1,1);
    const token=c.veg.machines.juicer.queue[0].id;c.now+=41*60000;c.cancelCraftQueue('juicer',token);
    assert.equal(c.veg.machines.juicer.job.r,1);assert.equal(c.veg.inv.strawberry,6);assert.equal(c.veg.machines.juicer.queue.length,0);
});
test('full inventory preserves finished goods and blocks refunds instead of deleting items',()=>{
    const c=game();c.startCraft('mill',0,3);c.veg.inv['wheat~3']=999;c.cancelCraftQueue('mill',c.veg.machines.mill.queue[1].id);assert.equal(c.veg.machines.mill.queue.length,2);
    c.veg.inv.flour=998;c.now+=100*60000;c.collectAllCraft();assert.equal(c.veg.inv.flour,998);assert.equal(c.veg.machines.mill.ready.length,3);
    c.veg.inv.flour=995;c.collectAllCraft();assert.equal(c.veg.inv.flour,999);assert.equal(c.veg.machines.mill.ready.length,1);
});
test('default map has reachable entrances for every building and unlocked plot',()=>{
    for(const [land,count] of [[0,3],[0,6],[1,7],[3,9],[6,12]]){
        const s=G.cleanWorld();for(const e of G.entities(s,count,land).filter(e=>e.type==='building'||e.type==='plot'))assert.notEqual(G.approach(s,count,land,s.pos,e),null,e.type+':'+e.id);
    }
});
test('grid paths respect collisions and locked land, and only move one cardinal tile per step',()=>{
    const s=G.cleanWorld();assert.equal(G.path(s,3,0,s.pos,{x:3,y:3}),null);assert.equal(G.path(s,3,0,s.pos,{x:18,y:6}),null);
    const p=G.path(s,3,0,s.pos,{x:1,y:2});assert(p);let before=s.pos;for(const next of p){assert.equal(Math.abs(next.x-before.x)+Math.abs(next.y-before.y),1);before=next;}
    assert.equal(G.canPlace(s,3,0,{x:7,y:7}),false);assert.equal(G.canPlace(s,3,0,{x:9,y:6}),false);
});
test('world saves normalize invalid avatar values, resource IDs and unknown objects',()=>{
    const s=G.cleanWorld({avatar:{shirt:999,hair:-1,hat:'bad'},decor:[{kind:'<script>',x:2,y:2}],cleared:[1,1,999,'1']});
    assert.equal(s.avatar.shirt,5);assert.equal(s.avatar.hair,0);assert.equal(s.avatar.hat,1);assert.equal(s.decor.length,0);assert.deepEqual(plain(s.cleared),[1]);
    assert.deepEqual(plain(G.cleanWorld(plain(s))),plain(s));
});
test('the world adapter preserves undiscovered hybrid crop identities',()=>{
    const source=read('index.html'),start=source.indexOf('        let livingFarmStarted = false;'),end=source.indexOf('        // ครั้งแรกที่เปิดฟาร์มแบบแยก:',start);
    let adapter;const world={start:a=>{adapter=a;},refresh(){}};
    const c={window:{FarmWorld:world},FarmWorld:world,FarmPixelArt:{ui:k=>'pixel:'+k},farmIcon:k=>'known:'+k,
        isSecretHybrid:k=>k==='starTomato',saveVeg(){},openFarm(){},waterVeggies(){},hasItems(){},closeVegPicker(){},craftTick(){},setInterval(){},document:{addEventListener(){}}};
    vm.createContext(c);vm.runInContext(source.slice(start,end)+'\ninitLivingFarm();',c);
    assert.equal(adapter.icon('starTomato'),'pixel:help');assert.equal(adapter.icon('carrot'),'known:carrot');
});
test('scripts compile, all avatar variants are native pixels, and offline assets exist',()=>{
    for(const file of ['farm-systems.js','farm-world.js','farm-pixel-art.js','farm-pixel-ui.js','sw.js'])new vm.Script(read(file),{filename:file});
    for(const m of read('index.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
    vm.runInContext(read('farm-pixel-art.js'),runtime);const a=runtime.FarmPixelArt;
    const sprites=new Set();for(const direction of ['up','down','left','right'])for(let shirt=0;shirt<6;shirt++)for(let frame=0;frame<2;frame++){
        const svg=a.avatar({shirt,hair:0,hat:1},direction,frame);assert(svg.includes('crispEdges'));assert(!/NaN|undefined|<image|<text/.test(svg));sprites.add(svg);
    }
    assert.equal(sprites.size,48);
    for(const m of read('sw.js').matchAll(/'\.\/([^']+)'/g))assert(fs.existsSync(path.join(cwd,m[1].split('?')[0])),m[1]);
});
