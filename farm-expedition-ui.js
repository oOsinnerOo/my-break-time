/* Readable play surfaces for the existing exploration and fishing systems.
 * No new loot rolls, prices or reward paths: buttons call the original actions.
 */
const EXP_UI={folds:{}};
const EXP_ZONES={forest:{name:'ป่าหลังฟาร์ม',icon:'forest',verb:'เดินป่า',level:6},mine:{name:'เหมืองแร่ประกายดาว',icon:'pickaxe',verb:'ลงเหมือง',level:8},beach:{name:'ชายหาดน้ำใส',icon:'sea',verb:'เดินชายหาด',level:10},pond:{name:'บ่อปลาหลังฟาร์ม',icon:'pond'},sea:{name:'ออกเรือกลางทะเล',icon:'boat'},salt:{name:'นาเกลือริมทะเล',icon:'sea'}};
function expGlyph(k,fallback='') {return window.FarmCuteArt?.ui(k)||window.FarmCuteArt?.icon(k)||fallback;}
function expFold(id,title,content,note='') {
    return `<details class="exp-fold" ${EXP_UI.folds[id]?'open':''} ontoggle="EXP_UI.folds['${id}']=this.open"><summary><span>${title}</span>${note?`<small>${note}</small>`:''}</summary><div class="exp-fold-body">${content}</div></details>`;
}
function expHeading(z,sub='') {
    const def=EXP_ZONES[z];
    return `<header class="exp-heading"><span class="exp-emblem" aria-hidden="true">${expGlyph(def.icon,'✦')}</span><div><small>ออกไปเจอเรื่องดี ๆ</small><h3>${def.name}</h3>${sub?`<p>${sub}</p>`:''}</div></header>`;
}
function expHud(z) {
    const en=energyNow(),hp=hpNow(),max=hpMax();
    return `<div class="exp-hud"><div class="exp-stat"><span>⚡ แรง <b id="forest-energy">${en}/${ENERGY_MAX}</b></span><span class="farm-xp energy-bar" role="progressbar" aria-label="แรง" aria-valuemin="0" aria-valuemax="${ENERGY_MAX}" aria-valuenow="${Math.min(en,ENERGY_MAX)}"><span style="width:${Math.min(100,en/ENERGY_MAX*100)}%"></span></span></div><div class="exp-stat${hp<HP_TRIP?' is-low':''}"><span>❤️ เลือด <b id="zone-hp">${hp}/${max}</b></span><span class="farm-xp hp-bar" role="progressbar" aria-label="เลือด" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${hp}"><span style="width:${hp/max*100}%"></span></span></div></div><span class="exp-energy-note" id="forest-energy-next">${energyText()} · พักดี +${ENERGY_BREAK} · กินอาหารฟื้นแรง</span>`;
}
function expProgress(z) {
    const area=z==='forest'?veg.forest:z==='mine'?veg.mine:veg.sea,cells=area.cells||[];
    const total=z==='mine'?cells.length:z==='forest'?9:8,done=cells.filter(c=>c.open).length;
    const finished=cells.length>0&&done===total;
    return `<div class="exp-progress"><span><b>${z==='mine'?'สำรวจชั้นนี้':'สำรวจเส้นทาง'}</b><small>${done}/${total} จุด${finished?' · ครบแล้ว!':''}</small></span><div class="exp-dots" aria-label="สำรวจแล้ว ${done} จาก ${total} จุด">${Array.from({length:total},(_,i)=>`<i class="${i<done?'is-done':''}"></i>`).join('')}</div></div>`;
}
function expRoute(z) {
    const busy=adBusy(z),active=veg.adventure.active[z],defs=FarmAdventure.routes[z];
    const selected=busy&&active?active.route:veg.adventure.selected[z],def=defs.find(r=>r.id===selected)||defs[0];
    return `<section class="exp-route"><div class="exp-route-top"><b>${busy?'เป้าหมายรอบนี้':'เลือกเส้นทาง'}</b><span>${busy&&active?`${active.progress}/${def.target}${active.claimed?' ✓':''}`:'รางวัลพิเศษ'}</span></div>${!busy?`<div class="exp-route-choices">${defs.map(r=>`<button type="button" class="${r.id===selected?'is-active':''}" aria-pressed="${r.id===selected}" onclick="adSelectRoute('${z}','${r.id}')">${r.name}</button>`).join('')}</div>`:`<strong>${def.name}${active?.claimed?' · สำเร็จแล้ว':''}</strong>`}<small>${def.text} · ${itemInfo(def.reward[0]).name} ×${def.reward[1]}</small></section>`;
}
function expBlockerText(z) {
    return adBlockers(z).map(k=>k==='mine'?`เหมืองชั้น ${veg.mine.floor}`:EXP_ZONES[k].name).join(' และ ');
}
function expReady(z) {
    if(storageFrozen||window.farmEconomyBlocked)return 'เปิดเกมใหม่เพื่อกู้รายการบันทึกก่อน';
    if(farmLevel()<EXP_ZONES[z].level)return `ปลดล็อกเลเวล ${EXP_ZONES[z].level}`;
    if(hpNow()<HP_TRIP)return `เลือดต้องมี ${HP_TRIP} ขึ้นไป · กินอาหารหรือผลไม้ก่อน`;
    const cost=z==='forest'?forestCost():z==='mine'?1:SEA_COST;
    if(energyNow()<cost)return `แรงไม่พอ · ต้องมี ${cost} ⚡`;
    return '';
}
function expStart(z,floor=1) {
    if(!Object.hasOwn(FarmAdventure.routes,z)||adBusy(z))return false;
    const why=expReady(z);
    if(why){showToast(why,'info');renderFarmPanel();return false;}
    const blockers=adBlockers(z);
    // The button explicitly says it returns from pending trips. Never silently
    // discard their banked goods or pay rewards for their unvisited cells.
    if(blockers.length&&!farmTrade(()=>blockers.forEach(adEndTrip)))return false;
    if(window.farmEconomyBlocked)return false;
    if(z==='forest')startForest();else if(z==='mine')enterMine(floor);else startBeach();
    const body=document.getElementById('farm-body');
    if(body)body.scrollTop=0;
    return adBusy(z);
}
function expStartButton(z,floor=1) {
    const why=expReady(z),blocked=adBlockers(z).length>0,area=z==='forest'?veg.forest:z==='mine'?veg.mine:veg.sea;
    const again=z!=='mine'&&area.cells?.length;
    const label=blocked?'กลับบ้านแล้วเริ่มรอบใหม่':z==='mine'?`ลงเหมืองชั้น ${floor}`:`${EXP_ZONES[z].verb}${again?'รอบใหม่':''}`;
    const cost=z==='forest'?forestCost():z==='mine'?1:SEA_COST;
    return `${blocked?`<aside class="exp-blocker"><b>มีทริปค้าง: ${expBlockerText(z)}</b><span>ปุ่มนี้จะพากลับบ้านพร้อมของที่เก็บแล้ว แล้วเริ่มเส้นทางใหม่</span></aside>`:''}<button type="button" class="modal-btn btn-primary exp-primary" ${why?'disabled':''} onclick="expStart('${z}',${floor})"><span>${label}</span><small>${why||`${z==='mine'?'ทุบหินครั้งละ':'ใช้แรง'} ${cost} ⚡`}</small></button>${why?`<p class="exp-action-note">${why}</p>`:''}`;
}
function expPoint(i,c) {
    return `<span class="exp-point${c?.open?' is-done':''}" aria-hidden="true">${c?.open?'✓':i+1}</span>`;
}
function expMessage(text,fallback='แตะจุดบนแผนที่เพื่อสำรวจ') {
    return `<div class="exp-message" role="status">${escHtml(text||fallback)}</div>`;
}
function expRoundSummary(z) {
    const area=z==='forest'?veg.forest:veg.sea,cells=area.cells;
    if(!cells?.length||cells.some(c=>!c.open))return '';
    const skipped=cells.filter(c=>c.skip).length,returned=skipped>0&&!veg.adventure.active[z];
    const finds=z==='forest'?area.got||[]:cells.filter(c=>!c.skip&&!(c.risk&&c.hit)&&itemInfo(c.k)).map(c=>[c.k,c.n]);
    const totals={};finds.forEach(([k,n])=>{if(n>0&&itemInfo(k))totals[k]=(totals[k]||0)+n;});
    const seedCount=cells.filter(c=>!c.skip&&!(c.risk&&c.hit)&&c.k.startsWith('seed:')).length;
    return `<section class="exp-summary"><div><b>${returned?'กลับถึงบ้านแล้ว':'สำรวจครบรอบแล้ว!'}</b><span>${skipped?`เดินอ้อม/ข้าม ${skipped} จุด`:'พร้อมออกเดินทางรอบใหม่'}</span></div><div class="exp-loot">${Object.entries(totals).map(([k,n])=>`<span>${farmIcon(k,itemInfo(k).e)} ${itemInfo(k).name} <b>×${n}</b></span>`).join('')}${seedCount?`<span>เมล็ดพันธุ์ <b>×${seedCount}</b></span>`:''}${!finds.length&&!seedCount?'<small>ของที่เก็บแล้วอยู่ในคลังตามเดิม</small>':''}</div></section>`;
}
function expSupplies(z) {
    const en=energyNow(),hp=hpNow(),foods=[...new Set([...eatableKeys(),...healKeys()])].filter(k=>veg.inv[k]>0).slice(0,8);
    const buttons=foods.map(k=>{const it=itemInfo(k);return `<button type="button" class="chip-btn" ${en>=ENERGY_OVER&&hp>=hpMax()?'disabled':''} onclick="eatDish('${k}')">${farmIcon(baseOf(k),it.e)} ${it.name}${starText(it.q)} ×${veg.inv[k]}<small>${foodEn(k)?` ⚡+${foodEn(k)}`:''}${foodHp(k)?` ❤️+${foodHp(k)}`:''}</small></button>`;}).join('');
    const bandage=veg.adventure.supplies.bandage,rope=veg.adventure.supplies.rope;
    const low=hp<HP_TRIP||en<(z==='forest'?forestCost():z==='mine'?1:SEA_COST);
    if(low&&EXP_UI.folds['food-'+z]===undefined)EXP_UI.folds['food-'+z]=true;
    return expFold('food-'+z,'เสบียงและการฟื้นตัว',`<p class="farm-card-sub">แรงฟื้นเองทุก 6 นาที · เลือดฟื้นด้วยอาหารหรือผ้าพันแผล</p><div class="farm-chips">${buttons}${bandage?`<button type="button" class="chip-btn" ${hp>=hpMax()?'disabled':''} onclick="useAdventureSupply('bandage')">${adIcon('bandage')} พันแผล ×${bandage} · ❤️+30</button>`:''}${z==='mine'&&veg.mine.floor&&veg.mine.floor<MINE_FLOORS&&rope?`<button type="button" class="chip-btn" ${veg.mine.cells.some(c=>c.k==='ladder'&&!c.open)?'':'disabled'} onclick="useAdventureSupply('rope')">${adIcon('rope')} เปิดทางลง ×${rope}</button>`:''}</div>${!foods.length?'<p class="farm-card-sub">ยังไม่มีอาหาร · ทำอาหารจากครัว หรือเก็บผลไม้ไว้ฟื้นเลือด</p>':''}<button type="button" class="chip-btn" onclick="openFarm('kitchen')">ไปครัว</button>`,hp<HP_TRIP||en<1?'ต้องเติมเสบียง':'อาหาร / ผ้าพันแผล');
}
function expTravelActions(z) {
    return adBusy(z)?`<div class="exp-travel-actions"><span>ของที่เจอเก็บเข้าคลังทันที</span><button type="button" class="chip-btn" onclick="adReturnHome('${z}')">กลับบ้านพร้อมของ</button></div>`:'';
}
function expFishScene(where) {
    const f=fishing,here=f.where===where,state=here?f.state:'idle',r=here?f.result:null,c=ecologyFishContext(where);
    const night=c.hour<6||c.hour>=19,wet=['rain','storm'].includes(c.weather);
    return `<div class="pond exp-water ${where==='sea'?'sea-pond ':''}is-${state}${night?' is-night':''}"><span class="exp-water-badge">${c.label} · ${WEATHERS[c.weather].name}</span>${window.FarmCuteArt?.waterscape(where,night,wet)||''}<span class="exp-water-shimmer" aria-hidden="true"></span><span class="pond-ripple" aria-hidden="true"></span><span class="pond-float" aria-hidden="true"></span>${state==='bite'?'<span class="exp-bite-sign" aria-hidden="true">!</span>':''}${['waiting','fight'].includes(state)?`<span class="exp-fish-shadow" aria-hidden="true">${expGlyph('fish','')}</span>`:''}${r?.how==='catch'&&state==='idle'?`<span class="pond-catch" aria-hidden="true">${farmIcon(r.caught,FISH[r.caught].e)}</span>`:''}<span class="exp-scene-caption">${state==='waiting'?'ดูทุ่นไว้… รอปลากิน':state==='bite'?'ทุ่นจมแล้ว! ดึงเลย':state==='fight'?'สู้กับปลา! แตะดึงต่อเนื่อง':r?.how==='catch'?'เก็บความสุขกลับฟาร์ม':'เลือกเหยื่อ แล้วลองเหวี่ยงเบ็ดดู'}</span></div>`;
}
function expFishSteps(where) {
    const state=fishing.where===where?fishing.state:'idle',step=state==='waiting'?1:['bite','fight','settling'].includes(state)?2:0;
    return `<ol class="exp-fish-steps" aria-label="ขั้นตอนตกปลา">${['เหวี่ยงเบ็ด','รอทุ่นจม','ดึงปลา'].map((s,i)=>`<li class="${i===step?'is-current':i<step?'is-done':''}"><b>${i<step?'✓':i+1}</b>${s}</li>`).join('')}</ol>`;
}
function expFishFeedback(where,msg) {
    const r=fishing.where===where?fishing.result:null;
    if(!r||r.how!=='catch'||fishing.state!=='idle')return expMessage(msg);
    const f=FISH[r.caught];
    return `<section class="exp-catch-card rar-${f.r}" role="status"><span class="exp-catch-icon">${farmIcon(r.caught,f.e)}</span><div><small>ตกได้แล้ว · เก็บเข้ายุ้งฉาง</small><b>${f.name}</b><span>${RARITY[f.r].name} · ${r.cm} ซม.${r.record?' · สถิติใหม่!':''}</span>${r.frags||r.trophy?`<small>${r.frags?`เศษเมล็ด +${r.frags}`:''}${r.trophy?` · ตัวยักษ์ +${f.value} เหรียญ`:''}</small>`:''}</div></section>`;
}
function expFishAction(where,action) {
    const f=fishing,busy=f.where===where&&f.state!=='idle';
    if(busy&&f.state==='waiting')return `<div class="exp-controls"><button type="button" class="modal-btn btn-primary exp-primary" disabled>กำลังรอปลากินเหยื่อ…</button><button type="button" class="exp-cancel chip-btn" onclick="expCancelCast()">เก็บเบ็ด · คืน${where==='sea'?'ครั้งตก':'ตั๋ว'}และเหยื่อ</button></div>`;
    return `<div class="exp-controls">${action}</div>`;
}
function expCancelCast(){if(cancelFishing()===false)return;renderFarmPanel();renderFarmStatus();}
