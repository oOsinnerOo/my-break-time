/* Living villagers, personal quests and friendships. No timers or positions are
 * saved: only completed actions, relationships and accepted jobs enter the save. */
(function(root){
    'use strict';
    const G=root.FarmSystems;
    const IDS=['chick','bunny','dadBear','momElephant','orangeCat','hedgehog','luckyCat','teddy'];
    const NPCS={
        chick:{name:'ลูกเจี๊ยบ',role:'เด็กน้อยนักสำรวจ',species:'chick',body:'#f4d477',light:'#fff0b2',coat:'#83b6a0',favorite:['carrot','corn'],work:'barn',afternoon:'board',line:'วันนี้จะเดินสำรวจให้ทั่วเลย!',close:'ถ้ามีอะไรหาย เราช่วยกันหาอีกนะ',memory:['ตอนหลงทางฉันกลัวมาก แต่เธอยอมเดินตามหากระดิ่งให้ ตั้งแต่นั้นทางกลับบ้านก็ไม่น่ากลัวแล้ว','ฉันเริ่มวาดแผนที่หมู่บ้านแล้ว ตรงฟาร์มเธอวาดเป็นรูปหัวใจไว้ด้วย']},
        bunny:{name:'กระต่าย',role:'คนดูแลสวนสมุนไพร',species:'bunny',body:'#e8d8c9',light:'#fff0dd',coat:'#b4a2c7',favorite:['carrot','soup'],work:'forest',afternoon:'pond',line:'ค่อย ๆ เดินนะ ดอกเล็ก ๆ ก็งอกอยู่ริมทาง',close:'เห็นเธอมาแล้วรู้สึกเหมือนได้พักใต้ต้นไม้เลย',memory:['ฉันเคยรีบทำสวนจนลืมดูแลตัวเอง เธอทำให้รู้ว่ารับความช่วยเหลือจากคนอื่นบ้างก็ได้','สวนสมุนไพรโตขึ้นแล้ว ฉันเว้นมุมหนึ่งไว้ให้นั่งคุยกับเธอเสมอ']},
        dadBear:{name:'พ่อหมี',role:'ช่างซ่อมประจำหมู่บ้าน',species:'bear',body:'#bd874f',light:'#efcc8b',coat:'#7797b0',favorite:['wood','bread'],work:'craft',afternoon:'house',line:'ของเก่าถ้าซ่อมดี ๆ ก็ใช้ต่อได้อีกนาน',close:'มีเธอมาช่วย งานหนักก็เบาลงเยอะ',memory:['ค้อนด้ามนี้เป็นของพ่อฉัน ตอนหาไม่เจอเลยใจหาย ขอบใจที่ไม่มองว่าเป็นแค่ค้อนเก่า ๆ','ฉันทำม้านั่งตัวใหม่ไว้ที่บ้าน เผื่อวันไหนเธอเหนื่อยจะได้มานั่งพักด้วยกัน']},
        momElephant:{name:'แม่ช้าง',role:'คนทำขนมของหมู่บ้าน',species:'elephant',body:'#91adbf',light:'#c7dae1',coat:'#df9f9a',favorite:['wheat','bread'],work:'stall',afternoon:'barn',line:'กลิ่นขนมอบทำให้ตลาดอุ่นขึ้นได้เสมอ',close:'คราวหน้าแวะมาเล่าเรื่องฟาร์มให้ฟังด้วยนะ',memory:['ฉันเคยอบขนมไม่ขึ้นฟูจนไม่กล้าเปิดร้าน แต่ทุกคนก็ยังกินด้วยกันจนหมด ความอร่อยอาจอยู่ที่คนรอบโต๊ะด้วย','ฉันจดสูตรของเธอลงในสมุดเล่มโปรดแล้ว หน้าถัดไปยังว่างไว้ให้เราลองทำอะไรใหม่ ๆ']},
        orangeCat:{name:'แมวส้ม',role:'นักตกปลาขี้เซา',species:'cat',body:'#dc9954',light:'#ffe1ab',coat:'#789eae',favorite:['fish','milk'],work:'pond',afternoon:'forest',line:'เงียบไว้หน่อย... ปลากำลังจะหลับเหมือนฉัน',close:'แบ่งที่นั่งริมบ่อไว้ให้แล้ว มานั่งด้วยกันสิ',memory:['ความจริงฉันมาริมบ่อเพราะชอบฟังเสียงน้ำ ต่อให้ไม่ได้ปลาเลยก็ยังเป็นวันที่ดีนะ','เมื่อก่อนฉันชอบนั่งคนเดียว ตอนนี้พอได้ยินเสียงเดินมาก็แอบหวังว่าจะเป็นเธอ']},
        hedgehog:{name:'เม่นน้อย',role:'ช่างเย็บผ้าผู้ละเอียดอ่อน',species:'hedgehog',body:'#a27765',light:'#ecd2ad',coat:'#bf9fa4',favorite:['wool','strawberry'],work:'craft',afternoon:'house',line:'เย็บทีละฝีเข็มก็กลายเป็นผ้าห่มผืนใหญ่ได้',close:'หนามฉันไม่ได้แหลมกับทุกคนหรอกนะ',memory:['ฉันไม่ค่อยกล้าขอให้ใครช่วย กลัวว่าจะทำให้เขาลำบาก แต่เธอทำให้การขอความช่วยเหลือไม่ยากเหมือนเดิม','ผ้าห่มที่เราเตรียมไว้มีคนเอามาปูนั่งดูดาวด้วยกัน ฉันดีใจที่ฝีเข็มเล็ก ๆ ทำให้ทุกคนใกล้กัน']},
        luckyCat:{name:'แมวกวัก',role:'คนจัดตลาดนัด',species:'cat',body:'#e4dbbf',light:'#fff2d1',coat:'#bf8d72',favorite:['honey','tomato'],work:'stall',afternoon:'board',line:'ตลาดที่ดีต้องมีทั้งของอร่อยและเสียงหัวเราะ',close:'วันนี้ไม่ได้จะขายอะไร แค่อยากคุยกับเธอ',memory:['ตอนเริ่มจัดตลาดมีแค่สองร้าน ฉันเกือบถอดใจ ดีที่มีคนแวะมาช่วยเหมือนที่เธอทำวันนี้','ฉันเริ่มจำได้แล้วว่าทุกคนชอบซื้ออะไร แต่ที่อยากจำที่สุดคือเรื่องเล่าของคนที่แวะมาหา']},
        teddy:{name:'หมีเท็ดดี้',role:'คนจัดงานเล็ก ๆ ของหมู่บ้าน',species:'bear',body:'#cda484',light:'#f3dec1',coat:'#bd94b1',favorite:['bouquet','strawberry'],work:'board',afternoon:'pond',line:'แค่มีคนมานั่งด้วยกัน วันธรรมดาก็เป็นวันพิเศษ',close:'งานครั้งหน้ามีที่ของเธอแน่นอน',memory:['ฉันกลัวว่างานที่จัดจะไม่มีใครมา แต่เธอช่วยเตรียมแม้จะยังไม่รู้ว่าจะเป็นงานใหญ่แค่ไหน','ฉันเก็บริบบิ้นเส้นแรกไว้เสมอ มันเตือนว่าความทรงจำดี ๆ เริ่มจากการช่วยกันคนละนิด']}
    };
    const visit=(place,text)=>({kind:'visit',place,text});
    const talk=(who,text)=>({kind:'talk',who,text});
    const find=(place,name,text)=>({kind:'find',place,name,text});
    const bring=(need,text)=>({kind:'bring',need,text});
    const STORIES={
        chick:{title:'เสียงกระดิ่งพากลับบ้าน',level:1,intro:'กระดิ่งที่ผูกกระเป๋าหายไปแล้ว ฉันเดินตามเสียงมันกลับบ้านทุกวัน ลองถามกระต่ายหน่อยได้ไหมว่าเห็นแถวไหน',ending:'เจอแล้ว! ต่อไปได้ยินเสียงนี้ก็จะนึกถึงวันที่เธอช่วยฉัน',reward:{coins:20,xp:15},steps:[talk('bunny','ถามกระต่ายเรื่องกระดิ่งที่หาย'),find('board','กระดิ่งของลูกเจี๊ยบ','ตามหากระดิ่งใกล้กระดานออเดอร์'),bring({carrot:2},'นำแครอท 2 หัวกลับไปหาลูกเจี๊ยบ')]},
        bunny:{title:'มุมพักใจใต้ร่มไม้',level:2,intro:'อยากเตรียมมุมพักให้คุณยาย แต่ถุงเมล็ดสมุนไพรหล่นระหว่างเดินกลับ ช่วยดูแถวทางเข้าป่าให้หน่อยนะ',ending:'เราจะวางซุปอุ่น ๆ ไว้ตรงนี้ แล้วนั่งฟังเสียงลมด้วยกัน',reward:{coins:30,xp:20},steps:[find('forest','ถุงเมล็ดสมุนไพร','หาถุงเมล็ดที่ทางเข้าป่า'),visit('pond','สำรวจมุมพักริมบ่อปลา'),bring({soup:1},'นำซุปผัก 1 ถ้วยมาหากระต่าย')]},
        dadBear:{title:'ค้อนเก่ากับงานซ่อมใหม่',level:1,intro:'ค้อนคู่ใจหายอยู่แถวโรงแปรรูป ถ้าหาเจอช่วยดูทางเข้าป่าด้วย ฉันจะเตรียมวัสดุซ่อมป้ายให้ทุกคน',ending:'ค้อนกลับมาแล้ว ป้ายใหม่ก็แข็งแรง คราวนี้ใครมาก็ไม่หลงแน่',reward:{coins:30,xp:20},steps:[find('craft','ค้อนด้ามเก่า','ตามหาค้อนข้างโรงแปรรูป'),visit('forest','ไปดูป้ายที่ทางเข้าป่า'),bring({wood:3,stone:2},'ส่งไม้ 3 ชิ้นและหิน 2 ชิ้นให้พ่อหมี')]},
        momElephant:{title:'กลิ่นขนมเช้าวันตลาด',level:3,intro:'จะทำขนมให้คนที่มาตลาด แต่ไม่แน่ใจว่าควรเตรียมมุมไหน ลองถามแมวกวักแล้วแวะดูตลาดให้ทีนะ',ending:'ขนมพร้อมแล้ว! เช้าวันตลาดจะหอมขึ้นเพราะเธอช่วยนี่แหละ',reward:{coins:35,xp:25},steps:[talk('luckyCat','คุยกับแมวกวักเรื่องมุมขายขนม'),visit('stall','สำรวจหน้าตลาดฟาร์ม'),bring({bread:1,egg:1},'ส่งขนมปัง 1 ก้อนและไข่ 1 ฟองให้แม่ช้าง')]},
        orangeCat:{title:'ทุ่นลอยที่ไม่ได้ตามปลา',level:1,intro:'ทุ่นตกปลาหายไปแถวบ่อ แต่กระต่ายน่าจะเห็นอะไรตอนเดินผ่าน ช่วยถามหน่อยสิ... ฉันจะเฝ้าปลาอยู่ตรงนี้',ending:'ได้ทุ่นคืนพร้อมมื้อเย็นแล้ว วันนี้นั่งริมบ่อด้วยกันนานหน่อยก็ได้',reward:{coins:25,xp:20},steps:[talk('bunny','ถามกระต่ายเรื่องทุ่นตกปลา'),find('pond','ทุ่นตกปลาสีแดง','ตามหาทุ่นสีแดงริมบ่อ'),bring({fish:1},'นำปลานิล 1 ตัวกลับไปหาแมวส้ม')]},
        hedgehog:{title:'ผ้าห่มก่อนลมหนาว',level:8,intro:'กล่องเข็มหายไปแล้ว พ่อหมีช่วยทำด้ามจับให้ฉันอยู่ ถามเขาแล้วลองดูข้างโรงแปรรูปได้ไหม',ending:'ผ้าห่มผืนนี้จะอุ่นกว่าทุกปี เพราะมีคนช่วยกันทำตั้งหลายคน',reward:{coins:55,xp:40},steps:[talk('dadBear','ถามพ่อหมีเรื่องกล่องเข็ม'),find('craft','กล่องเข็มของเม่นน้อย','หากล่องเข็มข้างโรงแปรรูป'),bring({cloth:1,wool:1},'ส่งผ้าทอ 1 ผืนและขนแกะ 1 ชิ้นให้เม่นน้อย')]},
        luckyCat:{title:'ป้ายชวนเดินตลาด',level:4,intro:'ป้ายตลาดหายไปจากกระดาน ลองถามแม่ช้างว่าเก็บไว้หรือเปล่า แล้วช่วยเตรียมของเลี้ยงคนมาตั้งร้านด้วยนะ',ending:'ป้ายกลับขึ้นแล้ว คราวนี้ตลาดจะมีทั้งกลิ่นขนมและเสียงคนคุยกัน',reward:{coins:40,xp:30},steps:[talk('momElephant','ถามแม่ช้างเรื่องป้ายตลาด'),find('board','ป้ายตลาดนัด','หาป้ายที่ข้างกระดานออเดอร์'),bring({honey:1,bread:1},'นำขนมปัง 1 ก้อนและน้ำผึ้ง 1 ขวดให้แมวกวัก')]},
        teddy:{title:'ริบบิ้นสำหรับวันธรรมดา',level:2,intro:'อยากจัดงานเล็ก ๆ ให้ลูกเจี๊ยบหายคิดถึงบ้าน ช่วยถามเขาว่าอยากทำอะไร แล้วหาริบบิ้นที่หล่นหน้าบ้านให้หน่อยนะ',ending:'ไม่ต้องเป็นเทศกาลใหญ่ แค่ทุกคนมาด้วยกันก็ดีที่สุดแล้ว',reward:{coins:35,xp:25},steps:[talk('chick','คุยกับลูกเจี๊ยบเรื่องงานเล็ก ๆ'),find('house','ริบบิ้นสีชมพู','หาริบบิ้นหน้าบ้านไร่'),bring({strawberry:2,bouquet:1},'ส่งสตรอว์เบอร์รี 2 ผลและช่อดอกไม้ 1 ช่อให้เท็ดดี้')]}
    };
    const JOBS={
        chick:[{title:'มื้อเล็กหลังสำรวจ',level:1,place:'board',need:{carrot:2}},{title:'เมล็ดข้าวให้เพื่อนตัวน้อย',level:2,place:'barn',need:{wheat:2}}],
        bunny:[{title:'เตรียมแปลงสมุนไพร',level:1,place:'forest',need:{carrot:2}},{title:'ผักสำหรับหม้อซุป',level:2,place:'pond',need:{tomato:2}}],
        dadBear:[{title:'ป้ายทางเข้าที่โยกคลอน',level:1,place:'forest',need:{wood:2}},{title:'ฐานโต๊ะตัวใหม่',level:1,place:'craft',need:{stone:2}}],
        momElephant:[{title:'วัตถุดิบก่อนเปิดร้าน',level:2,place:'stall',need:{wheat:3}},{title:'ขนมสำหรับคนตื่นเช้า',level:3,place:'barn',need:{egg:1}}],
        orangeCat:[{title:'มื้อเย็นริมบ่อ',level:1,place:'pond',need:{fish:1}},{title:'ตะกร้าผักของแมวส้ม',level:1,place:'stall',need:{carrot:2}}],
        hedgehog:[{title:'กล่องเก็บด้ายใบใหม่',level:1,place:'craft',need:{wood:2}},{title:'ขนแกะนุ่ม ๆ',level:6,place:'barn',need:{wool:1}}],
        luckyCat:[{title:'เตรียมตะกร้าหน้าร้าน',level:1,place:'stall',need:{carrot:2}},{title:'สีสันบนแผงขาย',level:2,place:'stall',need:{tomato:2}}],
        teddy:[{title:'ของว่างตรงม้านั่ง',level:1,place:'house',need:{carrot:2}},{title:'ผลไม้สำหรับวงคุย',level:2,place:'pond',need:{strawberry:2}}]
    };
    const obj=x=>x&&typeof x==='object'&&!Array.isArray(x)?x:{};
    const int=(x,max)=>Number.isFinite(x)?Math.min(max,Math.max(0,Math.floor(x))):0;
    const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)?x:'';
    const hash=s=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
    const dailyKey=r=>'d:'+r.who+':'+r.day+':'+r.variant;
    function cleanState(input){
        const x=obj(input),people={},stories={};
        for(const id of IDS){
            const p=obj(obj(x.people)[id]),s=obj(obj(x.stories)[id]),points=int(p.points,100);
            people[id]={points,chatDay:day(p.chatDay),giftDay:day(p.giftDay),requestDay:day(p.requestDay),memories:int(p.memories,3)&(points>=60?3:points>=20?1:0)};
            const done=s.done===true;stories[id]={started:done||s.started===true,paused:!done&&s.paused===true,step:done?STORIES[id].steps.length:int(s.step,STORIES[id].steps.length-1),done};
            if(!stories[id].started){stories[id].step=0;stories[id].paused=false;}
        }
        const seen=new Set(),requests=[];
        for(const r of (Array.isArray(x.requests)?x.requests:[]).slice(0,30)){
            if(!r||!IDS.includes(r.who)||seen.has(r.who)||!day(r.day)||!Number.isInteger(r.variant)||!JOBS[r.who][r.variant])continue;
            seen.add(r.who);requests.push({who:r.who,day:r.day,variant:r.variant,step:int(r.step,1)});if(requests.length===3)break;
        }
        let active=0;for(const id of IDS)if(stories[id].started&&!stories[id].done&&!stories[id].paused){if(++active>3-requests.length)stories[id].paused=true;}
        const validPins=IDS.map(id=>'s:'+id).concat(requests.map(dailyKey));
        return {v:1,people,stories,requests,daily:{day:day(obj(x.daily).day),n:int(obj(x.daily).n,3)},pin:validPins.includes(x.pin)?x.pin:''};
    }
    function clock(now=Date.now()){
        const minutes=((Math.floor(now/1000)%1440)+1440)%1440,hour=Math.floor(minutes/60),minute=minutes%60;
        return {hour,minute,label:String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0'),night:hour<6||hour>=21};
    }
    function routine(id,now,weather){
        const h=clock(now).hour,n=NPCS[id];
        if(weather==='rain'||weather==='storm')return {place:IDS.indexOf(id)%2?'stall':'house',action:'หลบฝนใต้ชายคา',bubble:weather==='storm'?'รอพายุเบาก่อนนะ':'ฟังเสียงฝนด้วยกันไหม'};
        if(h<6||h>=21)return {place:'house',action:'พักผ่อนหน้าบ้าน',bubble:'คืนนี้ดาวสวยจัง'};
        if(weather==='heat'&&h>=10&&h<16)return {place:'pond',action:'พักร้อนริมบ่อ',bubble:'พักในร่มกันก่อนนะ'};
        if(h>=10&&h<14)return {place:'stall',action:'แวะตลาดและคุยกับเพื่อน',bubble:'วันนี้ตลาดคึกคักจัง'};
        if(h>=18)return {place:'pond',action:'พักหลังเลิกงาน',bubble:'ทำงานเสร็จแล้ว พักกันเถอะ'};
        const place=h<10?n.work:n.afternoon;
        return {place,action:({barn:'ดูแลคอกสัตว์',forest:'ดูต้นไม้ริมทาง',pond:'นั่งเฝ้าปลา',craft:'เตรียมอุปกรณ์ทำงาน',house:'เตรียมของหน้าบ้าน',board:'ดูข่าวบนกระดาน',stall:'จัดของหน้าร้าน'})[place],bubble:n.line};
    }
    class Engine{
        constructor(api){this.api=api;}
        get state(){return this.api.read().state;}
        get today(){return this.api.read().day;}
        current(key){
            if(typeof key!=='string')return null;
            if(key.startsWith('s:')){const who=key.slice(2);if(!IDS.includes(who))return null;const s=this.state.stories[who];return {...STORIES[who],...s,key,who,kind:'story'};}
            const r=this.state.requests.find(r=>dailyKey(r)===key);if(!r)return null;const j=JOBS[r.who][r.variant];
            return {...r,key,kind:'daily',started:true,paused:false,done:false,title:j.title,level:j.level,intro:'ช่วยแวะสำรวจจุดหมาย แล้วนำของกลับมาให้ฉันหน่อยนะ',ending:'ขอบใจที่แวะมาช่วย งานวันนี้เบาลงเยอะเลย',steps:[visit(j.place,'แวะสำรวจ'+G.BUILDINGS[j.place].name),bring(j.need,'นำของกลับมาส่ง'+NPCS[r.who].name)],reward:{coins:12,xp:10}};
        }
        active(){return IDS.map(id=>this.current('s:'+id)).filter(q=>q.started&&!q.done&&!q.paused).concat(this.state.requests.map(r=>this.current(dailyKey(r))));}
        dailyCount(){return this.state.daily.day===this.today?this.state.daily.n:0;}
        offer(who){if(!IDS.includes(who))return null;const choices=JOBS[who].map((j,i)=>({...j,variant:i})).filter(j=>j.level<=this.api.read().level);return choices.length?choices[hash(this.today+who)%choices.length]:null;}
        ready(q){return !!q&&!q.done&&q.started&&!q.paused&&q.steps[q.step]?.kind==='bring'&&this.api.has(q.steps[q.step].need);}
        save(message){this.api.save();if(message)this.api.toast(message,'success');if(this.api.changed)this.api.changed();}
        fail(message){if(message)this.api.toast(message,'info');return false;}
        acceptStory(who){
            const q=this.current('s:'+who);if(!q||q.done||q.started&&!q.paused)return false;
            if(this.api.read().level<q.level)return this.fail('ภารกิจนี้เปิดเมื่อเลเวล '+q.level);
            if(this.active().length>=3)return this.fail('ติดตามพร้อมกันได้ 3 งาน พักงานในสมุดหรือส่งงานที่ค้างก่อนนะ');
            const s=this.state.stories[who];s.started=true;s.paused=false;this.state.pin=q.key;this.save('รับภารกิจ: '+q.title);return true;
        }
        acceptDaily(who){
            const j=this.offer(who);if(!j||this.state.requests.some(r=>r.who===who)||this.state.people[who].requestDay===this.today)return false;
            if(this.dailyCount()>=3)return this.fail('ส่งคำขอรายวันครบ 3 งานแล้ว พรุ่งนี้ชาวบ้านจะมีงานใหม่');
            if(this.active().length>=3)return this.fail('มีงานที่ติดตามอยู่ครบ 3 งานแล้ว');
            const r={who,day:this.today,variant:j.variant,step:0};this.state.requests.push(r);this.state.pin=dailyKey(r);this.save('รับคำขอ: '+j.title);return true;
        }
        pause(key){const q=this.current(key);if(!q||q.kind!=='story'||q.done||!q.started)return false;this.state.stories[q.who].paused=true;if(this.state.pin===key)this.state.pin='';this.save('พักงานไว้แล้ว กลับมาต่อจากขั้นเดิมได้');return true;}
        returnDaily(key){const q=this.current(key);if(!q||q.kind!=='daily')return false;this.state.requests=this.state.requests.filter(r=>dailyKey(r)!==key);if(this.state.pin===key)this.state.pin='';this.save('คืนคำขอแล้ว ไม่มีวัตถุดิบถูกหัก');return true;}
        pin(key){const q=this.current(key);if(!q||q.done||!q.started||q.paused)return false;this.state.pin=key;this.save();return true;}
        progress(kind,value){
            let changed=false;
            for(const q of this.active()){
                const step=q.steps[q.step];if(!step||step.kind!==kind||(kind==='talk'?step.who:step.place)!==value)continue;
                const live=q.kind==='story'?this.state.stories[q.who]:this.state.requests.find(r=>dailyKey(r)===q.key);live.step++;changed=true;
            }
            if(changed)this.save('ทำเป้าหมายสำเร็จแล้ว ดูขั้นต่อไปในสมุดชาวบ้าน');return changed;
        }
        talk(who){
            if(!IDS.includes(who))return false;const p=this.state.people[who];let changed=false;
            if(p.chatDay!==this.today){p.chatDay=this.today;p.points=Math.min(100,p.points+2);changed=true;}
            const advanced=this.progress('talk',who);if(changed&&!advanced)this.save();return true;
        }
        collect(key,step){
            const q=this.current(key);if(!q||q.done||q.paused||!q.started||q.step!==step||q.steps[step]?.kind!=='find')return false;
            this.state.stories[q.who].step++;this.save('พบ'+q.steps[step].name+'แล้ว!');return true;
        }
        gift(who,item){
            if(!IDS.includes(who)||!this.api.giftable(item)||!this.api.has({[item]:1}))return false;
            const p=this.state.people[who];if(p.giftDay===this.today)return this.fail('วันนี้ให้ของขวัญคนนี้แล้ว พรุ่งนี้มาใหม่ได้');
            this.api.take({[item]:1});p.giftDay=this.today;const n=NPCS[who].favorite.includes(item)?6:2;p.points=Math.min(100,p.points+n);
            this.save(NPCS[who].name+(n===6?'ชอบของชิ้นนี้มาก!':'ขอบคุณสำหรับของขวัญ')+' · ความสนิท +'+n);return true;
        }
        claim(key){
            const q=this.current(key);if(!this.ready(q))return false;
            if(q.kind==='daily'&&this.dailyCount()>=3)return this.fail('วันนี้รับรางวัลคำขอครบ 3 งานแล้ว งานนี้เก็บไว้ส่งพรุ่งนี้ได้');
            this.api.take(q.steps[q.step].need);
            if(q.kind==='story')Object.assign(this.state.stories[q.who],{done:true,paused:false,step:q.steps.length});
            else{this.state.requests=this.state.requests.filter(r=>dailyKey(r)!==key);this.state.people[q.who].requestDay=this.today;this.state.daily={day:this.today,n:this.dailyCount()+1};}
            this.state.people[q.who].points=Math.min(100,this.state.people[q.who].points+(q.kind==='story'?12:5));
            if(this.state.pin===key)this.state.pin='';
            // Persist the consumed goods and claim before reward callbacks save XP/coins.
            this.api.save();this.api.reward(q.reward);this.save(q.ending+' · '+q.reward.coins+' เหรียญ + '+q.reward.xp+' XP');return true;
        }
        memory(who,index){
            if(!IDS.includes(who)||!Number.isInteger(index)||index<0||index>1)return false;const p=this.state.people[who];
            if(p.points<[20,60][index])return false;p.memories|=1<<index;this.save();return true;
        }
    }
    class Walkers{
        constructor(){this.actors=new Map();this.signature='';this.selected='';this.revision=0;}
        sync(world,count,land,weather,now){
            const sig=JSON.stringify([world.buildings,world.decor,world.cleared,count,land]);
            this.world=world;this.count=count;this.land=land;this.weather=weather;
            if(sig!==this.signature){this.signature=sig;this.revision++;this.blocked=G.entities(world,count,land).filter(e=>!e.walk);for(const a of this.actors.values()){a.plan='';a.route=[];if(!this.can(a.x,a.y)){const p=this.destination(a.id,'house',world.pos,0);a.x=p.x;a.y=p.y;}}}
            for(const id of IDS)if(!this.actors.has(id)){const p=this.destination(id,routine(id,now,weather).place,world.pos,0);this.actors.set(id,{id,...p,dir:'down',route:[],moving:false,plan:'',next:now+3000+IDS.indexOf(id)*700});}
            this.plan(now);
        }
        can(x,y){return G.unlocked(x,y,this.land)&&!this.blocked.some(e=>G.inside(x,y,e));}
        destination(id,place,from,cycle,avoidActors=true){
            const b={...G.BUILDINGS[place],...this.world.buildings[place]},spots=[];
            for(let y=b.y-1;y<=b.y+b.h;y++)for(let x=b.x-1;x<=b.x+b.w;x++){
                if(G.inside(x,y,b)||x<b.x&&y<b.y||x<b.x&&y>=b.y+b.h||x>=b.x+b.w&&y<b.y||x>=b.x+b.w&&y>=b.y+b.h||!this.can(x,y))continue;
                spots.push({x,y});
            }
            const reserved=avoidActors?[...this.actors.values()].filter(a=>a.id!==id).map(a=>a.goal||a):[],offset=(IDS.indexOf(id)+cycle)%Math.max(1,spots.length);
            const sorted=spots.slice(offset).concat(spots.slice(0,offset)).sort((a,b)=>Number(reserved.some(p=>p.x===a.x&&p.y===a.y))-Number(reserved.some(p=>p.x===b.x&&p.y===b.y)));
            for(const p of sorted)if(G.path(this.world,this.count,this.land,{x:Math.round(from.x),y:Math.round(from.y)},p)!==null)return p;
            for(let y=1;y<G.H-1;y++)for(let x=1;x<G.W-1;x++)if(this.can(x,y)&&G.path(this.world,this.count,this.land,this.world.pos,{x,y})!==null)return {x,y};
            return {...this.world.pos};
        }
        select(id){this.selected=id||'';const a=this.actors.get(id);if(a){a.x=Math.round(a.x);a.y=Math.round(a.y);a.route=[];a.moving=false;a.next=0;}}
        plan(now){
            for(const a of this.actors.values()){
                const r=routine(a.id,now,this.weather),key=r.place+':'+r.action+':'+this.revision;
                a.action=a.id===this.selected?'รอคุยกับคุณ':r.action;a.bubble=r.bubble;
                if(a.id===this.selected)continue;
                if(a.plan===key&&(a.route.length||now<a.next))continue;
                const initial=!a.plan;a.plan=key;a.next=now+12000+hash(a.id+Math.floor(now/12000))%12000;
                const to=this.destination(a.id,r.place,a,initial?0:Math.floor(now/12000)),from={x:Math.round(a.x),y:Math.round(a.y)};
                a.goal=to;const p=G.path(this.world,this.count,this.land,from,to);a.route=p===null?[]:Math.hypot(a.x-from.x,a.y-from.y)>.01?[from,...p]:p;
            }
        }
        tick(dt,now){
            this.plan(now);let moving=false;
            for(const a of this.actors.values()){
                a.moving=false;if(a.id===this.selected||!a.route.length)continue;const p=a.route[0],dx=p.x-a.x,dy=p.y-a.y,dist=Math.hypot(dx,dy),step=Math.max(0,Math.min(.1,dt))*1.6;
                if(dist<.001){a.route.shift();continue;}
                a.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
                if(dist<=step){a.x=p.x;a.y=p.y;a.route.shift();}else{a.x+=dx/dist*step;a.y+=dy/dist*step;}
                a.moving=true;moving=true;
            }
            return moving||[...this.actors.values()].some(a=>a.route.length);
        }
        entities(){return [...this.actors.values()].map(a=>({type:'npc',id:a.id,name:NPCS[a.id].name,x:Math.round(a.x),y:Math.round(a.y),w:1,h:1,walk:true}));}
    }
    const spriteCache=new Map();
    function sprite(id,direction='down',frame=0,pose='idle'){
        if(!IDS.includes(id))return '';if(!['up','down','left','right'].includes(direction))direction='down';frame=frame?1:0;
        if(!['idle','work','rest'].includes(pose))pose='idle';const key=id+direction+frame+pose;if(spriteCache.has(key))return spriteCache.get(key);
        const n=NPCS[id],r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;let s='<ellipse cx="12" cy="30" rx="8" ry="1.5" fill="#61704e"/>';
        s+=r(6,23,5,6-frame,'#60443e')+r(14,23,5,5+frame,'#60443e')+r(5,28-frame,6,2,'#493b42')+r(14,28+frame,6,2,'#493b42');
        s+=r(5,15,15,11,'#60443e')+r(6,15,13,9,n.coat)+r(9,16,7,8,'#fff0d7')+r(10,17,5,1,n.coat)+r(3,17+frame,3,6,n.body)+r(20,17-frame,3,6,n.body);
        if(n.species==='bunny')s+=r(6,0,4,10,n.body)+r(15,0,4,10,n.body)+r(7,1,2,7,'#d99aa6')+r(16,1,2,7,'#d99aa6');
        else if(n.species==='cat')s+=r(5,3,5,7,n.body)+r(15,3,5,7,n.body)+r(6,4,2,3,'#d99aa6')+r(17,4,2,3,'#d99aa6');
        else if(n.species==='bear')s+=r(4,3,6,6,n.body)+r(15,3,6,6,n.body)+r(5,4,3,3,n.light)+r(17,4,3,3,n.light);
        else if(n.species==='elephant')s+=r(1,7,8,9,n.body)+r(17,7,7,9,n.body)+r(2,8,5,6,n.light)+r(19,8,4,6,n.light);
        else if(n.species==='hedgehog')s+=r(3,4,18,12,'#785650')+r(5,2,3,4,'#785650')+r(10,1,3,5,'#785650')+r(16,2,3,4,'#785650');
        else s+=r(10,2,5,4,'#cf9661');
        s+=r(5,6,15,11,n.body)+r(7,8,11,8,n.light)+r(7,6,10,2,n.body);
        if(direction==='up')s+=r(6,7,13,9,n.body);
        else{
            const left=direction!=='right',right=direction!=='left';if(left)s+=r(8,10,2,pose==='rest'?1:2,'#493b42');if(right)s+=r(15,10,2,pose==='rest'?1:2,'#493b42');
            s+=r(7,13,2,1,'#dc9a92')+r(17,13,2,1,'#dc9a92');
            s+=n.species==='elephant'?r(direction==='left'?7:direction==='right'?16:11,12,4,7,n.body):n.species==='chick'?r(11,12,4,2,'#cf9661'):r(11,13,3,1,'#785650');
            if(id==='luckyCat')s+=r(7,6,4,2,'#ba805e')+r(17,7,2,3,'#ba805e')+r(8,17,9,2,'#ba705e');
        }
        if(pose==='work'){
            if(id==='dadBear')s+=r(20,12-frame*3,2,11,'#80543f')+r(17,11-frame*3,7,4,'#91adbf');
            else if(id==='bunny')s+=r(19,19-frame,5,5,'#659cae')+r(17,20-frame,3,2,'#91c8cf')+(frame?r(17,24,1,2,'#91c8cf')+r(21,26,1,2,'#91c8cf'):'');
            else if(id==='orangeCat')s+=r(21,5,1,17,'#80543f')+r(22,5,1,1,'#fff0c7')+r(23,5,1,21,'#d9e3c0')+r(22,26,2,2,'#c66e69');
            else if(id==='momElephant')s+=r(2,22+frame,21,2,'#80543f')+r(4,18+frame,5,4,'#cd9860')+r(11,18+frame,5,4,'#ecc38b')+r(18,18+frame,4,4,'#cd9860');
            else if(id==='hedgehog')s+=r(17,19+frame,7,7,'#b4a2c7')+r(19,17-frame,1,9,'#e8e4ce');
            else if(id==='luckyCat')s+=r(18,17-frame,6,10,'#80543f')+r(19,18-frame,4,7,'#fff0c7')+r(20,20-frame,3,1,'#ba805e');
            else if(id==='teddy')s+=r(19,18+frame,3,3,'#d99aa6')+r(22,16+frame,2,6,'#bf7091');
            else s+=r(20,18-frame,3,7,'#e1a24e')+r(19,17-frame,5,2,'#64964e');
        }
        const out='<g shape-rendering="crispEdges">'+s+'</g>';spriteCache.set(key,out);return out;
    }

    let api,engine,bridge,host,overlay,walkers,dialogue='',book=false,bookTab='quests',lastFocus,lastObserve=0,lastSync=0,clueSignature='',clueList=[],lastNote='',markerAt=0,markers={},lastDialogHTML='',feedback='';
    const peopleDOM=new Map(),NS='http://www.w3.org/2000/svg';
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const face=(id,size=36)=>`<svg width="${size}" height="${size*32/24}" viewBox="0 0 24 32" aria-hidden="true">${sprite(id)}</svg>`;
    const labelNeed=need=>Object.entries(need).map(([k,n])=>esc(api.item(k).name)+' '+n).join(' · ');
    function start(adapter){
        if(api)return;api=adapter;engine=new Engine({...adapter,changed:refresh,toast:(message,type)=>{adapter.toast(message,type);if(type==='info'){feedback=message;render();}}});walkers=new Walkers();
        overlay=document.createElement('div');overlay.className='fv-overlay';overlay.hidden=true;
        overlay.innerHTML='<section class="fv-dialog" role="dialog" aria-modal="true" aria-labelledby="fv-title"><header><div class="fv-dialog-face"></div><div><small class="fv-subtitle"></small><h3 id="fv-title"></h3></div><button type="button" data-fv="close" aria-label="ปิดสมุดชาวบ้าน">×</button></header><div class="fv-content"></div><p class="fv-feedback" role="status"></p></section>';
        document.body.append(overlay);overlay.addEventListener('click',onClick);
        overlay.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){
            const buttons=[...overlay.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(b=>b.getClientRects().length),first=buttons[0],last=buttons.at(-1);
            if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
        }});
        if(bridge)mountUI();
        setInterval(()=>{if(!document.hidden&&bridge?.active()){lastSync=0;bridge.refresh();refresh();}},1000);
    }
    function mount(options){bridge=options;if(api)mountUI();}
    function mountUI(){
        if(host)return;host=document.createElement('div');host.className='fv-strip';
        host.innerHTML='<button type="button" data-fv="book"><span>สมุดชาวบ้าน</span><small>ภารกิจ · ความสนิท</small></button><div><span class="fv-clock"></span><span class="fv-tracked"></span></div><button type="button" data-fv="track" aria-label="ไปยังเป้าหมายภารกิจที่ติดตาม">ไปหา</button>';
        bridge.host.querySelector('.fw-under').after(host);host.addEventListener('click',onClick);syncScene(bridge.read());refresh();bridge.refresh();
    }
    function refresh(){
        if(!api)return;clueSignature='';markerAt=0;
        if(host){host.querySelector('.fv-clock').textContent='เวลาหมู่บ้าน '+clock(api.now()).label;const q=engine.current(engine.state.pin),main=api.main();host.querySelector('.fv-tracked').textContent=q&&!q.done&&!q.paused?q.title+' · '+q.steps[q.step].text:main?main.title:'แวะทักทายชาวบ้านในฟาร์ม';}
        if(!overlay.hidden)render();
    }
    function syncScene(d){
        if(!api||!bridge)return;const now=api.now();if(now-lastSync<900)return;lastSync=now;
        walkers.sync(d.world,d.plots.length,d.land,d.weather,now);
    }
    function targets(){return api&&walkers?[...walkers.entities(),...clues()]:[];}
    function select(id){if(walkers)walkers.select(id);}
    function clues(){
        if(!api||!walkers.world)return [];const quests=engine.active().filter(q=>q.steps[q.step]?.kind==='find'),signature=walkers.signature+quests.map(q=>q.key+q.step).join('|');
        if(signature===clueSignature)return clueList;clueSignature=signature;
        clueList=quests.map(q=>{const step=q.steps[q.step],p=walkers.destination(q.who,step.place,walkers.world.pos,7,false);return {type:'clue',id:q.key+'@'+q.step,key:q.key,step:q.step,name:step.name,...p,w:1,h:1,walk:true};});return clueList;
    }
    function marker(id){
        if(engine.active().some(q=>q.who===id&&engine.ready(q)))return '?';
        const main=api.main();if(main?.who===id)return api.has(main.need)?'?':'!';
        if(engine.active().some(q=>q.steps[q.step]?.kind==='talk'&&q.steps[q.step].who===id))return '…';
        const q=engine.current('s:'+id);return !q.done&&!q.started&&q.level<=api.read().level?'!':'';
    }
    function frame(dt,time,d,position,group,clueGroup){
        if(!api)return false;syncScene(d);const now=api.now(),moving=walkers.tick(dt,now);let performing=false;if(!markerAt||now-markerAt>=1000){markerAt=now;markers=Object.fromEntries(IDS.map(id=>[id,marker(id)]));}
        if(now-lastObserve>=400){lastObserve=now;for(const [id,b] of Object.entries(G.BUILDINGS)){const p=d.world.buildings[id];if(id==='sea'&&d.land<4)continue;const e={...b,...p};if(!G.inside(position.x,position.y,e)&&Math.min(...edges(e).map(p=>Math.hypot(position.x-p.x,position.y-p.y)))<.18)engine.progress('visit',id);}}
        for(const a of walkers.actors.values()){
            let el=peopleDOM.get(a.id);if(!el){const node=document.createElementNS(NS,'g');node.dataset.fwType='npc';node.dataset.fwId=a.id;node.innerHTML='<g class="fv-map-sprite"></g><rect class="fv-name-bg" x="-28" y="7" width="56" height="13" rx="2" fill="#fff0c7" stroke="#80543f"/><text class="fv-name" x="0" y="17" text-anchor="middle" font-size="9" fill="#4b3845"></text><g class="fv-marker"><rect x="-6" y="-43" width="12" height="14" rx="2" fill="#fff0c7" stroke="#80543f"/><text x="0" y="-32" text-anchor="middle" font-size="12" font-weight="bold" fill="#8b543c"></text></g><g class="fv-bubble"><rect x="-43" y="-46" width="86" height="16" rx="3" fill="#fff7dc" stroke="#80543f"/><text x="0" y="-35" text-anchor="middle" font-size="8" fill="#4b3845"></text></g>';group.append(node);el={node,sprite:node.querySelector('.fv-map-sprite'),name:node.querySelector('.fv-name'),marker:node.querySelector('.fv-marker'),bubble:node.querySelector('.fv-bubble'),art:''};peopleDOM.set(a.id,el);el.name.textContent=NPCS[a.id].name;}
            el.node.setAttribute('transform',`translate(${(a.x*32+16).toFixed(1)} ${(a.y*32+24).toFixed(1)})`);
            const rest=clock(now).night&&a.id!==walkers.selected,work=!a.moving&&!rest&&a.id!==walkers.selected&&!/พัก|หลบฝน/.test(a.action)&&(now+hash(a.id))%8000<1800,pose=rest?'rest':work?'work':'idle';performing=performing||work;
            const f=a.moving||work?Math.floor(time/(work?320:170))%2:0,key=a.dir+f+pose;if(el.art!==key){el.art=key;el.sprite.innerHTML=`<svg x="-12" y="-28" width="24" height="32" viewBox="0 0 24 32">${sprite(a.id,a.dir,f,pose)}</svg>`;}
            const badge=markers[a.id];el.marker.style.display=badge?'':'none';el.marker.querySelector('text').textContent=badge;
            const bubble=!badge&&!a.moving&&(Math.floor(now/5000)+IDS.indexOf(a.id))%8===0;el.bubble.style.display=bubble?'':'none';if(bubble)el.bubble.querySelector('text').textContent=a.id===walkers.selected?'รอคุยกับคุณ':a.bubble.slice(0,17);
        }
        const cs=clues(),sig=cs.map(c=>c.id+c.x+','+c.y).join('|');if(clueGroup.dataset.signature!==sig){clueGroup.dataset.signature=sig;clueGroup.innerHTML=cs.map(c=>`<g data-fw-type="clue" data-fw-id="${esc(c.id)}" transform="translate(${c.x*32+16} ${c.y*32+24})"><path d="M-9-11h18v14H-9z" fill="#80543f"/><path d="M-7-10H7V1H-7z" fill="#ecc38b"/><path d="M-4-15H4V-9H-4z" fill="#80543f"/><path d="M-2-13H2V-9H-2z" fill="#fff0c7"/><text x="0" y="-19" text-anchor="middle" font-size="13" fill="#fff0c7">✦</text></g>`).join('');}
        return moving||performing;
    }
    function edges(e){const a=[];for(let x=e.x;x<e.x+e.w;x++)a.push({x,y:e.y-1},{x,y:e.y+e.h});for(let y=e.y;y<e.y+e.h;y++)a.push({x:e.x-1,y},{x:e.x+e.w,y});return a;}
    function status(id){const a=walkers?.actors.get(id);return a?.action||routine(id,api.now(),api.read().weather).action;}
    function description(id){return NPCS[id].role+' · '+status(id);}
    function open(who){
        if(!api||!IDS.includes(who)||!bridge?.near('npc',who))return false;
        lastFocus=document.activeElement;dialogue=who;book=false;lastNote='';engine.talk(who);show();return true;
    }
    function openBook(){if(!api)return;lastFocus=document.activeElement;dialogue='';book=true;lastNote='';show();}
    function show(){overlay.hidden=false;lastDialogHTML='';feedback='';render();overlay.querySelector('[data-fv="close"]').focus();}
    function close(){if(!overlay)return;overlay.hidden=true;dialogue='';book=false;lastNote='';if(lastFocus?.isConnected)lastFocus.focus();}
    function render(){
        if(!api||overlay.hidden)return;const content=overlay.querySelector('.fv-content');overlay.querySelector('.fv-feedback').textContent=feedback;
        overlay.querySelector('.fv-dialog-face').innerHTML=dialogue?face(dialogue,38):'';
        overlay.querySelector('#fv-title').textContent=dialogue?NPCS[dialogue].name:'สมุดชาวบ้าน';overlay.querySelector('.fv-subtitle').textContent=dialogue?NPCS[dialogue].role:'เรื่องราวเล็ก ๆ ในฟาร์มของเรา';
        const html=dialogue?dialogueHTML(dialogue):bookHTML();if(lastDialogHTML===html)return;lastDialogHTML=html;
        const focused=overlay.contains(document.activeElement)?document.activeElement?.dataset.fv:null,scroll=content.scrollTop;content.innerHTML=html;content.scrollTop=scroll;
        if(focused)content.querySelector('[data-fv="'+focused+'"]')?.focus({preventScroll:true});
    }
    function needHTML(need){return `<div class="fv-needs">${Object.entries(need).map(([k,n])=>`<span class="${api.count(k)>=n?'is-ready':''}">${esc(api.item(k).name)} ${Math.min(api.count(k),n)}/${n}</span>`).join('')}</div>`;}
    function questHTML(q,dialog=false){
        const active=q.started&&!q.paused&&!q.done,step=q.steps[q.step],ready=engine.ready(q);
        return `<article class="fv-quest ${q.done?'is-done':''}" data-fv-quest="${esc(q.key)}"><div class="fv-quest-title"><b>${esc(q.title)}</b><small>${q.kind==='daily'?'คำขอรายวัน':'เรื่องราวส่วนตัว'} · ${esc(NPCS[q.who].name)}</small></div>${q.done?'<p>ช่วยชาวบ้านสำเร็จแล้ว</p>':`<p>${esc(!q.started?q.intro:q.paused?'พักงานไว้ · ต่อจากขั้นเดิมได้':step.text)}</p><ol>${q.steps.map((s,i)=>`<li class="${i<q.step?'is-done':i===q.step&&active?'is-now':''}">${i<q.step?'✓ ':''}${esc(s.text)}</li>`).join('')}</ol>${active&&step.kind==='bring'?needHTML(step.need):''}<small>รางวัล ${q.reward.coins} เหรียญ · ${q.reward.xp} XP · ความสนิท +${q.kind==='story'?12:5}</small><div class="fv-actions">${active?`<button type="button" data-fv="${dialog&&ready?'claim':'go'}" data-key="${esc(q.key)}">${dialog&&ready?'ส่งของและรับรางวัล':'ไปยังเป้าหมาย'}</button><button type="button" data-fv="pin" data-key="${esc(q.key)}">${engine.state.pin===q.key?'กำลังติดตาม':'ติดตาม'}</button>${q.kind==='story'?`<button type="button" data-fv="pause" data-key="${esc(q.key)}">พักงาน</button>`:`<button type="button" data-fv="return-daily" data-key="${esc(q.key)}">คืนคำขอ</button>`}`:dialog?`<button type="button" data-fv="accept" data-who="${q.who}" ${api.read().level<q.level?'disabled':''}>${api.read().level<q.level?'เปิดเลเวล '+q.level:q.paused?'ทำงานนี้ต่อ':'รับภารกิจ'}</button>`:`<button type="button" data-fv="meet" data-who="${q.who}">ไปหา${esc(NPCS[q.who].name)}</button>${q.paused?`<button type="button" data-fv="accept" data-who="${q.who}">ทำงานนี้ต่อ</button>`:''}`}</div>`}</article>`;
    }
    function mainHTML(main,dialog){
        return `<article class="fv-quest fv-main"><div class="fv-quest-title"><b>${esc(main.title)}</b><small>เนื้อเรื่องหมู่บ้าน · ${esc(NPCS[main.who]?.name||'ชาวบ้าน')}</small></div><p>${esc(main.text)}</p>${needHTML(main.need)}<small>รางวัล ${esc(main.reward)}</small><div class="fv-actions">${dialog?`<button type="button" data-fv="main" data-token="${esc(main.token)}" ${api.has(main.need)?'':'disabled'}>${api.has(main.need)?'ส่งของเนื้อเรื่อง':'รวบรวมของให้ครบก่อน'}</button>`:`<button type="button" data-fv="meet" data-who="${main.who}">เดินไปหา${esc(NPCS[main.who]?.name||'ชาวบ้าน')}</button>`}</div></article>`;
    }
    function dialogueHTML(who){
        const n=NPCS[who],p=engine.state.people[who],q=engine.current('s:'+who),main=api.main(),r=engine.state.requests.find(r=>r.who===who),offer=engine.offer(who),h=clock(api.now()).hour;
        const speech=lastNote||((api.read().weather==='rain'||api.read().weather==='storm')?'ฝนกำลังตก มายืนหลบด้วยกันก่อนนะ':p.points>=40?n.close:q.done?q.ending:h<6||h>=21?'แวะมาก่อนนอนเหรอ นั่งคุยสักหน่อยก็ได้นะ':n.line);
        const gifts=api.gifts().sort((a,b)=>Number(n.favorite.includes(b))-Number(n.favorite.includes(a))).slice(0,8);
        return `<p class="fv-speech">“${esc(speech)}”</p><div class="fv-relationship"><span>${'♥'.repeat(Math.floor(p.points/20))}${'♡'.repeat(5-Math.floor(p.points/20))}</span><small>ความสนิท ${p.points}/100 · ${p.chatDay===engine.today?'คุยกันแล้ววันนี้':'คุยกันได้ความสนิท +2 วันละครั้ง'}</small><progress value="${p.points}" max="100" aria-label="ความสนิทกับ${esc(n.name)}"></progress></div><p class="fv-routine">ตอนนี้: ${esc(status(who))} · ชอบ ${n.favorite.map(k=>esc(api.item(k).name)).join(' / ')}</p>${n.memory.map((text,i)=>p.points>=[20,60][i]?`<button type="button" class="fv-memory" data-fv="memory" data-who="${who}" data-index="${i}">${p.memories&(1<<i)?'อ่านความทรงจำอีกครั้ง':'เรื่องที่อยากเล่าให้ฟัง'} · ${i+1}</button>`:'').join('')}${main?.who===who?mainHTML(main,true):''}${questHTML(q,true)}${r?questHTML(engine.current(dailyKey(r)),true):offer&&p.requestDay!==engine.today?`<article class="fv-quest"><b>คำขอวันนี้: ${esc(offer.title)}</b><p>แวะ${G.BUILDINGS[offer.place].name} แล้วนำ ${labelNeed(offer.need)} กลับมาให้</p><small>12 เหรียญ · 10 XP · ความสนิท +5 · ส่งได้วันละ 3 งานรวมทุกคน</small><button type="button" data-fv="daily" data-who="${who}" ${engine.dailyCount()>=3?'disabled':''}>${engine.dailyCount()>=3?'ส่งคำขอครบแล้ววันนี้':'รับคำขอวันนี้'}</button></article>`:'<p class="fv-routine">คำขอวันนี้เสร็จแล้ว ขอบใจที่มาช่วยนะ</p>'}<details class="fv-gifts"><summary>ให้ของขวัญ · วันละ 1 ชิ้นต่อคน</summary>${p.giftDay===engine.today?'<p>ให้ของขวัญคนนี้แล้ววันนี้</p>':gifts.length?`<p>ของโปรด +6 ความสนิท · ของอื่น +2</p><div class="fv-actions">${gifts.map(k=>`<button type="button" data-fv="gift" data-who="${who}" data-item="${k}">ให้${esc(api.item(k).name)} ×1${n.favorite.includes(k)?' · ของโปรด':''}</button>`).join('')}</div>`:'<p>ยังไม่มีของในยุ้งฉางให้เลือก</p>'}</details>`;
    }
    function bookHTML(){
        const active=engine.active(),main=api.main(),next=IDS.find(id=>!engine.state.stories[id].done&&STORIES[id].level<=api.read().level);let html=`<nav class="fv-tabs" aria-label="สมุดชาวบ้าน"><button type="button" data-fv="tab" data-tab="quests" aria-pressed="${bookTab==='quests'}">ภารกิจ ${active.length}/3</button><button type="button" data-fv="tab" data-tab="people" aria-pressed="${bookTab==='people'}">ชาวบ้าน 8 คน</button></nav>`;
        if(bookTab==='people')return html+`<p class="fv-note">เลือกชาวบ้านเพื่อเดินเข้าไปคุย · เวลาหมู่บ้าน 1 วันเท่ากับ 24 นาทีจริง</p><div class="fv-roster">${IDS.map(id=>{const p=engine.state.people[id];return `<article><div>${face(id)}<div><b>${NPCS[id].name}</b><small>${NPCS[id].role}</small><span class="fv-hearts">${'♥'.repeat(Math.floor(p.points/20))}${'♡'.repeat(5-Math.floor(p.points/20))}</span></div></div><p>${esc(status(id))}</p><button type="button" data-fv="meet" data-who="${id}">เดินไปหา${NPCS[id].name}</button></article>`;}).join('')}</div>`;
        html+=`<p class="fv-note">ทำได้พร้อมกัน 3 งาน · พักเรื่องราวส่วนตัวแล้วกลับมาทำต่อได้ · คำขอที่รับแล้วเก็บไว้ส่งวันถัดไปได้</p><h4>กำลังทำ</h4>${active.length?active.map(q=>questHTML(q)).join(''):`<p class="fv-empty">${next?'ยังไม่มีงานที่ติดตาม ลองคุยกับ'+NPCS[next].name+'เพื่อรับเรื่องราวใหม่':'แวะคุยกับชาวบ้านหรือรับคำขอประจำวันได้เลย'}</p>`}${main?'<h4>เนื้อเรื่องหมู่บ้าน</h4>'+mainHTML(main,false):''}<details class="fv-story-list"><summary>เรื่องราวของชาวบ้าน ${IDS.filter(id=>engine.state.stories[id].done).length}/8 เรื่อง</summary>${IDS.filter(id=>!active.some(q=>q.key==='s:'+id)).map(id=>questHTML(engine.current('s:'+id))).join('')}</details><p class="fv-note">คำขอรายวันที่ส่งแล้ว ${engine.dailyCount()}/3 · คำขอ การคุย และของขวัญรีเซ็ตตามวันจริง · เปิดความทรงจำที่ 1 และ 3 หัวใจ</p>`;
        return html;
    }
    function go(key){
        const q=engine.current(key),step=q?.steps[q.step];if(!q||q.done||q.paused||!q.started||!step)return false;close();
        if(step.kind==='talk')bridge.meet(step.who);else if(step.kind==='bring')bridge.meet(q.who);else if(step.kind==='visit')bridge.go(step.place);else{const e=clues().find(c=>c.key===key);if(e)bridge.find(e.id);}
        return true;
    }
    function collect(id){const c=clues().find(c=>c.id===id);if(!c||!bridge.near('clue',id))return false;const ok=engine.collect(c.key,c.step);if(ok){clueSignature='';bridge.refresh();}return ok;}
    function onClick(event){
        if(event.target===overlay){close();return;}const b=event.target.closest('button[data-fv]');if(!b)return;
        const who=b.dataset.who,key=b.dataset.key;let changed=false;feedback='';
        switch(b.dataset.fv){
            case 'close':close();return;
            case 'book':openBook();return;
            case 'tab':bookTab=b.dataset.tab;render();return;
            case 'meet':close();bridge.meet(who);return;
            case 'go':go(key);return;
            case 'track':{const q=engine.current(engine.state.pin);if(q&&!q.done&&!q.paused){go(q.key);return;}const main=api.main();if(main)bridge.meet(main.who);else openBook();return;}
            case 'pause':changed=engine.pause(key);break;
            case 'return-daily':changed=engine.returnDaily(key);break;
            case 'pin':changed=engine.pin(key);break;
            case 'accept':if(!dialogue||bridge.near('npc',dialogue))changed=engine.acceptStory(who);break;
            case 'daily':if(dialogue===who&&bridge.near('npc',who))changed=engine.acceptDaily(who);break;
            case 'gift':if(dialogue===who&&bridge.near('npc',who)){changed=engine.gift(who,b.dataset.item);if(changed)lastNote=NPCS[who].favorite.includes(b.dataset.item)?'ชอบชิ้นนี้มากเลย ขอบใจที่จำได้นะ':'ขอบใจนะ จะเก็บไว้อย่างดีเลย';}break;
            case 'claim':{const q=engine.current(key);if(q?.who===dialogue&&bridge.near('npc',dialogue)){changed=engine.claim(key);if(changed)lastNote=q.ending;}break;}
            case 'main':if(dialogue&&bridge.near('npc',dialogue)){changed=api.deliverMain(b.dataset.token,dialogue);if(changed)lastNote='ขอบใจที่ช่วยหมู่บ้านนะ เรื่องราวต่อไปรออยู่ในสมุดแล้ว';}break;
            case 'memory':if(who===dialogue&&bridge.near('npc',who)&&engine.memory(who,Number(b.dataset.index))){lastNote=NPCS[who].memory[Number(b.dataset.index)];changed=true;}break;
        }
        if(changed){render();bridge.refresh();}
    }
    root.FarmVillagers=Object.freeze({NPCS,STORIES,JOBS,IDS,cleanState,clock,routine,Engine,Walkers,sprite,start,mount,refresh,syncScene,targets,select,frame,description,open,openBook,collect});
})(typeof window==='undefined'?globalThis:window);
