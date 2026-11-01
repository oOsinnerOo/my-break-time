/* Collection guide and fishing preparation, using the farm's existing catalogs. */
const ECOLOGY_UI={open:{pond:false,sea:false}};
function readEcology(raw,inventory={}){
    const clean=FarmEcology.cleanState(raw,k=>!!itemInfo(k),k=>Object.prototype.hasOwnProperty.call(FISH,k));
    Object.keys(inventory).forEach(k=>{if(itemInfo(k))clean.seen[baseOf(k)]=true;});return clean;
}
function ecologyClock(d=new Date()){return FarmVillagers.clock(d.getTime());}
function selectedFishBait(where='pond'){
    if(fishing.state!=='idle'&&fishing.where===where)return fishing.bait;
    return FarmEcology.baitFor({selected:veg.baitSel,bait:veg.bait,gold:veg.goldBait},where);
}
function ecologyFishContext(where='pond',d=new Date()){
    if(fishing.state!=='idle'&&fishing.where===where&&fishing.context)return fishing.context;
    const time=ecologyClock(d);
    return {...time,where,bait:selectedFishBait(where),weather:todayWeather(),season:farmSeason(d),rod:upgLv('rod'),skill:sk('fish'),beach:gdSetOn('beach'),secrets:{...veg.secrets}};
}
function ecologyFishTable(where='pond'){return FarmEcology.table(FISH,ecologyFishContext(where));}
function ecologyPercent(p){return p>=.99999?'100%':p<=0?'0%':p<.0001?'<0.01%':(p*100).toFixed(p<.01?2:1)+'%';}
function ecologyFishName(k){const f=FISH[k];return veg.fishCaught[k]?f.name:f.secret?'เงาปลาลึกลับ':`เงาปลา${RARITY[f.r].name} (${f.cm[0]}–${f.cm[1]} ซม.)`;}
function ecologyFishReason(k,row){
    if(row.p>0)return 'พร้อมพบ';
    const f=FISH[k],r=row.reasons||[],texts=[];
    if(!r.length)return 'อีเวนต์พิเศษกำลังดึงดูดเงาปลาอื่น';
    if(r.includes('place'))texts.push(f.sea?'ออกเรือในทะเล':'บ่อปลา');
    if(r.includes('secret'))texts.push('ยังไม่ค้นพบอีเวนต์');
    if(r.includes('day'))texts.push('กลางวัน 06:00–18:00');
    if(r.includes('night'))texts.push('กลางคืน 19:00–05:00');
    if(r.includes('hour'))texts.push('เวลา '+String(f.when.hour).padStart(2,'0')+':00–'+String((f.when.hour+1)%24).padStart(2,'0')+':00');
    if(r.includes('weather'))texts.push(f.when.weather.map(w=>WEATHERS[w].name).join('/'));
    if(r.includes('season'))texts.push(FARM_SEASONS[f.when.season].name);
    if(r.includes('bait'))texts.push('ต้องใช้เหยื่อทอง');
    return texts.join(' · ')||'ยังไม่อยู่ในแหล่งนี้';
}
function ecologySetTarget(k){
    if(fishing.state!=='idle'||(k&&(!FISH[k]||(FISH[k].secret&&!veg.secrets[k]))))return;
    veg.ecology.target=k;saveVeg();renderFarmPanel();
    if(document.getElementById('veg-book').style.display==='flex')renderDex();
}
function ecologySetCalm(on){if(fishing.state!=='idle')return;veg.ecology.calm=!!on;saveVeg();renderFarmPanel();}
function ecologyOpenFishing(where){
    if(fishing.state!=='idle')return;
    closeVegBook();if(where==='sea')seaView='boat';openFarm(where==='sea'?'sea':'pond');
}
function ecologyFishTargetHTML(k){
    const disabled=fishing.state!=='idle',chosen=veg.ecology.target===k;
    if(FISH[k].secret&&!veg.secrets[k])return '';
    return `<div class="farm-chips"><button type="button" class="chip-btn" ${disabled?'disabled':''} onclick="ecologySetTarget('${chosen?'':k}')">${chosen?'เลิกติดตาม':'ติดตามปลานี้'}</button><button type="button" class="chip-btn" ${disabled?'disabled':''} onclick="ecologyOpenFishing('${FISH[k].sea?'sea':'pond'}')">ไป${FISH[k].sea?'ออกเรือ':'บ่อปลา'}</button></div>`;
}
function ecologyFishPlanHTML(where){
    const c=ecologyFishContext(where),rows=ecologyFishTable(where),busy=fishing.state!=='idle',target=veg.ecology.target;
    if(!busy)ecologyTick.hour=c.hour;
    const listed=rows.filter(r=>!!FISH[r.key].sea===(where==='sea')&&(!FISH[r.key].secret||veg.secrets[r.key]||r.p>0));
    const tr=target?rows.find(r=>r.key===target):null,t=FarmEcology.timing(upgLv('rod'),veg.ecology.calm);
    return `<section class="eco-fish-plan"><div class="eco-fish-time"><b>${busy?'เวลาเหวี่ยงเบ็ด':'เวลาหมู่บ้าน'} <span data-fish-clock>${c.label}</span></b><small>${WEATHERS[c.weather].name} · ${FARM_SEASONS[c.season].name}</small></div><p class="farm-card-sub">กลางวัน–กลางคืนวนครบใน 24 นาที · อากาศและฤดูตามวันจริง</p>${tr?`<p class="eco-target">เป้าหมาย: ${escHtml(ecologyFishName(target))} · ${ecologyPercent(tr.p)}<br><small>${escHtml(ecologyFishReason(target,tr))}</small></p>`:''}<label class="eco-calm"><input type="checkbox" ${veg.ecology.calm?'checked':''} ${busy?'disabled':''} onchange="ecologySetCalm(this.checked)"> โหมดสบาย · เวลากด ${ (t.bite/1000).toFixed(2)} วินาที${veg.ecology.calm?' · สู้ปลาได้นานขึ้น 2 เท่า':''}</label><details ${ECOLOGY_UI.open[where]?'open':''} ontoggle="ECOLOGY_UI.open['${where}']=this.open"><summary>หมายปลาและโอกาสติดเบ็ด${busy?'ของครั้งนี้':''}</summary><p class="farm-card-sub">โอกาสรวมตามเหยื่อ คันเบ็ด สกิล และเงื่อนไขตอนเหวี่ยง · โหมดสบายให้รางวัลเท่ากัน</p><label>เป้าหมายสะสม<select aria-label="เป้าหมายสะสมปลา" ${busy?'disabled':''} onchange="ecologySetTarget(this.value)"><option value="">ไม่ติดตาม</option>${Object.keys(FISH).filter(k=>!FISH[k].secret||veg.secrets[k]).map(k=>`<option value="${k}" ${target===k?'selected':''}>${FISH[k].sea?'ทะเล':'บ่อ'} · ${escHtml(ecologyFishName(k))}</option>`).join('')}</select></label><div class="eco-fish-list">${listed.sort((a,b)=>b.p-a.p).map(r=>`<div class="eco-fish-row${r.p?' is-open':''}"><span>${veg.fishCaught[r.key]?farmIcon(r.key,FISH[r.key].e):'❔'} ${escHtml(ecologyFishName(r.key))}<small>${escHtml(ecologyFishReason(r.key,r))}</small></span><b>${ecologyPercent(r.p)}</b></div>`).join('')}</div><button type="button" class="chip-btn" ${busy?'disabled':''} onclick="renderFarmPanel()">อัปเดตหมายปลา</button></details><p class="farm-card-sub">ปิดระหว่างรอปลาคืนตั๋ว/ครั้งตกและเหยื่อ · หลังปลากินแล้วเก็บเบ็ดถือว่าปลาหลุด</p></section>`;
}
function ecologyUsageData(){return {recipes:RECIPES,machines:MACHINES,upgrades:UPGRADES,gear:AD_GEAR,cooked:veg.cooked,villagers:FarmVillagers.NPCS,feeds:Object.fromEntries(Object.entries(ANIMAL_FEEDS).map(([id,f])=>[id,{...f,name:ANIMALS[id].name,level:ANIMALS[id].level,qty:feedNeed(id)}]))};}
function ecologyKnown(k){
    const b=baseOf(k);
    return !!(veg.ecology.seen[b]||countBase(b)||cropTotal(b)||veg.cooked[b]||veg.fishCaught[b]||veg.forest.found[b]||veg.mine.found[b]||veg.sea.found[b]||veg.treeFinds[b]||veg.treasures[b]||Object.values(veg.museum).some(m=>m&&typeof m==='object'&&m[b]));
}
function ecologyItemHidden(k){
    const b=baseOf(k);
    return RECIPES[b]?.secret&&!veg.cooked[b]||rarAtLeast(itemRarity(b),'epic')&&!ecologyKnown(b);
}
function ecologyRarityHTML(){
    return `<details class="eco-rarity"><summary>ระดับความหายาก ต่างจากดาวอย่างไร?</summary><p>ระดับบอกชนิดและวิธีหา ส่วน ★1–5 คือคุณภาพของผัก ผลไม้ และอาหาร ไม่เปลี่ยนชนิดให้เป็นของตำนาน</p><p>ตัวคูณคุณภาพ: ${[1,2,3,4,5].map(q=>'★'+q+' ×'+QUALITY_MULT[q]).join(' · ')}</p><p>ผักผลไม้และปลาปัจจุบันสูงสุดระดับเทพ · ระดับอมตะ/จักรวาลอยู่ในของล้ำค่าและสมบัติจากการสำรวจ</p><p>ผักเทพลุ้นจากกล่อง 1% หรือใช้เศษ ${MYTH_ROLL} ชิ้น โอกาสเริ่ม ${MYTH_BASE}% · ผักตำนานต่างชนิดติดกันลุ้นเมล็ดเทพ ${Math.round(HARVEST_MYTH_CHANCE*100)}%</p></details>`;
}
function ecologyUsesHTML(key){
    const k=baseOf(key),uses=FarmEcology.uses(k,ecologyUsageData());
    if(k==='herbTonic')uses.unshift({kind:'animals',name:'บำรุงตอนจับคู่สัตว์ · ลุ้นลายพิเศษ ×2',qty:1});
    if(FARM_PRODUCTS[k]?.zone==='baby')uses.unshift({kind:'animals',name:'รับเลี้ยงลูกสัตว์ในฟาร์ม',qty:1});
    if(k==='honey')uses.unshift({kind:'pond',name:'เหยื่อทอง',qty:1,extra:'พร้อมเหยื่อหนอน 3 ตัว'});
    const lines=uses.map(u=>`<li>${escHtml(u.output?itemInfo(u.output)?.name||u.output:u.name)} · ใช้ ${u.qty} ชิ้น${u.stage?' · '+escHtml(u.name)+' ขั้น '+u.stage:''}${u.level?' · เลเวล '+u.level:''}${u.extra?' · '+u.extra:''}</li>`);
    return `<section class="eco-uses"><p class="dex-group"><b>ใช้กับอะไรได้บ้าง</b></p>${lines.length?`<ul class="dex-list">${lines.slice(0,8).join('')}</ul>${lines.length>8?`<details><summary>อีก ${lines.length-8} วิธีใช้</summary><ul class="dex-list">${lines.slice(8).join('')}</ul></details>`:''}`:'<p class="farm-card-sub">เก็บสะสม ขาย ส่งออเดอร์ ประมูล หรือแลกเปลี่ยนกับเพื่อนได้</p>'}<div class="farm-chips">${[...new Set(uses.map(u=>u.kind))].map(t=>`<button type="button" class="chip-btn" onclick="ecologyOpenUse('${t}')">ดู${{kitchen:'ครัว',craft:'โรงแปรรูป',upgrade:'อัปเกรด',pond:'บ่อปลา',animals:'สัตว์',villagers:'สมุดชาวบ้าน'}[t]}</button>`).join('')}</div></section>`;
}
function ecologyOpenUse(tab){
    if(fishing.state!=='idle'&&cancelFishing()===false)return;
    closeVegBook();if(tab==='villagers'){closeFarm();FarmVillagers.openBook();}else openFarm(tab);
}
function ecologyItemSources(k){
    const from=[];
    if(RECIPES[k])return [`ทำ${RECIPES[k].name}ในครัว เลเวล ${RECIPES[k].level}`];
    Object.values(MACHINES).forEach(m=>(m.recipes||[]).filter(r=>r.out===k).forEach(()=>from.push(`${m.name} ที่โรงแปรรูป · เลเวล ${m.level}`)));
    if(from.length)return from;
    Object.values(ANIMALS).filter(a=>a.product===k).forEach(a=>from.push('เก็บผลผลิตจาก'+a.name));
    if(k==='honey')from.push('เก็บจากบ้านผึ้ง เมื่อมีดอกไม้บาน');
    if(k==='bouquet')from.push('เด็ดดอกไม้ที่บานแล้ว');
    const z=FARM_PRODUCTS[k]?.zone;
    if(z==='forest')from.push(`สำรวจป่า เลเวล ${FOREST_LEVEL}`);
    if(z==='mine'||z==='fossil')from.push(`ขุดเหมือง เลเวล ${MINE_LEVEL}`);
    if(z==='sea')from.push(`สำรวจชายหาด เลเวล ${SEA_LEVEL}`);
    if(FRUIT_GEMS.some(([g])=>g===k))from.push('ลุ้นตอนเก็บผลไม้ ต้นเก่าแก่และดวงสะสมช่วยเพิ่มโอกาส');
    if(z==='treasure')from.push('ลุ้นตอนสำรวจป่า เหมือง หรือทะเล ดวงสะสมช่วยเพิ่มโอกาส');
    if(z==='baby')from.push('เพาะพันธุ์สัตว์ในฟาร์ม หรือรับจากเพื่อน');
    return from.length?from:['ผลผลิตพิเศษจากฟาร์ม สัตว์ หรือกิจกรรม'];
}
function ecologyItemDetail(key){
    const k=baseOf(key),it=itemInfo(key),r=itemRarity(k)||'common',hidden=ecologyItemHidden(k);
    if(hidden)return dexHead('❔','ยังไม่ค้นพบ',r,'ไอเทมสะสม')+'<p class="dex-desc">ค้นพบก่อนจึงเห็นชื่อและรายละเอียด ของที่เคยพบจะจำไว้แม้ใช้หมด</p><p class="farm-card-sub">'+(RECIPES[k]?'ค้นพบสูตรลับจากการทำอาหาร':ecologyItemSources(k).map(escHtml).join(' · '))+'</p>';
    return dexHead(it.icon||it.e,it.name+starText(it.q),r,RECIPES[k]?'อาหาร':'ไอเทมและวัสดุ')+dexStats([
        ['📦','มีในยุ้งฉาง',String(countBase(k))+' ชิ้น'],['🪙','ราคาพื้นฐาน',String(it.value)+' เหรียญ'],['🏷️','ขายตอนนี้',String(sellPrice(key))+' เหรียญ/ชิ้น'],
        ...(foodEn(key)||foodHp(key)?[['🍽️','กินแล้วฟื้น',`แรง +${foodEn(key)} · เลือด +${foodHp(key)}`]]:[])
    ])+'<p class="dex-group"><b>หาได้ที่ไหน</b></p><ul class="dex-list">'+ecologyItemSources(k).map(x=>'<li>'+escHtml(x)+'</li>').join('')+'</ul>'+ecologyUsesHTML(k);
}
function ecologyItemsTab(){
    const list=[...new Set([...Object.keys(FARM_PRODUCTS),...Object.keys(RECIPES)])],shown=list.filter(k=>dex.filter==='all'||(itemRarity(k)||'common')===dex.filter);
    return ecologyRarityHTML()+`<p class="dex-sum">วัสดุและอาหาร · แตะดูแหล่งหา สูตร และงานอัปเกรดที่ใช้</p><div class="farm-chips">${['all',...RARITY_KEYS.filter(r=>list.some(k=>(itemRarity(k)||'common')===r))].map(r=>`<button type="button" class="chip-btn${dex.filter===r?' is-active':''}" onclick="dexSetFilter('${r}')">${r==='all'?'ทั้งหมด':RARITY[r].name}</button>`).join('')}</div><div class="dex-grid">${shown.map(k=>{const it=itemInfo(k),hidden=ecologyItemHidden(k);return dexCell('item',k,hidden?'❔':it.e,hidden?'ยังไม่พบ':it.name,countBase(k),'',itemRarity(k)||'common',hidden);}).join('')}</div>`;
}
function openItemGuide(key){const k=baseOf(key);if(!itemInfo(k))return;openDex(VEGGIES[k]?'crops':FISH[k]?'fish':'items',k);}
function ecologyPauseFishing(){
    if(!['waiting','bite','fight'].includes(fishing.state)||fishing.paused)return;
    clearTimeout(fishing.timer);fishing.paused={state:fishing.state,left:Math.max(100,fishing.until-Date.now()),seq:fishing.seq};
}
function ecologyResumeFishing(){
    const p=fishing.paused;if(!p)return;fishing.paused=null;
    if(p.seq!==fishing.seq||p.state!==fishing.state)return;
    fishSchedule(p.state,p.left,seq=>p.state==='waiting'?fishBite(seq):endFishing(p.state==='bite'?'late':'escape'));
    renderFarmPanel();
}
function ecologyTick(){
    if(document.hidden||!document.getElementById('farm-modal')||document.getElementById('farm-modal').style.display!=='flex')return;
    if(!farmTabIs('pond')&&!(farmTabIs('sea')&&seaView==='boat'))return;
    const clock=ecologyClock(),node=document.querySelector('[data-fish-clock]');
    if(node&&!fishing.context)node.textContent=clock.label;
    if(fishing.state==='idle'&&ecologyTick.hour!==clock.hour){ecologyTick.hour=clock.hour;if(!document.activeElement?.closest('.eco-fish-plan'))renderFarmPanel();}
}
document.addEventListener('DOMContentLoaded',()=>{
    setInterval(ecologyTick,1000);
    document.addEventListener('visibilitychange',()=>document.hidden?ecologyPauseFishing():ecologyResumeFishing());
    window.addEventListener('pagehide',()=>{if(['waiting','bite','fight'].includes(fishing.state))cancelFishing();});
});
