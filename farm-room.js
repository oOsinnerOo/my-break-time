/* Shared courtyard. Broadcasts contain cosmetic game presence only; room
 * membership, visits, gifts and greetings remain on the original room RPCs. */
(function(root){
    'use strict';
    const G=root.FarmSystems,A=root.FarmCuteArt,TTL=45000;
    const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const ROOM=/^[A-HJKMNP-Z2-9]{6}$/,DIRECTIONS=['down','up','left','right'];
    const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
    const lookOK=a=>Array.isArray(a)&&a.length===3&&a.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=[5,3,2][i]);
    function cleanSnapshot(s){
        if(!Array.isArray(s)||s[0]!==1||!finite(s[1],1,22)||!finite(s[2],1,16)||!Number.isInteger(s[3])||s[3]<0||s[3]>3||!lookOK(s.slice(4,7))||!finite(s[7],1,9e15))return null;
        return {x:s[1],y:s[2],dir:DIRECTIONS[s[3]],look:s.slice(4,7),at:s[7]};
    }
    function layout(){
        const s=G.cleanWorld();s.cleared=G.RESOURCES.map(r=>r.id);
        s.buildings.house={x:3,y:3};s.buildings.barn={x:15,y:3};s.buildings.stall={x:9,y:2};
        s.buildings.craft={x:3,y:11};s.buildings.pond={x:10,y:8};s.buildings.board={x:7,y:5};
        s.buildings.forest={x:3,y:1};s.buildings.mine={x:18,y:1};s.buildings.sea={x:20,y:11};
        s.decor=[{kind:'bench',x:8,y:9},{kind:'bench',x:13,y:9},{kind:'flowerbed',x:8,y:7},{kind:'flowerbed',x:13,y:7},
            {kind:'lamppost',x:6,y:6},{kind:'lamppost',x:16,y:6},{kind:'flowerbed',x:5,y:13},{kind:'flowerbed',x:17,y:13}];
        return s;
    }
    const meetingLayout=layout();
    function canStand(x,y){return finite(x,1,22)&&finite(y,1,16)&&!G.entities(meetingLayout,0,6).some(e=>!e.walk&&G.inside(x,y,e));}
    class Network {
        constructor(options={}){
            this.options=options;this.now=options.now||(()=>Date.now());this.Socket=options.Socket||root.WebSocket;
            this.every=options.every||((fn,n)=>setInterval(fn,n));this.after=options.after||((fn,n)=>setTimeout(fn,n));
            this.clearEvery=options.clearEvery||(id=>clearInterval(id));this.clearAfter=options.clearAfter||(id=>clearTimeout(id));
            this.random=options.random||(()=>{const a=new Uint32Array(2);root.crypto.getRandomValues(a);return [...a].map(n=>n.toString(16).padStart(8,'0')).join('');});
            this.room='';this.me='';this.members=new Map();this.peers=new Map();this.pending=new Map();this.backendSeen=new Map();
            this.active=false;this.joined=false;this.rejected=false;this.status='idle';this.socket=null;this.ref=0;this.seq=0;this.session='';
            this.local={x:9,y:6,dir:'down',look:[0,0,1]};this.dirty=true;this.lastSend=0;this.lastUnknown=-Infinity;
            this.retry=0;this.timer=0;this.heartbeat=0;this.watchdog=0;this.heartbeatTimeout=0;this.heartbeatRef='';this.lastInbound=0;this.backoff=1000;this.retired=new Map();
        }
        changed(){if(this.options.onChange)this.options.onChange();}
        sync(info){
            const room=ROOM.test(info.room||'')?info.room:'',me=UUID.test(info.player||'')?info.player:'';
            if(room!==this.room||me!==this.me){this.disconnect(true);this.room=room;this.me=me;this.peers.clear();this.pending.clear();this.backendSeen.clear();this.retired.clear();this.session=this.random();this.seq=0;this.rejected=false;this.status='idle';}
            this.members=new Map((Array.isArray(info.members)?info.members:[]).filter(p=>p&&UUID.test(p.id)).slice(0,30).map(p=>[p.id,p]));
            for(const id of this.peers.keys())if(!this.members.has(id))this.peers.delete(id);
            for(const [id,p] of this.pending)if(this.members.has(id)){this.pending.delete(id);this.receive(p);}
            for(const member of this.members.values()){
                if(member.id===this.me)continue;const s=member.farm&&member.farm.presence;
                if(!s){if(member.farm?.presenceHere===false&&this.peers.get(member.id)?.source==='snapshot'){this.peers.delete(member.id);this.changed();}continue;}if(this.backendSeen.get(member.id)===s.at)continue;this.backendSeen.set(member.id,s.at);
                const peer=this.peers.get(member.id);if(peer&&peer.source==='live'&&this.now()-peer.seen<TTL)continue;
                const age=Math.max(0,this.now()-s.at);if(age>TTL||!canStand(s.x,s.y))continue;
                this.put(member.id,s,'snapshot',this.now()-age);
            }
            this.prune();
            if(this.active&&room&&me&&!this.socket&&!this.retry)this.connect();
        }
        setActive(on){
            if(this.active===on)return;this.active=on;
            if(on){this.session=this.random();this.seq=0;this.dirty=true;this.backoff=1000;this.rejected=false;if(this.room&&this.me)this.connect();else this.setStatus('no-room');}
            else{this.disconnect(true);this.peers.clear();this.pending.clear();this.setStatus('idle');}
        }
        setStatus(s){if(this.status!==s){this.status=s;this.changed();}}
        update(x,y,dir,look){
            if(!canStand(x,y)||!DIRECTIONS.includes(dir)||!lookOK(look))return false;
            const value={x:+x.toFixed(3),y:+y.toFixed(3),dir,look:[...look]};
            if(JSON.stringify(value)!==JSON.stringify(this.local)){this.local=value;this.dirty=true;}
            return true;
        }
        snapshot(){const p=this.local;return this.active&&this.room?[1,p.x,p.y,DIRECTIONS.indexOf(p.dir),...p.look,this.now()]:[0];}
        packet(here=true){const p=this.local;return {v:1,r:this.room,id:this.me,s:this.session,n:++this.seq,h:here?1:0,x:p.x,y:p.y,d:p.dir,a:p.look};}
        wire(event,payload,topic){
            if(!this.socket||this.socket.readyState!==1)return false;
            try{this.socket.send(JSON.stringify({topic:topic||'realtime:bt-courtyard-v1:'+this.room,event,payload,ref:event==='phx_join'?this.joinRef:String(++this.ref),join_ref:topic==='phoenix'?null:this.joinRef}));return true;}catch{return false;}
        }
        publish(force=false){
            const now=this.now();if(now-this.lastSend<250)return false;if(!this.joined||!this.active||(!force&&!this.dirty&&now-this.lastSend<8000)||(!force&&now-this.lastSend<500))return false;
            if(this.wire('broadcast',{type:'broadcast',event:'move',payload:this.packet()})){this.lastSend=now;this.dirty=false;return true;}return false;
        }
        connect(){
            if(!this.active||!this.room||!this.me||this.socket||this.rejected)return;
            if(!this.Socket){this.rejected=true;this.setStatus('snapshot');return;}
            this.clearAfter(this.retry);this.retry=0;this.setStatus('connecting');
            const origin=new URL(this.options.origin),url=origin.href.replace(/^http/,'ws').replace(/\/$/,'')+'/realtime/v1/websocket?apikey='+encodeURIComponent(this.options.apiKey)+'&vsn=1.0.0';
            let socket;try{socket=new this.Socket(url);}catch{this.reconnect();return;}this.socket=socket;
            this.watchdog=this.after(()=>{if(this.socket===socket&&!this.joined)socket.close();},12000);
            socket.onopen=()=>{
                if(this.socket!==socket)return;this.joinRef=String(++this.ref);
                this.wire('phx_join',{config:{broadcast:{self:false,ack:false},presence:{enabled:false},private:false}});
                this.clearAfter(this.watchdog);
                this.watchdog=this.after(()=>{if(this.socket===socket&&!this.joined)socket.close();},10000);
            };
            socket.onmessage=event=>{
                if(this.socket!==socket||typeof event.data!=='string'||event.data.length>16000)return;
                let message;try{message=JSON.parse(event.data);}catch{return;}this.lastInbound=this.now();
                if(message.topic==='phoenix'&&message.event==='phx_reply'&&String(message.ref)===this.heartbeatRef){
                    this.clearAfter(this.heartbeatTimeout);this.heartbeatTimeout=0;this.heartbeatRef='';return;
                }
                if(message.topic==='realtime:bt-courtyard-v1:'+this.room&&message.event==='phx_reply'&&!this.joined){
                    if(message.payload&&message.payload.status==='ok'){
                        this.clearAfter(this.watchdog);this.watchdog=0;this.joined=true;this.backoff=1000;this.setStatus('live');
                        this.timer=this.every(()=>{this.publish();this.prune();},500);
                        this.heartbeat=this.every(()=>this.ping(),25000);
                        this.wire('broadcast',{type:'broadcast',event:'hello',payload:{id:this.me}});this.publish(true);
                    }else{this.rejected=true;this.disconnect(false);this.setStatus('snapshot');}
                }else if(message.topic==='realtime:bt-courtyard-v1:'+this.room&&message.event==='broadcast'){
                    const b=message.payload||{};if(b.event==='move')this.receive(b.payload);
                    else if(b.event==='hello'&&b.payload&&UUID.test(b.payload.id)&&b.payload.id!==this.me){this.publish(true);this.unknown();}
                }else if(message.event==='phx_error'||message.event==='phx_close')socket.close();
            };
            socket.onclose=()=>{if(this.socket!==socket)return;this.socket=null;this.joined=false;this.clearTimers();if(this.active)this.reconnect();};
            socket.onerror=()=>{if(this.socket===socket)this.setStatus('snapshot');};
        }
        unknown(){if(this.now()-this.lastUnknown<8000)return;this.lastUnknown=this.now();if(this.options.onUnknown)this.options.onUnknown();}
        ping(){
            if(!this.joined||this.heartbeatRef)return;
            const socket=this.socket;
            if(this.wire('heartbeat',{},'phoenix')){
                this.heartbeatRef=String(this.ref);
                this.heartbeatTimeout=this.after(()=>{if(this.socket===socket&&this.heartbeatRef)socket.close();},12000);
            }
        }
        resume(){
            if(!this.active)return;
            if(!this.joined||this.now()-this.lastInbound>30000){this.retryNow();return;}
            this.publish(true);this.ping();
        }
        retryNow(){
            if(!this.active)return;this.disconnect(false);this.rejected=false;this.backoff=1000;this.connect();
        }
        reconnect(){
            if(!this.active||this.retry)return;this.setStatus('snapshot');
            const delay=this.backoff;this.backoff=Math.min(30000,this.backoff*2);
            this.retry=this.after(()=>{this.retry=0;this.connect();},delay);
        }
        clearTimers(){this.clearEvery(this.timer);this.clearEvery(this.heartbeat);this.clearAfter(this.watchdog);this.clearAfter(this.heartbeatTimeout);this.timer=this.heartbeat=this.watchdog=this.heartbeatTimeout=0;this.heartbeatRef='';}
        disconnect(announce){
            this.clearAfter(this.retry);this.retry=0;
            if(announce&&this.joined)this.wire('broadcast',{type:'broadcast',event:'move',payload:this.packet(false)});
            const socket=this.socket;this.socket=null;this.joined=false;this.clearTimers();if(socket){socket.onclose=null;try{socket.close();}catch{}}
        }
        receive(p){
            if(!p||Array.isArray(p)||p.v!==1||p.r!==this.room||!UUID.test(p.id||'')||p.id===this.me||!/^[a-f0-9]{16}$/.test(p.s||'')||!Number.isSafeInteger(p.n)||p.n<1||(p.h!==0&&p.h!==1)||!canStand(p.x,p.y)||!DIRECTIONS.includes(p.d)||!lookOK(p.a))return false;
            if(!this.members.has(p.id)){if(this.pending.size<20)this.pending.set(p.id,p);this.unknown();return false;}
            const old=this.peers.get(p.id),retired=this.retired.get(p.id)||new Set();
            if(retired.has(p.s))return false;
            if(old&&old.source==='live'&&old.session===p.s&&p.n<=old.seq)return false;
            if(old&&old.source==='live'&&old.session!==p.s){if(!p.h)return false;retired.add(old.session);if(retired.size>8)retired.delete(retired.values().next().value);this.retired.set(p.id,retired);}
            if(!p.h){if(old&&(old.source!=='live'||old.session===p.s)){this.peers.delete(p.id);this.changed();}return true;}
            this.put(p.id,{x:p.x,y:p.y,dir:p.d,look:p.a,session:p.s,seq:p.n},'live',this.now());return true;
        }
        put(id,p,source,seen){
            const old=this.peers.get(id),from=old?this.sample(old,this.now()):p;
            this.peers.set(id,{...p,id,source,seen,from:{x:from.x,y:from.y},transition:this.now(),until:this.now()+500});this.changed();
        }
        sample(p,now){const t=Math.min(1,Math.max(0,(now-p.transition)/500));return {...p,x:p.from.x+(p.x-p.from.x)*t,y:p.from.y+(p.y-p.from.y)*t,moving:t<1&&Math.hypot(p.from.x-p.x,p.from.y-p.y)>.03};}
        players(){this.prune();return [...this.peers.values()].filter(p=>this.members.has(p.id)).map(p=>({...this.sample(p,this.now()),name:this.members.get(p.id).name,level:this.members.get(p.id).farm?.lv||1}));}
        prune(){let removed=false;for(const [id,p] of this.peers)if(this.now()-p.seen>TTL||!this.members.has(id)){this.peers.delete(id);removed=true;}if(removed)this.changed();}
        hasMotion(){return [...this.peers.values()].some(p=>this.now()<p.until);}
    }

    let api,host,net,map,view,active=false,route=[],position={x:9,y:6},direction='down',target=null,overview=false,keys=new Set();
    let raf=0,last=0,cols=16,rows=11,movingFrame=0,localArt='',timer=0,knownRoom='',knownPlayer='',visible=true,memberSignature='';
    const peerDOM=new Map(),NS='http://www.w3.org/2000/svg';
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const text=(el,value)=>{if(el.textContent!==value)el.textContent=value;};
    const $=s=>host.querySelector(s),svg=(s,x,y,w,h,vb='0 0 64 64')=>`<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${vb}">${s}</svg>`;
    const ROOM_NAMES={house:'ศาลากลาง',barn:'ฟาร์มเพื่อน',stall:'ตลาดเพื่อน',craft:'ภารกิจทีม',pond:'น้ำพุประจำห้อง',board:'ข่าวในห้อง',forest:'บอสห้อง',mine:'ประกวดสวน',sea:'กิจกรรมห้อง'};
    function roomNodes(){return G.entities(meetingLayout,0,6).map(e=>e.type==='building'?{...e,name:ROOM_NAMES[e.id]}:e);}
    function start(adapter){
        if(api)return;api=adapter;host=document.createElement('section');host.className='fr-room';host.hidden=true;
        host.innerHTML=`<div class="fr-heading"><div><span>จุดนัดพบของทุกคน</span><h3>ลานห้องเพื่อน</h3></div><button type="button" data-fr="manage">${A.ui('friends')} จัดการห้อง</button></div>
            <div class="fr-status" role="status"></div><div class="fr-lobby" hidden><b>เข้าห้องเดียวกัน แล้วมาเจอกันที่ลานนี้</b><p>สร้างห้องหรือใส่รหัสห้องของเพื่อน จากนั้นกด “ห้องเพื่อน” บนฟาร์มของแต่ละคน</p><button type="button" data-fr="manage">สร้างห้อง / เข้าห้อง</button></div>
            <div class="fr-connected"><div class="fr-toolbar"><button type="button" data-fr="overview">${A.ui('map')} แผนที่</button><button type="button" data-fr="refresh">${A.ui('refresh')} อัปเดตห้อง</button><span class="fr-count"></span></div>
            <div class="fr-view" tabindex="0" role="group" aria-label="ลานห้องเพื่อน แตะพื้นเพื่อเดิน แตะเพื่อนเพื่อเดินเข้าไปหา ใช้ลูกศรและ Enter ได้"><svg class="fr-map" shape-rendering="geometricPrecision" aria-hidden="true"><g class="fr-ground"></g><g class="fr-places"></g><g class="fr-peers"></g><g class="fr-self"></g></svg><span class="fr-room-name"></span></div>
            <div class="fr-under"><p class="fr-hint" role="status">แตะตัวละครเพื่อนเพื่อเดินไปหา</p><div class="fw-controls"><button type="button" class="fw-up" data-fr-step="0,-1" aria-label="เดินขึ้นในลานห้อง">↑</button><button type="button" class="fw-left" data-fr-step="-1,0" aria-label="เดินซ้ายในลานห้อง">←</button><button type="button" class="fw-use" data-fr="use" aria-label="ใช้งานสิ่งที่อยู่ใกล้ในลานห้อง">ใช้งาน</button><button type="button" class="fw-right" data-fr-step="1,0" aria-label="เดินขวาในลานห้อง">→</button><button type="button" class="fw-down" data-fr-step="0,1" aria-label="เดินลงในลานห้อง">↓</button></div></div>
            <div class="fr-focus" hidden><div><b></b><button type="button" data-fr="close" aria-label="ปิดรายละเอียดเพื่อน">×</button></div><p></p><nav aria-label="การใช้งานจุดหมาย"></nav></div>
            <div class="fr-members"><h4>เพื่อนที่อยู่ในลาน</h4><div></div><p></p></div><details class="fr-access"><summary>เลือกอาคารในลาน</summary><div>${Object.entries(ROOM_NAMES).map(([id,name])=>`<button type="button" data-fr-place="${id}">${name}</button>`).join('')}</div></details></div>`;
        document.getElementById('farm-world').append(host);map=$('.fr-map');view=$('.fr-view');
        net=new Network({origin:adapter.origin,apiKey:adapter.apiKey,onChange:()=>{updateUI();wake();},onUnknown:()=>api.refreshRoom()});
        host.addEventListener('click',click);view.addEventListener('click',mapClick);
        view.addEventListener('keydown',e=>{if(/^(Arrow|[wasdWASD])/.test(e.key)){e.preventDefault();keys.add(e.key.toLowerCase());wake();}if(e.key==='Enter'||e.key===' '){e.preventDefault();use();}});
        view.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));view.addEventListener('blur',()=>keys.clear());window.addEventListener('blur',()=>keys.clear());
        window.addEventListener('pagehide',()=>net.disconnect(true));window.addEventListener('online',()=>{if(active){net.retryNow();refresh();}});
        document.addEventListener('visibilitychange',()=>{keys.clear();if(!document.hidden&&active){net.resume();api.refreshRoom();refresh();}});
        new ResizeObserver(entries=>{const w=entries[0].contentRect.width;if(w){cols=Math.max(10,Math.min(18,Math.floor(w/32)));rows=Math.round(cols*.72);wake();}}).observe(view);
        new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)wake();},{rootMargin:'100px'}).observe(view);
        drawScene();
        timer=setInterval(()=>{if(active){refresh();net.publish();}},1000);
    }
    function setActive(on){
        if(!api)return;active=on;host.hidden=!on;keys.clear();route=[];target=null;$('.fr-focus').hidden=true;
        if(on){refresh();net.setActive(true);api.refreshRoom();wake();}
        else{net.setActive(false);clearPeerDOM();if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
    }
    function refresh(){
        if(!api)return;const info=api.read();
        if(info.room!==knownRoom||info.player!==knownPlayer){knownRoom=info.room;knownPlayer=info.player;let h=0;for(const c of info.player||'')h=(h*31+c.charCodeAt(0))>>>0;position={x:8+h%6,y:6};if(!canStand(position.x,position.y))position={x:9,y:6};route=[];target=null;memberSignature='';clearPeerDOM();}
        net.sync(info);net.update(position.x,position.y,direction,info.look);
        if(active){updateUI();wake();}
    }
    function updateUI(){
        if(!host||!active)return;const info=api.read(),joined=ROOM.test(info.room||'')&&UUID.test(info.player||'');
        $('.fr-lobby').hidden=joined;$('.fr-connected').hidden=!joined;
        const states={idle:'', 'no-room':'ยังไม่ได้เข้าห้อง',connecting:'กำลังเชื่อมต่อลานห้อง…',live:'เชื่อมต่อสด · เห็นเพื่อนที่เปิดลานห้องอยู่',snapshot:'กำลังเชื่อมต่อใหม่ · แสดงตำแหน่งล่าสุดที่ได้รับ'};
        $('.fr-status').textContent=joined?(states[net.status]||'กำลังโหลดห้อง…'):'สร้างหรือเข้าห้องเพื่อมาเดินเจอกัน';
        $('.fr-room-name').textContent=info.roomName||('ห้อง '+info.room);
        const peers=net.players(),ids=peers.map(p=>p.id+':'+p.name+':'+p.source+':'+p.look.join(',')+':'+p.level).join('|');
        $('.fr-count').textContent=(peers.length+1)+' คนในลาน';
        if(ids!==memberSignature){memberSignature=ids;$('.fr-members div').innerHTML=peers.map(p=>`<button type="button" data-fr-peer="${p.id}">${svg(A.avatar({shirt:p.look[0],hair:p.look[1],hat:p.look[2]}),0,0,24,32,'0 0 24 32')}<span>${esc(p.name)}<small>Lv.${p.level}${p.source==='snapshot'?' · ตำแหน่งล่าสุด':''}</small></span><b>เดินไปหา</b></button>`).join('');}
        $('.fr-members p').textContent=peers.length?'เปิดลานห้องไว้พร้อมกัน แล้วเดินเข้าไปคุยหรือเยี่ยมฟาร์มกันได้':'ยังไม่มีเพื่อนคนอื่นอยู่ในลาน ชวนเพื่อนเข้าห้องและเปิด “ห้องเพื่อน” พร้อมกัน';
        if(target)focus();
    }
    function drawScene(){
        let s='<rect width="768" height="576" fill="#48744b"/><rect x="32" y="32" width="704" height="512" fill="#95b66d"/><path d="M32 160H736V224H32zM288 64H352V512H288zM192 352H672V400H192z" fill="#c5b17c"/>';
        for(let i=0;i<85;i++)s+=`<circle cx="${32+i*83%702}" cy="${32+i*47%510}" r="1.5" fill="#bbd7ac" opacity=".6"/>`;
        for(let x=0;x<24;x+=2)s+=svg(A.decor('decor-bush'),x*32,-8,64,48);$('.fr-ground').innerHTML=s;
        let places='';for(const e of roomNodes().sort((a,b)=>a.y+a.h-b.y-b.h)){
            const x=e.x*32,y=e.y*32;places+=`<g data-room-place="${e.type==='building'?e.id:''}">`;
            if(e.type==='decor')places+=svg(A.decor('decor-'+e.kind),x-8,y-(e.kind==='lamppost'?30:14),48,e.kind==='lamppost'?64:48);
            else if(e.id==='house')places+=svg(A.house(3),x-8,y-45,112,112);
            else if(e.id==='pond')places+=svg(A.decor('decor-stonefountain'),x-5,y-35,80,100);
            else places+=svg(A.ui(e.id==='barn'?'friends':e.id==='craft'?'quest':e.art),x-2,y-20,Math.max(40,e.w*32+4),Math.max(40,e.w*32+4),'0 0 24 24');
            if(e.type==='building')places+=`<rect x="${x-7}" y="${y+e.h*32+4}" width="${e.name.length*7+10}" height="15" rx="2" fill="#fff0c7" stroke="#80543f"/><text x="${x-2}" y="${y+e.h*32+15}" font-size="10" fill="#4b3845">${esc(e.name)}</text>`;
            places+='</g>';
        }$('.fr-places').innerHTML=places;
    }
    function wake(){if(active&&net?.room&&!document.hidden&&!raf){last=0;raf=requestAnimationFrame(frame);}}
    function frame(time){
        raf=0;if(!active||document.hidden)return;const dt=last?Math.min(.06,(time-last)/1000):0;last=time;
        if(!route.length&&keys.size){const d=({arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]})[[...keys].at(-1)];if(d)step(...d);}
        if(route.length){const n=route[0],dx=n.x-position.x,dy=n.y-position.y,dist=Math.hypot(dx,dy),speed=4.5*dt;direction=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';movingFrame=Math.floor(time/130)%2;
            if(dist<=speed){position={...route.shift()};if(!route.length){$('.fr-hint').textContent='ถึงจุดหมายแล้ว กดใช้งานได้เลย';focus();}}else{position.x+=dx/dist*speed;position.y+=dy/dist*speed;}
        }else movingFrame=0;
        const info=api.read();net.update(position.x,position.y,direction,info.look);net.publish();
        const mine=A.avatar({shirt:info.look[0],hair:info.look[1],hat:info.look[2]},direction,movingFrame);
        if(localArt!==mine){$('.fr-self').innerHTML=svg(mine,-12,-28,24,32,'0 0 24 32')+`<rect x="-18" y="7" width="36" height="15" rx="2" fill="#365943"/><text x="0" y="18" text-anchor="middle" font-size="10" fill="#fff0c7">คุณ</text>`;localArt=mine;}
        $('.fr-self').setAttribute('transform',`translate(${position.x*32+16} ${position.y*32+24})`);
        drawPeers(net.players(),time);
        const w=(overview?24:cols)*32,h=(overview?18:rows)*32,x=overview?0:Math.max(0,Math.min(768-w,position.x*32+16-w/2)),y=overview?0:Math.max(0,Math.min(576-h,position.y*32+16-h/2));
        map.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);view.style.aspectRatio=w+'/'+h;
        if(target)focus();if(route.length||keys.size||visible&&net.hasMotion())raf=requestAnimationFrame(frame);else last=0;
    }
    function clearPeerDOM(){for(const item of peerDOM.values())item.node.remove();peerDOM.clear();}
    function drawPeers(players,time){
        const present=new Set(players.map(p=>p.id));
        for(const [id,item] of peerDOM)if(!present.has(id)){item.node.remove();peerDOM.delete(id);}
        for(const p of players){
            let item=peerDOM.get(p.id);
            if(!item){
                const node=document.createElementNS(NS,'g');node.dataset.roomPeer=p.id;
                node.innerHTML='<g class="fr-peer-sprite"></g><g class="fr-peer-label"><rect y="7" height="15" rx="2" stroke="#80543f"/><text x="0" y="18" text-anchor="middle" font-size="10" fill="#4b3845"></text></g>';
                $('.fr-peers').append(node);item={node,sprite:node.querySelector('.fr-peer-sprite'),label:node.querySelector('text'),bg:node.querySelector('rect'),art:''};peerDOM.set(p.id,item);
            }
            item.node.setAttribute('transform',`translate(${(p.x*32+16).toFixed(1)} ${(p.y*32+24).toFixed(1)})`);
            const key=p.look.join(',')+':'+p.dir+':'+(p.moving?Math.floor(time/130)%2:0);
            if(item.art!==key){item.sprite.innerHTML=svg(A.avatar({shirt:p.look[0],hair:p.look[1],hat:p.look[2]},p.dir,p.moving?Math.floor(time/130)%2:0),-12,-28,24,32,'0 0 24 32');item.art=key;}
            const width=Math.min(100,p.name.length*7+12);item.bg.setAttribute('x',String(-width/2));item.bg.setAttribute('width',String(width));item.bg.setAttribute('fill',p.source==='live'?'#fff0c7':'#d6d2c4');text(item.label,p.name);
        }
    }
    function peer(id){return net.players().find(p=>p.id===id);}
    function entity(){if(!target)return null;if(target.type==='friend'){const p=peer(target.id);return p?{...p,type:'friend',x:Math.round(p.x),y:Math.round(p.y),w:1,h:1}:null;}return roomNodes().find(p=>p.type==='building'&&p.id===target.id);}
    function distance(e){return Math.min(...[{x:e.x-1,y:e.y},{x:e.x+(e.w||1),y:e.y},{x:e.x,y:e.y-1},{x:e.x,y:e.y+(e.h||1)}].map(p=>Math.hypot(position.x-p.x,position.y-p.y)));}
    function visit(type,id){
        target={type,id};const e=entity();if(!e)return;const from={x:Math.round(position.x),y:Math.round(position.y)};
        const p=G.approach(meetingLayout,0,6,from,e);if(p===null){$('.fr-hint').textContent='จุดนี้มีสิ่งกีดขวาง ลองเข้าจากอีกทาง';return;}
        position=from;route=p;$('.fr-hint').textContent=route.length?'กำลังเดินไปหา '+(e.name||'เพื่อน'):'ถึงแล้ว กดใช้งานได้เลย';focus();wake();
    }
    function focus(){
        if(!target)return;const e=entity();if(!e){target=null;$('.fr-focus').hidden=true;return;}
        const close=!route.length&&distance(e)<=1.2;$('.fr-focus').hidden=false;text($('.fr-focus b'),e.name);
        text($('.fr-focus p'),e.type==='friend'?`Lv.${e.level} · ${e.source==='live'?'อยู่ในลานห้อง':'ตำแหน่งล่าสุด'}${close?' · อยู่ใกล้กันแล้ว':' · เดินเข้าใกล้เพื่อทักทาย'}`:'เดินเข้าใกล้เพื่อเปิด'+e.name);
        const actions=e.type==='friend'?`<button type="button" data-fr="wave" ${close?'':'disabled'}>โบกมือทักทาย</button><button type="button" data-fr="farm" ${close?'':'disabled'}>ดูฟาร์มเพื่อน</button><button type="button" data-fr="gift" ${close?'':'disabled'}>ส่งของให้เพื่อน</button>${!close&&!route.length?'<button type="button" data-fr="follow">เดินไปหาอีกครั้ง</button>':''}`:`<button type="button" data-fr="use" ${close?'':'disabled'}>เข้า${e.name}</button>`;
        if($('.fr-focus nav').innerHTML!==actions)$('.fr-focus nav').innerHTML=actions;
    }
    function step(dx,dy){if(route.length)return;const from={x:Math.round(position.x),y:Math.round(position.y)},to={x:from.x+dx,y:from.y+dy},p=G.path(meetingLayout,0,6,from,to);if(p&&p.length===1){target=null;$('.fr-focus').hidden=true;position=from;route=p;wake();}}
    function use(){if(route.length)return;if(!target){const p=net.players().find(p=>Math.hypot(position.x-p.x,position.y-p.y)<2);if(p)visit('friend',p.id);else{const e=roomNodes().find(e=>e.type==='building'&&distance(e)<=1.2);if(e)visit('building',e.id);}return;}const e=entity();if(!e||distance(e)>1.2)return;if(e.type==='friend')api.friend(e.id,'wave');else api.place(e.id);}
    function mapClick(event){
        const p=event.target.closest('[data-room-peer]'),b=event.target.closest('[data-room-place]');if(p){visit('friend',p.dataset.roomPeer);return;}if(b&&b.dataset.roomPlace){visit('building',b.dataset.roomPlace);return;}
        const r=map.getBoundingClientRect(),v=map.viewBox.baseVal,to={x:Math.floor((v.x+(event.clientX-r.left)/r.width*v.width)/32),y:Math.floor((v.y+(event.clientY-r.top)/r.height*v.height)/32)},from={x:Math.round(position.x),y:Math.round(position.y)},path=G.path(meetingLayout,0,6,from,to);
        if(path){target=null;$('.fr-focus').hidden=true;position=from;route=path;wake();}
    }
    function click(event){
        const b=event.target.closest('button');if(!b||!host.contains(b))return;
        if(b.dataset.frPeer){visit('friend',b.dataset.frPeer);return;}if(b.dataset.frPlace){visit('building',b.dataset.frPlace);return;}if(b.dataset.frStep){step(...b.dataset.frStep.split(',').map(Number));return;}
        switch(b.dataset.fr){case'manage':api.manage();break;case'refresh':net.retryNow();api.refreshRoom();refresh();break;case'overview':overview=!overview;b.setAttribute('aria-pressed',String(overview));wake();break;case'close':target=null;$('.fr-focus').hidden=true;break;case'use':use();break;case'follow':if(target)visit(target.type,target.id);break;case'wave':case'farm':case'gift':{const e=entity();if(e?.type==='friend'&&!route.length&&distance(e)<=1.2)api.friend(e.id,b.dataset.fr);break;}}
    }
    root.FarmRoom=Object.freeze({start,setActive,refresh,snapshot:()=>net?net.snapshot():[0],isActive:()=>active,Network,cleanSnapshot,layout,canStand,TTL});
})(typeof window==='undefined'?globalThis:window);
