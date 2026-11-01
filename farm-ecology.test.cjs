const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('./farm-ecology.js'),A=require('./farm-adventure.js'),html=fs.readFileSync('index.html','utf8');
function literal(name){
 const start=html.indexOf('{',html.indexOf('const '+name+' = {'));assert(start>=0,name);let depth=0,quote='',escape=false;
 for(let i=start;i<html.length;i++){const ch=html[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';}
 else if("'\"`".includes(ch))quote=ch;else if(html.slice(i,i+2)==='//')i=html.indexOf('\n',i);else if(html.slice(i,i+2)==='/*')i=html.indexOf('*/',i)+1;
 else if(ch==='{')depth++;else if(ch==='}'&&!--depth)return html.slice(start,i+1);}
 throw Error('Unclosed object '+name);
}
const obj=name=>vm.runInNewContext('('+literal(name)+')',{FOREST_LEVEL:6,MINE_LEVEL:8});
const F=obj('FISH'),products=obj('FARM_PRODUCTS'),recipes=obj('RECIPES'),machines=obj('MACHINES'),upgrades=obj('UPGRADES');
const crops={...obj('VEGGIES'),...obj('LEGEND_VEGGIES'),...obj('MYTH_VEGGIES'),...obj('FOREST_CROPS'),...Object.fromEntries(['apple','wheat','pear','olive','greenApple','goldLantern','moonFruit'].map(k=>[k,{}]))};
const ctx=(over={})=>({where:'pond',hour:12,minute:0,label:'12:00',weather:'sun',season:'winter',bait:'',rod:0,skill:0,beach:false,secrets:{},...over});
test('all cooking and processing ingredients exist in the real crop, product or fish catalogs',()=>{
 const all={...crops,...products,...F,...recipes};
 for(const [k,r]of Object.entries(recipes))for(const ingredient of Object.keys(r.need))assert(all[ingredient],k+': '+ingredient);
 for(const m of Object.values(machines))for(const r of m.recipes){assert(all[r.out],r.out);for(const k of Object.keys(r.need))assert(all[k],m.name+': '+k);}
 assert.equal(Object.keys(crops).length,48);assert.equal(Object.keys(F).length,25);
});
test('every non-secret fish has an attainable village-time, weather, season and bait combination',()=>{
 for(const [k,f]of Object.entries(F)){if(f.secret)continue;let attainable=false;
 for(const hour of [0,3,6,12,19,22])for(const weather of ['sun','rain','storm','rainbow','wind'])for(const season of ['winter','rain','summer'])for(const bait of ['','bait','gold']){
  if(E.table(F,ctx({where:f.sea?'sea':'pond',hour,weather,season,bait,secrets:{ghostFish:true}})).find(r=>r.key===k).p>0)attainable=true;
 }assert(attainable,k+' has no valid habitat window');}
});
test('pond and sea distributions sum to one and never contain the other habitat',()=>{
 for(const where of ['pond','sea'])for(const hour of [0,5,6,12,18,19,23])for(const bait of ['','bait','gold']){
  const rows=E.table(F,ctx({where,hour,bait}));assert(Math.abs(rows.reduce((s,r)=>s+r.p,0)-1)<1e-12);
  assert(rows.filter(r=>r.p>0).every(r=>!!F[r.key].sea===(where==='sea')));
 }
});
test('gold bait fish are unavailable without gold and sea fallback matches the actual selected bait',()=>{
 assert.equal(E.table(F,ctx()).find(r=>r.key==='skyKoi').p,0);
 assert(E.table(F,ctx({bait:'gold'})).find(r=>r.key==='skyKoi').p>0);
 assert.equal(E.baitFor({selected:'bait',bait:0,gold:1},'sea'),'gold');
 assert.equal(E.baitFor({selected:'',bait:10,gold:1},'pond'),'');
 assert(E.table(F,ctx({where:'sea',bait:E.baitFor({selected:'bait',bait:0,gold:1},'sea')})).find(r=>r.key==='naga').p>0);
});
test('the first midnight encounter uses the same probability table as the rolled fish',()=>{
 const rows=E.table(F,ctx({hour:0}));assert.equal(rows.find(r=>r.key==='ghostFish').p,1);
 for(const roll of [0,.3,.999999])assert.equal(E.choose(rows,roll),'ghostFish');
 const known=E.table(F,ctx({hour:0,secrets:{ghostFish:true}}));assert(known.find(r=>r.key==='ghostFish').p<1);
 assert.equal(E.table(F,ctx({where:'sea',hour:0})).find(r=>r.key==='ghostFish').p,0);
});
test('rod, skill and bait modify normalized rarity odds instead of claiming raw weights are percentages',()=>{
 const base=E.table(F,ctx()),boosted=E.table(F,ctx({rod:7,skill:5,beach:true,bait:'bait'}));
 const rare=rows=>rows.filter(r=>E.tiers.indexOf(F[r.key].r)>=2).reduce((s,r)=>s+r.p,0);
 assert(rare(boosted)>rare(base));assert.notEqual(base.find(r=>r.key==='octopus').p,F.octopus.w/100);
});
test('calm mode and tool upgrades change timing without increasing rewards or spawn odds',()=>{
 for(let rod=0;rod<=7;rod++){const normal=E.timing(rod,false,{taps:8,ms:3600}),calm=E.timing(rod,true,{taps:8,ms:3600});
  assert.equal(calm.taps,normal.taps);assert.equal(calm.ms,normal.ms*2);assert(calm.bite>normal.bite);}
 assert.equal(E.timing(5,false,{taps:8,ms:3600}).taps,6);
 assert.deepEqual(E.table(F,ctx({calm:true})),E.table(F,ctx({calm:false})));
});
test('an empty fish table never invents a fallback catch',()=>{assert.equal(E.choose(E.table({},ctx())),null);});
test('the item-use index covers crafting and upgrades while preserving secret recipes',()=>{
 const data={recipes,machines,upgrades,cooked:{}};
 assert(E.uses('fish',data).some(u=>u.kind==='upgrade'&&u.id==='rod'));
 assert(E.uses('ironOre',data).some(u=>u.kind==='craft'&&u.output==='ironBar'));
 const hidden=Object.entries(recipes).find(([,r])=>r.secret);if(hidden){const ingredient=Object.keys(hidden[1].need)[0];assert(!E.uses(ingredient,data).some(u=>u.id===hidden[0]));
 assert(E.uses(ingredient,{...data,cooked:{[hidden[0]]:1}}).some(u=>u.id===hidden[0]));}
});
test('save cleaning rejects fabricated item records and unknown fish targets',()=>{
 const s=E.cleanState({seen:{wood:true,imaginary:true},target:'imaginary',calm:'yes'},k=>!!products[k],k=>!!F[k]);
 assert.deepEqual(s,{seen:{wood:true},target:'',calm:false});
});
function game(over={}){
 let now=1700000000000,seq=0;const timers=new Map(),messages=[],storage=new Map();
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const c={console,Date:Clock,Math:Object.create(Math),JSON,Number,Set,Map,Uint8Array,window:null,document:{hidden:false,activeElement:null,addEventListener(){},getElementById:()=>({style:{display:'none'}}),querySelector:()=>null},navigator:{},
  FISH:F,FarmEcology:E,FarmAdventure:A,FarmVillagers:{clock:()=>({hour:12,minute:0,label:'12:00'})},storageFrozen:false,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  veg:{inv:{honey:2},overflow:{},ecology:{seen:{},target:'',calm:false},bait:1,goldBait:1,baitSel:'bait',fish:{tickets:3,freeDay:'today'},sea:{casts:3},secrets:{},fishRecord:{},fishCaught:{},dexDay:{},frags:0,xp:0,house:1,stats:{earned:0,day:{coins:0}},baitBuy:{day:'today',n:0}},shop:{coins:100},
  todayWeather:()=> 'sun',farmSeason:()=> 'winter',upgLv:()=>0,sk:()=>5,gdSetOn:()=>false,SKILL_MAX:5,FISH_TICKET_MAX:10,
  hasItems:()=>true,countBase:k=>c.veg.inv[k]||0,takeItems:items=>{for(const [k,n]of Object.entries(items))c.veg.inv[k]-=n;},baseOf:k=>k.split('~')[0],
  itemInfo:k=>({name:k,value:F[k]?.value||4}),giveItem:k=>{c.veg.inv[k]=(c.veg.inv[k]||0)+1;},noteDex:k=>{c.veg.dexDay[k]='today';},luckGain(){},farmLevel:()=>1,statDay:()=>c.veg.stats.day,ensurePlots(){},
  saveVeg(){},saveShop(){},renderFarmPanel(){},renderFarmStatus(){},renderVeggies(){},renderDex(){},updateCoinUI(){},playSound(){},showToast:m=>messages.push(m),passNote(){},rmProg(){},rmFishReport(){},fireConfetti(){},showBadgeCelebration(){},unlockSecret(){},
  dayKeyLocal:()=> 'today',rarAtLeast:(r,min)=>E.tiers.indexOf(r)>=E.tiers.indexOf(min),rnd:a=>a,
  setTimeout:(fn,ms)=>{const id=++seq;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),setInterval(){},addEventListener(){}};
 c.Math.random=()=>.01;c.window=c;Object.assign(c,over);vm.createContext(c);
 vm.runInContext(fs.readFileSync('farm-adventure-ui.js','utf8'),c);vm.runInContext(fs.readFileSync('farm-ecology-ui.js','utf8'),c);
 vm.runInContext(html.slice(html.indexOf('        const fishing ='),html.indexOf('        function fishResultText(')),c);
 c.run=s=>vm.runInContext(s,c);c.f=c.run('fishing');c.timers=timers;c.messages=messages;c.advance=n=>now+=n;c.store=storage;return c;
}
test('repeated waiting cancellations cannot farm bait with the top fishing skill',()=>{
 const c=game();for(let i=0;i<20;i++){c.castLine();assert.equal(c.veg.bait,0);c.cancelFishing();assert.equal(c.veg.bait,1);assert.equal(c.veg.fish.tickets,3);}
 assert.equal(Object.keys(c.veg.fishCaught).length,0);
});
test('a cancellation after the bite consumes one attempt and cannot reveal-and-reroll for free',()=>{
 const c=game({sk:()=>0});c.castLine();c.fishBite();c.cancelFishing();assert.equal(c.veg.fish.tickets,2);assert.equal(c.veg.bait,0);assert.equal(c.f.state,'idle');
});
test('a stale bite callback from a previous cast cannot affect the next cast',()=>{
 const c=game();c.castLine();const old=c.timers.get(c.f.timer).fn;c.cancelFishing();c.castLine();const current=c.f.fish;old();assert.equal(c.f.state,'waiting');assert.equal(c.f.fish,current);
});
test('a queued bite timeout cannot terminate a fight after the player reels in',()=>{
 const c=game();c.castLine();c.f.fish='octopus';c.fishBite();const late=c.timers.get(c.f.timer).fn;c.reelIn();assert.equal(c.f.state,'fight');late();assert.equal(c.f.state,'fight');
});
test('one successful cast can award its fish and bait rebate only once',()=>{
 const c=game();c.castLine();c.fishBite();c.reelIn();assert.equal(c.f.state,'idle');assert.equal(c.veg.fishCaught.fish,1);assert.equal(c.veg.bait,1);
 c.endFishing('catch');assert.equal(c.veg.fishCaught.fish,1);assert.equal(c.veg.bait,1);
});
test('fishing odds and the chosen fish stay tied to the bait snapshot when the last bait is spent',()=>{
 const c=game();c.veg.bait=0;c.veg.baitSel='bait';c.beginFishCast('sea');assert.equal(c.f.bait,'gold');assert.equal(c.veg.goldBait,0);
 assert(c.ecologyFishTable('sea').find(r=>r.key==='naga').p>0);assert.equal(c.f.context.bait,'gold');
});
test('pausing and resuming keeps the same fish, progress and remaining reaction time',()=>{
 const c=game();c.castLine();c.f.fish='octopus';c.fishBite();c.reelIn();c.reelIn();const taps=c.f.taps,fish=c.f.fish;
 c.advance(400);c.ecologyPauseFishing();const left=c.f.paused.left;c.advance(60000);c.ecologyResumeFishing();
 assert.equal(c.f.fish,fish);assert.equal(c.f.taps,taps);assert.equal(c.timers.get(c.f.timer).ms,left);
});
test('a failed cast debit starts no timer and leaves its bait and ticket intact',()=>{
 const c=game();c.localStorage.setItem=()=>{throw Error('quota');};c.castLine();assert.equal(c.f.state,'idle');assert.equal(c.veg.fish.tickets,3);assert.equal(c.veg.bait,1);assert.equal(c.timers.size,0);
});
test('a failed catch save can retry the same reward without rerolling the fish size',()=>{
 const c=game();c.castLine();c.fishBite();const set=c.localStorage.setItem;c.localStorage.setItem=()=>{throw Error('quota');};c.reelIn();
 assert(c.f.pendingReward);const cm=c.f.pendingReward.cm;assert.equal(c.veg.fishCaught.fish,undefined);
 c.localStorage.setItem=set;c.Math.random=()=>.99;c.reelIn();assert.equal(c.f.result.cm,cm);assert.equal(c.veg.fishCaught.fish,1);
});
test('gold bait crafting checks inventory and commits its whole recipe together',()=>{
 const c=game();c.veg.bait=3;c.craftGoldBait();assert.equal(c.veg.bait,0);assert.equal(c.veg.inv.honey,1);assert.equal(c.veg.goldBait,2);
 const fail=game();fail.veg.bait=3;fail.localStorage.setItem=()=>{throw Error('quota');};fail.craftGoldBait();assert.equal(fail.veg.bait,3);assert.equal(fail.veg.inv.honey,2);assert.equal(fail.veg.goldBait,1);
});
test('runtime assets compile and the instructions use the real seed costs and harvest chance',()=>{
 for(const file of ['farm-ecology.js','farm-ecology-ui.js','farm-ecology.css']){assert(html.includes(file+'?'));assert(fs.readFileSync('sw.js','utf8').includes(file+'?'));if(file.endsWith('.js'))new vm.Script(fs.readFileSync(file,'utf8'));}
 assert(!html.includes('ครั้งละ 6 ชิ้น โอกาสค่อยๆ เพิ่ม'));assert(!html.includes('เมล็ดผักเทพตอนเก็บ (10%)'));
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
test('a trophy catch commits fish, fragments, XP and its coin bonus together only once',()=>{
 const c=game();c.Math.random=()=>.99;c.castLine();c.f.fish='skyKoi';c.fishBite();c.reelIn();while(c.f.state==='fight')c.reelIn();
 assert.equal(c.veg.fishCaught.skyKoi,1);assert.equal(c.veg.frags,6);assert.equal(c.shop.coins,200);assert.equal(c.veg.xp,42);assert.equal(c.veg.stats.earned,100);
 c.endFishing('catch');assert.equal(c.shop.coins,200);assert.equal(c.veg.frags,6);
});
test('vegetables and fish also point to their actual animal-feed and villager-gift uses',()=>{
 const feeds=obj('ANIMAL_FEEDS'),animals=obj('ANIMALS');
 const data={feeds:Object.fromEntries(Object.entries(feeds).map(([id,f])=>[id,{...f,name:animals[id].name,qty:1}])),villagers:{chick:{name:'Chick',favorite:['carrot']}}};
 assert(E.uses('carrot',data).some(u=>u.kind==='animals'&&u.id==='goat'));
 assert(E.uses('carrot',data).some(u=>u.kind==='villagers'&&u.id==='chick'));
 assert(E.uses('fish',data).some(u=>u.kind==='animals'&&u.id==='duck'));
});
