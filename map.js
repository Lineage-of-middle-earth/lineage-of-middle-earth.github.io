/* Map of Middle-earth: a pannable, zoomable canvas. World space is 1000 x 760 units, north up. */
(()=>{
const cv=document.getElementById("mapcv");if(!cv)return;
const ctx=cv.getContext("2d"),info=document.getElementById("mapinfo"),W=1000;let H=760;
/* optional illustrated base layer (data-base on the canvas); the hand-drawn layers are the fallback */
const base=new Image();let baseOk=false;
/* where each label sits on images/middle-earth-map-2.webp (1000 wide); it replaces the hand-drawn positions when that image loads.
   An optional third value overrides the zoom a place needs, to thin out crowded spots. */
const ON_BASE={"Grey Havens":[400,147],"Hobbiton":[500,150],"Bree":[545,160],"Weathertop":[566,150],"Rivendell":[592,172],"Moria":[612,196,1],"Lothlórien":[640,200],"Dol Guldur":[690,203],
 "Thranduil's Halls":[680,96],"Erebor":[716,70],"Dale":[722,88],"Lake-town":[736,102],"Mount Gundabad":[586,60],"Carn Dûm":[556,72],"Fornost":[505,106],"Annúminas":[470,96],
 "Tharbad":[520,236],"Isengard":[592,262],"Helm's Deep":[596,284,1],"Edoras":[626,282],"Minas Tirith":[704,318],"Osgiliath":[716,312],"Minas Morgul":[728,336],"Cirith Ungol":[738,320],
 "Black Gate":[736,266],"Mount Doom":[806,302],"Barad-dûr":[842,282],"Pelargir":[668,360],"Dol Amroth":[630,374],"Umbar":[602,468],"Fangorn":[622,240],"Beorn's House":[650,165],"Amon Hen":[676,270],
 "LINDON":[412,112],"ERIADOR":[505,196],"DUNLAND":[546,238],"ENEDWAITH":[502,274],"FORODWAITH":[650,30],"ANGMAR":[540,88],"RHOVANION":[772,176],"MIRKWOOD":[696,150],"ROHAN":[666,258],
 "GONDOR":[620,340],"MORDOR":[800,342],"HARAD":[720,472],"KHAND":[870,410],"RHÛN":[910,130],"DORWINION":[836,160],"The Great Sea":[300,175],"Bay of Belfalas":[560,400],"Sea of Rhûn":[860,206]};
/* lands this illustration shows beyond the hand-drawn map */
const BASE_REGIONS=[["AMAN",130,250,"The Undying Lands in the far West, home of the Valar and the Elves who crossed the Sea. After the fall of Númenor it was taken out of the circles of the world, reachable only by the Straight Road."],
 ["NÚMENOR",395,322,"The star-shaped island raised from the sea for the Edain in the Second Age. Its kings grew proud, and it was drowned when Ar-Pharazôn sailed against the Valar."]];
if(cv.dataset.base){base.onload=()=>{baseOk=true;REGIONS.push(...BASE_REGIONS);for(const l of[PLACES,REGIONS,WATERS])for(const r of l){const p=ON_BASE[r[0]];if(p){r[1]=p[0];r[2]=p[1];if(p[2]!==undefined)r[4]=p[2]}}H=Math.round(W*base.naturalHeight/base.naturalWidth);cv.style.aspectRatio=`${base.naturalWidth}/${base.naturalHeight}`;cw=0;size()};base.src=cv.dataset.base}

const LAND=[[210,-100],[1100,-100],[1100,860],[560,860],[560,720],[540,690],[600,668],[660,675],[715,630],[650,612],[560,607],[470,587],[380,565],[330,535],[270,515],[240,490],[235,440],[255,400],[265,350],[235,325],[200,300],[170,270],[150,245],[188,215],[125,190],[100,140],[120,100],[160,70],[190,40]];
const MOUNTS=[
 [[390,40],[405,100],[420,150],[445,200],[455,250],[470,300],[480,350],[485,410]],
 [[190,90],[192,140],[200,185],[197,235],[200,290]],
 [[540,30],[620,35],[690,40],[760,45]],
 [[790,110],[840,100],[885,120]],
 [[440,472],[490,480],[540,490],[590,498],[640,494]],
 [[700,555],[705,510],[715,470],[730,442]],
 [[730,442],[780,432],[840,440],[885,470]],
 [[700,585],[760,570],[800,540],[830,510]]];
const FORESTS=[[600,170,70,60],[610,250,60,50],[570,210,50,60],[495,385,36,30],[272,243,18,14],[520,285,16,18],[600,502,16,10],[380,300,22,16]];
const RIVERS=[
 [[595,45],[565,100],[550,170],[530,205],[525,260],[520,320],[535,380],[560,420],[590,450],[620,480],[655,500],[668,545],[662,585],[656,612]],
 [[310,165],[325,215],[315,250],[280,285],[262,312],[205,300]],
 [[430,100],[400,170],[385,235],[355,300],[320,335],[262,345]],
 [[455,430],[400,442],[330,432],[262,432],[245,440]],
 [[505,415],[550,430],[600,455],[640,480]],
 [[465,262],[500,275],[527,293]],
 [[705,155],[740,200],[800,280],[815,320]],
 [[190,150],[185,190],[188,213]]];
const LAKES=[[305,150,16,9],[840,340,58,36],[705,172,10,6],[640,490,6,11]];

/* type: c city/fortress, h haven, r ruin, m mountain, p place; z = zoom needed before the label shows */
const PLACES=[
 ["Grey Havens",188,212,"h",0,"The harbour of Círdan at the head of the Gulf of Lune. From here the Ring-bearers and the last of the High Elves sailed into the West."],
 ["Hobbiton",240,228,"p",0,"A village of Hobbits in the Westfarthing of the Shire, home of Bilbo and Frodo Baggins at Bag End."],
 ["Bree",305,222,"c",0,"A town of Men and Hobbits at the crossing of the Great East Road and the Greenway. The Prancing Pony stands here."],
 ["Weathertop",356,190,"r",1,"Amon Sûl, the hill where Frodo was stabbed by the Witch-king. Once the greatest watchtower of Arnor."],
 ["Rivendell",425,196,"h",0,"Imladris, the hidden valley of Elrond Half-elven and the place where the Fellowship was formed."],
 ["Moria",455,262,"c",0,"Khazad-dûm, the great Dwarf-kingdom beneath the Misty Mountains, abandoned after the awakening of Durin's Bane."],
 ["Lothlórien",520,286,"h",0,"The golden woods of Celeborn and Galadriel, with the tree-city of Caras Galadhon."],
 ["Dol Guldur",590,268,"r",0,"The hill-fortress in southern Mirkwood, held by Sauron as the Necromancer before he returned to Mordor."],
 ["Thranduil's Halls",640,150,"c",1,"The cave-realm of the Elvenking in northern Mirkwood, where Bilbo's Dwarves were imprisoned."],
 ["Erebor",700,120,"m",0,"The Lonely Mountain, kingdom of Thorin Oakenshield's line and the lair of Smaug."],
 ["Dale",706,148,"c",1,"The Men's town under the Lonely Mountain, destroyed by Smaug and rebuilt after his death."],
 ["Lake-town",698,176,"c",1,"Esgaroth, a town of Men built on the Long Lake."],
 ["Mount Gundabad",410,58,"m",1,"The northern stronghold of the Orcs at the head of the Misty Mountains."],
 ["Carn Dûm",418,100,"r",1,"Chief fortress of Angmar, realm of the Witch-king in the north."],
 ["Fornost",322,140,"r",1,"Fornost Erain, last capital of the North-kingdom of Arnor."],
 ["Annúminas",298,162,"r",1,"The first capital of Arnor, beside Lake Nenuial."],
 ["Tharbad",310,346,"r",1,"A ruined river-town where the Old South Road crossed the Greyflood."],
 ["Isengard",462,418,"c",0,"Orthanc in the Ring of Isengard, seat of Saruman the White."],
 ["Helm's Deep",505,468,"c",0,"The Hornburg and the Deeping Coomb, fortress of the Rohirrim in the White Mountains."],
 ["Edoras",556,462,"c",0,"Capital of Rohan and seat of the Kings of the Mark, with the hall Meduseld."],
 ["Minas Tirith",632,518,"c",0,"The White City of Gondor, built in seven tiers on the Hill of Guard."],
 ["Osgiliath",668,526,"r",1,"The ruined old capital of Gondor, divided by the Anduin."],
 ["Minas Morgul",712,522,"c",0,"The Tower of Sorcery, once Minas Ithil, held by the Witch-king."],
 ["Cirith Ungol",724,496,"p",1,"The pass above Minas Morgul, guarded by a tower and by Shelob."],
 ["Black Gate",740,440,"c",1,"The Morannon, main entrance to Mordor from the north."],
 ["Mount Doom",776,490,"m",0,"Orodruin, the fire-mountain where the One Ring was made and unmade."],
 ["Barad-dûr",812,472,"c",0,"The Dark Tower, fortress of Sauron in the heart of Mordor."],
 ["Pelargir",660,590,"h",1,"The great port of Gondor on the Anduin, a city of ships."],
 ["Dol Amroth",470,580,"h",0,"The princes' city on the Bay of Belfalas, home of Prince Imrahil."],
 ["Umbar",545,692,"h",0,"The great southern haven, a stronghold of the Corsairs."],
 ["Fangorn",495,385,"p",1,"The old forest of the Ents, with Treebeard as its eldest."],
 ["Beorn's House",556,192,"p",1,"The hall of the skin-changer Beorn between the Anduin and Mirkwood."],
 ["Amon Hen",630,478,"m",1,"The Hill of Sight above Nen Hithoel, where the Fellowship broke."]];
/* regions carry the zoomed-out overview; they fade as place names take over */
const REGIONS=[
 ["LINDON",142,128,"The last Elf-realm west of the Blue Mountains, ruled by Gil-galad and later Círdan. Its havens are where the Elves take ship into the West."],
 ["ERIADOR",340,285,"The wide lands between the Blue and Misty Mountains, once the North-kingdom of Arnor. By the Third Age it is mostly empty, save the Shire and Bree."],
 ["DUNLAND",392,372,"Hill-country of the Dunlendings, old enemies of Rohan who joined Saruman in the War of the Ring."],
 ["ENEDWAITH",305,408,"A thinly peopled land between the Greyflood and the Isen, lying between Arnor and Gondor."],
 ["FORODWAITH",655,18,"The cold northern waste beyond the Grey Mountains, home of the Lossoth, the Snowmen."],
 ["ANGMAR",460,104,"The witch-realm of the north, ruled by the Witch-king, which broke the North-kingdom of Arnor."],
 ["RHOVANION",590,350,"Wilderland: the lands east of the Misty Mountains, from the Anduin vale to Mirkwood and the Lonely Mountain."],
 ["MIRKWOOD",610,205,"The great forest, once Greenwood the Great, darkened by Sauron's shadow from Dol Guldur. Thranduil's Wood-elves hold its north."],
 ["ROHAN",570,424,"The Riddermark, the grassland realm of the horse-lords descended from Eorl the Young."],
 ["GONDOR",585,555,"The South-kingdom of the Dúnedain, founded by Isildur and Anárion, ruled by the Stewards from Minas Tirith until Aragorn's return."],
 ["MORDOR",792,528,"The Black Land of Sauron, walled by the Ash Mountains and the Mountains of Shadow, with Mount Doom at its heart."],
 ["HARAD",780,690,"The hot southern lands of the Haradrim, allies of Sauron who brought the mûmakil to war."],
 ["KHAND",905,580,"A land south-east of Mordor, home of the Variags who fought for Sauron."],
 ["RHÛN",890,280,"The vast East around the inland Sea of Rhûn, from which the Easterlings came west to war."],
 ["DORWINION",800,235,"A land on the north-west shore of the Sea of Rhûn, famed for the strong wine drunk in Thranduil's halls."]];
const WATERS=[["The Great Sea",72,420],["Bay of Belfalas",430,625],["Sea of Rhûn",840,340]];

/* seeded random so forests and hills stay put */
const rnd=(s=>()=>(s=Math.imul(s^s>>>15,1|s)+0x6d2b79f5|0,((s^(s>>>7))>>>0)/4294967296))(7);
const TREES=[];for(const[x,y,rx,ry]of FORESTS){const n=Math.round(rx*ry/28);for(let i=0;i<n;i++){const a=rnd()*6.283,r=Math.sqrt(rnd());TREES.push([x+Math.cos(a)*r*rx,y+Math.sin(a)*r*ry])}}
const PEAKS=[];for(const l of MOUNTS)for(let i=0;i<l.length-1;i++){const[a,b]=[l[i],l[i+1]],n=Math.max(2,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/9));for(let k=0;k<=n;k++){const t=k/n;PEAKS.push([a[0]+(b[0]-a[0])*t+(rnd()-.5)*6,a[1]+(b[1]-a[1])*t+(rnd()-.5)*6,4+rnd()*3.5])}}

function smooth(p,closed){const n=p.length;ctx.beginPath();
 if(closed){const m=i=>[(p[i%n][0]+p[(i+1)%n][0])/2,(p[i%n][1]+p[(i+1)%n][1])/2],s=m(n-1);ctx.moveTo(s[0],s[1]);for(let i=0;i<n;i++){const e=m(i);ctx.quadraticCurveTo(p[i][0],p[i][1],e[0],e[1])}ctx.closePath()}
 else{ctx.moveTo(p[0][0],p[0][1]);for(let i=1;i<n-1;i++)ctx.quadraticCurveTo(p[i][0],p[i][1],(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2);ctx.lineTo(p[n-1][0],p[n-1][1])}}

let cw=0,ch=0,dpr=1,fit=1,v={s:1,x:0,y:0},sel=null,hov=null,selR=null,hovR=null,dirty=true,pal;
/* the illustrated base goes soft at about 2.5x its own pixels, the hand-drawn layers stay sharp to 7x */
const zMax=()=>baseOk?Math.max(2,Math.min(3.5,2.5*base.naturalWidth/(W*fit*dpr))):7;
const clampV=()=>{v.s=Math.min(fit*zMax(),Math.max(fit,v.s));const mw=W*v.s,mh=H*v.s;
 v.x=mw<=cw?(cw-mw)/2:Math.min(0,Math.max(cw-mw,v.x));v.y=mh<=ch?(ch-mh)/2:Math.min(0,Math.max(ch-mh,v.y))};
function size(){const r=cv.getBoundingClientRect();if(!r.width)return;const first=!cw;dpr=Math.min(devicePixelRatio||1,2);cw=r.width;ch=r.height;cv.width=Math.round(cw*dpr);cv.height=Math.round(ch*dpr);
 fit=Math.min(cw/W,ch/H);if(first)v.s=fit;clampV();dirty=true}
function colors(){const dark=getComputedStyle(document.documentElement).colorScheme==="dark";
 pal=dark?{dark:true,sea:"#15222a",seaInk:"#5f7f8c",land:"#2b3027",coast:"#6f6a52",grid:"rgba(255,255,255,.04)",mtn:"#6d7068",mtnHi:"#8b8e84",tree:"#3f5a38",river:"#4d86a3",ink:"#e3e6df",halo:"rgba(17,21,24,.85)",reg:"rgba(217,166,80,.55)",pin:"#d9a650"}
 :{sea:"#c5d6d8",seaInk:"#4f6f78",land:"#e6dcbc",coast:"#8a7a5a",grid:"rgba(80,60,20,.06)",mtn:"#9a8e72",mtnHi:"#b8ac90",tree:"#8aa56a",river:"#5d97b5",ink:"#2a2418",halo:"rgba(247,243,226,.85)",reg:"rgba(110,76,20,.55)",pin:"#8c5f1a"}}

function draw(){dirty=false;if(!cw)return;colors();
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=pal.sea;ctx.fillRect(0,0,cw,ch);
 ctx.setTransform(dpr*v.s,0,0,dpr*v.s,dpr*v.x,dpr*v.y);const z=v.s/fit,px=1/v.s;
 if(baseOk){ctx.imageSmoothingQuality="high";ctx.drawImage(base,0,0,W,H);if(pal.dark){ctx.fillStyle="rgba(12,14,16,.28)";ctx.fillRect(0,0,W,H)}
  pal={...pal,ink:"#2a1d0e",halo:"rgba(241,227,194,.88)",reg:"rgba(95,52,18,.82)",pin:"#8a2f1c",land:"#f1e3c2",seaInk:"#3d5a6a"}}
 else{
 ctx.fillStyle=pal.sea;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle=pal.grid;ctx.lineWidth=px;for(let i=0;i<=W;i+=50){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke()}for(let i=0;i<=H;i+=50){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(W,i);ctx.stroke()}
 /* coast: a soft halo of shallows, then the land */
 smooth(LAND,true);ctx.lineJoin="round";ctx.strokeStyle=pal.coast;ctx.globalAlpha=.18;ctx.lineWidth=14;ctx.stroke();ctx.lineWidth=7;ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle=pal.land;ctx.fill();ctx.strokeStyle=pal.coast;ctx.lineWidth=1.4;ctx.stroke();
 for(const[x,y,rx,ry]of LAKES){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,6.283);ctx.fillStyle=pal.sea;ctx.fill();ctx.strokeStyle=pal.coast;ctx.lineWidth=1;ctx.stroke()}
 ctx.strokeStyle=pal.river;ctx.lineCap="round";RIVERS.forEach((r,i)=>{ctx.lineWidth=i?1.4:2.4;smooth(r,false);ctx.stroke()});
 ctx.fillStyle=pal.tree;ctx.globalAlpha=.9;for(const[x,y]of TREES){ctx.beginPath();ctx.moveTo(x,y-3.2);ctx.lineTo(x+2.3,y+1.6);ctx.lineTo(x-2.3,y+1.6);ctx.fill()}ctx.globalAlpha=1;
 for(const[x,y,s]of PEAKS){ctx.beginPath();ctx.moveTo(x-s,y+s*.7);ctx.lineTo(x,y-s*.9);ctx.lineTo(x+s,y+s*.7);ctx.closePath();ctx.fillStyle=pal.mtn;ctx.fill();ctx.beginPath();ctx.moveTo(x,y-s*.9);ctx.lineTo(x+s,y+s*.7);ctx.lineTo(x+s*.15,y+s*.7);ctx.closePath();ctx.fillStyle=pal.mtnHi;ctx.fill()}
 }
 /* labels stay one size on screen whatever the zoom */
 const lab=(t,x,y,size,font,col,spacing,halo)=>{ctx.font=`${font} ${size*px}px ${getComputedStyle(document.body).getPropertyValue("--f-body")||"Georgia,serif"}`;ctx.letterSpacing=spacing?spacing*px+"px":"0px";ctx.fillStyle=col;ctx.textAlign="center";ctx.textBaseline="middle";
  if(halo){ctx.lineWidth=3*px;ctx.strokeStyle=pal.halo;ctx.lineJoin="round";ctx.strokeText(t,x,y)}ctx.fillText(t,x,y)};
 /* zoom levels: regions (overview) → places → place kinds; regions fade out between 2.2x and 3.4x */
 const ra=regA(z);if(ra>0){ctx.globalAlpha=ra;REGIONS.forEach(([t,x,y],i)=>lab(t,x,y,selR===i||hovR===i?17:Math.min(16,12+z*1.3),"600",pal.reg,5,selR===i||hovR===i||baseOk));ctx.globalAlpha=1}
 for(const[t,x,y]of WATERS)lab(t,x,y,13,"italic 400",pal.seaInk,3,baseOk);
 PLACES.forEach((p,i)=>{const[n,x,y,k,mz]=p,on=sel===i,hv=hov===i;if(z<1+mz*.55&&!on&&!hv)return;
  const r=(on?6:4.4)*px;ctx.beginPath();
  if(k==="m"){ctx.moveTo(x-r*1.2,y+r);ctx.lineTo(x,y-r*1.3);ctx.lineTo(x+r*1.2,y+r)}
  else if(k==="r"){ctx.rect(x-r*.8,y-r*.8,r*1.6,r*1.6)}
  else if(k==="h"){ctx.arc(x,y,r,0,6.283)}
  else{ctx.moveTo(x,y-r*1.3);ctx.lineTo(x+r*1.1,y);ctx.lineTo(x,y+r*1.3);ctx.lineTo(x-r*1.1,y);ctx.closePath()}
  ctx.fillStyle=k==="r"?pal.land:pal.pin;ctx.fill();ctx.strokeStyle=on?pal.ink:pal.pin;ctx.lineWidth=(on?2:1.6)*px;ctx.stroke();
  lab(n,x,y-(r+8*px)/px*px,on?14:12,on?"700":"500",pal.ink,0,true);
  if(z>=Math.min(2.6,zMax()*.85))lab(KINDS[k],x,y+r+9*px,11,"italic 400",pal.ink,0,true)});
 hud()}
function hud(){const el=document.getElementById("mapzoom");if(el)el.textContent=Math.round(v.s/fit*100)+"%"}
const tick=()=>{if(dirty)draw();requestAnimationFrame(tick)};

const toWorld=(cx,cy)=>[(cx-v.x)/v.s,(cy-v.y)/v.s];
const KINDS={c:"Fortress or city",h:"Haven or hidden realm",r:"Ruin",m:"Mountain",p:"Place"};
const regA=z=>{const m=Math.min(3.4,zMax()*.95);return Math.max(0,Math.min(1,(m-z)/(m*.35)))};
/* places win over regions; a region is hit within ~40px of its label while it is still visible */
function pick(cx,cy){const[wx,wy]=toWorld(cx,cy),z=v.s/fit;let best=-1,bd=(16/v.s)**2;PLACES.forEach((p,i)=>{if(z<1+p[4]*.55&&sel!==i)return;const d=(p[1]-wx)**2+(p[2]-wy)**2;if(d<bd){bd=d;best=i}});
 if(best>=0)return{k:"p",i:best};if(regA(z)<.35)return null;
 let rb=-1,rd=Infinity;REGIONS.forEach((r,i)=>{const dx=(r[1]-wx)*v.s,dy=(r[2]-wy)*v.s;if(Math.abs(dx)<r[0].length*6+12&&Math.abs(dy)<14){const d=dx*dx+dy*dy;if(d<rd){rd=d;rb=i}}});return rb<0?null:{k:"r",i:rb}}
function zoomAt(cx,cy,f){const[wx,wy]=toWorld(cx,cy);v.s*=f;clampV();v.x=cx-wx*v.s;v.y=cy-wy*v.s;clampV();dirty=true}
function card(title,kind,text){info.innerHTML=`<h3></h3><small></small><p></p>`;info.querySelector("h3").textContent=title;info.querySelector("small").textContent=kind;info.querySelector("p").textContent=text;info.hidden=false;dirty=true}
function show(i){sel=i;selR=null;const p=PLACES[i];card(p[0],KINDS[p[3]],p[5])}
function showR(i){selR=i;sel=null;const r=REGIONS[i];card(r[0].charAt(0)+r[0].slice(1).toLowerCase(),"Region overview",r[3])}
const open=h=>h===null?clear():h.k==="p"?show(h.i):showR(h.i);
function clear(){sel=null;selR=null;info.hidden=true;dirty=true}
function flyTo(i){const p=PLACES[i];v.s=Math.max(v.s,fit*2.4);clampV();v.x=cw/2-p[1]*v.s;v.y=ch/2-p[2]*v.s;clampV();show(i)}

const ptrs=new Map();let drag=null,pinch=0,moved=false;
const loc=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);const[x,y]=loc(e);ptrs.set(e.pointerId,[x,y]);moved=false;if(ptrs.size===1)drag={x,y,vx:v.x,vy:v.y};else{drag=null;const[a,b]=[...ptrs.values()];pinch=Math.hypot(a[0]-b[0],a[1]-b[1])}});
cv.addEventListener("pointermove",e=>{const[x,y]=loc(e);
 if(ptrs.has(e.pointerId))ptrs.set(e.pointerId,[x,y]);
 if(ptrs.size===2){const[a,b]=[...ptrs.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pinch)zoomAt((a[0]+b[0])/2,(a[1]+b[1])/2,d/pinch);pinch=d;moved=true;return}
 if(drag&&ptrs.size===1){const dx=x-drag.x,dy=y-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;if(moved){v.x=drag.vx+dx;v.y=drag.vy+dy;clampV();dirty=true;cv.style.cursor="grabbing"}return}
 const h=pick(x,y),hp=h&&h.k==="p"?h.i:null,hr=h&&h.k==="r"?h.i:null;if(hp!==hov||hr!==hovR){hov=hp;hovR=hr;cv.style.cursor=h===null?"grab":"pointer";dirty=true}});
