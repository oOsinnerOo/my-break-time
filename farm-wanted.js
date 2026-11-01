/* Room buy requests. The server owns orders/fills; a durable outbox handles retries. */
const wanted = { data:null, busy:false, promise:null, error:'', seen:null, form:{item:'',qty:1,price:1}, at:0 };
function cleanWantedSave(raw) {
    const a=raw && typeof raw==='object'?raw:{}, received={};
    Object.entries(a.received || {}).forEach(([id,ids])=> {
        if(/^[0-9a-f-]{36}$/i.test(id) && Array.isArray(ids)) received[id]=[...new Set(ids.filter(n=>Number.isSafeInteger(n)&&n>0))];
    });
    const p=a.pending;
    const valid=p && /^[0-9a-f-]{36}$/i.test(p.op) && /^[0-9a-f-]{36}$/i.test(p.player) && /^[A-Z0-9]{6}$/.test(p.room)
        && ['create','fill','cancel','cancel_all'].includes(p.action) && Number.isInteger(p.qty) && p.qty>=0 && p.qty<=99
        && Number.isInteger(p.price) && p.price>=0 && p.price<=9999 && Number.isSafeInteger(p.id) && p.id>=0
        && (p.item==='' || /^[a-zA-Z]{1,24}(~[2-5])?$/.test(p.item));
    return {received,pending:valid?{op:p.op,player:p.player,room:p.room,action:p.action,item:p.item,id:p.id,qty:p.qty,price:p.price}:null};
}
function wantedContext() { return {room:friends.room,player:friends.player,secret:friends.secret}; }
function wantedCurrent(c) { return c.room===friends.room && c.player===friends.player && c.secret===friends.secret; }
function wantedError(e) {
    return ({gone:'ป้ายนี้ปิดแล้ว ของหรือเหรียญที่พักไว้คืนให้แล้ว',quantity_changed:'เพื่อนขายเข้าป้ายไปก่อนแล้ว ของของคุณคืนครบแล้ว',too_many:'เปิดป้ายรับซื้อได้พร้อมกัน 6 ป้าย',limit:'วันนี้ทำรายการเยอะแล้ว ลองใหม่พรุ่งนี้นะ',bad_item:'ไอเทมนี้ยังรับซื้อไม่ได้',bad_price:'ตรวจจำนวนและราคาต่อชิ้นอีกครั้ง',own:'ทำรายการกับป้ายนี้ไม่ได้',bad_player:'ออกจากห้องไปแล้ว รายการที่ยังไม่สำเร็จคืนให้แล้ว'})[e] || 'เชื่อมต่อไม่สำเร็จ รายการที่ค้างไว้จะตรวจซ้ำให้โดยไม่หักเพิ่ม';
}
async function wantedResolve(c) {
    const p=veg.wanted.pending;
    if(!p) return true;
    if(p.player!==c.player || p.room!==c.room) throw new Error('pending_account');
    let r;
    try {
        r=await mpCall('bt_wanted_mutate',{p_player:c.player,p_secret:c.secret,p_op:p.op,p_action:p.action,p_id:p.id || null,p_item:p.item || null,p_qty:p.qty || null,p_price:p.price || null});
    } catch(e) {
        // Auth is checked again after looking up the idempotency key on the server.
        if(e.message==='bad_player') r={ok:false,error:'bad_player'};
        else throw e;
    }
    if(!wantedCurrent(c)) return false;
    if(typeof r.ok!=='boolean' || r.error==='op_mismatch') throw new Error('unresolved_operation');
    if(!farmTrade(()=> {
        if(!r.ok) {
            if(p.action==='create') shop.coins+=p.qty*p.price;
            if(p.action==='fill') giveItem(p.item,p.qty);
        }
        veg.wanted.pending=null;
    })) return false;
    if(!r.ok) showToast(wantedError(r.error),'info');
    else if(p.action==='create') { wanted.form.item=''; showToast(`ประกาศรับซื้อ ${itemInfo(p.item).name}${starText(qualOf(p.item))} ×${p.qty} ชิ้นละ 🪙${p.price} ให้เพื่อนในห้องแล้ว`, 'success'); }
    else if(p.action==='fill') showToast('ส่งของให้เพื่อนแล้ว กำลังรับเหรียญเข้ากระเป๋า', 'success');
    return true;
}
function wantedApplyReceipts(c, receipts) {
    if(!Array.isArray(receipts)) throw new Error('bad_receipts');
    const done=new Set(veg.wanted.received[c.player] || []), rows=[];
    receipts.forEach(r=>{if(!done.has(r.id)){rows.push(r);done.add(r.id);}});
    if(!rows.length) return true;
    if(rows.some(r=>!Number.isSafeInteger(r.id) || r.id<1 || !Number.isInteger(r.qty) || r.qty<0 || r.qty>99 || !Number.isInteger(r.coins) || r.coins<0 || r.coins>989901 ||
        !((r.item && itemInfo(r.item) && r.qty>0 && r.coins===0) || (!r.item && r.qty===0 && r.coins>0)))) throw new Error('bad_receipts');
    let coins=0, goods=0;
    const ok=farmTrade(()=> {
        rows.forEach(r=> { if(r.item){giveItem(r.item,r.qty);goods+=r.qty;}else{shop.coins+=r.coins;coins+=r.coins;} });
        veg.wanted.received[c.player]=[...done];
    });
    if(ok) { renderFarmStatus();updateBasketFood();showToast(`ตลาดเพื่อนส่ง${goods?`ของ ${goods} ชิ้น`:''}${goods&&coins?' และ ':''}${coins?`เหรียญ 🪙${coins}`:''}เข้ากระเป๋าแล้ว`,'success'); }
    return ok;
}
function cleanWantedBoard(r) {
    if(r.version!==1 || !Array.isArray(r.open) || !Array.isArray(r.receipts)) throw new Error('bad_board');
    const open=r.open.filter(o=>o && Number.isSafeInteger(o.id) && o.id>0 && mpItemOk(o.item) &&
        typeof o.buyer==='string' && MP_UUID_RE.test(o.buyer) && Number.isInteger(o.qty) && o.qty>=1 && o.qty<=99 &&
        Number.isInteger(o.remaining) && o.remaining>=1 && o.remaining<=o.qty && Number.isInteger(o.price) && o.price>=1 && o.price<=9999)
        .map(o=>({...o,name:mpCleanName(o.name),expires:Date.parse(o.expires)||0}));
    return {open,me:r.me,active:r.active===true,room:r.room};
}
async function wantedSync() {
    if(!friends.player || !friends.secret) return false;
    if(wanted.promise) return wanted.promise;
    const c=wantedContext(); wanted.busy=true;
    wanted.promise=(async()=> {
        try {
            if(!await wantedResolve(c)) return false;
            const r=await mpCall('bt_wanted_state',{p_player:c.player,p_secret:c.secret});
            if(!wantedCurrent(c) || r.me!==c.player || r.room!==c.room) return false;
            const board=cleanWantedBoard(r);
            if(!wantedApplyReceipts(c,r.receipts)) return false;
            const ids=r.receipts.map(x=>x.id);
            if(ids.length) { try { await mpCall('bt_wanted_ack',{p_player:c.player,p_secret:c.secret,p_ids:ids}); }catch(_){} }
            if(!wantedCurrent(c)) return false;
            if(wanted.seen && wanted.data?.room===board.room) {
                const fresh=board.open.find(o=>o.buyer!==c.player&&!wanted.seen.has(o.id));
                if(fresh) farmNotify('friends','เพื่อนเปิดป้ายรับซื้อ',`${fresh.name} รับซื้อ${itemInfo(fresh.item).name} ×${fresh.remaining} ชิ้นละ ${fresh.price} เหรียญ`);
            }
            wanted.seen=new Set(board.open.map(o=>o.id)); wanted.data=board; wanted.error=''; wanted.at=Date.now(); return true;
        } catch(e) {
            if(wantedCurrent(c)) wanted.error=e.message==='pending_account'?'มีรายการจากห้องเดิมค้างอยู่ กลับเข้าข้อมูลห้องเดิมเพื่อรับของและเหรียญให้ครบก่อน':wantedError(e.message);
            return false;
        } finally {
            wanted.busy=false; wanted.promise=null;
            if(wantedCurrent(c) && mkOpen()) renderFarmPanel();
        }
    })();
    return wanted.promise;
}
function wantedCatalog() {
    return [...new Set([...Object.keys(VEGGIES),...Object.keys(FARM_PRODUCTS),...Object.keys(RECIPES),...Object.keys(FISH)])]
        .filter(k=>mpItemOk(k) && !isSecretHybrid(k) && FARM_PRODUCTS[k]?.zone!=='baby' &&
            (!FISH[k]?.secret || veg.fishCaught[k]) && (!RECIPES[k]?.secret || veg.cooked[k]) &&
            (FARM_PRODUCTS[k]?.zone!=='treasure' || countBase(k)>0 || veg.treasures[k]));
}
function wantedSelect(k) {
    if(!wantedCatalog().includes(k)) return;
    wanted.form={item:k,qty:1,price:Math.min(9999,Math.max(1,marketPrice(k)))};renderFarmPanel();
}
function wantedInput(field,value,live=false) {
    const f=wanted.form;
    if(field==='quality') {
        const k=qKey(baseOf(f.item),Math.max(1,Math.min(5,Math.floor(+value)||1)));
        if(itemInfo(k)) { f.item=k;f.price=Math.min(9999,Math.max(1,marketPrice(k))); }
    } else if(field==='qty') f.qty=Math.max(1,Math.min(99,Math.floor(+value)||1));
    else if(field==='price') f.price=Math.max(1,Math.min(9999,Math.floor(+value)||1));
    wantedUpdateTotal();
    if(!live) renderFarmPanel();
}
function wantedTyping() { return document.activeElement?.tagName==='INPUT' && !!document.activeElement.closest('.ad-wanted'); }
function wantedUpdateTotal() {
    const f=wanted.form, total=f.qty*f.price, line=document.querySelector('.ad-wanted-total'), button=document.querySelector('.ad-wanted-post');
    if(line) line.textContent=`ตลาดวันนี้ 🪙${marketPrice(f.item)}/ชิ้น · พักเงินรวม 🪙${total} · มี 🪙${shop.coins}`;
    if(button) { button.textContent=`ประกาศรับซื้อ · 🪙${total}`; button.disabled=wanted.busy || !!veg.wanted.pending || shop.coins<total || (wanted.data?.open.filter(o=>o.buyer===friends.player).length || 0)>=6; }
}
function wantedOperationId() {
    const b=crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
    const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
async function wantedPerform(action,fields={}) {
    if(veg.wanted.pending) return false;
    if(wanted.promise) await wanted.promise;
    if(wanted.busy || veg.wanted.pending || !friends.room || wanted.data?.room!==friends.room || !wanted.data?.active) return false;
    const p={op:wantedOperationId(),player:friends.player,room:friends.room,action,id:0,item:'',qty:0,price:0,...fields};
    if(!farmTrade(()=> {
        if(action==='create') {if(shop.coins<p.qty*p.price) throw new Error('no_coins');shop.coins-=p.qty*p.price;}
        if(action==='fill') {if((veg.inv[p.item]||0)<p.qty) throw new Error('no_item');takeExact(p.item,p.qty);}
        veg.wanted.pending=p;
    })) return false;
    renderFarmPanel();return wantedSync();
}
async function wantedPost() {
    const f=wanted.form;
    if(!wantedCatalog().includes(baseOf(f.item)) || !itemInfo(f.item) || shop.coins<f.qty*f.price) return;
    return wantedPerform('create',{...f,item:f.item});
}
async function wantedSell(id) {
    const o=wanted.data?.open.find(x=>x.id===id), n=o && Math.min(o.remaining,veg.inv[o.item]||0);
    if(!o || o.buyer===friends.player || !n) return;
    return wantedPerform('fill',{id:o.id,item:o.item,qty:n,price:o.price});
}
async function wantedCancel(id) { return wantedPerform('cancel',{id}); }
async function wantedBeforeLeave() {
    if(!await wantedSync() || veg.wanted.pending) {showToast('รับรายการตลาดที่ค้างให้ครบก่อนออกจากห้อง กดรีเฟรชแล้วลองอีกครั้งนะ','info');return false;}
    if(wanted.data.open.some(o=>o.buyer===friends.player)) {
        if(!await wantedPerform('cancel_all') || veg.wanted.pending) return false;
    }
    return true;
}
function openWantedMarket() { stallView='friends';openFarm('stall');mkOnOpen(); }
function renderWantedBoard() {
    const c=wantedContext(), d=wanted.data?.room===c.room && wanted.data?.me===c.player?wanted.data:null;
    const locked=wanted.busy || !!veg.wanted.pending;
    if(!d) return `<section class="ad-wanted"><h3>ป้ายรับซื้อของในห้อง</h3><p class="farm-card-sub">${escHtml(wanted.error || 'กำลังเปิดป้ายรับซื้อ…')}</p><button class="chip-btn" type="button" ${locked?'disabled':''} onclick="wantedSync()">รีเฟรชป้ายรับซื้อ</button></section>`;
    const mine=d.open.filter(o=>o.buyer===c.player), others=d.open.filter(o=>o.buyer!==c.player);
    const card=(o,own)=> {
        const it=itemInfo(o.item), n=Math.min(o.remaining,veg.inv[o.item]||0);
        return `<div class="farm-card"><span class="barn-emoji">${it.icon||it.e}</span><div class="farm-card-main"><b>${escHtml(o.name)} รับซื้อ ${it.name}${starText(it.q)}</b><span class="farm-card-sub">ยังต้องการ ${o.remaining}/${o.qty} ชิ้น · 🪙${o.price}/ชิ้น · เงินที่พักไว้ 🪙${o.remaining*o.price}</span><span class="farm-card-sub">${own?'ยกเลิกได้ รับเงินส่วนที่เหลือคืน':'คุณมีตรงดาว '+(veg.inv[o.item]||0)+' ชิ้น'} · ${leftText(o.expires-mpNow())}</span></div>${own?`<button class="chip-btn" type="button" ${locked?'disabled':''} onclick="wantedCancel(${o.id})">ยกเลิก</button>`:`<button class="shop-buy farm-action" type="button" ${locked||!n?'disabled':''} onclick="wantedSell(${o.id})">${n?'ขาย '+n+' ชิ้น · 🪙'+n*o.price:'ยังไม่มีของ'}</button>`}</div>`;
    };
    const f=wanted.form, base=baseOf(f.item), keys=wantedCatalog(), it=itemInfo(f.item);
    return `<section class="ad-wanted"><h3>ป้ายรับซื้อ · ให้เพื่อนขายเข้าคำขอได้ทันที</h3><p class="farm-card-sub">ประกาศให้เพื่อนทั้งห้องรู้ · รับซื้อบางส่วนได้ · ป้ายอยู่ 3 วัน · ซื้อของให้แล้วส่งเข้ายุ้งฉางอัตโนมัติ</p>${others.map(o=>card(o,false)).join('')||'<p class="farm-card-sub">ยังไม่มีเพื่อนตั้งรับซื้อ</p>'}${mine.map(o=>card(o,true)).join('')}<details ${f.item?'open':''}><summary>ตั้งป้ายรับซื้อของฉัน (${mine.length}/6)</summary><label>ไอเทมที่ต้องการ<select aria-label="ไอเทมที่ต้องการรับซื้อ" onchange="wantedSelect(this.value)" ${locked?'disabled':''}><option value="">เลือกไอเทม</option>${keys.map(k=>`<option value="${k}" ${base===k?'selected':''}>${itemInfo(k).name}</option>`).join('')}</select></label>${it?`${itemInfo(qKey(base,2))?`<label>คุณภาพที่รับซื้อ<select aria-label="ดาวที่ต้องการรับซื้อ" onchange="wantedInput('quality',this.value)" ${locked?'disabled':''}>${[1,2,3,4,5].map(q=>`<option value="${q}" ${qualOf(f.item)===q?'selected':''}>${q} ดาว (รับตรงดาว)</option>`).join('')}</select></label>`:''}<label>จำนวนที่ต้องการ (1–99)<input type="number" inputmode="numeric" min="1" max="99" value="${f.qty}" ${locked?'disabled':''} oninput="wantedInput('qty',this.value,true)" onchange="this.value=wanted.form.qty" aria-label="จำนวนรับซื้อ"></label><label>ราคาต่อชิ้น (1–9,999)<input type="number" inputmode="numeric" min="1" max="9999" value="${f.price}" ${locked?'disabled':''} oninput="wantedInput('price',this.value,true)" onchange="this.value=wanted.form.price" aria-label="ราคารับซื้อต่อชิ้น"></label><p class="farm-card-sub ad-wanted-total">ตลาดวันนี้ 🪙${marketPrice(f.item)}/ชิ้น · พักเงินรวม 🪙${f.qty*f.price} · มี 🪙${shop.coins}</p><button type="button" class="shop-buy ad-wanted-post" ${locked||mine.length>=6||shop.coins<f.qty*f.price?'disabled':''} onclick="wantedPost()">ประกาศรับซื้อ · 🪙${f.qty*f.price}</button>`:''}</details>${veg.wanted.pending?'<p role="status">กำลังตรวจรายการที่ค้าง เงินหรือของพักไว้แล้ว กดรีเฟรชเพื่อตรวจซ้ำได้โดยไม่หักเพิ่ม</p>':''}${wanted.error?`<p role="status">${escHtml(wanted.error)}</p>`:''}<button type="button" class="chip-btn" ${wanted.busy?'disabled':''} onclick="wantedSync()">รีเฟรชป้ายรับซื้อ</button></section>`;
}
