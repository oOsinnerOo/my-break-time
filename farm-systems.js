/* Deterministic save migration, production queues and farm-grid rules. */
(function(root) {
    'use strict';
    const CAP = 10, W = 24, H = 18;
    const integer = (v, lo, hi, fallback = lo) => Number.isInteger(+v) && Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : fallback;
    const recipeOK = (r, recipes) => Number.isInteger(r) && r >= 0 && r < recipes.length;
    function cleanPaid(paid, rec) {
        const out = {}, totals = {};
        for (const [k,n] of Object.entries(paid && typeof paid === 'object' ? paid : {})) {
            const b = k.split('~')[0];
            if (!/^[A-Za-z]+(?:~[2-5])?$/.test(k) || !Object.hasOwn(rec.need,b) || !Number.isInteger(n) || n < 1) continue;
            out[k] = Math.min(n,rec.need[b]); totals[b] = (totals[b] || 0) + out[k];
        }
        // Malformed reservations never refund unrelated or higher-quantity goods.
        return Object.entries(rec.need).every(([k,n])=>totals[k]===n) && Object.keys(totals).length===Object.keys(rec.need).length ? out : {...rec.need};
    }
    function cleanMachine(x, recipes, now = Date.now()) {
        x = x && typeof x === 'object' ? x : {};
        const ready = (Array.isArray(x.ready) ? x.ready : []).filter(r=>recipeOK(r,recipes)).slice(0,CAP);
        const j = x.job;
        const job = ready.length < CAP && j && recipeOK(j.r,recipes) && Number.isFinite(j.end) && j.end > 0
            ? {r:j.r,end:Math.min(j.end,now+recipes[j.r].mins*60000)} : null;
        const input = (Array.isArray(x.queue) ? x.queue : []).filter(q=>q && recipeOK(q.r,recipes)).slice(0,CAP-ready.length-(job?1:0));
        let seq=Math.max(integer(x.seq,0,1e12),...input.map(q=>integer(q.id,0,1e12)));
        const used=new Set();
        const queue=input.map(q=>{let id=integer(q.id,0,1e12);if(!id||used.has(id))id=++seq;used.add(id);return {id,r:q.r,paid:cleanPaid(q.paid,recipes[q.r])};});
        return {made:integer(x.made,0,1e6),job,queue,ready,seq};
    }
    const occupied = m => (m.job ? 1 : 0) + m.queue.length + m.ready.length;
    function settle(m, recipes, now = Date.now()) {
        let changed = false, completed = 0;
        if (!m.job && m.queue.length) {
            const q = m.queue.shift(); m.job = {r:q.r,end:now+recipes[q.r].mins*60000}; changed = true;
        }
        for (let i=0;i<CAP && m.job && m.job.end<=now;i++) {
            const end = m.job.end; m.ready.push(m.job.r); m.job = null; completed++; changed = true;
            if (m.queue.length) { const q=m.queue.shift(); m.job={r:q.r,end:end+recipes[q.r].mins*60000}; }
        }
        return {changed,completed};
    }
    function enqueue(m,recipes,r,reservations,now=Date.now()) {
        if (!recipeOK(r,recipes) || !Array.isArray(reservations) || !reservations.length || reservations.length>CAP-occupied(m)) return false;
        for(const paid of reservations) m.queue.push({id:++m.seq,r,paid:cleanPaid(paid,recipes[r])});
        if(!m.job) {const q=m.queue.shift();m.job={r:q.r,end:now+recipes[q.r].mins*60000};}
        return true;
    }
    function cancel(m,id) {
        if (!Number.isInteger(id)) return null;
        const index=m.queue.findIndex(q=>q.id===id);if(index<0)return null;
        return m.queue.splice(index,1)[0].paid;
    }
    const BUILDINGS = Object.freeze({
        house:{name:'บ้านไร่',x:3,y:3,w:3,h:2,tab:'house',art:'house'},
        barn:{name:'คอกสัตว์',x:12,y:3,w:3,h:2,tab:'animals',art:'barn'},
        stall:{name:'ตลาดฟาร์ม',x:8,y:2,w:2,h:2,tab:'stall',art:'stall'},
        craft:{name:'โรงแปรรูป',x:3,y:9,w:2,h:2,tab:'craft',art:'craft'},
        pond:{name:'บ่อปลา',x:15,y:7,w:2,h:2,tab:'pond',art:'pond'},
        board:{name:'กระดานออเดอร์',x:8,y:5,w:1,h:1,tab:'orders',art:'orders'},
        forest:{name:'ทางเข้าป่า',x:2,y:1,w:1,h:1,tab:'forest',art:'forest'},
        mine:{name:'ทางเข้าเหมือง',x:15,y:1,w:1,h:1,tab:'mine',art:'pickaxe'},
        sea:{name:'ท่าเรือ',x:21,y:9,w:1,h:2,tab:'sea',art:'boat'}
    });
    const DECOR = Object.freeze({
        stones:{name:'ทางเดินหิน',need:{stone:1},walk:true},
        fence:{name:'รั้วไม้',need:{wood:1},walk:false},
        bench:{name:'ม้านั่ง',need:{wood:3},walk:false},
        flowerbed:{name:'แปลงดอกไม้',need:{bouquet:1,wood:1},walk:false},
        lamppost:{name:'โคมไฟ',need:{wood:2,stone:2},walk:false}
    });
    const PLOTS = Object.freeze(Array.from({length:12},(_,i)=>({x:7+(i%3)*3,y:i<6?7+Math.floor(i/3)*2:12+Math.floor((i-6)/3)*2,w:2,h:1})));
    const RESOURCES = Object.freeze([
        [1,7,'tree'],[1,10,'tree'],[5,7,'rock'],[6,11,'rock'],[3,13,'tree'],[5,15,'rock'],[14,15,'tree'],
        [18,3,'tree'],[20,4,'rock'],[21,6,'tree'],[18,13,'tree'],[21,15,'rock']
    ].map(([x,y,kind],i)=>({id:i,x,y,kind,w:1,h:1})));
    function cleanWorld(x) {
        x=x && typeof x==='object' ? x : {};
        const buildings={};
        for(const [id,b] of Object.entries(BUILDINGS)) {
            const v=x.buildings && x.buildings[id];
            buildings[id]={x:integer(v&&v.x,1,W-b.w-1,b.x),y:integer(v&&v.y,1,H-b.h-1,b.y)};
        }
        const a=x.avatar||{};
        return {v:1,mode:x.mode==='garden'?'garden':'world',pos:{x:integer(x.pos&&x.pos.x,1,W-2,9),y:integer(x.pos&&x.pos.y,1,H-2,6)},
            avatar:{shirt:integer(a.shirt,0,5),hair:integer(a.hair,0,3),hat:integer(a.hat,0,2,1)},buildings,
            decor:(Array.isArray(x.decor)?x.decor:[]).filter(d=>d && Object.hasOwn(DECOR,d.kind) && Number.isInteger(d.x)&&Number.isInteger(d.y)&&d.x>0&&d.x<W-1&&d.y>0&&d.y<H-1).slice(0,48)
                .map(d=>({kind:d.kind,x:d.x,y:d.y})),
            cleared:[...new Set((Array.isArray(x.cleared)?x.cleared:[]).filter(id=>RESOURCES.some(r=>r.id===id)))].slice(0,RESOURCES.length)};
    }
    function unlocked(x,y,land) {return x>=1&&y>=1&&x<=(land>=4?22:16)&&y<=(land>=1?16:11);}
    const inside=(x,y,b)=>x>=b.x&&y>=b.y&&x<b.x+(b.w||1)&&y<b.y+(b.h||1);
    function entities(s,plotCount,land) {
        return [...Object.entries(BUILDINGS).filter(([id])=>id!=='sea'||land>=4).map(([id,b])=>({...b,...s.buildings[id],id,type:'building'})),
            ...PLOTS.slice(0,plotCount).map((p,i)=>({...p,id:i,type:'plot'})),
            ...RESOURCES.filter(r=>!s.cleared.includes(r.id)&&unlocked(r.x,r.y,land)).map(r=>({...r,type:'resource'})),
            ...s.decor.map((d,i)=>({...d,id:i,type:'decor',w:1,h:1,walk:DECOR[d.kind].walk}))];
    }
    const key=(x,y)=>x+','+y;
    function path(s,plotCount,land,from,to,ignore) {
        const blocked=entities(s,plotCount,land).filter(e=>!e.walk&&e!==ignore && !(ignore &&e.type===ignore.type&&e.id===ignore.id));
        const can=(x,y)=>unlocked(x,y,land)&&!blocked.some(e=>inside(x,y,e));
        if(!can(to.x,to.y))return null;
        const q=[{x:from.x,y:from.y}], seen=new Map([[key(from.x,from.y),null]]);
        for(let i=0;i<q.length;i++){
            const p=q[i];if(p.x===to.x&&p.y===to.y){const out=[];let k=key(p.x,p.y);while(seen.get(k)!==null){const [x,y]=k.split(',').map(Number);out.unshift({x,y});k=seen.get(k);}return out;}
            for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]]){const x=p.x+dx,y=p.y+dy,k=key(x,y);if(!seen.has(k)&&can(x,y)){seen.set(k,key(p.x,p.y));q.push({x,y});}}
        }
        return null;
    }
    function approach(s,count,land,from,e) {
        const candidates=[];
        for(let y=e.y-1;y<=e.y+(e.h||1);y++)for(let x=e.x-1;x<=e.x+(e.w||1);x++){
            if(inside(x,y,e)||((x<e.x||x>=e.x+(e.w||1))&&(y<e.y||y>=e.y+(e.h||1))))continue;
            const route=path(s,count,land,from,{x,y});if(route)candidates.push(route);
        }
        return candidates.sort((a,b)=>a.length-b.length)[0]||null;
    }
    function canPlace(s,count,land,rect,ignore) {
        if(!unlocked(rect.x,rect.y,land)||!unlocked(rect.x+(rect.w||1)-1,rect.y+(rect.h||1)-1,land))return false;
        if(inside(s.pos.x,s.pos.y,rect))return false;
        return !entities(s,count,land).some(e=>!(ignore&&e.type===ignore.type&&e.id===ignore.id)&&rect.x<e.x+(e.w||1)&&rect.x+(rect.w||1)>e.x&&rect.y<e.y+(e.h||1)&&rect.y+(rect.h||1)>e.y);
    }
    root.FarmSystems=Object.freeze({CAP,cleanMachine,occupied,settle,enqueue,cancel,cleanPaid,W,H,BUILDINGS,DECOR,PLOTS,RESOURCES,cleanWorld,unlocked,inside,entities,path,approach,canPlace});
})(typeof window==='undefined'?globalThis:window);
