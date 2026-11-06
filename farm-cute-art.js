/* Soft, scalable storybook artwork for ฟาร์มน้อยพักใจ. Original SVG paths;
 * the catalog and save IDs are independent of their presentation. */
(function(root){'use strict';
const C={ink:'#4b5853',green:'#78b88a',leaf:'#4d9c70',mint:'#b9dfbb',cream:'#fff5d9',pink:'#f3b7c0',coral:'#ee8e7f',gold:'#f2c775',blue:'#83bdd0',lavender:'#c6b4dc',wood:'#b98d70',soil:'#ad866c'};
const cache=new Map(),catalog=new Map();let baseDecor={},basePots={},baseHouses=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const memo=(k,f)=>{if(!cache.has(k))cache.set(k,f());return cache.get(k);};
const hash=s=>{let n=0;for(const ch of s)n=(n*31+ch.charCodeAt(0))>>>0;return n;};
const circle=(x,y,r,c,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${extra}/>`;
const oval=(x,y,rx,ry,c)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${c}"/>`;
const rect=(x,y,w,h,c,r=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`;
const path=(d,c='none',stroke='',width=1.3)=>`<path d="${d}" fill="${c}"${stroke?` stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"`:''}/>`;
const face=(x=12,y=15,s=1)=>`<g class="cute-face">${circle(x-2.5*s,y,.65*s,C.ink)+circle(x+2.5*s,y,.65*s,C.ink)+oval(x-4*s,y+1.7*s,1.3*s,.65*s,'#f5a9ab')+oval(x+4*s,y+1.7*s,1.3*s,.65*s,'#f5a9ab')+path(`M${x-1.3*s} ${y+1.6*s}q${1.3*s} ${1.8*s} ${2.6*s} 0`,'none',C.ink,.65*s)}</g>`;
const shine=(x=7,y=9)=>oval(x,y,1.1,2.5,'#ffffff99');
const leaf=(x=12,y=5)=>path(`M${x} ${y}q-1-6 6-4q-1 5-6 4`,C.leaf)+path(`M${x} ${y}q-4-4-7-1q3 4 7 1`,C.green);
const svg=(body,extra='')=>`<svg class="farm-cute-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" ${extra}>${body}</svg>`;
    const DECOR_IDS = [
        'sunflower', 'snail', 'mushroom', 'ladybug', 'lantern', 'fountain', 'rock', 'tree', 'mailbox', 'bench', 'carp', 'tractor',
        'ghost', 'web', 'candle', 'khom', 'diya', 'boat', 'village', 'museum', 'aquarium', 'vase', 'pass', 'fence', 'stones',
        'flowerbed', 'bush', 'lights', 'birdbath', 'swing', 'pond', 'chime', 'sign', 'lamppost', 'birdhouse', 'gnome', 'torii',
        'stonelantern', 'redbridge', 'bamboo', 'sala', 'jar', 'coconut', 'elephant', 'umbrellatable', 'bicycle', 'cafesign',
        'flowercart', 'beachchair', 'sandcastle', 'swimring', 'beachumbrella', 'mushroomhouse', 'flowerarch',
        'logpile', 'logbench', 'picnic', 'woodcart', 'treehouse', 'owltotem', 'minelantern', 'catstatue', 'minecart',
        'stonefountain', 'crystals', 'gemfountain', 'dino', 'geode', 'starfishsign', 'shellchime', 'coralpot',
        'pearllamp', 'lighthouse', 'shipwreck', 'bossshield', 'gardencup', 'trophy-gold', 'trophy-silver', 'trophy-bronze'
    ];
    const CROPS = [
        'carrot', 'tomato', 'corn', 'cabbage', 'chili', 'strawberry', 'pumpkin', 'watermelon', 'tangerine', 'broccoli',
        'grape', 'cherry', 'banana', 'blueberry', 'lemon', 'coconut', 'mushroom', 'pineapple', 'peach', 'avocado',
        'eggplant', 'kiwi', 'sweetPotato', 'cucumber', 'bellPepper', 'onion', 'potato', 'garlic', 'mango', 'melon',
        'apple', 'pear', 'olive', 'greenApple', 'goldLantern', 'moonFruit', 'wheat', 'coffee', 'cocoa', 'tea',
        'rainbowCorn', 'starTomato', 'dragonChili', 'crystalBerry', 'luckyClover', 'moonPumpkin', 'galaxyMelon', 'lotusGod'
    ];
    const FLOWERS = ['sunflower', 'tulip', 'rose', 'daisy', 'hibiscus'];
    const PRODUCT_GROUPS = {
        egg: ['egg', 'duckEgg', 'blackEgg', 'goldenEgg', 'jadeEgg', 'swanEgg'],
        milk: ['milk', 'chocoMilk', 'moonMilk'],
        jar: ['honey', 'wildHoney', 'jam', 'resin', 'truffleOil', 'fishSauce', 'veggieJuice', 'berryJuice', 'salt'],
        wool: ['wool', 'pinkWool', 'rainbowWool', 'cloth'],
        cheese: ['cheese', 'alpineCheese', 'goldCheese', 'butter'],
        mushroom: ['truffle', 'whiteTruffle', 'strawMushroom', 'shiitake', 'lingzhi'],
        wood: ['wood', 'plank'], stone: ['stone', 'coal', 'copperOre', 'ironOre', 'silverOre', 'goldOre'],
        gem: ['ruby', 'emerald', 'sapphire', 'diamond', 'rubyCut', 'emeraldCut', 'sapphireCut', 'diamondCut', 'seaGlass', 'pearl', 'fruitCrystal', 'planetShard'],
        bar: ['copperBar', 'ironBar', 'silverBar', 'goldBar'],
        leaf: ['lemongrass', 'galangal', 'pandan', 'bambooShoot', 'driedTea', 'seaweed'],
        shell: ['conch', 'scallop', 'giantClam'], crab: ['seaCrab'], fish: ['saltedFish', 'cannedTuna'],
        bag: ['flour', 'coffeePowder', 'wovenBasket'], chocolate: ['chocolate'], flower: ['bouquet', 'coral', 'starfish'],
        fossil: ['fSkull', 'fTooth', 'fNeck', 'fRib', 'fSpine', 'fArm', 'fLeg', 'fTail', 'feather'],
        treasure: ['fruitGold', 'fruitHeart', 'fruitRainbow', 'fruitStar', 'nestHeaven', 'crownDeep', 'nagaTrident'],
        chair: ['chair']
    };
    const FISH = ['fish', 'tropical', 'shrimp', 'crab', 'oyster', 'puffer', 'squid', 'lobster', 'octopus', 'shark',
        'dragonFish', 'giantCatfish', 'ghostFish', 'moonWhale', 'skyKoi', 'mackerel', 'tuna', 'grouper', 'barracuda',
        'jellyfish', 'mantaRay', 'swordfish', 'hammerhead', 'giantSquid', 'naga'];
    const DISHES = ['mooncake', 'salad', 'soup', 'bread', 'curry', 'omelet', 'noodle', 'sandwich', 'taco', 'honeyToast', 'fruitPunch',
        'dumpling', 'smoothie', 'pancake', 'carrotCake', 'iceCream', 'custard', 'fruitSalad', 'pumpkinPie', 'scarf', 'woolDoll',
        'pizza', 'cheeseEgg', 'cheesecake', 'grilledFish', 'sushi', 'tempura', 'tomKha', 'bambooCurry', 'stirShiitake',
        'mushroomYum', 'pandanDrink', 'pandanCake', 'lingzhiTea', 'icedCoffee', 'hotChoc', 'thaiTea', 'tomYumKung',
        'somTamPu', 'seaweedSalad', 'crabFriedRice', 'grilledTuna', 'friedMackerel', 'tunaSalad', 'herbTonic', 'farmTea'];
    const ANIMALS = ['hen', 'duck', 'cow', 'sheep', 'goat', 'pig', 'cat', 'dog', 'rabbit', 'hamster'];
    const MACHINES = ['mill', 'juicer', 'churn', 'jam', 'loom', 'oil', 'workbench', 'roaster', 'furnace', 'polisher', 'fishdryer'];
const GROUP_BY_KEY={};Object.entries(PRODUCT_GROUPS).forEach(([g,ks])=>ks.forEach(k=>GROUP_BY_KEY[k]=g));
function crop(k){
 const magic={rainbowCorn:'corn',starTomato:'tomato',dragonChili:'chili',crystalBerry:'strawberry',moonPumpkin:'pumpkin',galaxyMelon:'watermelon',lotusGod:'tulip'},original=k;k=magic[k]||k;
 let s='',f=true;
 const color={tomato:'#ef8b7d',apple:'#ee8d8e',greenApple:'#a6ce7d',tangerine:'#f2b268',peach:'#efbbc0',bellPepper:'#edb376',melon:'#bbd894',mango:'#f1c273',lemon:'#f3d67a',potato:'#c8a783',sweetPotato:'#b6889f',onion:'#d4aec2',coconut:'#b99373',pear:'#c2d281',olive:'#9dab76'};
 if(['tomato','apple','greenApple','tangerine','peach','bellPepper','melon','mango','lemon','potato','sweetPotato','onion','coconut','pear','olive'].includes(k)){
  s=path(k==='pear'?'M12 4c-4 0-3 5-6 9c-4 8 16 12 14 1c-1-4-5-5-5-8q-1-3-3-2':k==='lemon'?'M3 12Q6 3 15 5l4 3q6 7-3 12Q6 24 3 12':k==='mango'?'M14 4C4 2 1 17 9 21c11 3 17-17 5-17':k==='bellPepper'?'M7 6Q12 2 16 6q8-1 5 11q-2 7-9 4q-7 3-9-5Q1 7 7 6':k==='sweetPotato'?'M4 14Q3 6 14 6q7-5 7 2q2 10-11 13Q1 24 4 14':'M12 5C5 2 0 10 4 17c3 7 14 7 17 0C25 8 18 2 12 5',color[k])+shine(6.5,10);
  if(!['potato','sweetPotato','coconut','olive'].includes(k))s+=path('M12 6q-1-3 1-5','none','#8c725b',1.7)+leaf(13,5);
  if(k==='peach')s+=path('M12 8q-3 5 0 11','none','#cf8e9e',.8);
  if(['melon','coconut'].includes(k))s+=path('M8 7q-3 7 0 12m8-12q3 7 0 12','none',k==='melon'?'#8db576':'#917052',.9);
  if(k==='potato')s+=circle(7,16,.7,'#ab8867')+circle(16,10,.7,'#ab8867');
 }else if(k==='carrot')s=path('M7 8Q6 6 9 5h8q3 0 1 5L11 22Q9 25 8 20Z','#f3a76b')+path('M11 7Q5 1 8 1q4 0 5 5Q13-1 16 1q2 2-2 6',C.leaf)+path('M9 11h3m-2 4h2','none','#d48753',.9);
 else if(k==='corn'){s=oval(12,12,5.5,9,'#f6d888');for(let y=6;y<19;y+=3)s+=path(`M9 ${y}h6`,'none','#d9b45d',.7);s+=path('M12 23Q1 22 3 11q9 3 9 12M12 23q13-3 9-14q-7 5-9 14',C.green);}
 else if(k==='chili')s=path('M12 6C25 4 25 22 3 22q12-6 8-12Z','#e98786')+path('M12 7q0-5 6-5','none',C.leaf,2.3);
 else if(k==='banana')s=path('M4 3q-4 18 11 18q6 0 7-5q-15 5-16-13Z','#f6d984')+path('M6 3q1 14 13 15','none','#dcb65f',.8);
 else if(k==='watermelon')s=path('M2 8q10 24 20 0Z',original==='galaxyMelon'?C.lavender:'#74b78d')+path('M4 9q8 18 16 0Z',original==='galaxyMelon'?'#aa8cce':'#ed9e9f')+[[8,11],[16,11],[12,15]].map(([x,y])=>oval(x,y,.55,1,C.ink)).join('');
 else if(k==='strawberry')s=path('M12 6C-5 0 3 18 11 22q3 2 10-11q4-10-9-5','#ef9ca9')+path('M6 4l6 2l6-3l-2 5l-4-1l-5 2Z',C.green)+[[6,11],[17,11],[9,19],[14,18]].map(([x,y])=>oval(x,y,.5,.8,'#fff0c6')).join('');
 else if(k==='grape'||k==='blueberry'){
  const pts=k==='grape'?[[7,9],[15,9],[5,14],[12,14],[19,14],[8,19],[15,19],[12,22]]:[[7,10],[16,11],[11,18]];
  s=pts.map(([x,y])=>circle(x,y,k==='grape'?3.7:5,k==='grape'?'#b6a0d5':'#94acd5')+circle(x-1,y-1,1,'#ffffff66')).join('')+leaf(12,5);
 }else if(k==='cherry')s=path('M6 13q7-1 7-12q0 9 6 14','none',C.leaf,1.4)+circle(6,16,5,'#eaa0ad')+circle(18,17,5,'#ed8d9b')+leaf(14,4);
 else if(k==='pineapple')s=path('M12 6Q1 5 4 18q1 7 9 5q9-1 8-9q0-9-9-8','#efcd79')+path('M6 8l12 11M5 13l11 9M18 8L7 19M20 13l-8 9','none','#d6ae68',.8)+path('M12 9Q1 1 6 2l6 4Q9-3 13 0l1 6q10-8 8-3l-9 6',C.green);
 else if(k==='pumpkin')s=oval(7,14,5.5,8,'#eeb17e')+oval(17,14,5.5,8,'#eeb17e')+oval(12,14,6,9,original==='moonPumpkin'?'#c1c8df':'#f4c48b')+path('M12 5q-3-6 2-4','none',C.leaf,2.5);
 else if(k==='kiwi'||k==='avocado')s=oval(12,13,9,10,k==='kiwi'?'#b69e76':'#6ba27d')+oval(12,13,7.3,8.3,k==='kiwi'?'#b9ce89':'#d4e4aa')+(k==='avocado'?circle(12,16,4,'#bb9378'):circle(12,13,2.6,'#f6efc6')+Array.from({length:8},(_,i)=>oval(12+Math.cos(i*Math.PI/4)*4.5,13+Math.sin(i*Math.PI/4)*5.5,.45,.7,C.ink)).join(''));
 else if(['cucumber','eggplant'].includes(k))s=path('M12 5Q22 2 19 13q-1 9-11 9q-8-4-2-13Z',k==='eggplant'?'#ab91c3':'#8bbd91')+leaf(12,5)+shine(8,11);
 else if(k==='garlic')s=path('M10 7Q2 7 3 15q0 9 10 7q11 1 8-9q-2-6-7-6l-1-6q-4 0-3 6','#eee3e0')+path('M11 9q-5 6 0 12m3-12q5 6 1 12','none','#c8b8bc',.8);
 else if(k==='cabbage'||k==='broccoli'){
  s=rect(10,13,5,10,'#a6c98f')+[[7,12],[16,12],[12,7]].map(([x,y])=>circle(x,y,k==='cabbage'?7:5.7,k==='cabbage'?'#b4d59d':'#83b891')).join('');
  if(k==='cabbage')s+=path('M5 17q6-6 8 3M6 11q7 0 12 8M12 4q6 6 6 13','none','#8dbf86',1);
 }else if(k==='mushroom')s=rect(9,11,7,11,'#eee3c7')+path('M2 13Q2-2 13 2q10 1 10 11Z','#d9a49e')+circle(7,8,1.7,'#fff0de')+circle(16,6,2,'#fff0de');
 else if(k==='wheat'){s=path('M12 23V4','none','#b6a16d',1.4);for(let y=5;y<19;y+=4)s+=oval(9,y,2,3,'#e8ce8c')+oval(15,y+2,2,3,'#f0d995');}
 else if(k==='coffee'||k==='cocoa')s=oval(8,12,5,8,k==='coffee'?'#bd9582':'#c8ab86')+oval(16,16,5,7,'#d2b39c')+path('M9 6q-4 5-2 11m10-7q-4 4-2 10','none','#8b7062',1.1)+leaf(14,4);
 else if(k==='tea'||k==='luckyClover'){s=path('M12 23V9','none',C.leaf,1.5);for(const [x,y]of [[7,8],[17,8],[7,15],[17,15]])s+=oval(x,y,4,4.5,k==='luckyClover'?'#9bcba0':'#8cb98b');}
 else if(k==='goldLantern')s=path('M12 6C-1 3 4 17 12 23q12-11 8-16q-2-4-8-1','#f3ce78')+path('M12 7v14M5 8q7 6 14 0','none','#dfad5c',.9)+leaf(12,5);
 else if(k==='moonFruit')s=circle(12,13,9,'#d1d4ed')+path('M17 5q-10 3-3 14q-12-2-9-10q5-8 12-4','#fff4cd');
 else if(FLOWERS.includes(k)||k==='tulip'){
  s=path('M12 23V10','none',C.leaf,1.7)+path('M12 19q-8-1-7-7q7 1 7 7',C.green);
  const c=k==='rose'?'#eba5b2':k==='hibiscus'?'#eeb6cd':k==='sunflower'?'#f3d580':k==='daisy'?'#fdf4df':'#d1b7df';
  if(k==='tulip')s+=path('M5 3l4 3l3-5l3 5l4-3q3 13-7 12Q2 16 5 3',c);
  else s+=Array.from({length:6},(_,i)=>circle(12+Math.cos(i*Math.PI/3)*4,8+Math.sin(i*Math.PI/3)*4,3.8,c)).join('')+circle(12,8,3,k==='sunflower'?'#ad8d70':'#f0ce7e');f=false;
 }
 if(!s)return '';if(f&&!['wheat','tea','coffee','cocoa','banana','cherry','kiwi'].includes(k))s+=face(12,k==='carrot'?12:14,.72);
 if(magic[original])s+=path('M20 1l.8 2.2L23 4l-2.2.8L20 7l-.8-2.2L17 4l2.2-.8Z','#e2c58a')+circle(3,4,1,C.lavender);
 if(original==='rainbowCorn')s+=path('M9 7h6m-6 4h6m-6 4h6','none','#eaa0b3',1);
 return s;
}
function fish(k){
 const i=Math.max(0,FISH.indexOf(k)),colors=['#8bbdce','#efb18a','#b3a3d2','#91c5aa','#edc67e'],c=colors[i%colors.length];let s='';
 if(/shrimp|lobster|crab/i.test(k)){
  const crab=/crab/i.test(k);s=oval(12,14,crab?7:5,crab?5:7,c)+path('M6 13Q0 7 3 5m15 8q6-6 3-8M6 17l-4 3m16-3l4 3','none',c,2)+circle(3,5,2,c)+circle(21,5,2,c)+path('M8 10V7m8 3V7','none',C.ink,1)+face(12,13,.7);
 }else if(/oyster/i.test(k))s=path('M3 17Q0 7 10 4q9-5 12 8q0 9-11 9Z','#e6c4cd')+path('M5 16Q6 7 14 7q10 2 4 10Z','#fff3df')+circle(12,15,4,'#c5dcde')+shine(11,14);
 else if(/squid|octopus|jellyfish/i.test(k))s=path('M5 14Q1 1 13 2q12 0 7 12Z',c)+[5,10,15,20].map(x=>path(`M${x} 13q-3 8 0 9q4-1 1-5`,'none',c,2.3)).join('')+face(12,9,.9);
 else if(k==='mantaRay')s=path('M12 5Q1 7 1 18l10-2q1 2 2 0l10 2Q23 7 12 5',c)+path('M12 15q7 8 2 9','none',c,1.6)+face(12,10,.8);
 else if(k==='puffer')s=circle(12,13,9,'#f1d296')+path('M5 5L3 3m16 2l2-2M3 13H1m20 0h2M6 21l-2 2m14-2l2 2','none','#d5b47e',1.5)+face(12,12,1.1);
 else if(k==='naga'||k==='dragonFish')s=path('M3 7Q14-2 18 7q9 12-7 13q-10 1-6-4q2 4 9 0q7-5 0-9q-6-3-11 0',k==='naga'?'#9fc7ac':'#ebc480')+path('M2 5l1-4l3 3m6 1l4-4l1 5','none','#c8ad72',1.4)+face(7,6,.65);
 else{
  const long=['barracuda','swordfish','mackerel','tuna'].includes(k),whale=k==='moonWhale',shark=/shark|hammerhead/i.test(k);
  s=path(long?'M3 12Q10 3 19 9l4-4v14l-5-4Q9 21 3 12':'M2 12Q5 1 16 7l7-4l-1 8l1 9l-7-4Q5 24 2 12',k==='ghostFish'?'#d8d9ed':k==='skyKoi'?'#edcc8c':c)+path('M10 7l4-5l3 6',shark?'#76a9bc':c)+path('M6 16q6 4 10-1','#fff8e6')+circle(6,10,1,C.ink)+circle(5.7,9.6,.3,'#fff')+oval(6,13,1.5,.7,'#eda7a9');
  if(k==='tropical')s+=path('M10 7q-3 6 0 10m5-9q-2 4 0 8','none','#fff0d1',1.5);
  if(k==='swordfish')s+=path('M4 11L0 9','none',c,1.7);
  if(k==='hammerhead')s+=path('M4 6v11','none',c,4);
  if(k==='giantCatfish')s+=path('M4 13q-6 0-3 5m3-5q-2 7 4 6','none',C.ink,.7);
  if(whale)s+=path('M8 5V1m0 1L5 0m3 2l3-2','none','#a7cddd',.9);
  if(k==='grouper')s+=[[12,9],[15,12],[10,16]].map(([x,y])=>circle(x,y,.7,'#9b9187')).join('');
  if(['skyKoi','moonWhale','ghostFish'].includes(k))s+=path('M19 1l.7 2L22 4l-2.3.7L19 7l-.7-2.3L16 4l2.3-1Z','#f2d28e');
 }
 return s;
}
function animal(k){
 const c={cow:'#f5eee2',pig:'#eeb9c3',duck:'#efcf86',hen:'#f7ecd7',sheep:'#f5eee9',goat:'#d0c2ac',cat:'#e9bc93',dog:'#d2af8d',rabbit:'#e9d8d9',hamster:'#ddbf9d'}[k]||'#d3b9a1';
 let s=oval(12,16,9,6,c)+oval(12,10,8,7,c)+oval(7,21,2.5,1.8,c)+oval(17,21,2.5,1.8,c);
 if(k==='rabbit')s=oval(7,4,2.8,6,c)+oval(17,4,2.8,6,c)+oval(7,3,1,4,'#eab4bf')+oval(17,3,1,4,'#eab4bf')+s;
 else if(k==='cat')s=path('M4 8L3 1l7 5m4 0l7-5l-1 8',c)+s+path('M20 17q7-8 1-9','none',c,2.5);
 else if(k==='dog')s+=oval(4,9,3,5,'#b2907c')+oval(20,9,3,5,'#b2907c');
 else if(k==='pig')s+=path('M4 8Q-1 0 8 4m8 0q9-4 4 4',c)+oval(12,14,4,2.6,'#dc9ea9')+circle(10.7,14,.5,C.ink)+circle(13.3,14,.5,C.ink);
 else if(k==='hen'||k==='duck')s+=path('M10 1q-4-2-4 2q-3 0 0 4l7-2Z',k==='hen'?'#e89991':c)+path('M10 12h5l-2.5 3Z','#dda771');
 else {s+=oval(5,5,3,3,c)+oval(19,5,3,3,c);if(k==='cow')s+=oval(5,16,2,3,'#a29688')+oval(17,7,2,3,'#a29688');if(k==='sheep')s+=[6,10,15,19].map(x=>circle(x,6,3.2,'#fcf4e8')).join('');}
 s+=face(12,10,.9);return s;
}
function item(k){
 const g=GROUP_BY_KEY[k];let s='';
 if(g==='egg')s=path('M12 2C7 2 1 15 5 20q7 6 14 0q5-8-3-17q-2-2-4-1',/gold/i.test(k)?'#edd193':/jade/i.test(k)?'#b9d4bb':/black/i.test(k)?'#a2a0b4':'#f2e6c8')+shine(7,12)+face(12,14,.8);
 else if(g==='milk'||g==='jar'){
  const c=/milk/i.test(k)?/choco/i.test(k)?'#b79c89':'#fff3d9':/jam|berry/i.test(k)?'#dba8ba':k==='salt'?'#e8eddf':/Tea|seaweed/i.test(k)?'#aec7a2':'#edc98e';
  s=rect(6,4,12,18,'#c6e0df',3)+rect(7,10,10,11,c,2)+rect(7,1,10,4,'#bca68c',1.5)+rect(8,11,8,7,'#fff7e5',2)+face(12,14,.6)+path('M8 6v3','none','#fff',1.4);
 }else if(g==='wool')s=oval(12,13,10,9,k==='pinkWool'?'#e8b4c7':k==='rainbowWool'?'#d6c0de':'#eddfcf')+path('M3 11q10 10 17 1M5 6q12 11 12 14M10 4q5 8-2 16','none','#c3aab8',1)+face(12,12,.8);
 else if(g==='cheese')s=path('M3 10L18 4l4 9v8H3Z',k==='butter'?'#f6e6af':'#f0cf8b')+path('M3 10h19','none','#dab776',1)+circle(8,16,2,'#dcb474')+circle(18,17,1.5,'#dcb474')+face(14,13,.65);
 else if(g==='mushroom')s=rect(9,11,7,11,'#f4e5ca')+path('M2 13Q0 0 12 2q13-1 11 11Z',k==='lingzhi'?'#cc9e8c':k==='whiteTruffle'?'#e5d3b2':'#bb9a83')+shine(6,8)+face(12,16,.7);
 else if(g==='wood')s=rect(2,6,20,6,'#c6a181',2)+rect(3,14,19,6,'#b99277',2)+path('M5 9h12m-9 8h10','none','#a57f66',1)+oval(3,9,2,3,'#e1c59c');
 else if(g==='stone')s=path('M2 17L5 6q7-7 13 0l4 11q-6 8-20 0',k==='coal'?'#8b8c9b':'#adb6bc')+path('M5 7l7-3l-2 8Z','#d7dee0')+(/Ore/.test(k)?circle(9,13,2,/gold/i.test(k)?'#efd594':/copper/i.test(k)?'#dca891':'#d0dfe0')+circle(16,15,2.7,/gold/i.test(k)?'#efd594':'#c8d8df'):'');
 else if(g==='gem'||g==='bar'){
  const c=/ruby/i.test(k)?'#e6a1ad':/emerald/i.test(k)?'#8cc9b2':/sapphire/i.test(k)?'#91b5d4':/gold|fruitCrystal/i.test(k)?'#edd393':'#bcdfdf';
  s=k==='pearl'?circle(12,13,9,'#dae6e0')+shine(8,9):g==='bar'?path('M5 7h13l5 12H1Z',c)+path('M5 7l2 8h13','none','#fff5dd',1.2):path('M5 3h14l4 7l-11 13L1 10Z',c)+path('M5 3l3 7l4 13l4-13l3-7M1 10h22','none','#ffffff88',.9);s+=shine(6,8);
 }else if(g==='leaf')s=path('M5 21Q-3 3 17 4q9 16-12 17',k==='galangal'?'#dbbc9d':k==='seaweed'?'#83b5a4':'#9ac69e')+path('M7 19L15 7m-6 9l-2-6m5 3l6-1','none','#669f7a',1);
 else if(g==='shell')s=path('M3 19Q-2 5 12 3q15 2 9 16Z','#e9c7cb')+path('M4 18h16M6 7l6 12l6-12M12 4v14','none','#cba3b6',.9)+shine(5,10);
 else if(g==='crab')s=fish('crab');
 else if(g==='fish')s=fish(k==='saltedFish'?'mackerel':'tuna')+(k==='cannedTuna'?rect(3,15,18,7,'#adc6cf',2):'');
 else if(g==='bag')s=path('M6 4q6 3 12 0l-2 4q9 15-4 15Q-1 23 8 8Z','#e9d6ad')+rect(6,5,12,2,'#b89979',1)+crop(k==='coffeePowder'?'coffee':'wheat').replaceAll('cute-face','cute-small-face');
 else if(g==='chocolate')s=rect(3,3,18,19,'#ab8a7d',3)+rect(4,14,16,7,'#e4b4c5',2)+[6,11,16].map(x=>rect(x,5,3,6,'#c7a28c',1)).join('');
 else if(g==='flower')s=k==='starfish'?path('M12 1l3 7l8 1l-6 5l2 8l-7-4l-7 4l2-8l-6-5l8-1Z','#e9c29c')+face(12,12,.8):k==='coral'?path('M12 23V8m0 10Q2 16 3 9m9 7q9-1 9-9m-9 6Q7 12 7 3','none','#e5a9ad',3.5):crop('rose')+crop('daisy');
 else if(g==='fossil')s=k==='feather'?path('M5 22Q0-1 18 2q10 13-13 20','#d3c8d8')+path('M5 22L17 5m-9 12V9m4 5h6','none','#aaa0b4',1):path('M4 5q-5-1-3 4q0 4 4 2l11 8q-1 5 3 4q5 0 3-4q4-4 0-6q-3-1-4 1L8 7q2-5-2-5q-4-1-2 3','#e6dac5')+path('M7 9l10 7','none','#c1ae94',1.2);
 else if(g==='treasure')s=path('M2 6l6 5l4-9l4 9l6-5l-2 15H4Z','#edcf89')+circle(12,16,2.5,k==='fruitHeart'?'#e6a7b7':k==='fruitRainbow'?'#b5acd6':'#9dc5ca')+shine(5,14);
 else if(g==='chair')s=rect(5,2,14,10,'#c9a68d',3)+rect(4,12,16,4,'#d9b79a',2)+path('M6 16v7m12-7v7','none','#a48672',2);
 return s;
}
function dish(k){
 let s='';const drink=/Drink|Tea|Coffee|Choc|Punch|smoothie|Tonic|Juice/.test(k),baked=/bread|Toast|pancake|Cake|cake|Pie|pizza|sandwich/.test(k);
 if(k==='scarf')return path('M3 4q9 4 17 0v7q-8 3-17 0Z',C.pink)+rect(13,10,6,12,'#d994ad',2)+path('M15 20v3m3-3v3','none','#b7809e',.8);
 if(k==='woolDoll')return animal('hamster');
 if(drink)s=path('M5 5h14l-2 17H7Z',/Coffee|Choc/.test(k)?'#c1a192':/Tea|tea/.test(k)?'#dfbb88':'#e9b7c5')+path('M15 1l-3 14','none','#8eabb2',1.3)+rect(4,4,16,3,'#e6dec9',1.5)+face(12,13,.8)+shine(8,10);
 else if(baked){s=oval(12,20,11,3,'#c2d9d7');if(k==='pizza')s=path('M3 19L11 2l12 15Z','#f2d597')+path('M3 19q10 5 20-2','none','#ccaa7c',2)+circle(12,12,2,'#d69b91')+circle(17,16,1.6,'#d69b91');else if(/Cake|cake/.test(k))s+=rect(4,8,16,12,'#dfb68f',2)+rect(4,5,16,5,'#fff0d7',2)+circle(12,4,2,'#dfa2ac');else s+=path('M4 10Q0 2 9 3q3-2 7 0q9 0 4 8v9H4Z','#e3c298')+path('M7 10v7m10-7v7','none','#c49d77',1);s+=face(12,13,.7);}
 else if(k==='sushi')s=rect(3,9,18,12,'#6f9c89',4)+oval(12,10,9,5,'#f8edd7')+oval(12,10,5,3,'#e6ab9d')+path('M8 10h8','none','#f7d39d',1.7);
 else if(k==='iceCream')s=path('M6 12l6 11l6-11Z','#e0bf91')+circle(8,10,5,'#e9bccb')+circle(16,10,5,'#c1d1a9')+circle(12,5,4,'#f8e7bd')+face(12,11,.7);
 else if(/grilled|friedMackerel|tempura/i.test(k))s=oval(12,15,11,7,'#d6e4df')+fish('fish')+leaf(19,19);
 else s=path('M2 11h20q0 12-10 12Q2 23 2 11','#bdd7d8')+oval(12,11,10,4,'#f0d4a5')+[[7,10],[12,11],[17,9]].map(([x,y],i)=>circle(x,y,2,['#b3cca0','#e4b49d','#f6e4ac'][i])).join('')+face(12,16,.8);
 return s;
}
function icon(k,fallback=''){
 k=String(k).split('~')[0];if(k.startsWith('seed:'))k=k.slice(5);
 return memo('icon:'+k,()=>{
  const baby=catalog.has(k)&&/^bb(Hen|Duck|Cow|Sheep|Goat|Pig)/.exec(k);
  const body=baby?animal(baby[1].toLowerCase())+path('M18 2q-5-4-5 1q0 3 5 5q7-5 3-7q-2-1-3 1','#e7b6c5'):CROPS.includes(k)||FLOWERS.includes(k)?crop(k):FISH.includes(k)?fish(k):ANIMALS.includes(k)?animal(k):GROUP_BY_KEY[k]?item(k):DISHES.includes(k)?dish(k):catalog.has(k)?dish(k):'';
  return body?svg(body):'';
 })||fallback;
}
function machine(k,fallback=''){
 if(!MACHINES.includes(k)&&!catalog.get(k)?.recipes)return fallback;
 return memo('machine:'+k,()=>{
  const i=MACHINES.indexOf(k),c=['#a8cdb9','#a7c7d8','#d3bfdb','#e8c4b2'][Math.abs(i)%4];
  let s=rect(2,19,20,4,'#bdac96',1.7)+rect(4,5,16,16,c,3)+rect(3,3,18,4,'#dfd9ba',2)+circle(12,13,5,'#fff6dc')+circle(12,13,3.2,'#b5c9bd');
  if(k==='workbench')s=rect(1,10,22,4,'#c4a58b',2)+rect(3,13,3,10,'#aa8b75',1)+rect(18,13,3,10,'#aa8b75',1)+path('M7 2l6 7m-3-7l5 3','none','#93aeba',2.5);
  if(k==='furnace'||k==='roaster')s+=path('M9 16q-1-4 3-7q5 7 2 8Z','#eab78b');
  if(k==='loom')s+=path('M7 6v13m3-13v13m4-13v13m3-13v13','none','#dfb2bd',1.2);
  if(k==='juicer')s+=path('M10 1q2-3 5 0v4h-5Z','#c4d9b2');
  return svg(s);
 });
}
function ui(k,fallback=''){
 const alias={animals:'hen',flower:'daisy',lotus:'lotusGod',wood:'wood',stone:'stone',gem:'diamond',shell:'conch',bone:'fSkull',wheat:'wheat',pumpkin:'pumpkin',dog:'dog',cat:'cat',rabbit:'rabbit',bear:'hamster',mushroom:'mushroom',leaf:'tea',fish:'fish'};
 if(alias[k])return icon(alias[k]);if(k==='craft')return machine('workbench');
 return memo('ui:'+k,()=>{
  let s='';const stroke=d=>path(d,'none',C.ink,1.7);
  if(k==='forest'||k==='tree')s=path('M12 2L3 13h5l-4 5h16l-4-5h5Z',C.green)+rect(10,18,4,5,'#b18c70',1)+circle(8,14,1.5,'#cfe0a9');
  else if(k==='heart')s=path('M12 22C-5 12 1-3 12 6C23-3 29 12 12 22','#e8a9b6')+shine(5,8);
  else if(k==='coin')s=circle(12,12,10,'#e7c88c')+circle(12,12,7.4,'#f8de9e')+stroke('M12 7v10m-3-7q3-5 6 0q0 2-3 2q-4 0-3 3q3 4 6 0');
  else if(k==='energy')s=path('M13 1L3 14h8l-1 9l11-14h-8Z','#f0c879');
  else if(k==='star'||k==='sparkle')s=path('M12 1l3.5 7l7.5 1L18 15l1 8l-7-4l-7 4l1-8L1 9l7.5-1Z','#ebce8a')+(k==='star'?face(12,12,.7):'');
  else if(k==='water')s=path('M12 1C8 8-4 17 5 22q7 5 14-1q8-7-7-20','#91c6d7')+shine(7,15)+face(12,16,.7);
  else if(k==='pond')s=path('M2 23L16 3','none','#b69278',2.5)+path('M16 3q8 0 6 15q-1 4-5 2','none','#8eaeb8',1.1)+rect(17,15,4,6,'#dfa199',2);
  else if(['auction','hammer','pickaxe','axe','wrench'].includes(k))s=path('M6 22L17 5','none','#b4957c',3)+path(k==='pickaxe'?'M7 5Q16-1 23 9L16 6Z':k==='wrench'?'M15 3q-6 4 0 8q7 1 7-6l-4 3l-2-2l2-4Z':'M11 2l10 6l-4 6l-10-6Z','#9cb7c4');
  else if(['house','barn','stall','museum','kitchen'].includes(k))s=rect(4,10,16,13,'#e8d3af',3)+path('M1 11L12 1l11 10Z',k==='kitchen'?'#dfb2aa':'#a9c7b5')+rect(9,15,6,8,'#b79c85',2)+rect(5,13,3,4,'#add2da',1);
  else if(k==='sea'||k==='boat')s=k==='sea'?path('M1 15q4-6 8 0t8 0t8 0v9H0Z','#9bc9d7')+path('M3 10Q12-5 22 10Z','#ecc2be')+stroke('M12 3v17'):path('M2 15h20q-2 9-10 8Q4 24 2 15','#c6a98e')+path('M12 2v13H3Z','#bbd3db')+path('M14 4l7 10h-7Z','#e6b7b3');
  else if(['farmer','person','chef','friends','ninja'].includes(k))s=circle(12,8,5,'#e9c7ad')+path('M3 23q0-12 9-10q9-2 9 10Z',k==='chef'?'#f6edda':'#a9c8c0')+face(12,8,.65)+(k==='farmer'?oval(12,4,10,2,'#dfc191')+rect(7,0,10,4,'#edcf98',2):'');
  else if(k==='lock')s=path('M6 10V7q0-11 12 0v3','none','#9db2b0',2.5)+rect(3,9,18,14,'#e0cda7',4)+circle(12,15,2,'#8b9e9b')+rect(11,15,2,5,'#8b9e9b',1);
  else if(k==='check')s=circle(12,12,10,'#b8d8bc')+path('M6 12l4 4l8-8','none','#4e8a6c',2);
  else if(k==='close')s=circle(12,12,10,'#edc6c8')+stroke('M8 8l8 8m0-8l-8 8');
  else if(k==='skills')s=circle(12,13,9,'#e6bac4')+circle(12,13,6,'#fff0d8')+circle(12,13,2.5,'#e6bac4')+path('M12 13L21 3m-1 1V1m0 3h3','none','#8eaeac',1.6);
  else if(k==='refresh')s=path('M20 7A9 9 0 1 0 21 15','none','#80ac9c',2.5)+path('M21 2v7h-7Z','#80ac9c');
  else if(['next','play','up','back','plus'].includes(k))s=circle(12,12,10,'#c5dace')+stroke(k==='plus'?'M6 12h12m-6-6v12':k==='up'?'M6 14l6-6l6 6':k==='back'?'M16 6l-7 6l7 6':'M8 6l7 6l-7 6');
  else if(['help','info','warning'].includes(k))s=(k==='warning'?path('M12 2L1 22h22Z','#f1d69a'):circle(12,12,10,'#c8d8e1'))+stroke(k==='help'?'M8 8q3-5 7-1q2 3-3 5v3':k==='info'?'M12 11v7':'M12 8v7')+circle(12,k==='info'?7:18,1,C.ink);
  else if(['book','quest','orders','pass','ticket','calendar','note','map'].includes(k))s=rect(3,2,18,21,k==='book'?'#c5bfda':'#e4d4b5',3)+rect(6,3,14,18,'#fff7e4',2)+stroke(k==='map'?'M8 8l3-2l3 6l4-2':'M9 8h8m-8 4h8m-8 4h5')+(k==='orders'?rect(8,1,8,3,'#aec8b8',1):'');
  else if(['clock','hourglass'].includes(k))s=circle(12,12,10,'#e0d5c0')+circle(12,12,8,'#fff4d8')+stroke('M12 6v7l4 2');
  else if(k==='sun')s=circle(12,12,6,'#f1d28a')+path('M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12l2 2M4 20l2-2M18 6l2-2','none','#e2bd76',1.6);
  else if(k==='moon')s=path('M18 2Q5 4 10 16q3 6 10 2Q8 28 2 16Q-3 3 12 1Z','#e8d69c');
  else if(['cloud','rain','storm','snow','wind','wave'].includes(k))s=path('M3 15Q-1 9 6 8Q10-2 17 6q10 0 6 9Z','#c2d5dc')+(k==='cloud'?'':path(k==='wind'?'M3 19h14m-12 4h16':k==='storm'?'M13 14l-4 5h4l-2 5l7-7h-5Z':'M6 18l-2 4m9-4l-2 4m9-4l-2 4','none','#8cb8ce',1.8));
  else if(['bag','basket','chest','gift'].includes(k))s=rect(3,8,18,15,k==='gift'?'#e7b9c4':'#d6bb94',4)+path('M7 8q-1-10 5-5q7-5 5 5','none','#ac947c',1.5)+(k==='gift'?rect(10,8,4,15,'#f6e2b9',1):path('M7 13h10m-10 4h10','none','#b49b7c',.8));
  else if(['trophy','medal','crown'].includes(k))s=path('M5 3h14q1 12-7 12Q4 15 5 3','#ebcd8d')+path('M5 5Q-2 4 2 10l5 2m12-7q7-1 3 5l-5 2','none','#d9b980',1.6)+rect(10,14,4,5,'#d2b586',1)+rect(6,19,12,4,'#e9cc96',1);
  else if(k==='leaf'||k==='sprout')s=path('M12 23V10','none',C.leaf,1.8)+path('M12 13Q1 12 2 4q11-1 10 9M12 10q1-11 10-8q1 9-10 8',C.green);
  else if(k==='ladder')s=path('M6 2v21m12-21v21M6 6h12M6 12h12M6 18h12','none','#bda17d',2.2);
  else if(k==='pest'||k==='wormUp'||k==='compost')s=path('M4 21q-3-9 5-10q-3-13 7-10q8 3 3 14q-1 8-15 6','#adc79f')+face(14,5,.7);
  else if(k==='bee')s=oval(8,6,5,4,'#d1e3de')+oval(16,6,5,4,'#d1e3de')+oval(12,14,8,6,'#ead18e')+path('M10 9v10m5-10v10','none','#b3a085',2)+face(12,13,.7);
  else if(k==='bandage')s=path('M1 9L9 1l14 14l-8 8Z','#f2debc')+rect(7,7,10,10,'#fff2d3',2)+path('M12 9v6m-3-3h6','none','#ddaaa9',1.5);
  else if(k==='rope')s=path('M15 22Q0 15 4 6q3-7 13-3q9 7-2 13q-10 3-9-6q0-7 9-4q4 4-1 6','none','#c7ad88',2.8);
  else if(k==='gloves')s=path('M5 21L2 12q0-5 3-1V4q2-3 4 0V2q3-3 4 0v2q3-4 4 1v2q3-3 4 1v9q0 7-16 4','#cbb8a5')+path('M6 18h12','none','#ebd9bb',1.8);
  else if(k==='lamp')s=path('M8 5q0-7 8 0','none','#a59480',1.5)+rect(5,6,14,16,'#c2cfbd',3)+rect(8,9,8,10,'#fae5a9',2)+rect(4,20,16,3,'#a8b9a4',1.5);
  else if(k==='tidechart')s=path('M1 4l7-2l8 3l7-2v17l-7 2l-8-3l-7 2Z','#d8e4c3')+path('M4 12q4-6 8 0t8 0','none','#97becb',2)+path('M8 3v16m8-14v16','none','#b7c9a2',.7);
  else if(['chat','mail','link','chart','search','camera','phone','computer','gear','shield','sword','palette','puzzle','dna','rainbow','fire','candle','hat','smile','sleep','sad','surprise','fountain','slots','restroom','lantern','balloon','krathong','snowman','flag','key','scarecrow','fertilizer','potion','snake','trap','bat','ghost','candy','dragon'].includes(k)){
   const colors=['#b6d5cb','#d9c3e2','#edd7af','#b9d6e2','#edc2c6'];s=rect(2,2,20,20,colors[hash(k)%5],6);
   const shapes={chat:'M6 7h12v8H12l-5 4v-4H6Z',mail:'M5 7h14v11H5Zm0 0l7 6l7-6',link:'M9 15l6-6M10 7l2-2q6-3 7 3q1 2-3 5M14 17l-2 2q-6 3-7-3q-1-2 3-5',chart:'M6 18v-5m6 5V6m6 12V9',search:'M15 15l5 5M17 10a7 7 0 1 0-14 0a7 7 0 1 0 14 0',gear:'M12 5v3m0 8v3M5 12h3m8 0h3M7 7l2 2m6 6l2 2M7 17l2-2m6-6l2-2',shield:'M12 4l7 3q1 11-7 14q-8-3-7-14Z',sword:'M7 17L18 4l2 2L9 19M5 15l6 6',key:'M13 11l7 8m-4-4l-2 2M13 8a4 4 0 1 0-8 0a4 4 0 1 0 8 0',hat:'M4 16h16M7 16V8q5-7 10 0v8',camera:'M5 8h14v11H5Zm5-3h4v3m2 5a4 4 0 1 0-8 0a4 4 0 1 0 8 0'};
   s+=shapes[k]?stroke(shapes[k]):face(12,11,1.4)+path('M7 18h10','none','#ffffff99',1.5);
  }
  return s?svg(s):'';
 })||fallback;
}
function configure(data={}){
 for(const source of data.catalogs||[])for(const [k,v]of Object.entries(source))catalog.set(k,v);
 baseDecor=Object.fromEntries(Object.entries(data.decor||{}).map(([k,v])=>[k,v.svg]));basePots=data.pots||{};baseHouses=(data.houses||[]).slice();cache.clear();
}
function house(level=0){
 level=Math.max(0,Math.min(4,level|0));return memo('house:'+level,()=>{
  const c=['#d4b193','#dea9a3','#9cbfcd','#a4c1aa','#c4afd4'][level];
  return oval(32,60,29,3,'#afbea67a')+(level>2?rect(1,30,24,29,'#f0dfc4',3)+path('M0 32L12 18l15 14Z','#d8b1a3'):'')+rect(10,24,44,35,'#f5e8ce',4)+rect(43,7,6,16,'#b8a08c',2)+path('M3 28L29 5q3-3 6 0l26 23q2 4-2 5H5q-5 0-2-5',c)+path('M7 28L32 8l25 20','none','#ffffff77',2)+rect(27,39,11,20,'#b59a80',4)+circle(35,49,1,'#f5e4b5')+rect(13,36,10,11,'#b8d8df',3)+rect(42,36,10,11,'#b8d8df',3)+path('M18 37v9m-4-5h8m25-4v9m-4-5h8','none','#f7f0d7',1)+path('M8 59h48','none','#bcaa8d',2)+(level>0?circle(10,55,4,'#a4c39a')+circle(54,55,4,'#a4c39a')+circle(9,53,1.5,'#e7b7bd')+circle(55,53,1.5,'#edce8f'):'')+(level===4?path('M32 4V0h8l-3 3l3 3h-8','#e4b1b9'):'');
 });
}
function decor(id){
 if(baseDecor[id])return `<g class="cute-decor" stroke-linecap="round" stroke-linejoin="round">${baseDecor[id]}</g>`;
 if(!DECOR_IDS.some(k=>(k.startsWith('trophy-')?k:'decor-'+k)===id))return '';
 const k=id.replace('decor-','');
 if(k==='tree')return `<g transform="translate(0,-2) scale(.29)">${tree('classic',4).svg}</g>`;
 if(k==='bush')return oval(32,55,27,3,'#b7b99c66')+path('M6 49Q-2 31 16 31Q17 12 33 24Q47 13 51 32Q69 35 58 50Z','#9ac79f')+path('M13 44q7-8 13-6m10-9q7-2 10 4','none','#bfddad',3);
 if(k==='pond')return oval(32,45,30,16,'#a0c49c')+oval(32,44,26,12,'#a4d2dd')+path('M12 43q15 5 30 0','none','#e9f4e9',2)+circle(44,40,4,'#bdd6a4');
 return `<g transform="translate(8,8) scale(2)">${(ui(k)||icon(k)||ui('gift')).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;
}
function pot(kind='clay'){
 if(basePots[kind]?.svg)return basePots[kind].svg;
 if(kind==='ground')return oval(110,159,48,7,'#bc9d7f');
 const c={clay:'#dfb4a1',celadon:'#bad4c5',wood:'#c6aa8e',stone:'#bdc4c7'}[kind]||'#dfb4a1';
 return path('M77 143h66l-8 23H85Z',c)+rect(74,137,72,10,c,4)+oval(110,139,29,3,'#af8c74')+path('M88 151v8','none','#fff6e4',3);
}
function tree(kind='classic',stage=4,opts={}){
 stage=Math.max(0,Math.min(4,stage|0));return memo(['tree',kind,stage,opts.wilted,opts.flower].join(':'),()=>{
  const h=[15,29,54,87,125][stage]*(kind==='bonsai'?.65:1),top=145-h;
  const c=opts.wilted?'#b7aaa1':{sakura:'#e9bacb',ratchaphruek:'#e6d68b',maple:'#dea98d',pine:'#8dbbaa',mango:'#a8c78b',bonsai:'#a8c8a2'}[kind]||'#9bc995';
  let s=oval(110,145,18+stage*7,4,'#abbf9a66')+path(`M105 145Q112 ${145-h*.4} 106 ${top+h*.15}h10q-6 ${h*.6} 2 ${h*.85}Z`,'#b19279')+path(`M110 ${145-h*.3}l-${h*.2}-${h*.25}m${h*.2} ${h*.25}l${h*.23}-${h*.3}`,'none','#ad8d76',3);
  if(kind==='pine')s+=path(`M110 ${top}Q${80-stage*5} ${top+h*.2} ${80-stage*6} ${top+h*.5}h14l-18 23q34 15 68 0l-18-23h14Q135 ${top+h*.1} 110 ${top}Z`,c);
  else s+=oval(110,top+h*.35,18+stage*6,h*.36,c)+circle(88,top+h*.42,9+stage*5,c)+circle(133,top+h*.43,9+stage*5,c)+oval(98,top+h*.23,8+stage*3,h*.12,'#ffffff24');
  if(opts.flower&&!opts.wilted&&stage>1)s+=[[88,.35],[121,.23],[135,.43],[101,.48],[118,.56]].map(([x,y])=>circle(x,top+h*y,2+stage*.4,kind==='ratchaphruek'?'#fff1b3':'#f3d1d5')).join('');
  return {top,svg:`<g class="cute-tree">${s}</g>`};
 });
}
function plot(state,opts={}){
 const stage=!state.seed?-1:state.stage===0?0:state.stage>=state.need-1?2:1;
 const dry=state.soil<30;let s=oval(40,59,37,9,'#ccd7b88c')+path('M7 44Q40 36 73 44l4 12q-37 16-74 0Z',dry?'#cbb08b':'#b8957b')+oval(40,45,32,6,dry?'#dcc29b':'#c5a282');
 if(stage===0)s+=oval(40,43,4,2,'#947e66');
 if(stage===1)s+=`<g transform="translate(25,11) scale(1.25)">${ui('sprout').replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;
 if(stage===2){let body=opts.secret?ui('sprout'):state.type==='flower'?icon(state.seed):icon(state.seed);s+=`<g transform="translate(17,0) scale(1.9)">${body.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`;}
 return `<svg class="farm-cute-plot" viewBox="0 0 80 72" aria-hidden="true">${s}</svg>`;
}
function backdrop(kind='meadow',time='day',wet=false){
 const night=time==='night',sky=night?'#73839e':time==='dusk'?'#e2bdd0':time==='dawn'?'#ecd5c6':wet?'#b6ccd1':'#d1e9e0';
 let s=rect(0,0,320,200,sky,0)+(night?path('M265 12q-17 8-5 23q-26-2-20-20q6-11 25-3','#fff0cb'):circle(265,28,16,'#f7dfa1'))+path('M0 91Q65 34 143 88Q238 32 320 86v114H0Z',night?'#9db5aa':'#bed9ac')+path('M0 120Q82 70 166 116Q240 88 320 114v86H0Z',kind==='snow'?'#e9efe8':night?'#8fa89a':'#afcda0');
 if(kind==='beach')s+=path('M0 106Q133 84 320 113v87H0Z','#9bcdd6')+path('M0 145q120-40 320 2v53H0Z','#f4e1ba')+path('M0 140q120-40 320 2','none','#f7f1d9',4);
 else s+=path('M170 200Q149 155 174 105','none',kind==='snow'?'#d8ddcf':'#e3d3ad',28);
 if(kind==='pine')for(const x of [20,55,275,305])s+=`<g transform="translate(${x-40},40) scale(.55)">${tree('pine',4).svg}</g>`;
 if(kind==='flowers')for(let i=0;i<13;i++)s+=circle(i*43%320,140+i*17%57,2,['#eebcc8','#f6e4b6','#d6bddb'][i%3]);
 if(wet)for(let i=0;i<23;i++)s+=path(`M${i*43%320} ${i*37%190}l-3 9`,'none','#edf7f577',1.3);
 return s;
}
function bush(i=0){return `<svg viewBox="0 0 64 46" aria-hidden="true">${oval(32,42,28,3,'#64785f26')+path('M7 39Q-4 20 14 19Q15 2 31 11Q48-1 51 19Q70 20 59 39Z',i%3===1?'#94bf9b':'#9acb9e')+path('M13 28q3-8 13-7m11-7q8-1 9 5','none','#cce3b3',3)+(i%2?[[20,28],[43,26],[32,16]].map(([x,y])=>circle(x,y,2.3,i%4===1?'#e3acb3':'#f7e8c4')).join(''):'')}</svg>`;}
function rock(c={},floor=1,i=0){return `<svg viewBox="0 0 40 34" aria-hidden="true">${oval(20,30,17,2,'#28253333')+path('M3 22L8 8Q18-1 28 5l9 16q2 10-15 11Q2 33 3 22',floor>19?'#baa9cb':floor>9?'#a6bfca':'#b8bdc5')+path('M8 11l10-7l9 3l-8 10Z','#e3e3e3aa')+((c.hp>1||c.cracked)?path('M20 5l-4 9l7 5l-3 10','none','#85818e',1.5):'')}</svg>`;}
function sand(i=0){return `<svg viewBox="0 0 50 30" aria-hidden="true">${oval(25,25,23,3,'#c5ad7f55')+path('M4 24Q10 7 24 11Q39 8 47 24Z','#eed4a4')+path('M11 21q12-12 25-3','none','#f9e8c5',2.6)+path('M40 1l1 4l4 1l-4 1l-1 4l-1-4l-4-1l4-1Z','#fff9e8')}</svg>`;}
function scene(kind='forest'){
 let s=backdrop(kind==='beach'?'beach':'meadow');
 if(kind==='forest'){
  s+=path('M0 87Q55 76 110 88T220 88T330 86v114H0Z','#b3cfa4');
  for(const [x,st]of [[-35,4],[20,3],[225,3],[260,4]])s+=`<g transform="translate(${x},7) scale(.6)">${tree('classic',st).svg}</g>`;
  s+=path('M156 200q-35-40 3-88','none','#e5d4aa',28);
 }else if(kind==='mine')s=rect(0,0,320,150,'#dae6dd',0)+path('M-20 150Q-1 21 100 28Q161-15 228 39Q305 30 340 150Z','#b7b4bc')+path('M40 150Q65 56 134 61q78-17 139 89Z','#cfc4bd')+path('M119 150V88q0-64 82 0v62Z','#67677d')+rect(112,67,96,12,'#b79d88',4)+rect(117,77,9,73,'#baa28c',3)+rect(195,77,9,73,'#baa28c',3)+path('M146 150l10-48m28 48l-13-48M150 129h29M152 117h24','none','#a9988c',3)+circle(160,87,6,'#f9dfa1')+circle(160,87,14,'#f9dfa133')+`<g transform="translate(243,104) scale(1.5)">${item('diamond')+item('ruby')}</g>`;
 return `<svg class="${kind==='mine'?'mine-entrance':'forest-bg'}" viewBox="0 0 320 ${kind==='mine'?150:200}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`;
}
function waterscape(where='pond',night=false,wet=false){
 return memo(['water',where,night,wet].join(':'),()=>{
  const sea=where==='sea';let s=rect(0,0,320,192,night?'#7187a4':wet?'#b5ced5':'#d1e9e4',0)+(night?path('M275 12q-15 7-3 20q-25-2-18-18q7-7 21-2','#fff2d1'):circle(267,28,15,'#f8dfa5'))+path('M0 65Q53 12 122 58T240 54T330 63v129H0Z',night?'#8aa9aa':'#bad8b8')+rect(0,82,320,110,night?'#799fb7':'#a6d6dc',0);
  for(let i=0;i<12;i++)s+=path(`M${15+i*63%290} ${92+i*23%90}q12 4 24 0`,'none',night?'#b9d9df66':'#eff8ee99',1.4);
  if(!sea){s+=path('M0 70Q51 87 39 132q-8 29 20 60H0Z','#adcaa5')+path('M320 70q-30 17-21 47q8 30-18 75h39Z','#b8d4aa')+rect(0,120,104,19,'#c8ad90',4)+path('M13 123v12m18-12v12m18-12v12m18-12v12m18-12v12','none','#ae927d',1.4)+path('M17 139v24m69-24v24','none','#a78b75',5);}
  else s+=path('M31 124h101q-9 29-49 27q-40 0-52-27','#c5a68b')+path('M34 124q49 9 96 0','none','#f3e6ca',4)+path('M61 133h45','none','#ab8d77',2);
  s+=`<g transform="translate(61,65) scale(1.9)">${avatar({shirt:1,hair:0,hat:1},'right')}</g>`+path('M102 101l19-43q43-4 73 47','none','#9c8c7d',1.4);
  if(wet)for(let i=0;i<25;i++)s+=path(`M${i*37%320} ${i*31%190}l-3 8`,'none','#f0f8f4aa',1.2);
  return `<svg class="exp-water-art" viewBox="0 0 320 192" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${s}</svg>`;
 });
}
function avatar(look={},direction='down',frame=0){
 const shirts=['#b3c8e0','#a2cbb5','#e8b6c2','#e5c68f','#c7b7dc','#94c5cd'],hairs=['#9c7e68','#b79478','#7a777f','#d1b48e'];
 const c=shirts[(Number(look.shirt)||0)%6],hair=hairs[(Number(look.hair)||0)%4],up=direction==='up',dx=direction==='left'?-1:direction==='right'?1:0;
 let s=oval(12,30,8,1.5,'#81938640')+path(`M8 22l-${frame?1:0} 6m8-6l${frame?1:0} 6`,'none','#9a938e',4)+oval(7-(frame?1:0),29,3,1.5,'#817b78')+oval(17+(frame?1:0),29,3,1.5,'#817b78')+rect(5,14,14,11,c,4)+path(`M5 17q-4 ${frame?6:4} 0 7m14-7q4 ${frame?4:6} 0 7`,'none','#e5c5ad',3)+circle(12,9,7,'#ebceb4')+path('M5 9Q3 0 12 1q10-1 7 9l-4-6l-4 3l-6-1Z',hair);
 if(up)s+=circle(12,8,6.5,hair);else s+=face(12+dx*2,9,.85);
 if(Number(look.hat))s+=oval(12,4,11,2,'#dfc694')+rect(6,0,12,4,'#efd9a5',2)+path('M7 3h10','none','#c8a77d',1);
 return `<g class="cute-avatar" data-direction="${direction}" shape-rendering="geometricPrecision">${s}</g>`;
}
function festival(theme,top=25){return ['halloween','christmas','valentine','newyear','loykrathong','songkran','cny','mothersday','fathersday','okphansa'].includes(theme)?`<g transform="translate(25,${Math.max(4,top-15)}) scale(1.2)">${(ui(theme==='halloween'?'pumpkin':theme==='valentine'?'heart':'gift')).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'')}</g>`:'';}
root.FarmCuteArt=Object.freeze({palette:C,cropIds:Object.freeze(CROPS),decorIds:Object.freeze(DECOR_IDS.map(k=>k.startsWith('trophy-')?k:'decor-'+k)),configure,icon,machine,ui,decor,house,pot,tree,plot,backdrop,bush,rock,sand,scene,waterscape,avatar,festival});
})(typeof window==='undefined'?globalThis:window);
