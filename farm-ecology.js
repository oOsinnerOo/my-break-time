/* Shared fishing rules: the probability shown to players is the table actually rolled. */
(function(root){
    'use strict';
    const tiers=['common','uncommon','rare','epic','legendary','mythic','immortal','cosmic'];
    const rank=r=>tiers.indexOf(r);
    function cleanState(raw,knownItem=()=>true,knownFish=()=>true){
        const a=raw&&typeof raw==='object'?raw:{};
        return {seen:Object.fromEntries(Object.keys(a.seen&&typeof a.seen==='object'?a.seen:{}).filter(k=>/^[a-zA-Z]{1,24}$/.test(k)&&knownItem(k)).map(k=>[k,true])),
            target:typeof a.target==='string'&&knownFish(a.target)?a.target:'',calm:a.calm===true};
    }
    function baitFor(state,where){
        if(state.selected==='gold'&&state.gold>0)return 'gold';
        if(state.selected==='bait'&&state.bait>0)return 'bait';
        if(where==='sea')return state.bait>0?'bait':state.gold>0?'gold':'';
        return '';
    }
    function reasons(f,c){
        const w=f.when||{},out=[],hour=c.hour;
        if(!!f.sea!==(c.where==='sea'))out.push('place');
        if(!(f.w>0))out.push('unavailable');
        if(f.secret&&!c.secrets?.[c.key])out.push('secret');
        if(w.night&&!(hour>=19||hour<5))out.push('night');
        if(w.day&&!(hour>=6&&hour<18))out.push('day');
        if(w.hour!==undefined&&hour!==w.hour)out.push('hour');
        if(w.weather&&!w.weather.includes(c.weather))out.push('weather');
        if(w.season&&w.season!==c.season)out.push('season');
        if(w.bait&&w.bait!==c.bait)out.push('bait');
        return out;
    }
    function weight(f,c){
        const rare=rank(f.r)>=rank('rare'),myth=rank(f.r)>=rank('mythic');
        const bait=myth?1:c.bait==='gold'?(rare?2.5:.4):c.bait==='bait'&&rare?1.5:1;
        return Math.max(0,f.w||0)*(f.boost&&f.boost===c.weather?3:1)*(rare?1+.15*(Number(c.rod)||0):1)*(rare&&c.beach?1.1:1)*bait*(rare?1+.1*(Number(c.skill)||0):1);
    }
    function table(fishes,c){
        const special=c.where!=='sea'&&c.hour===0&&!c.secrets?.ghostFish&&fishes.ghostFish?.w>0;
        let rows=Object.entries(fishes).map(([key,f])=>{const why=reasons(f,{...c,key});return {key,reasons:why,weight:why.length?0:weight(f,c),p:0};});
        if(special)rows=rows.map(r=>({...r,weight:r.key==='ghostFish'?1:0,reasons:r.key==='ghostFish'?[]:r.reasons}));
        const total=rows.reduce((s,r)=>s+r.weight,0);
        rows.forEach(r=>r.p=total?r.weight/total:0);
        return rows;
    }
    function choose(rows,roll=Math.random()){
        const pool=rows.filter(r=>r.p>0);
        if(!pool.length)return null;
        let x=Math.max(0,Math.min(1-Number.EPSILON,Number(roll)||0));
        for(const r of pool){x-=r.p;if(x<0)return r.key;}
        return pool[pool.length-1].key;
    }
    function timing(rod,calm,fight){
        rod=Math.max(0,Math.min(7,Math.floor(+rod)||0));
        return {bite:(calm?3000:1300)+120*rod,ms:fight?fight.ms*(calm?2:1):0,
            taps:fight?Math.max(2,fight.taps-(rod>=5?2:rod>=3?1:0)):0};
    }
    function uses(key,data){
        const out=[];
        Object.entries(data.recipes||{}).forEach(([id,r])=>{if(r.need?.[key]&&(!r.secret||data.cooked?.[id]))out.push({kind:'kitchen',name:r.name,qty:r.need[key],level:r.level||1,id});});
        Object.entries(data.machines||{}).forEach(([id,m])=>(m.recipes||[]).forEach(r=>{if(r.need?.[key])out.push({kind:'craft',name:m.name,qty:r.need[key],level:m.level||1,id,output:r.out});}));
        Object.entries(data.upgrades||{}).forEach(([id,u])=>(u.mats||[]).forEach((m,i)=>{if(m[key])out.push({kind:'upgrade',name:u.name,qty:m[key],stage:i+1,id});}));
        Object.entries(data.gear||{}).forEach(([id,u])=>(u.mats||[]).forEach((m,i)=>{if(m[key])out.push({kind:'upgrade',name:u.name,qty:m[key],stage:i+1,id});}));
        Object.entries(data.feeds||{}).forEach(([id,f])=>{if(f.fav===key||(f.also||[]).includes(key))out.push({kind:'animals',name:(f.fav===key?'ของโปรดของ':'อาหารของ')+f.name,qty:f.qty||1,level:f.level||1,id});});
        Object.entries(data.villagers||{}).forEach(([id,n])=>{if((n.favorite||[]).includes(key))out.push({kind:'villagers',name:'ของโปรดของ'+n.name,qty:1,extra:'ความสนิท +6 · วันละครั้งต่อคน',id});});
        return out;
    }
    root.FarmEcology={tiers,cleanState,baitFor,reasons,weight,table,choose,timing,uses};
    if(typeof module==='object')module.exports=root.FarmEcology;
})(typeof window==='object'?window:globalThis);
