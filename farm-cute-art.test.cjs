const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),context={};vm.createContext(context);vm.runInContext(fs.readFileSync('farm-cute-art.js','utf8'),context);const A=context.FarmCuteArt;
function catalog(name){
 const start=html.indexOf('{',html.indexOf('const '+name+' = {'));assert(start>=0,name);let depth=0,quote='',escape=false;
 for(let i=start;i<html.length;i++){const ch=html[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';}
 else if("'\"`".includes(ch))quote=ch;else if(html.slice(i,i+2)==='//')i=html.indexOf('\n',i);else if(ch==='{')depth++;else if(ch==='}'&&!--depth)return vm.runInNewContext('('+html.slice(start,i+1)+')',{FOREST_LEVEL:6,MINE_LEVEL:8});}
 throw Error('Unclosed '+name);
}
const catalogs=['VEGGIES','LEGEND_VEGGIES','MYTH_VEGGIES','FOREST_CROPS','FLOWERS','FISH','FARM_PRODUCTS','RECIPES','ANIMALS','PETS','MACHINES'].map(catalog);
const valid=s=>{assert(s.length);assert(!/NaN|undefined|crispEdges|pixelated|<image|<script|<text/i.test(s));assert(s.includes('<path')||s.includes('<ellipse')||s.includes('<circle')||/<rect[^>]+rx=/.test(s));};
test('the actual crop, fish, animal, food and material catalogs all receive scalable cartoon illustrations',()=>{
 A.configure({catalogs});let count=0;for(const entries of catalogs)for(const [k,v]of Object.entries(entries)){valid(v.recipes?A.machine(k):A.icon(k));count++;}
 assert(count>180);assert.equal(A.cropIds.length,48);assert.equal(Object.keys(catalog('FISH')).length,25);
});
test('all action icons used by the game menu and travel supplies have artwork',()=>{
 const keys=[...html.matchAll(/data-cute-icon="([^"]+)"/g)].map(m=>m[1]);
 for(const k of new Set([...keys,'gloves','lamp','tidechart','bandage','rope','pest','scarecrow','wormUp']))valid(A.ui(k));
});
test('unknown items do not acquire invented catalog identities and hidden hybrids stay visually hidden',()=>{
 assert.equal(A.icon('fabricated-item'),'');assert.equal(A.icon('fabricated-item','?'),'?');
 const state={seed:'starTomato',type:'veg',soil:80,stage:4,need:4},before=JSON.stringify(state);
 assert.notEqual(A.plot(state,{secret:true}),A.plot(state,{secret:false}));assert.equal(JSON.stringify(state),before);
});
test('garden growth, house upgrades and travel scenes retain visibly distinct states',()=>{
 for(const kind of ['classic','sakura','ratchaphruek','mango','maple','pine','bonsai']){
  const states=[];for(let stage=0;stage<5;stage++){const t=A.tree(kind,stage,{flower:true});valid(t.svg);assert(t.top>=0&&t.top<170);states.push(t.svg);valid(A.tree(kind,stage,{wilted:true}).svg);}assert.equal(new Set(states).size,5);
 }
 assert.equal(new Set(Array.from({length:5},(_,i)=>A.house(i))).size,5);
 for(const kind of ['forest','mine','beach'])valid(A.scene(kind));for(const where of ['pond','sea'])for(const night of [false,true])valid(A.waterscape(where,night,true));
});