const end=e=>{const wasTap=!moved&&ptrs.size===1&&ptrs.has(e.pointerId);const[x,y]=ptrs.get(e.pointerId)||[0,0];ptrs.delete(e.pointerId);pinch=0;drag=null;cv.style.cursor="grab";
 if(wasTap&&e.type==="pointerup")open(pick(x,y))};
cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
/* scrolling over the map zooms toward the cursor; a horizontal trackpad swipe pans */
cv.addEventListener("wheel",e=>{e.preventDefault();if(Math.abs(e.deltaX)>Math.abs(e.deltaY)){v.x-=e.deltaX;clampV();dirty=true;return}
 const[x,y]=loc(e),dy=e.deltaMode===1?e.deltaY*16:e.deltaY;zoomAt(x,y,Math.exp(-dy*(e.ctrlKey?.01:.0022)))},{passive:false});
cv.addEventListener("keydown",e=>{const k=e.key,st=40;
 if(k==="+"||k==="="){zoomAt(cw/2,ch/2,1.3)}else if(k==="-"){zoomAt(cw/2,ch/2,1/1.3)}else if(k==="0"){v.s=fit;clampV();dirty=true}
 else if(k==="ArrowLeft")v.x+=st;else if(k==="ArrowRight")v.x-=st;else if(k==="ArrowUp")v.y+=st;else if(k==="ArrowDown")v.y-=st;else return;
 e.preventDefault();clampV();dirty=true});
document.getElementById("mapctl").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const a=b.dataset.m;
 if(a==="in")zoomAt(cw/2,ch/2,1.4);else if(a==="out")zoomAt(cw/2,ch/2,1/1.4);else if(a==="fit"){v.s=fit;clampV();clear()}dirty=true});
const list=document.getElementById("maplist");
[...PLACES.keys()].sort((a,b)=>PLACES[a][0].localeCompare(PLACES[b][0])).forEach(i=>{const o=document.createElement("option");o.value=i;o.textContent=PLACES[i][0];list.append(o)});
list.addEventListener("change",()=>{if(list.value!=="")flyTo(+list.value);list.value=""});

new ResizeObserver(size).observe(cv);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>dirty=true);
new MutationObserver(()=>dirty=true).observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>dirty=true);
size();requestAnimationFrame(tick);
})();
