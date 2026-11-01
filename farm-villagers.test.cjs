const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,f),'utf8');
const plain=x=>JSON.parse(JSON.stringify(x));
const runtime={};vm.createContext(runtime);vm.runInContext(read('farm-systems.js')+'\n'+read('farm-villagers.js'),runtime);
const V=runtime.FarmVillagers,G=runtime.FarmSystems;
function game(){
    const c={state:V.cleanState(),day:'2026-11-01',level:10,weather:'sun',inventory:{carrot:9,wood:20,stone:20,fish:4,wheat:20,tomato:20,egg:9,wool:9,strawberry:9},coins:0,xp:0,saves:[],messages:[]};
    const inventoryContext={veg:{inv:c.inventory},baseOf:k=>k.split('~')[0],qKey:(k,q)=>q===1?k:k+'~'+q};
    vm.createContext(inventoryContext);const source=read('index.html');vm.runInContext(source.slice(source.indexOf('        function giveItem('),source.indexOf('        function addXP(')),inventoryContext);
    c.api={read:()=>c,has:inventoryContext.hasItems,take:inventoryContext.takeItems,giftable:k=>['carrot','wood','fish','tomato'].includes(k),
        save:()=>c.saves.push({state:plain(c.state),inventory:plain(c.inventory),coins:c.coins,xp:c.xp}),
        reward:r=>{c.coins+=r.coins;c.xp+=r.xp;if(c.onReward)c.onReward();},toast:message=>c.messages.push(message)};
    c.engine=new V.Engine(c.api);return c;
}
test('old saves receive eight clean relationships without altering legacy quest progress',()=>{
    const legacy={quest:{ch:5,daily:'2026-10-30'},inv:{carrot:9}};const copy=plain(legacy),s=V.cleanState(legacy.villagers);
    assert.equal(Object.keys(s.people).length,8);assert.equal(s.people.chick.points,0);assert.deepEqual(legacy,copy);assert.deepEqual(plain(V.cleanState(plain(s))),plain(s));
});
test('imported villagers discard unknown jobs, invalid dates and arbitrary reward payloads',()=>{
    const s=V.cleanState({people:{chick:{points:Infinity,chatDay:'<script>',memories:99},bunny:{points:999,memories:3}},stories:{chick:{step:99},bunny:{started:true,step:999}},
        requests:[{who:'stranger',day:'2026-11-01',variant:0},{who:'chick',day:'bad',variant:0},{who:'chick',day:'2026-11-01',variant:99},{who:'dadBear',day:'2026-11-01',variant:0,step:999,reward:{coins:1e9}}],pin:'<img>',daily:{day:'bad',n:Infinity}});
    assert.equal(s.people.chick.points,0);assert.equal(s.people.chick.chatDay,'');assert.equal(s.people.chick.memories,0);assert.equal(s.people.bunny.points,100);
    assert.equal(s.stories.chick.step,0);assert.equal(s.stories.bunny.step,2);assert.equal(s.pin,'');assert.equal(s.requests.length,1);assert.equal(s.requests[0].step,1);assert(!('reward' in s.requests[0]));
});
test('save migration keeps at most three tracked tasks and preserves paused progress',()=>{
    const s=V.cleanState({stories:Object.fromEntries(V.IDS.map(id=>[id,{started:true,step:1}])),requests:[{who:'chick',day:'2026-11-01',variant:0,step:0}]});
    const c=game();c.state=s;assert.equal(c.engine.active().length,3);assert(s.stories.dadBear.paused);assert.equal(s.stories.dadBear.step,1);
});
test('personal quests advance only accepted objectives in order and reject stale clue clicks',()=>{
    const c=game(),e=c.engine;assert.equal(e.collect('s:chick',1),false);assert(e.acceptStory('chick'));assert.equal(e.progress('visit','board'),false);assert.equal(e.collect('s:chick',1),false);
    e.talk('bunny');assert.equal(c.state.stories.chick.step,1);assert.equal(e.collect('s:chick',0),false);assert(e.collect('s:chick',1));assert.equal(c.state.stories.chick.step,2);
    assert.equal(e.collect('s:chick',1),false);assert.equal(e.talk('unknown'),false);assert.equal(e.claim('s:unknown'),false);
});
test('level gates and active-task limits cannot be bypassed; paused quests resume their old step',()=>{
    const c=game(),e=c.engine;c.level=1;assert.equal(e.acceptStory('hedgehog'),false);e.acceptStory('chick');e.talk('bunny');e.acceptStory('dadBear');e.acceptStory('orangeCat');assert.equal(e.acceptDaily('bunny'),false);
    assert(e.pause('s:chick'));assert(e.acceptDaily('bunny'));assert.equal(e.acceptStory('chick'),false);const key=e.active().find(q=>q.kind==='daily').key;assert(e.returnDaily(key));
    assert(e.acceptStory('chick'));assert.equal(c.state.stories.chick.step,1);assert.equal(e.claim('s:chick'),false);
});
test('turn-in consumes actual lowest-quality goods and persists the claim before reward callbacks',()=>{
    const c=game(),e=c.engine;c.inventory.carrot=1;c.inventory['carrot~3']=4;e.acceptStory('chick');e.talk('bunny');e.collect('s:chick',1);
    c.onReward=()=>assert.equal(e.claim('s:chick'),false);assert(e.claim('s:chick'));
    assert.equal(c.inventory.carrot,undefined);assert.equal(c.inventory['carrot~3'],3);assert.equal(c.coins,20);assert.equal(c.xp,15);assert.equal(c.state.people.chick.points,12);
    const saved=c.saves.find(x=>x.state.stories.chick.done);assert(saved);assert.equal(saved.coins,0);assert.equal(saved.inventory['carrot~3'],3);assert.equal(e.claim('s:chick'),false);assert.equal(c.coins,20);
});
test('missing goods never finish a story or pay rewards, including after inventory changes',()=>{
    const c=game(),e=c.engine;e.acceptStory('chick');e.talk('bunny');e.collect('s:chick',1);c.inventory.carrot=1;
    assert.equal(e.ready(e.current('s:chick')),false);assert.equal(e.claim('s:chick'),false);assert.equal(c.coins,0);assert.equal(c.state.stories.chick.done,false);assert.equal(c.inventory.carrot,1);
});
test('daily conversation and gifts have independent per-person limits and never consume hidden or invalid goods',()=>{
    const c=game(),e=c.engine;e.talk('chick');e.talk('chick');assert.equal(c.state.people.chick.points,2);
    assert.equal(e.gift('chick','starTomato'),false);assert.equal(e.gift('chick','<img>'),false);assert(e.gift('chick','carrot'));assert.equal(c.state.people.chick.points,8);assert.equal(c.inventory.carrot,8);
    assert.equal(e.gift('chick','carrot'),false);assert.equal(c.inventory.carrot,8);assert(e.gift('bunny','wood'));assert.equal(c.state.people.bunny.points,2);
    c.day='2026-11-02';e.talk('chick');assert(e.gift('chick','carrot'));assert.equal(c.state.people.chick.points,16);
});
test('daily jobs retain their accepted variant across midnight and level changes',()=>{
    const c=game(),e=c.engine;assert(e.acceptDaily('dadBear'));const first=e.active()[0],saved=plain(c.state);c.state=V.cleanState(saved);c.day='2026-11-02';c.level=1;
    const resumed=e.current(first.key);assert.equal(resumed.title,first.title);assert.deepEqual(plain(resumed.steps),plain(first.steps));e.progress('visit',resumed.steps[0].place);assert(e.claim(first.key));assert.equal(e.dailyCount(),1);assert.equal(c.state.people.dadBear.requestDay,'2026-11-02');assert.equal(e.acceptDaily('dadBear'),false);
});
test('three daily claims is a global real-day limit; remaining accepted jobs wait safely',()=>{
    const c=game(),e=c.engine;
    for(const who of ['chick','bunny','dadBear']){assert(e.acceptDaily(who));const q=e.active().find(q=>q.kind==='daily'&&q.who===who);e.progress('visit',q.steps[0].place);assert(e.claim(q.key));assert.equal(e.claim(q.key),false);}
    assert.equal(e.dailyCount(),3);assert.equal(c.coins,36);assert.equal(e.acceptDaily('orangeCat'),false);
    c.day='2026-11-02';assert(e.acceptDaily('orangeCat'));assert.equal(e.dailyCount(),0);
});
test('friendship memories require their heart thresholds and survive a save reload',()=>{
    const c=game(),e=c.engine;assert.equal(e.memory('chick',0),false);c.state.people.chick.points=20;assert(e.memory('chick',0));assert.equal(e.memory('chick',1),false);
    c.state.people.chick.points=60;assert(e.memory('chick',1));assert.equal(e.memory('chick',99),false);assert.equal(V.cleanState(plain(c.state)).people.chick.memories,3);
});
test('village clock is a 24-minute cycle and schedules react to night, rain and heat',()=>{
    assert.equal(V.clock(0).label,'00:00');assert.equal(V.clock(12*60000+34*1000).label,'12:34');assert.equal(V.clock(24*60000).label,'00:00');
    assert.equal(V.routine('chick',7*60000,'sun').place,'barn');assert.equal(V.routine('chick',11*60000,'sun').place,'stall');assert.equal(V.routine('chick',23*60000,'sun').place,'house');
    assert.match(V.routine('chick',7*60000,'rain').action,/หลบฝน/);assert.equal(V.routine('chick',11*60000,'heat').place,'pond');
});
test('all eight villagers respect obstacles and unlocked land while walking, without changing the farm save',()=>{
    for(const [land,count] of [[0,3],[1,7],[6,12]]){
        const world=G.cleanWorld(),saved=plain(world),w=new V.Walkers();let now=7*60000;w.sync(world,count,land,'sun',now);assert.equal(w.actors.size,8);
        for(let i=0;i<500;i++){now+=100;w.tick(.1,now);for(const a of w.actors.values()){assert(w.can(a.x,a.y),a.id+':'+a.x+','+a.y);assert.notEqual(G.approach(world,count,land,world.pos,{x:Math.round(a.x),y:Math.round(a.y),w:1,h:1}),null);}}
        assert.deepEqual(plain(world),saved);
    }
});
test('selected villagers wait for the player and resume after release; moved buildings replan routes',()=>{
    const world=G.cleanWorld(),w=new V.Walkers();let now=7*60000;w.sync(world,3,0,'sun',now);w.select('chick');const start={x:w.actors.get('chick').x,y:w.actors.get('chick').y};
    for(let i=0;i<80;i++){now+=100;w.tick(.1,now);}assert.deepEqual({x:w.actors.get('chick').x,y:w.actors.get('chick').y},start);
    w.select('');world.buildings.stall={x:10,y:1};w.sync(world,3,0,'rain',now);assert.match(w.actors.get('chick').action,/หลบฝน/);
    for(let i=0;i<80;i++){now+=100;w.tick(.1,now);for(const a of w.actors.values())assert(w.can(a.x,a.y));}
});
test('quest objects keep their location when villagers change destinations',()=>{
    const world=G.cleanWorld(),w=new V.Walkers();w.sync(world,3,0,'sun',7*60000);
    const before=plain(w.destination('chick','board',world.pos,7,false));
    for(const a of w.actors.values())a.goal={...before};
    assert.deepEqual(plain(w.destination('chick','board',world.pos,7,false)),before);
});
test('every villager and walking direction uses distinct native pixel sprites',()=>{
    const sprites=new Set();for(const who of V.IDS)for(const dir of ['down','up','left','right'])for(const f of [0,1]){
        const s=V.sprite(who,dir,f);assert(s.includes('crispEdges'));assert(!/NaN|undefined|<image|<text|script/i.test(s));sprites.add(s);
    }assert.equal(sprites.size,64);assert.equal(V.sprite('<script>'),'');
});
test('work and rest poses are distinct from ordinary idle sprites',()=>{
    for(const who of V.IDS){assert.notEqual(V.sprite(who,'down',0,'work'),V.sprite(who));assert.notEqual(V.sprite(who,'down',0,'rest'),V.sprite(who));}
});
test('unchanged dialogue does not rebuild normalized DOM and close an open gift menu',()=>{
    let html='<button disabled >hello</button>',writes=0;
    const content={scrollTop:7,querySelector:()=>null,get innerHTML(){return '<button disabled="">hello</button>';},set innerHTML(value){writes++;}};
    const header={textContent:'',innerHTML:''},c={api:{},dialogue:'',lastDialogHTML:'',lastNote:'',feedback:'',bookHTML:()=>html,document:{activeElement:null},overlay:{hidden:false,contains:()=>false,querySelector:s=>s==='.fv-content'?content:header}};
    vm.createContext(c);const source=read('farm-villagers.js');vm.runInContext(source.slice(source.indexOf('    function render(){'),source.indexOf('    function needHTML(')),c);
    c.render();c.render();assert.equal(writes,1);assert.equal(content.scrollTop,7);html='<p>changed quest</p>';c.render();assert.equal(writes,2);
});
test('the original eight-chapter quest rejects a late delivery token instead of consuming the next chapter',()=>{
    const source=read('index.html'),c={veg:{quest:{ch:0,daily:''}},dayKeyLocal:()=>'2026-11-01',hasItems:()=>true,paid:0,rewards:0,takeItems:()=>c.paid++,giveReward:()=>c.rewards++,
        CR:Object.fromEntries(V.IDS.map(id=>[id,{name:id}])),playSound(){},fireConfetti(){},showToast(){},renderFarmPanel(){},renderFarmStatus(){},updateBasketFood(){},rewardText:()=>''};
    vm.createContext(c);vm.runInContext(source.slice(source.indexOf('        const QUESTS ='),source.indexOf('        function renderQuestTab()')),c);
    assert.equal(c.deliverQuest('main:0'),true);assert.equal(c.veg.quest.ch,1);assert.equal(c.deliverQuest('main:0'),false);assert.equal(c.paid,1);assert.equal(c.rewards,1);assert.equal(c.deliverQuest('main:1'),true);
});
test('new modules, inline adapters and offline assets compile; villagers are included in save migration',()=>{
    for(const f of ['farm-villagers.js','farm-world.js','sw.js'])new vm.Script(read(f),{filename:f});
    for(const m of read('index.html').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
    assert.match(read('index.html'),/villagers: FarmVillagers\.cleanState\(v\.villagers\)/);
    for(const m of read('sw.js').matchAll(/'\.\/([^']+)'/g))assert(fs.existsSync(path.join(__dirname,m[1].split('?')[0])),m[1]);
});
