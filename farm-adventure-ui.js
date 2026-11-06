/* UI adapters for the existing farm save, inventory and exploration systems. */
const AD_GEAR = {
    gloves: { name: 'ถุงมือสำรวจ', level: 6, text: n => `ลดความเสียหายจากกับดัก ${15 * n}%`, mats: [{ wool: 2, wood: 3 }, { wool: 3, copperBar: 1 }, { wool: 4, ironBar: 2 }] },
    lamp: { name: 'ตะเกียงนักขุด', level: 8, text: n => `เห็นเบาะแสแร่ปลอดภัย ${n} จุดต่อชั้น`, mats: [{ coal: 3, wood: 3 }, { copperBar: 2, coal: 4 }, { ironBar: 2, coal: 6 }] },
    tidechart: { name: 'แผนที่น้ำขึ้นน้ำลง', level: 10, text: n => `เห็นของใต้ทราย ${n} จุด${n >= 2 ? ' · ออกเรือตกปลาเพิ่ม 1 ครั้ง' : ''}`, mats: [{ wood: 3, seaweed: 2 }, { seaGlass: 3, conch: 3 }, { pearl: 1, seaGlass: 4 }] }
};
function adIcon(k) {
    return FarmCuteArt.ui(k).replace('class="farm-cute-icon"','class="farm-cute-icon ad-icon"');
}
function farmTrade(change) {
    if (storageFrozen || window.farmEconomyBlocked) { showToast('กำลังป้องกันข้อมูลเซฟ กรุณาเปิดเกมใหม่ก่อนทำรายการ', 'warning'); return false; }
    const beforeVeg = JSON.stringify(veg), beforeShop = JSON.stringify(shop);
    try {
        change();
        const result = FarmAdventure.commit(localStorage, veg, shop);
        if (result.pending) { window.farmEconomyBlocked = true; showToast('บันทึกรายการไว้แล้ว กรุณาเปิดเกมใหม่เพื่อกู้รายการให้ครบ', 'warning'); }
        updateCoinUI(); return true;
    } catch (_) {
        veg = JSON.parse(beforeVeg); shop = JSON.parse(beforeShop);
        showToast('พื้นที่บันทึกไม่พอ รายการยังไม่สำเร็จและยังไม่หักของหรือเหรียญ', 'warning');
        return false;
    }
}
function adGear(k) { return veg.adventure.gear[k] || 0; }
function buyAdventureGear(k) {
    const g = AD_GEAR[k], n = adGear(k), price = [60,140,260][n];
    if (!g || n >= 3 || farmLevel() < g.level + n || shop.coins < price || !hasItems(g.mats[n])) return;
    if (!farmTrade(()=>{ takeItems(g.mats[n]); shop.coins -= price; veg.adventure.gear[k]++; })) return;
    showToast(`${g.name} ระดับ ${n+1} พร้อมใช้ · ${g.text(n+1)}`, 'success');
    renderFarmPanel(); renderShop(); renderFarmStatus();
}
function renderAdventureGear() {
    return '<p class="dex-group"><b>อุปกรณ์นักสำรวจ</b> · ทำครั้งเดียว ใช้ได้ตลอด</p>' + Object.entries(AD_GEAR).map(([k,g])=> {
        const n=adGear(k), price=[60,140,260][n], max=n>=3, ok=!max && farmLevel()>=g.level+n && shop.coins>=price && hasItems(g.mats[n]);
        return `<div class="farm-card ad-gear">${adIcon(k)}<div class="farm-card-main"><b>${g.name} · ${n}/3</b><span class="farm-card-sub">${g.text(n || 1)}${!n ? ' (เมื่อสร้างแล้ว)' : ''}</span>${max?'':`<span class="farm-card-sub">ถัดไป: ${g.text(n+1)} · เลเวล ${g.level+n}</span><div class="farm-chips"><span class="farm-chip">🪙${price}</span>${Object.entries(g.mats[n]).map(([m,q])=>itemChip(m,q)).join('')}</div>`}</div>${max?'<span class="farm-done">ครบแล้ว</span>':`<button class="shop-buy farm-action" type="button" ${ok?'':'disabled'} onclick="buyAdventureGear('${k}')">${n?'อัปเกรด':'สร้าง'}</button>`}</div>`;
    }).join('');
}
function buyAdventureSupply(k) {
    const def = { bandage: [12, 6], rope: [8, 8], wood: [9, 2] }[k];
    if (!def || farmLevel()<def[1] || shop.coins<def[0]) return;
    if (k!=='wood' && veg.adventure.supplies[k]>=20) return;
    if (!farmTrade(()=> { shop.coins-=def[0]; if(k==='wood') giveItem('wood',3); else veg.adventure.supplies[k]++; })) return;
    showToast(k==='wood' ? 'ได้ไม้ 3 ท่อนแล้ว' : 'เก็บอุปกรณ์ไว้พร้อมสำรวจแล้ว', 'success'); renderShop(); renderFarmPanel();
}
function renderAdventureStore() {
    return `<div class="ad-store"><p class="dex-group"><b>เสบียงเดินทาง</b></p>${[
        ['wood','ไม้แห้ง 3 ท่อน',9,2,'ใช้ทำงานช่างและภารกิจ ไม่ต้องรอเข้าป่า'],
        ['bandage','ผ้าพันแผล',12,6,'ฟื้นเลือด 30 หน่วย กดใช้ระหว่างสำรวจ'],
        ['rope','เชือกสำรวจ',8,8,'เปิดทางลงเหมือง 1 ชั้นโดยไม่เสียแรง (ยกเว้นชั้น 30)']
    ].map(([k,name,price,level,text])=> {
        const full=k!=='wood' && veg.adventure.supplies[k]>=20;
        return `<div class="farm-card">${k==='wood'?`<span class="barn-emoji">${farmIcon('wood','🪵')}</span>`:adIcon(k)}<div class="farm-card-main"><b>${name}</b><span class="farm-card-sub">${text}${k==='wood'?'':` · มี ${veg.adventure.supplies[k]}/20`}</span></div><button class="shop-buy farm-action" type="button" ${full || shop.coins<price || farmLevel()<level?'disabled':''} onclick="buyAdventureSupply('${k}')">${full?'เต็มแล้ว':farmLevel()<level?'เลเวล '+level:'🪙'+price}</button></div>`;
    }).join('')}<button class="chip-btn" type="button" onclick="openFarm('upgrade')">ดูอุปกรณ์นักสำรวจและอัปเกรด</button></div>`;
}
function adBusy(z) {
    return z==='mine' ? !!veg.mine.floor : !!((z==='forest'?veg.forest:veg.sea).cells || []).some(c=>!c.open);
}
function adBlockers(z) {
    return Object.keys(FarmAdventure.routes).filter(other=>other!==z && adBusy(other));
}
// Returning keeps every banked find. Unvisited cells are skipped, never rewarded.
// Shared by the return button and recovery of older saves with parallel trips.
function adEndTrip(z) {
    if(z==='mine') Object.assign(veg.mine,{floor:0,cells:null});
    else ((z==='forest'?veg.forest:veg.sea).cells || []).forEach(c=>{if(!c.open){c.open=true;c.skip=1;}});
    delete veg.adventure.active[z];
    if(veg.trip.z===z) veg.trip={z:'',got:[]};
    riskAsk='';
}
function adCanStart(z) {
    if(window.farmEconomyBlocked || storageFrozen) return false;
    const blocked=adBlockers(z);
    if (blocked.length) {
        showToast('มีทริปค้าง: '+blocked.map(k=>({forest:'ป่า',mine:'เหมือง',beach:'ชายหาด'})[k]).join(' / ')+' · ใช้ปุ่มกลับบ้านแล้วเริ่มรอบใหม่ได้เลย', 'info'); return false;
    }
    return true;
}
function adSelectRoute(z,r) {
    if(!FarmAdventure.routes[z]?.some(x=>x.id===r) || adBusy(z)) return;
    veg.adventure.selected[z]=r; saveVeg(); renderFarmPanel();
}
function adStart(z,cells,floor) {
    const route=veg.adventure.selected[z];
    veg.adventure.active[z]={route,progress:0,claimed:false};
    return adPrepare(z,cells,floor);
}
function adPrepare(z,cells,floor) {
    const route=veg.adventure.active[z]?.route || veg.adventure.selected[z];
    const out=FarmAdventure.plan(z,route,cells,floor);
    if(z==='mine' && adGear('lamp')) out.filter(c=>!c.trap && (c.k.endsWith('Ore') || c.k==='coal' || FARM_PRODUCTS[c.k]?.rar)).slice(0,adGear('lamp')).forEach(c=>c.hint=true);
    return out;
}
function adProgress(z,c,event) {
    const t=veg.adventure.active[z], def=t && FarmAdventure.routes[z].find(r=>r.id===t.route);
    if(!def || t.claimed || c?.skip || (c?.hit && c?.risk) || veg.hp<=0) return;
    const counts=z==='mine' ? (t.route==='survey' ? event==='down' : event==='rock') : z==='beach' && t.route==='cleanup' ? c?.k==='trash' : event==='find';
    if(!counts) return;
    t.progress=Math.min(def.target,t.progress+1);
    // A completed goal is banked once, so closing/reopening the panel cannot pay twice.
    if(t.progress>=def.target && farmTrade(()=> {
        t.claimed=true; veg.adventure.completed++; giveItem(...def.reward);
        if(z==='beach' && t.route==='cleanup') veg.bait=Math.min(99,veg.bait+3);
    })) showToast(`สำเร็จ: ${def.name} · ได้${itemInfo(def.reward[0]).name} ×${def.reward[1]}${z==='beach'&&t.route==='cleanup'?' และเหยื่อ 3 ชิ้น':''}`, 'success');
}
function adReturnHome(z) {
    if(!adBusy(z)) return;
    if(!farmTrade(()=>adEndTrip(z))) return;
    if(z==='mine') mineMsg='ขึ้นจากเหมืองพร้อมของแล้ว ใช้ลิฟต์ที่ปลดล็อกไว้กลับลงไปได้';
    if(z==='forest') forestMsg='กลับบ้านพร้อมของที่เก็บได้แล้ว เส้นทางที่ยังไม่ครบยกเลิกได้เสมอ';
    else if(z==='beach') seaMsg='กลับบ้านแล้ว ของที่เก็บได้ยังอยู่ในยุ้งฉาง';
    renderFarmPanel(); renderFarmStatus();
}
function useAdventureSupply(k) {
    if(!(veg.adventure.supplies[k]>0)) return;
    if(k==='bandage') {
        if(hpNow()>=hpMax()) return;
        if(!farmTrade(()=>{veg.adventure.supplies.bandage--;heal(30);})) return;
        showToast('พันแผลแล้ว ฟื้นเลือดได้สูงสุด 30 หน่วย', 'success');
    } else if(k==='rope') {
        if(!veg.mine.floor || veg.mine.floor>=MINE_FLOORS) return;
        const ladder=veg.mine.cells.find(c=>c.k==='ladder' && !c.open);
        if(!ladder) return;
        if(!farmTrade(()=>{veg.adventure.supplies.rope--;ladder.open=true;ladder.hint=true;})) return;
        mineMsg='ใช้เชือกผูกทางลงแล้ว เลือกลงชั้นถัดไปได้เลย';
    }
    renderFarmPanel(); renderFarmStatus();
}
function renderAdventureRoute(z) {
    const busy=adBusy(z), active=veg.adventure.active[z], defs=FarmAdventure.routes[z];
    const selected=active && busy?active.route:veg.adventure.selected[z], def=defs.find(r=>r.id===selected) || defs[0];
    return `<section class="ad-route" aria-label="เส้นทางสำรวจ"><b>เลือกเป้าหมายการเดินทาง</b><div class="farm-chips">${defs.map(r=>`<button class="chip-btn${r.id===selected?' is-active':''}" type="button" ${busy?'disabled':''} aria-pressed="${r.id===selected}" onclick="adSelectRoute('${z}','${r.id}')">${r.name}</button>`).join('')}</div><span class="farm-card-sub">${def.text} · รางวัล ${itemInfo(def.reward[0]).name} ×${def.reward[1]}</span>${busy&&active?`<span class="farm-card-sub">เป้าหมาย ${active.progress}/${def.target}${active.claimed?' · รับรางวัลแล้ว':''}</span>`:''}<div class="farm-chips">${veg.adventure.supplies.bandage?`<button type="button" class="chip-btn" ${hpNow()>=hpMax()?'disabled':''} onclick="useAdventureSupply('bandage')">${adIcon('bandage')} พันแผล (${veg.adventure.supplies.bandage})</button>`:''}${z==='mine'&&busy&&veg.mine.floor<MINE_FLOORS&&veg.adventure.supplies.rope?`<button type="button" class="chip-btn" ${veg.mine.cells.some(c=>c.k==='ladder'&&!c.open)?'':'disabled'} onclick="useAdventureSupply('rope')">${adIcon('rope')} ใช้เชือก (${veg.adventure.supplies.rope})</button>`:''}${busy?`<button type="button" class="chip-btn" onclick="adReturnHome('${z}')">กลับบ้านพร้อมของ</button>`:''}</div></section>`;
}
function renderOverflow() {
    const list=Object.entries(veg.overflow || {}).filter(([,n])=>n>0);
    return list.length?`<p class="farm-news">ตู้รับของสำรอง · ${list.map(([k,n])=>`${itemInfo(k).name}${starText(qualOf(k))} ×${n}`).join(' · ')}<br>ของที่เกิน 999 เก็บไว้ครบ และเติมเข้ายุ้งฉางอัตโนมัติเมื่อใช้ของ</p>`:'';
}
