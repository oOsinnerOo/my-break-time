const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const A=require('./farm-adventure.js'),html=fs.readFileSync('index.html','utf8');
const clone=x=>JSON.parse(JSON.stringify(x));
function game(){
 const storage=new Map(),messages=[];
 const c={console,Date,Math,Number,JSON,Object,Set,Map,FarmAdventure:A,storageFrozen:false,document:{getElementById:()=>null},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  veg:{inv:{wood:12,pearl:2},overflow:{},adventure:A.cleanAdventure({}),forest:{cells:Array.from({length:9},()=>({k:'wood',n:1,open:true})),got:[['wood',4]],trips:4,found:{}},mine:{floor:10,cells:[{k:'ladder',open:false}],lift:10,deepest:10},sea:{cells:[{k:'pearl',n:1,open:true},{k:'conch',n:1,open:false}],casts:2,beach:3,found:{pearl:2}},trip:{z:'mine',got:[['wood',2]]},energy:{n:30},hp:100},shop:{coins:200},
  itemInfo:k=>['wood','pearl','conch','resin','shiitake','lemongrass'].includes(k)?{name:k,e:k}:null,
  farmLevel:()=>20,hpNow:()=>c.veg.hp,HP_TRIP:15,energyNow:()=>c.veg.energy.n,forestCost:()=>3,FOREST_LEVEL:6,SEA_COST:3,
  skFree:()=>false,useEnergy:n=>{if(c.veg.energy.n<n)return false;c.veg.energy.n-=n;return true;},sk:()=>0,adGear:()=>0,
  saveVeg(){},updateCoinUI(){},showToast:m=>messages.push(m),renderFarmPanel(){},renderFarmStatus(){},playSound(){},passNote(){},
  trapBits:()=>({}),fixedForest:Array.from({length:9},()=>({k:'wood',n:1})),fishing:{where:'pond',state:'idle'},escHtml:s=>String(s),
  startBeach:()=>{c.veg.sea.cells=Array.from({length:8},()=>({k:'conch',n:1,open:false}));},
  enterMine:floor=>{c.veg.mine.floor=floor;c.veg.mine.cells=[{k:'ladder',open:false}];}};
 c.window=c;vm.createContext(c);
 vm.runInContext('let riskAsk="",forestMsg="",forestNew=-1,mineMsg="",seaMsg="";',c);
 vm.runInContext(fs.readFileSync('farm-adventure-ui.js','utf8'),c);
 vm.runInContext(fs.readFileSync('farm-expedition-ui.js','utf8'),c);
 vm.runInContext(html.slice(html.indexOf('        function startForest('),html.indexOf('        function forestFind(')),c);
 c.veg.adventure.active.mine={route:'survey',progress:1,claimed:false};
 c.veg.adventure.active.beach={route:'cleanup',progress:1,claimed:false};
 c.messages=messages;c.run=s=>vm.runInContext(s,c);return c;
}
test('a completed forest round with legacy mine and beach trips can start again without losing banked goods',()=>{
 const c=game(),inv=clone(c.veg.inv),coins=c.shop.coins;
 assert.match(c.expStartButton('forest'),/กลับบ้านแล้วเริ่มรอบใหม่/);assert.match(c.expStartButton('forest'),/เหมืองชั้น 10/);
 assert(c.expStart('forest'));assert.equal(c.veg.forest.trips,5);assert.equal(c.veg.energy.n,27);assert.equal(c.veg.forest.cells.length,9);assert(c.veg.forest.cells.every(x=>!x.open));
 assert.equal(c.veg.mine.floor,0);assert.equal(c.veg.mine.cells,null);assert(c.veg.sea.cells.every(x=>x.open));assert.equal(c.veg.sea.cells[1].skip,1);
 assert.equal(c.veg.adventure.active.mine,undefined);assert.equal(c.veg.adventure.active.beach,undefined);assert.equal(c.veg.adventure.completed,0);
 assert.deepEqual(clone(c.veg.inv),inv);assert.equal(c.shop.coins,coins);assert.equal(c.veg.sea.casts,2);assert.equal(c.veg.trip.z,'forest');
 // A double tap on the old start button cannot restart or charge the new round.
 assert.equal(c.expStart('forest'),false);assert.equal(c.veg.energy.n,27);assert.equal(c.veg.forest.trips,5);
});
test('insufficient energy or health never abandons pending trips',()=>{
 for(const [field,value]of [['energy',2],['hp',1]]){
  const c=game();if(field==='energy')c.veg.energy.n=value;else c.veg.hp=value;
  const before=clone(c.veg);assert.equal(c.expStart('forest'),false);assert.deepEqual(clone(c.veg),before);assert(c.messages.length);
  assert.match(c.expStartButton('forest'),/disabled/);
 }
});
test('failed durable recovery leaves all old journeys and inventory available for retry',()=>{
 const c=game(),before=clone(c.veg);c.localStorage.setItem=()=>{throw Error('quota');};
 assert.equal(c.expStart('forest'),false);assert.deepEqual(clone(c.veg),before);assert.equal(c.veg.forest.trips,4);
});
test('returning from one old trip never clears another trip loss ledger or grants goal rewards',()=>{
 const c=game();c.adReturnHome('beach');assert.equal(c.veg.trip.z,'mine');assert.equal(c.veg.trip.got.length,1);assert.equal(c.veg.adventure.completed,0);assert.equal(c.veg.inv.pearl,2);
 c.adReturnHome('mine');assert.equal(c.veg.mine.floor,0);assert.equal(c.veg.trip.z,'');assert.equal(c.veg.mine.lift,10);
});
test('completed or never-started zones are not blockers and invalid starts cannot alter a save',()=>{
 const c=game();c.adEndTrip('mine');c.adEndTrip('beach');assert.equal(c.adBlockers('forest').length,0);
 const before=clone(c.veg);assert.equal(c.expStart('imaginary'),false);assert.deepEqual(clone(c.veg),before);
 assert.match(c.expStartButton('forest'),/เดินป่ารอบใหม่/);
});
test('the waiting UI cannot consume a cast through an accidental early reel',()=>{
 const c=game();c.fishing.state='waiting';const action=c.expFishAction('pond','<button onclick="reelIn()">ดึง</button>');
 assert.match(action,/disabled/);assert.doesNotMatch(action,/reelIn/);assert.match(action,/expCancelCast/);
 c.fishing.state='bite';assert.match(c.expFishAction('pond','<button onclick="reelIn()">ดึง</button>'),/reelIn/);
});
test('fishing dioramas match the cast time and weather and remain crisp smooth vector artwork',()=>{
 const ctx={window:null};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('farm-cute-art.js','utf8'),ctx);
 const art=ctx.FarmCuteArt;
 for(const where of ['pond','sea'])for(const night of [false,true])for(const wet of [false,true]){
  const svg=art.waterscape(where,night,wet);assert.match(svg,/viewBox="0 0 320 192"/);assert(!svg.includes('http'));assert(!svg.includes('<image'));assert(svg.length<100000);
 }
 assert.notEqual(art.waterscape('pond',false,false),art.waterscape('pond',true,false));assert.notEqual(art.waterscape('sea',false,false),art.waterscape('pond',false,false));assert.match(art.sand(1),/<svg/);
});
test('expedition scripts and inline integrations compile and both files are available offline',()=>{
 for(const f of ['farm-expedition-ui.js','farm-expedition.css']){assert(html.includes(f+'?'));assert(fs.readFileSync('sw.js','utf8').includes(f+'?'));}
 new vm.Script(fs.readFileSync('farm-expedition-ui.js','utf8'));
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
