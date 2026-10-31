/* A walkable pixel farm backed by the original game's plots and inventory. */
(function(root) {
    'use strict';
    const G=root.FarmSystems,A=root.FarmPixelArt,T=32,NS='http://www.w3.org/2000/svg';
    let api,host,map,view,world,route=[],position={x:9,y:6},target=null,placement=null,editing=false,overview=false;
    let running=0,last=0,visible=true,dirty=true,lastSignature='',lastAvatar='',direction='down',walkFrame=0,moveTime=0;
    let cols=16,rows=11,keys=new Set(),pendingRefresh=false,settingsOpen=false;
    const $=s=>host.querySelector(s),icon=k=>A.ui(k),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
    const sprite=(svg,x,y,w,h,vb='0 0 64 64')=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}" overflow="visible">${svg}</svg>`;
    const glyph=(key,x,y,size=32)=>sprite(A.ui(key),x,y,size,size,'0 0 24 24');
    function data(){return api.read();}
    function nodes(){const d=data();return G.entities(world,d.plots.length,d.land);}
    function near(e){return !G.inside(position.x,position.y,e)&&Math.min(...edge(e).map(p=>Math.abs(p.x-position.x)+Math.abs(p.y-position.y)))<.1;}
    function edge(e){const a=[];for(let x=e.x;x<e.x+(e.w||1);x++){a.push({x,y:e.y-1},{x,y:e.y+(e.h||1)});}for(let y=e.y;y<e.y+(e.h||1);y++)a.push({x:e.x-1,y},{x:e.x+(e.w||1),y});return a;}
    function syncState(){
        const next=data().world;
        if(next!==world){world=next;position={...world.pos};route=[];target=null;dirty=true;lastSignature='';setMode(world.mode,false);}
    }
    function ensurePosition(){
        const d=data(),blocked=nodes().filter(e=>!e.walk);
        const good=(x,y)=>G.unlocked(x,y,d.land)&&!blocked.some(e=>G.inside(x,y,e));
        if(good(position.x,position.y))return;
        let found=null;
        for(let y=1;y<G.H-1;y++)for(let x=1;x<G.W-1;x++)if(good(x,y)&&(!found||Math.abs(x-9)+Math.abs(y-6)<found.dist))found={x,y,dist:Math.abs(x-9)+Math.abs(y-6)};
        position=found?{x:found.x,y:found.y}:{x:9,y:6};world.pos={...position};route=[];
    }
    function start(adapter){
        if(api)return;
        api=adapter;const card=document.getElementById('garden-card');if(!card)return;
        host=document.createElement('section');host.id='farm-world';host.className='farm-world';
        host.innerHTML=`<div class="fw-heading"><div><span class="fw-eyebrow">ชีวิตในฟาร์ม</span><h3>บ้านเล็ก ฟาร์มของเรา</h3></div><div class="fw-modes" role="group" aria-label="มุมมองสวน"><button type="button" data-mode="world">เดินเล่น</button><button type="button" data-mode="garden">สวนพักใจ</button></div></div>
            <div class="fw-play"><div class="fw-toolbar"><button type="button" data-command="overview">${icon('map')} แผนที่</button><button type="button" data-command="edit">${icon('hammer')} จัดพื้นที่</button><button type="button" data-command="look">${icon('farmer')} ตัวละคร</button><button type="button" data-command="land">${icon('plus')} ขยายที่ดิน</button></div>
            <div class="fw-look" hidden><label>เสื้อ <select data-look="shirt" aria-label="สีเสื้อตัวละคร"><option value="0">ใบไม้</option><option value="1">ท้องฟ้า</option><option value="2">อิฐแดง</option><option value="3">ลาเวนเดอร์</option><option value="4">น้ำผึ้ง</option><option value="5">ชมพู</option></select></label><label>ผม <select data-look="hair" aria-label="สีผมตัวละคร"><option value="0">น้ำตาล</option><option value="1">ดำ</option><option value="2">ทองแดง</option><option value="3">ทอง</option></select></label><label>หมวก <select data-look="hat" aria-label="หมวกตัวละคร"><option value="0">ไม่ใส่</option><option value="1">หมวกฟาง</option><option value="2">หมวกแก๊ป</option></select></label></div>
            <div class="fw-editor" hidden><b>เลือกของแล้วแตะช่องที่จะวาง</b><div class="fw-decor-tools">${Object.entries(G.DECOR).map(([k,d])=>`<button type="button" data-decor="${k}">${sprite(A.decor('decor-'+k),0,0,24,24)}<span>${d.name}</span></button>`).join('')}</div><p class="fw-edit-help">แตะอาคารเพื่อย้าย · แตะของตกแต่งเพื่อเก็บคืน · แปลงเพาะปลูกมีตำแหน่งประจำ</p><span class="fw-placement" role="status"></span><details class="fw-grid-input"><summary>เลือกตำแหน่งด้วยช่องตาราง</summary><label>แนวนอน <input type="number" data-grid="x" min="1" max="22" value="4" aria-label="ช่องแนวนอน"></label><label>แนวตั้ง <input type="number" data-grid="y" min="1" max="16" value="8" aria-label="ช่องแนวตั้ง"></label><button type="button" data-command="place-grid">วางตำแหน่งนี้</button></details></div>
            <div class="fw-view" tabindex="0" role="group" aria-label="แผนที่ฟาร์ม แตะเพื่อเดิน ใช้ปุ่มลูกศรหรือ W A S D และ Enter เพื่อใช้งาน" aria-describedby="fw-hint"><svg class="fw-map" xmlns="${NS}" aria-hidden="true" shape-rendering="crispEdges"><g class="fw-ground"></g><g class="fw-items"></g><g class="fw-selected"></g><g class="fw-pet"></g><g class="fw-player"></g></svg><div class="fw-hud"><span data-hud="level"></span><span data-hud="coins"></span><span data-hud="energy"></span></div><span class="fw-map-label">ลานฟาร์ม</span></div>
            <div class="fw-under"><p id="fw-hint" class="fw-hint" role="status">แตะพื้นเพื่อเดิน แตะอาคารหรือแปลงเพื่อไปใช้งาน</p><div class="fw-controls" aria-label="ควบคุมตัวละคร"><button type="button" class="fw-up" data-step="0,-1" aria-label="เดินขึ้น">↑</button><button type="button" class="fw-left" data-step="-1,0" aria-label="เดินซ้าย">←</button><button type="button" class="fw-use" data-command="use" aria-label="ใช้งานสิ่งที่อยู่ใกล้">ใช้งาน</button><button type="button" class="fw-right" data-step="1,0" aria-label="เดินขวา">→</button><button type="button" class="fw-down" data-step="0,1" aria-label="เดินลง">↓</button></div></div>
            <div class="fw-focus" hidden><div class="fw-focus-head"><b class="fw-focus-title"></b><button type="button" data-command="close-focus" aria-label="ปิดรายละเอียดจุดหมาย">×</button></div><p class="fw-focus-description"></p><div class="fw-timing" hidden aria-label="จังหวะเก็บเกี่ยว"><span></span><i></i></div><div class="fw-focus-actions"></div><div class="fw-picker-slot"></div></div>
            <button type="button" class="fw-goal" data-command="goal"></button><details class="fw-destinations"><summary>เลือกจุดหมายโดยไม่ใช้แผนที่</summary><div></div></details></div>`;
        card.querySelector('.garden-header').after(host);map=$('.fw-map');view=$('.fw-view');
        world=data().world;position={...world.pos};ensurePosition();setMode(world.mode,false);
        host.addEventListener('click',onClick);host.addEventListener('change',e=>{if(e.target.dataset.look){world.avatar[e.target.dataset.look]=+e.target.value;api.save();dirty=true;wake();}});
        view.addEventListener('click',onMapClick);
        view.addEventListener('keydown',e=>{if(/^(Arrow|[wasdWASD])/.test(e.key)){e.preventDefault();keys.add(e.key.toLowerCase());wake();}if(e.key==='Enter'||e.key===' '){e.preventDefault();useTarget();}if(e.key==='Escape')closeFocus();});
        view.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));view.addEventListener('blur',()=>keys.clear());
        window.addEventListener('blur',()=>keys.clear());
        document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();stop();}else refresh();});
        const resize=new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width){cols=Math.max(10,Math.min(18,Math.floor(width/T)));rows=Math.round(cols*.72);dirty=true;wake();}});resize.observe(view);
        new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible||route.length||data().timing>=0)wake();else stop();},{rootMargin:'100px'}).observe(view);
        new MutationObserver(refresh).observe(document.getElementById('veg-plots'),{childList:true});
        document.querySelector('.garden-header .gd-head-btns').addEventListener('click',e=>{if(e.target.closest('button'))setMode('garden');});
        refresh();
    }
    function setMode(mode,save=true){
        world.mode=mode;document.getElementById('garden-card').dataset.worldMode=mode;
        $('.fw-play').hidden=mode!=='world';host.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
        const picker=document.getElementById('veg-picker');
        if(mode==='world')$('.fw-picker-slot').append(picker);else document.getElementById('veg-plots').before(picker);
        api.closePicker();route=[];keys.clear();if(save)api.save();dirty=true;wake();
    }
    function terrain(d){
        let s=rect(0,0,G.W*T,G.H*T,'#365943')+rect(T,T,(G.W-2)*T,(G.H-2)*T,'#95b66d');
        s+=rect(2*T,5*T,14*T,2*T,'#c5b17c')+rect(6*T,2*T,T,10*T,'#c5b17c')+rect(10*T,4*T,T,8*T,'#c5b17c');
        const runs={'#a8c77b':'','#789c5b':'','#dfc791':''};
        for(let i=0;i<340;i++){const x=(i*83+11)%(G.W*T-64)+32,y=(i*47+19)%(G.H*T-64)+32,c=i%7===0?'#dfc791':i%2?'#a8c77b':'#789c5b';runs[c]+=`M${x} ${y}h${i%3+1}v2h-${i%3+1}z`;}
        s+=Object.entries(runs).map(([c,path])=>`<path d="${path}" fill="${c}"/>`).join('');
        s+=rect(17*T,T,6*T,16*T,'#9bad72')+rect(T,12*T,16*T,5*T,'#a8bc7c');
        if(d.land<1)s+=rect(T,12*T,16*T,5*T,'#486744', 'opacity=".8"')+glyph('lock',8*T,14*T,32);
        if(d.land<4)s+=rect(17*T,T,6*T,16*T,'#486744','opacity=".8"')+glyph('lock',19*T,8*T,32);
        for(let x=0;x<G.W;x+=2)s+=sprite(A.decor('decor-bush'),x*T,-10,64,48);
        for(let y=2;y<G.H;y+=3)s+=sprite(A.decor('decor-bush'),-24,y*T,64,56);
        if(editing)for(let y=1;y<G.H-1;y++)for(let x=1;x<G.W-1;x++)if(G.unlocked(x,y,d.land))s+=`<path d="M${x*T} ${y*T}h32v32" fill="none" stroke="#fff0c7" stroke-opacity=".24" stroke-width="1"/>`;
        return s;
    }
    function renderItems(d){
        const all=nodes().sort((a,b)=>(a.y+(a.h||1))-(b.y+(b.h||1)));
        let s='';
        for(const e of all){
            s+=`<g data-fw-type="${e.type}" data-fw-id="${e.id}">`;
            const x=e.x*T,y=e.y*T;
            if(e.type==='plot'){
                const p=d.plots[e.id];
                s+=rect(x,y+4,64,25,'#60443e')+rect(x+2,y+6,60,20,'#a47450')+rect(x+4,y+8,56,2,'#cd9860')+rect(x+4,y+17,56,2,'#80543f');
                if(p.seed){
                    if(p.type==='tree')s+=sprite(A.tree('classic',Math.min(4,Math.floor(p.stage/p.need*4))).svg,x+6,y-47,52,70,'0 0 220 170');
                    else if(p.stage>=p.need)s+=sprite(api.icon(p.seed),x+16,y-17,32,38,'0 0 24 24');
                    else s+=glyph('sprout',x+13,y-5,30);
                    if(p.pest||p.worm)s+=glyph('pest',x+45,y-11,18);
                    else if(p.stage>=p.need)s+=glyph('sparkle',x+45,y-15,16);
                }else s+=`<path d="M${x+27} ${y+12}h10m-5-5v10" fill="none" stroke="#ecc38b" stroke-width="2"/>`;
                s+=rect(x+4,y+30,56,3,'#60443e')+rect(x+4,y+30,Math.max(3,56*p.soil/100),3,'#64964e');
            }else if(e.type==='building'){
                s+=rect(x+3,y+(e.h||1)*T-5,e.w*T-4,7,'#61704e');
                if(e.id==='house')s+=sprite(A.house(d.house-1),x-8,y-45,112,112);
                else if(e.id==='pond')s+=sprite(A.decor('decor-pond'),x-8,y-26,80,88);
                else if(e.id==='forest')s+=sprite(A.decor('decor-tree'),x-10,y-35,60,70);
                else if(e.id==='craft')s+=sprite(A.machine('workbench'),x-2,y-13,68,77,'0 0 24 24');
                else s+=glyph(e.art,x-3,y-20,Math.max(40,e.w*T+6));
                s+=rect(x+e.w*T/2-3,y+e.h*T-2,6,4,'#ecc38b');
            }else if(e.type==='resource')s+=e.kind==='tree'?sprite(A.decor('decor-tree'),x-14,y-46,62,78):sprite(A.rock({hp:1},1,e.id),x-1,y+1,34,29,'0 0 40 34');
            else s+=sprite(A.decor('decor-'+e.kind),x-8,y-(e.kind==='lamppost'?31:14),48,e.kind==='lamppost'?64:48);
            s+='</g>';
        }
        return s;
    }
    function refresh(){
        if(!api||pendingRefresh)return;pendingRefresh=true;
        queueMicrotask(()=>{pendingRefresh=false;syncState();ensurePosition();dirty=true;updatePanels();wake();});
    }
    function updatePanels(){
        const d=data();
        $('[data-hud="level"]').innerHTML=icon('farmer')+' Lv.'+d.level;
        $('[data-hud="coins"]').innerHTML=icon('coin')+' '+d.coins;
        $('[data-hud="energy"]').innerHTML=icon('energy')+' '+d.energy;
        for(const el of host.querySelectorAll('[data-look]'))if(document.activeElement!==el)el.value=world.avatar[el.dataset.look];
        const ripe=d.plots.findIndex(p=>p.seed&&p.stage>=p.need),empty=d.plots.findIndex(p=>!p.seed),jobs=Object.values(d.machines).reduce((n,m)=>n+m.ready.length,0);
        $('.fw-goal').innerHTML=icon(jobs?'craft':ripe>=0?'basket':empty>=0?'sprout':'clock')+' '+(jobs?'โรงแปรรูปมีของพร้อมรับ '+jobs+' งาน':ripe>=0?'มีผลผลิตพร้อมเก็บ · เดินไปที่แปลง':empty>=0?'เริ่มปลูกที่แปลงว่าง · เลือกเมล็ดพันธุ์ของคุณ':'ฟาร์มกำลังเติบโต · สำรวจหรือแปรรูปของระหว่างรอ');
        if(target)showFocus(false);
        const signature=d.plots.map((p,i)=>i+':'+api.describe(i)).join('|')+'|'+JSON.stringify([world.buildings,world.decor,world.cleared,editing])+'|'+d.land;
        if($('.fw-destinations').dataset.signature!==signature){
            $('.fw-destinations').dataset.signature=signature;
            $('.fw-destinations div').innerHTML=d.plots.map((p,i)=>`<button type="button" data-destination="plot:${i}">แปลง ${i+1}: ${escape(api.describe(i))}</button>`).join('')+Object.entries(G.BUILDINGS).filter(([id])=>id!=='sea'||d.land>=4).map(([id,b])=>`<button type="button" data-destination="building:${id}">${b.name}</button>`).join('')+nodes().filter(e=>e.type==='resource'||editing&&e.type==='decor').map(e=>`<button type="button" data-destination="${e.type}:${e.id}">${e.type==='resource'?(e.kind==='tree'?'เคลียร์ต้นไม้':'ทุบกองหิน')+' ('+e.x+','+e.y+')':G.DECOR[e.kind].name}</button>`).join('');
        }
    }
    function wake(){if(!running&&api&&(visible||route.length||data().timing>=0)&&!document.hidden&&world.mode==='world'){last=0;running=requestAnimationFrame(frame);}}
    function stop(){if(running)cancelAnimationFrame(running);running=0;last=0;}
    function frame(time){
        running=0;if(document.hidden||world.mode!=='world'||!visible&&!route.length&&data().timing<0)return;
        const dt=last?Math.min(.06,(time-last)/1000):0;last=time;
        if(!route.length&&keys.size){const k=[...keys].at(-1),delta=({arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]})[k];if(delta)step(...delta);}
        if(route.length){
            const next=route[0],dx=next.x-position.x,dy=next.y-position.y,dist=Math.hypot(dx,dy),speed=4.5*dt;
            direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';moveTime+=dt;walkFrame=Math.floor(moveTime*9)%2;
            if(dist<=speed){position={...route.shift()};if(!route.length){world.pos={...position};api.save();if(target){$('.fw-hint').textContent='ถึงแล้ว กดใช้งานได้เลย';showFocus(true);}}}
            else{position.x+=dx/dist*speed;position.y+=dy/dist*speed;}
        }else walkFrame=0;
        const d=data(),signature=JSON.stringify([d.plots,d.land,d.house,world.buildings,world.decor,world.cleared,editing,d.pet&&d.pet.kind]);
        if(dirty||signature!==lastSignature){if(signature!==lastSignature){$('.fw-ground').innerHTML=terrain(d);$('.fw-items').innerHTML=renderItems(d);lastSignature=signature;}dirty=false;}
        const av=JSON.stringify([world.avatar,direction,walkFrame]);
        if(lastAvatar!==av){$('.fw-player').innerHTML=sprite(A.avatar(world.avatar,direction,walkFrame),-12,-28,24,32,'0 0 24 32');lastAvatar=av;}
        $('.fw-player').setAttribute('transform',`translate(${position.x*T+16} ${position.y*T+24})`);
        if($('.fw-pet').dataset.kind!==(d.pet?.kind||'')){$('.fw-pet').dataset.kind=d.pet?.kind||'';$('.fw-pet').innerHTML=d.pet?sprite(api.icon(d.pet.kind),-12,-18,24,24,'0 0 24 24'):'';}
        $('.fw-pet').setAttribute('transform',`translate(${position.x*T-8} ${position.y*T+23})`);
        const vw=(overview?G.W:cols)*T,vh=(overview?G.H:rows)*T;
        const camX=overview?0:Math.max(0,Math.min(G.W*T-vw,position.x*T+16-vw/2)),camY=overview?0:Math.max(0,Math.min(G.H*T-vh,position.y*T+16-vh/2));
        map.setAttribute('viewBox',`${camX} ${camY} ${vw} ${vh}`);view.style.aspectRatio=vw+'/'+vh;
        $('.fw-selected').innerHTML=target?`<rect x="${target.x*T}" y="${target.y*T}" width="${(target.w||1)*T}" height="${(target.h||1)*T}" fill="#fff0c7" fill-opacity=".12" stroke="#fff0c7" stroke-width="2" stroke-dasharray="4 3"/>`:'';
        if(d.timing>=0){$('.fw-timing').hidden=false;const t=((performance.now()-d.timingAt)%1800)/1800;$('.fw-timing i').style.left=((t<.5?t*2:2-t*2)*100)+'%';}
        else $('.fw-timing').hidden=true;
        if(route.length||keys.size||d.timing>=0)running=requestAnimationFrame(frame);else last=0;
    }
    function closeFocus(){target=null;$('.fw-focus').hidden=true;api.closePicker();dirty=true;wake();}
    function find(type,id){return nodes().find(e=>e.type===type&&String(e.id)===String(id));}
    function walkTo(e){
        const d=data();target=e;api.closePicker();
        const from={x:Math.round(position.x),y:Math.round(position.y)};
        const routeTo=G.approach(world,d.plots.length,d.land,from,e);
        if(routeTo===null){$('.fw-hint').textContent='ยังเดินไปไม่ถึง ลองย้ายของที่ขวางทางในโหมดจัดพื้นที่';route=[];return;}
        position=from;route=routeTo;showFocus(false);$('.fw-hint').textContent=route.length?'กำลังเดินไปยังจุดหมาย…':'ถึงแล้ว กดใช้งานได้เลย';dirty=true;wake();
    }
    function step(dx,dy){
        if(route.length||editing)return;
        const d=data(),from={x:Math.round(position.x),y:Math.round(position.y)},to={x:from.x+dx,y:from.y+dy};
        const p=G.path(world,d.plots.length,d.land,from,to);
        if(p&&p.length===1){target=null;$('.fw-focus').hidden=true;api.closePicker();route=p;wake();}
    }
    function showFocus(scroll){
        if(!target)return;const live=find(target.type,target.id);if(!live){closeFocus();return;}target=live;
        const e=target,arrived=near(e)&&!route.length;
        $('.fw-focus').hidden=false;let title='',desc='',actions='';
        if(e.type==='plot'){
            const p=data().plots[e.id];title='แปลงที่ '+(e.id+1);desc=api.describe(e.id);
            actions=`<button type="button" data-command="interact" ${arrived?'':'disabled'}>${data().timing===e.id?'กดตอนเข็มอยู่ตรงกลาง':p.pest?'จับหนอน':!p.seed?'เลือกเมล็ดพันธุ์':p.stage>=p.need?'เก็บผลผลิต':'ดูแลแปลง'}</button><button type="button" data-command="water">รดน้ำทั้งฟาร์ม</button>`;
        }else if(e.type==='building'){
            title=e.name;desc='เดินมาที่อาคาร แล้วเปิดระบบ'+e.name+'ของฟาร์ม';actions=`<button type="button" data-command="interact" ${arrived?'':'disabled'}>เข้า${e.name}</button>${editing?'<button type="button" data-command="move">ย้ายอาคารนี้</button>':''}`;
        }else if(e.type==='resource'){
            title=e.kind==='tree'?'ต้นไม้ในที่ดิน':'กองหิน';desc=(e.kind==='tree'?'เคลียร์ต้นไม้ ได้ไม้ 2 ชิ้น':'ทุบกองหิน ได้หิน 2 ชิ้น')+' · ใช้แรง 1 หน่วย';actions=`<button type="button" data-command="interact" ${arrived&&data().energy>0?'':'disabled'}>เคลียร์พื้นที่</button>`;
        }else{title=G.DECOR[e.kind].name;desc='ของตกแต่งที่คุณสร้างและจัดวางในฟาร์ม';actions=editing?'<button type="button" data-command="remove">เก็บคืนวัตถุดิบ</button>':'';}
        $('.fw-focus-title').textContent=title;$('.fw-focus-description').textContent=desc+(arrived?'':route.length?' · กำลังเดินไป…':' · ต้องเดินเข้าใกล้ก่อน');
        const box=$('.fw-focus-actions');if(box.innerHTML!==actions)box.innerHTML=actions;
        if(scroll && host.getBoundingClientRect().bottom<0)$('.fw-focus').scrollIntoView({block:'nearest'});
    }
    function useTarget(){
        if(route.length)return;
        if(!target){target=nodes().find(e=>near(e)&&e.type!=='decor');if(!target){$('.fw-hint').textContent='เดินเข้าใกล้แปลงหรืออาคารก่อนนะ';return;}showFocus(false);}
        if(!near(target))return;
        if(target.type==='plot'){api.plot(target.id);showFocus(false);wake();}
        else if(target.type==='building')api.open(target.tab);
        else if(target.type==='resource'){
            if(api.clear(target)){world.cleared.push(target.id);api.save();api.toast('เคลียร์พื้นที่แล้ว วัตถุดิบเข้ายุ้งฉางแล้ว','success');closeFocus();}else api.toast('แรงไม่พอหรือคลังเต็ม ลองรับอาหารหรือขายของก่อนนะ','warning');
        }
    }
    function onMapClick(event){
        const r=map.getBoundingClientRect(),vb=map.viewBox.baseVal,x=Math.floor((vb.x+(event.clientX-r.left)/r.width*vb.width)/T),y=Math.floor((vb.y+(event.clientY-r.top)/r.height*vb.height)/T),d=data();
        const clicked=event.target.closest('[data-fw-type]');
        const hit=clicked?find(clicked.dataset.fwType,clicked.dataset.fwId):null;
        if(!G.unlocked(hit?hit.x:x,hit?hit.y:y,d.land)){landPanel();return;}
        if(placement){place(x,y);return;}
        const e=hit||nodes().filter(n=>G.inside(x,y,n)).at(-1);
        if(e){if(editing&&(e.type==='building'||e.type==='decor')){target=e;showFocus(false);if(e.type==='building'){placement={type:'building',id:e.id};$('.fw-placement').textContent='ย้าย '+e.name+' · แตะตำแหน่งใหม่';}wake();}else walkTo(e);return;}
        if(editing){$('.fw-hint').textContent='เลือกของตกแต่งหรือแตะอาคารที่จะย้ายก่อน';return;}
        const from={x:Math.round(position.x),y:Math.round(position.y)},p=G.path(world,d.plots.length,d.land,from,{x,y});
        if(p){closeFocus();position=from;route=p;wake();}else $('.fw-hint').textContent='มีสิ่งกีดขวาง เดินไปช่องข้าง ๆ หรือเคลียร์พื้นที่ก่อน';
    }
    function place(x,y){
        if(!placement){api.toast('เลือกของตกแต่งหรืออาคารที่จะย้ายก่อนนะ');return;}
        if(!Number.isInteger(x)||!Number.isInteger(y)){api.toast('เลือกหมายเลขช่องเป็นจำนวนเต็มนะ');return;}
        const d=data(),p=placement,def=p.type==='building'?G.BUILDINGS[p.id]:G.DECOR[p.kind],rect={x,y,w:def.w||1,h:def.h||1};
        if(!G.canPlace(world,d.plots.length,d.land,rect,p.type==='building'?p:null)||G.PLOTS.some(q=>x<q.x+q.w&&x+rect.w>q.x&&y<q.y+q.h&&y+rect.h>q.y)) {api.toast('ตำแหน่งนี้มีของ แปลงปลูก หรือยังไม่ได้ปลดล็อก','warning');return;}
        if(p.type==='decor'&&(world.decor.length>=48||!api.has(def.need))){api.toast(world.decor.length>=48?'วางของครบ 48 ชิ้นแล้ว':'วัตถุดิบไม่พอสำหรับของชิ้นนี้','warning');return;}
        const old=p.type==='building'?{...world.buildings[p.id]}:null;
        if(old)world.buildings[p.id]={x,y};else world.decor.push({kind:p.kind,x,y});
        const accessible=nodes().filter(e=>e.type==='building'||e.type==='plot').every(e=>G.approach(world,d.plots.length,d.land,world.pos,e)!==null);
        if(!accessible){if(old)world.buildings[p.id]=old;else world.decor.pop();api.toast('วางตรงนี้จะปิดทางเข้าอาคารหรือแปลง ลองช่องอื่นนะ','warning');return;}
        if(p.type==='decor')api.take(def.need);
        placement=null;target=null;$('.fw-placement').textContent='จัดวางแล้ว บันทึกตำแหน่งให้อัตโนมัติ';api.save();refresh();
    }
    function landPanel(){
        target=null;$('.fw-focus').hidden=false;api.closePicker();const d=data();
        $('.fw-focus-title').textContent=d.land>=6?'ที่ดินขยายครบแล้ว':'ขยายที่ดิน '+d.land+'/6';
        $('.fw-focus-description').textContent=d.land>=6?'จัดวางอาคารและของตกแต่งได้ทั่วฟาร์ม':'เพิ่มแปลงปลูกอีก 1 แปลง · ซื้อครั้งแรกเปิดพื้นที่ใต้ฟาร์ม · ครั้งที่ 4 เปิดพื้นที่ตะวันออก';
        $('.fw-focus-actions').innerHTML=d.land>=6?'':`<button type="button" data-command="buy-land" ${d.level<d.landLevel||d.coins<d.landPrice?'disabled':''}>${d.level<d.landLevel?'ต้องเลเวล '+d.landLevel:icon('coin')+' '+d.landPrice+' · ขยายที่ดิน'}</button>`;
    }
    function onClick(event){
        const b=event.target.closest('button');if(!b||!host.contains(b))return;
        if(b.dataset.mode){setMode(b.dataset.mode);return;}
        if(b.dataset.destination){const [type,id]=b.dataset.destination.split(':');const e=find(type,id);if(e)walkTo(e);return;}
        if(b.dataset.step){step(...b.dataset.step.split(',').map(Number));return;}
        if(b.dataset.decor){placement={type:'decor',kind:b.dataset.decor};target=null;$('.fw-placement').textContent=G.DECOR[b.dataset.decor].name+' · ใช้ '+Object.entries(G.DECOR[b.dataset.decor].need).map(([k,n])=>api.name(k)+' '+n).join(' + ')+' · แตะช่องเพื่อวาง';return;}
        switch(b.dataset.command){
            case 'overview':overview=!overview;b.setAttribute('aria-pressed',String(overview));dirty=true;wake();break;
            case 'edit':editing=!editing;placement=null;route=[];position={x:Math.round(position.x),y:Math.round(position.y)};world.pos={...position};ensurePosition();$('.fw-editor').hidden=!editing;b.setAttribute('aria-pressed',String(editing));$('.fw-placement').textContent='';lastSignature='';refresh();break;
            case 'look':settingsOpen=!settingsOpen;$('.fw-look').hidden=!settingsOpen;b.setAttribute('aria-expanded',String(settingsOpen));break;
            case 'use':case 'interact':useTarget();break;
            case 'water':api.water();refresh();break;
            case 'place-grid':place(Number($('[data-grid="x"]').value),Number($('[data-grid="y"]').value));break;
            case 'close-focus':placement=null;closeFocus();break;
            case 'land':landPanel();break;
            case 'buy-land':api.expand();landPanel();refresh();break;
            case 'move':if(target){placement={type:'building',id:target.id};$('.fw-placement').textContent='แตะช่องใหม่สำหรับ '+target.name;}break;
            case 'remove':if(target&&target.type==='decor'){const e=target;if(api.give(G.DECOR[e.kind].need)){world.decor.splice(e.id,1);api.save();closeFocus();refresh();}else api.toast('คลังเต็ม ยังคืนวัตถุดิบไม่ได้','warning');}break;
            case 'goal':{const d=data(),ready=Object.values(d.machines).some(m=>m.ready.length);if(ready){walkTo(find('building','craft'));break;}let i=d.plots.findIndex(p=>p.seed&&p.stage>=p.need);if(i<0)i=d.plots.findIndex(p=>!p.seed);walkTo(find(i>=0?'plot':'building',i>=0?i:'board'));break;}
        }
    }
    root.FarmWorld=Object.freeze({start,refresh});
})(window);
