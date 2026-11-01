const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('./farm-adventure.js'),html=fs.readFileSync('index.html','utf8');
const clone=o=>JSON.parse(JSON.stringify(o));
const ids=Object.keys(A.personalities);
const lot=(over={})=>({id:1,k:'wood',n:3,start:12,at:1000000,ends:4600000,h:1,top:0,bids:0,my:0,who:'',...over});
test('NPC bids use real persisted events and deterministic offline catch-up',()=>{
 const live=lot(),offline=lot();A.initLot(live,false,40,ids);A.initLot(offline,false,40,ids);
 for(let now=live.at;now<=live.ends;now+=10000)A.advance(live,now);A.advance(live,live.ends);
 A.advance(offline,offline.ends);assert.deepEqual(live,offline);assert(live.bids>0);assert.equal(live.my,0);
 assert(live.history.every(h=>live.people.some(p=>p.id===h.who&&h.amount<=p.budget)));
});
test('a player can lead below NPC budgets and gets escrow back only once after a later counterbid',()=>{
 const l=lot();A.initLot(l,false,40,ids);l.people=[{id:'dadBear',budget:100,interest:1}];l.nextAt=l.at+20000;
 assert(A.bid(l,12,l.at+1000));assert.equal(l.who,'me');assert.equal(l.my,12);
 const first=A.advance(l,l.at+200000);assert.equal(first.refund,12);assert.equal(l.my,0);assert.equal(l.who,'dadBear');
 assert.equal(A.advance(l,l.ends).refund,0);
});
test('no phantom bid when no NPC can afford the opening price',()=>{
 const l=lot({start:1000});A.initLot(l,true,20,ids);A.advance(l,l.ends);assert.equal(l.bids,0);assert.equal(l.top,0);assert.equal(l.who,'');
});
test('last-minute extensions are bounded and expired or duplicate player bids are rejected',()=>{
 const l=lot();A.initLot(l,false,30,ids);const original=l.ends;
 assert(A.bid(l,12,original-1000));assert.equal(l.ends,original+59000);assert(!A.bid(l,14,original));
 l.who='chick';l.my=0;assert(A.bid(l,A.minimum(l),original+58000));assert(l.ends<=original+120000);
 l.who='chick';l.my=0;assert(!A.bid(l,9999,l.ends));assert(!A.bid(l,NaN,l.ends-1));
});
test('a saved lot keeps its random stream, bidders and real history on reload',()=>{
 const l=lot();A.initLot(l,false,45,ids);A.advance(l,l.at+400000);
 const reload={...l,...A.cleanLot(clone(l),x=>ids.includes(x)?x:'chick')};
 assert.deepEqual(A.advance(l,l.ends),A.advance(reload,reload.ends));assert.deepEqual(l,reload);
});
test('legacy player leads keep their paid amount during auction migration',()=>{
 const l=lot({top:30,my:30,who:'me',bids:3});A.initLot(l,false,40,ids);assert.equal(l.who,'me');assert.equal(l.my,30);assert.equal(l.top,30);
});
test('haggling budgets follow item value rather than an inflated stall sticker',()=>{
 const cheap=A.haggle({key:'wood',price:10,ref:8,rep:50,rare:false,roll:()=>.2});
 const inflated=A.haggle({key:'wood',price:99999,ref:8,rep:50,rare:false,roll:()=>.2});
 assert.equal(cheap.max,inflated.max);assert(inflated.max<20);assert(inflated.offer<=inflated.max);assert(ids.includes(cheap.who));assert(cheap.note.length);
});
function storage(){const m=new Map();return{m,getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('the economy journal recovers both saves after the first ordinary save write fails',()=>{
 const s=storage(),set=s.setItem;s.setItem=(k,v)=>{if(k==='shop_state')throw Error('disk');set(k,v);};
 assert.equal(A.commit(s,{inv:{wood:2}},{coins:80}).pending,true);assert(s.getItem('bt_economy_pending_v1'));
 s.setItem=set;assert(A.recover(s));assert.equal(JSON.parse(s.getItem('shop_state')).coins,80);assert.equal(JSON.parse(s.getItem('veggie_garden')).inv.wood,2);assert(!A.recover(s));
});
test('no ordinary saves change if the journal itself cannot be written',()=>{
 const s=storage();s.setItem('shop_state','old');s.setItem=()=>{throw Error('quota');};
 assert.throws(()=>A.commit(s,{inv:{}},{coins:0}));assert.equal(s.getItem('shop_state'),'old');
});
test('different trails produce different guaranteed loot and never overwrite mine exits',()=>{
 const cells=Array.from({length:9},()=>({k:'resin',n:1,open:false,trap:'snare'}));
 const supply=A.plan('forest','supply',cells),forage=A.plan('forest','forage',cells);
 assert(supply.filter(c=>c.k==='wood').length>=3);assert(forage.some(c=>c.k==='lemongrass'));assert.equal(cells[0].k,'resin');
 const rocks=[{k:'ladder',hp:1,open:false},...Array.from({length:24},()=>({k:'stone',hp:2,open:false}))];
 assert.equal(A.plan('mine','ore',rocks,15)[0].k,'ladder');assert(A.plan('mine','survey',rocks)[0].hint);
 assert.equal(A.plan('beach','cleanup',cells).filter(c=>c.k==='trash').length,3);
});
function game(){
 const c={console,Date,Math,Set,Map,Number,JSON,crypto:require('node:crypto').webcrypto,storageFrozen:false,
  localStorage:storage(),friends:{room:'ABC234',player:'00000000-0000-4000-8000-000000000001',secret:'qa'},
  shop:{coins:100},veg:{inv:{wood:5},overflow:{},hp:100,wanted:{received:{},pending:null},adventure:A.cleanAdventure({}),forest:{cells:null},mine:{floor:0},sea:{cells:null}},
  itemInfo:k=>/^(wood|carrot|resin|shiitake|coal|ironOre|seaweed)(~[2-5])?$/.test(k)?{name:k,value:4,q:+k.split('~')[1]||1}:null,
  baseOf:k=>String(k).split('~')[0],starText:q=>q>1?' stars':'',qualOf:k=>+String(k).split('~')[1]||1,showToast(){},updateCoinUI(){},renderFarmStatus(){},updateBasketFood(){},renderFarmPanel(){},renderShop(){},farmNotify(){},mpCleanName:s=>String(s||''),
  mpItemOk:k=>!!c.itemInfo(k),mpCall:async()=>{},mkOpen:()=>false,MP_UUID_RE:/^[0-9a-f-]{36}$/,
  farmLevel:()=>12,hasItems:()=>true,takeItems(){},hpNow:()=>c.veg.hp,hpMax:()=>100,heal:n=>{c.veg.hp=Math.min(100,c.veg.hp+n);},saveVeg(){},marketPrice:()=>4};
 c.window=c;vm.createContext(c);
 vm.runInContext(fs.readFileSync('farm-adventure.js','utf8'),c);vm.runInContext(fs.readFileSync('farm-adventure-ui.js','utf8'),c);
 vm.runInContext(fs.readFileSync('farm-wanted.js','utf8'),c);
 vm.runInContext(html.slice(html.indexOf('        function giveItem('),html.indexOf('        const countBase')),c);
 vm.runInContext(html.slice(html.indexOf('        function takeExact('),html.indexOf('        function takeItems(')),c);
 c.eval=s=>vm.runInContext(s,c);return c;
}
test('full inventory retains every incoming item and automatically draws from reserve when spending',()=>{
 const c=game();c.veg.inv.wood=998;c.giveItem('wood',5);assert.equal(c.veg.inv.wood,999);assert.equal(c.veg.overflow.wood,4);
 c.takeExact('wood',3);assert.equal(c.veg.inv.wood,999);assert.equal(c.veg.overflow.wood,1);
});
test('a failed durable write restores both coins and inventory in memory',()=>{
 const c=game();c.localStorage.setItem=()=>{throw Error('quota');};
 assert.equal(c.farmTrade(()=>{c.shop.coins-=12;c.takeExact('wood',2);}),false);assert.equal(c.shop.coins,100);assert.equal(c.veg.inv.wood,5);
});
test('a route reward can only be paid once and skipped or trapped finds do not count',()=>{
 const c=game();c.veg.adventure.active.forest={route:'supply',progress:5,claimed:false};
 c.adProgress('forest',{skip:1},'find');assert.equal(c.veg.adventure.active.forest.progress,5);
 c.adProgress('forest',{hit:1,risk:1},'find');assert.equal(c.veg.adventure.active.forest.progress,5);
 c.adProgress('forest',{},'find');assert.equal(c.veg.inv.resin,2);c.adProgress('forest',{},'find');assert.equal(c.veg.inv.resin,2);
});
test('out-of-order delivery IDs are all applied once, including a late lower ID',()=>{
 const c=game(),ctx=c.wantedContext();const receipt=id=>({id,item:'wood',qty:2,coins:0});
 assert(c.wantedApplyReceipts(ctx,[receipt(20)]));assert(c.wantedApplyReceipts(ctx,[receipt(19),receipt(20)]));assert.equal(c.veg.inv.wood,9);
 c.wantedApplyReceipts(ctx,[receipt(19),receipt(20)]);assert.equal(c.veg.inv.wood,9);
});
test('invalid delivery batches cannot partially pay or advance their receipt records',()=>{
 const c=game(),ctx=c.wantedContext();assert.throws(()=>c.wantedApplyReceipts(ctx,[{id:1,item:'wood',qty:2,coins:0},{id:2,item:'bad',qty:1,coins:0}]));
 assert.equal(c.veg.inv.wood,5);assert.equal(c.veg.wanted.received[ctx.player],undefined);
});
test('a lost operation response retains escrow and retries the same operation without charging twice',async()=>{
 const c=game(),ctx=c.wantedContext(),p={op:crypto.randomUUID(),player:ctx.player,room:ctx.room,action:'create',item:'wood',qty:3,price:4,id:0};
 c.shop.coins=88;c.veg.wanted.pending=p;let calls=0;c.mpCall=async(fn,args)=>{calls++;assert.equal(args.p_op,p.op);if(calls===1)throw Error('offline');return{ok:true,id:7};};
 await assert.rejects(()=>c.wantedResolve(ctx));assert.equal(c.shop.coins,88);assert(c.veg.wanted.pending);
 assert(await c.wantedResolve(ctx));assert.equal(c.shop.coins,88);assert.equal(c.veg.wanted.pending,null);assert(await c.wantedResolve(ctx));assert.equal(calls,2);
});
test('a rejected raced fill returns exactly the removed goods without inventing payment',async()=>{
 const c=game(),ctx=c.wantedContext();c.veg.inv.wood=2;c.veg.wanted.pending={op:crypto.randomUUID(),player:ctx.player,room:ctx.room,action:'fill',id:1,item:'wood',qty:3,price:4};
 c.mpCall=async()=>({ok:false,error:'quantity_changed'});assert(await c.wantedResolve(ctx));assert.equal(c.veg.inv.wood,5);assert.equal(c.shop.coins,100);assert.equal(c.veg.wanted.pending,null);
});
test('a response from a previous room cannot resolve or apply the new room outbox',async()=>{
 const c=game(),ctx=c.wantedContext();let resolve;c.veg.wanted.pending={op:crypto.randomUUID(),player:ctx.player,room:ctx.room,action:'create',item:'wood',qty:3,price:4,id:0};
 c.mpCall=()=>new Promise(r=>resolve=r);const pending=c.wantedResolve(ctx);c.friends.room='DEF234';resolve({ok:true});assert.equal(await pending,false);assert(c.veg.wanted.pending);
});
test('bandages at full health and ropes without a closed mine exit are never consumed',()=>{
 const c=game();c.veg.adventure.supplies={bandage:2,rope:2};c.useAdventureSupply('bandage');c.useAdventureSupply('rope');assert.equal(c.veg.adventure.supplies.bandage,2);assert.equal(c.veg.adventure.supplies.rope,2);
 c.veg.hp=80;c.useAdventureSupply('bandage');assert.equal(c.veg.hp,100);assert.equal(c.veg.adventure.supplies.bandage,1);
});
test('new runtime files and all inline scripts compile and are included in the offline shell',()=>{
 for(const f of ['farm-adventure.js','farm-adventure-ui.js','farm-wanted.js']){new vm.Script(fs.readFileSync(f,'utf8'));assert(fs.readFileSync('sw.js','utf8').includes(f+'?'));assert(html.includes(f+'?'));}
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});

test('operation IDs work without the HTTPS-only randomUUID convenience API',()=>{
 const c=game();c.crypto={getRandomValues:a=>require('node:crypto').randomFillSync(a)};
 const id=c.wantedOperationId();assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.notEqual(c.wantedOperationId(),id);
});
test('shop packs at 98/99 stock cannot charge for goods that do not fit',()=>{
 const c=game();c.SHOP_ITEMS={pack:{cat:'tool',consumable:'fert',qty:3,name:'Fertilizer'}};c.shopPrice=()=>9;c.shopLevel=()=>0;c.consumableCount=()=>c.veg.tools.fert;
 vm.runInContext(html.slice(html.indexOf('        function buyShopItem('),html.indexOf('        function toggleShopItem(')),c);
 for(const n of [98,99]){c.veg.tools={fert:n};c.buyShopItem('pack');assert.equal(c.shop.coins,100);assert.equal(c.veg.tools.fert,n);}
});
test('a fitting shop pack charges once and reaches the exact capacity',()=>{
 const c=game();c.SHOP_ITEMS={pack:{cat:'tool',consumable:'fert',qty:3,name:'Fertilizer'}};c.shopPrice=()=>9;c.shopLevel=()=>0;c.consumableCount=()=>c.veg.tools.fert;c.updateVegTools=()=>{};c.playSound=()=>{};c.veg.tools={fert:96};
 vm.runInContext(html.slice(html.indexOf('        function buyShopItem('),html.indexOf('        function toggleShopItem(')),c);
 c.buyShopItem('pack');assert.equal(c.shop.coins,91);assert.equal(c.veg.tools.fert,99);
});
