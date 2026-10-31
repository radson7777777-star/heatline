'use strict';
// HEATLINE — build 1. Plain canvas + Web Audio, no deps.
const W=640,H=360;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const off=document.createElement('canvas');off.width=W;off.height=H;const g=off.getContext('2d');
let SCALE=1;
function resize(){let s=Math.min(innerWidth/W,innerHeight/H);s=s>=1?Math.floor(s):s;SCALE=s;cv.width=Math.round(W*s);cv.height=Math.round(H*s);ctx.imageSmoothingEnabled=false;}
addEventListener('resize',resize);resize();
const Q=new URLSearchParams(location.search);
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rnd=(a,b)=>a+Math.random()*(b-a), D2R=Math.PI/180;

// ---------- TRACK ----------
const L=9000,LAPS=2,FINISH=L*LAPS,START_X=100;
const HT=new Float32Array(L+600);
function ramp(x,up,h,top,down){for(let i=0;i<=up;i++)HT[x+i]=Math.max(HT[x+i],h*i/up);for(let i=0;i<=top;i++)HT[x+up+i]=Math.max(HT[x+up+i],h);for(let i=0;i<=down;i++)HT[x+up+top+i]=Math.max(HT[x+up+top+i],h*(1-i/down));}
const zones=[],logs=[],pads=[],whoops=[];
function whoop(a,b){whoops.push([a,b]);for(let x=a;x<=b;x++)HT[x]=Math.max(HT[x],5*(1-Math.cos(2*Math.PI*(x-a)/36))/2);}
const zone=(t,a,b,lanes)=>zones.push({t,a,b,lanes});
ramp(650,40,14,0,40);ramp(900,70,30,60,70);pads.push({x:1180,l:0},{x:1180,l:3});
whoop(1350,1650);zone('mud',1800,2050,[1,2]);
ramp(2250,90,48,0,14);ramp(2400,14,44,0,150); // double: case it = crash
logs.push({x:2800,l:0},{x:2800,l:2},{x:2900,l:1},{x:2900,l:3});
zone('water',3200,3480,[0,1,2,3]);
ramp(3700,80,34,280,80);ramp(4300,40,22,0,40);ramp(4420,40,22,0,40);ramp(4540,40,22,0,40);
zone('mud',4800,5100,[0,3]);pads.push({x:5200,l:1},{x:5200,l:2});
ramp(5400,130,66,0,170);whoop(5900,6200);
logs.push({x:6450,l:1},{x:6450,l:2},{x:6560,l:0},{x:6560,l:3});
ramp(6800,60,26,0,30);ramp(6950,60,40,120,90);
zone('water',7400,7600,[2,3]);zone('mud',7700,7950,[1]);ramp(8100,70,28,0,70);
const wrap=x=>((x%L)+L)%L;
function hAt(x){const m=wrap(x),i=m|0,f=m-i;return HT[i]*(1-f)+HT[i+1]*f;}
const sl=x=>(hAt(x+1.5)-hAt(x-1.5))/3;
function surfAt(x,l){const m=wrap(x);for(const z of zones)if(m>=z.a&&m<=z.b&&z.lanes.includes(l))return z.t;return '';}
const inWhoops=x=>{const m=wrap(x);return whoops.some(w=>m>=w[0]-4&&m<=w[1]+24);};
const LANE_Y0=214,LH=18,contact=l=>LANE_Y0+l*LH+12;

// ---------- CONST ----------
const GRAV=520,TOP=207,TTOP=273,NA=TOP/2.2,TA=TTOP/1.4,ROT=240*D2R;
const AIS=[{name:'LARK',col:'#3FE0F0',ai:'lark'},{name:'SPROCKET',col:'#FFB020',ai:'sprocket'},{name:'BRICKS',col:'#7d8a96',ai:'bricks'},{name:'DOZER',col:'#5FA84A',ai:'dozer'}];

// ---------- AUDIO ----------
const AU={c:null,on:true,init(){if(this.c)return;try{const c=this.c=new (window.AudioContext||window.webkitAudioContext)();
 this.master=c.createGain();this.master.gain.value=0.6;this.master.connect(c.destination);
 this.sfx=c.createGain();this.sfx.connect(this.master);this.mus=c.createGain();this.mus.gain.value=0.22;this.mus.connect(this.master);
 const nb=c.createBuffer(1,c.sampleRate,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=nb;
 this.eg=c.createGain();this.eg.gain.value=0;this.ef=c.createBiquadFilter();this.ef.type='lowpass';this.ef.frequency.value=900;this.ef.Q.value=4;
 this.o1=c.createOscillator();this.o1.type='sawtooth';this.o2=c.createOscillator();this.o2.type='square';
 this.o1.connect(this.ef);this.o2.connect(this.ef);this.ef.connect(this.eg);this.eg.connect(this.sfx);this.o1.start();this.o2.start();
 this.tg=c.createGain();this.tg.gain.value=0;this.tw=c.createOscillator();this.tw.type='sine';this.tw.connect(this.tg);this.tw.start();
 const tn=c.createBufferSource();tn.buffer=nb;tn.loop=true;const bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=2500;tn.connect(bp);bp.connect(this.tg);tn.start();this.tg.connect(this.sfx);
 this.step=0;this.next=c.currentTime+0.1;setInterval(()=>this.sched(),25);}catch(e){this.c=null;}},
 engine(rpm,turbo,on){if(!this.c)return;const t=this.c.currentTime,f=55+rpm*120;
  this.o1.frequency.setTargetAtTime(f,t,0.03);this.o2.frequency.setTargetAtTime(f*0.5+3,t,0.03);this.ef.frequency.setTargetAtTime(500+rpm*1800,t,0.05);
  this.eg.gain.setTargetAtTime(on?0.07+rpm*0.05:0,t,0.05);this.tg.gain.setTargetAtTime(on&&turbo?0.05:0,t,0.08);this.tw.frequency.setTargetAtTime(1800+rpm*1400,t,0.05);
  this.mus.gain.setTargetAtTime(this.on?(on?0.14:0.22):0,t,0.2);},
 tone(f,d,type='square',v=0.15,slide=0){if(!this.c)return;const c=this.c,t=c.currentTime,o=c.createOscillator(),gg=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(0.001,t+d);o.connect(gg);gg.connect(this.sfx);o.start(t);o.stop(t+d+0.02);},
 noise(d,freq,v=0.3,type='lowpass',dest){if(!this.c)return;const c=this.c,t=c.currentTime,s=c.createBufferSource(),f=c.createBiquadFilter(),gg=c.createGain();s.buffer=this.nb;f.type=type;f.frequency.value=freq;gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(0.001,t+d);s.connect(f);f.connect(gg);gg.connect(dest||this.sfx);s.start(t,Math.random()*0.5);s.stop(t+d+0.02);},
 land(imp){this.noise(0.18,180+imp,clamp(imp/400,0.1,0.5));this.tone(70,0.15,'sine',clamp(imp/600,0.1,0.4),0.5);},
 chime(){[880,1320,1760].forEach((f,i)=>setTimeout(()=>this.tone(f,0.18,'triangle',0.12),i*60));},
 crash(){this.noise(0.6,900,0.5);this.noise(1.2,300,0.3);this.tone(120,0.4,'sawtooth',0.15,0.3);setTimeout(()=>this.noise(0.9,600,0.12,'bandpass'),300);},
 sched(){if(!this.c)return;const spb=60/160/4;while(this.next<this.c.currentTime+0.12){this.playStep(this.step,this.next);this.step=(this.step+1)%128;this.next+=spb;}},
 playStep(s,t){const c=this.c,b=s%16;const hit=(f,d,type,v,dest=this.mus)=>{const o=c.createOscillator(),gg=c.createGain();o.type=type;o.frequency.value=f;gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(0.001,t+d);o.connect(gg);gg.connect(dest);o.start(t);o.stop(t+d+0.02);};
  const nz=(d,fr,v)=>{const x=c.createBufferSource(),f=c.createBiquadFilter(),gg=c.createGain();x.buffer=this.nb;f.type='highpass';f.frequency.value=fr;gg.gain.setValueAtTime(v,t);gg.gain.exponentialRampToValueAtTime(0.001,t+d);x.connect(f);f.connect(gg);gg.connect(this.mus);x.start(t,Math.random()*0.5);x.stop(t+d+0.02);};
  if(b%4===0){const o=c.createOscillator(),gg=c.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+0.12);gg.gain.setValueAtTime(0.5,t);gg.gain.exponentialRampToValueAtTime(0.001,t+0.15);o.connect(gg);gg.connect(this.mus);o.start(t);o.stop(t+0.2);}
  if(b===4||b===12)nz(0.15,1200,0.35); if(b%2===1)nz(0.04,7000,0.12);
  const bar=(s>>4)%8,roots=[40,40,43,38,40,40,45,47],r=roots[bar];const mf=n=>440*Math.pow(2,(n-69)/12);
  const bl=[0,0,12,0,0,10,0,12,0,0,12,0,7,0,10,12];hit(mf(r+bl[b]),0.11,'sawtooth',0.12);
  const lead=[[64,0,67,0,69,0,67,64,0,0,62,0,64,0,0,0],[64,0,67,0,69,0,71,72,0,71,69,0,67,0,0,0]][bar&1];
  if(s>=32&&lead[b])hit(mf(lead[b]+(bar>=6?2:0)),0.16,'square',0.06);}
};

// ---------- INPUT ----------
const keys={},kp={};let lastInput='kb',padName='',padType='xbox',toastT=0,toastMsg='';
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!keys[e.code])kp[e.code]=1;keys[e.code]=1;lastInput='kb';AU.init();});
addEventListener('keyup',e=>{keys[e.code]=0;});
addEventListener('mousedown',()=>AU.init());
function toast(m){toastMsg=m;toastT=2.5;}
addEventListener('gamepadconnected',e=>{padName=e.gamepad.id;padType=/054c|playstation|dualsense|dualshock|sony/i.test(padName)?'ps':'xbox';toast((padType==='ps'?'PlayStation':'Xbox')+' controller connected');});
addEventListener('gamepaddisconnected',()=>{toast('Controller disconnected');if(G.state==='race')G.state='paused';});
const pad={b:[],pb:[],ax:[0,0],pAxY:0,pAxX:0,connected:false};
function pollPad(){let gp=null;const ps=navigator.getGamepads?navigator.getGamepads():[];for(const p of ps)if(p&&p.connected!==false){gp=p;break;}
 pad.pb=pad.b.slice();pad.pAxY=pad.ax[1];pad.pAxX=pad.ax[0];
 if(!gp){pad.connected=false;pad.b=[];pad.ax=[0,0];return;}
 if(!pad.connected&&!padName){padName=gp.id;padType=/054c|playstation|dualsense|dualshock|sony/i.test(gp.id)?'ps':'xbox';}
 pad.connected=true;pad.b=gp.buttons.map(b=>typeof b==='number'?b:(b.value||(b.pressed?1:0)));
 const dz=v=>Math.abs(v)<0.18?0:(v-Math.sign(v)*0.18)/0.82;pad.ax=[dz(gp.axes[0]||0),dz(gp.axes[1]||0)];
 if(pad.b.some(v=>v>0.3)||Math.abs(pad.ax[0])>0.3||Math.abs(pad.ax[1])>0.3){if(lastInput!=='pad')lastInput='pad';AU.init();}}
const pb=i=>(pad.b[i]||0)>0.4, pp=i=>pb(i)&&!((pad.pb[i]||0)>0.4);
const kd=(...c)=>c.some(k=>keys[k]), kpr=(...c)=>c.some(k=>kp[k]);
// menu nav (edge)
const nav={up:()=>kpr('ArrowUp','KeyW')||pp(12)||(pad.ax[1]<-0.6&&pad.pAxY>=-0.6),down:()=>kpr('ArrowDown','KeyS')||pp(13)||(pad.ax[1]>0.6&&pad.pAxY<=0.6),
 ok:()=>kpr('Enter','Space','KeyJ')||pp(0),back:()=>kpr('Escape','Backspace')||pp(1),pause:()=>kpr('Escape','KeyP')||pp(9),restart:()=>kpr('KeyR')||pp(8)};
function playerInput(){return{thr:Math.max(kd('KeyJ','KeyX')?1:0,pb(0)?1:0,pad.b[7]||0),turbo:kd('KeyK','KeyC')||pb(1)||(pad.b[6]||0)>0.4,brake:kd('Space')||pb(2),
 leanX:clamp((kd('KeyD','ArrowRight')?1:0)-(kd('KeyA','ArrowLeft')?1:0)+pad.ax[0]+(pb(15)?1:0)-(pb(14)?1:0),-1,1),
 up:kpr('KeyW','ArrowUp')||pp(12)||(pad.ax[1]<-0.6&&pad.pAxY>=-0.6),down:kpr('KeyS','ArrowDown')||pp(13)||(pad.ax[1]>0.6&&pad.pAxY<=0.6),
 thrPress:kpr('KeyJ','KeyX')||pp(0)||((pad.b[7]||0)>0.5&&(pad.pb[7]||0)<=0.5)};}
// prompt glyphs
const GL={kb:{thr:'J',turbo:'K',brake:'SPACE',lean:'A/D',lane:'W/S',ok:'ENTER',back:'ESC',pause:'ESC',restart:'R'},
 xbox:{thr:'A/RT',turbo:'B/LT',brake:'X',lean:'L-STICK',lane:'STICK/D-PAD',ok:'A',back:'B',pause:'START',restart:'VIEW'},
 ps:{thr:'X/R2',turbo:'O/L2',brake:'[]',lean:'L-STICK',lane:'STICK/D-PAD',ok:'X',back:'O',pause:'OPTIONS',restart:'SHARE'}};
const gl=k=>(lastInput==='pad'?GL[padType]:GL.kb)[k];

// ---------- RIDERS ----------
function mkRider(o,lane,x){return Object.assign({x,y:0,vy:0,spd:0,lane,laneF:lane,laneT:0,ang:0,wh:0,lean:0,ground:true,heat:0,stall:0,stallT:0,hits:0,crash:0,crashT:0,
 bx:0,by:0,bvx:0,bvy:0,brot:0,wrot:0,comp:0,wob:0,draft:false,finished:false,time:0,err:0,ssFreeze:0,ssWin:0,prevTurbo:false,leanHold:0,
 sideCd:0,inp:{},aiLaneCd:0,logPlan:null,rb:1,surf:'',lapShown:1},o);}
const G={state:'title',menu:0,t:0,riders:[],P:null,camX:0,shake:0,parts:[],pops:[],style:0,combo:1,best:+localStorage.getItem('heatline-best')||0,
 cd:0,results:null,finT:0,overheated:false,helpFrom:'title',auto:Q.has('auto')};
function newRace(){G.riders=[];const P=mkRider({name:'YOU',col:'#E23B3B',ai:null},1,START_X);G.P=P;
 const lanes=[0,2,3,1],xs=[START_X,START_X,START_X,START_X-40];AIS.forEach((a,i)=>G.riders.push(mkRider(Object.assign({},a),lanes[i],xs[i])));G.riders.push(P);
 G.t=0;G.cd=2.4;G.state='countdown';G.parts=[];G.pops=[];G.style=0;G.combo=1;G.results=null;G.finT=0;G.overheated=false;G.camX=P.x-180;G.lastCd=4;}

function pop(r,txt,col){if(r===G.P)G.pops.push({txt,col,t:1.2,x:r.x,y:r.y});}
function crash(r,why){if(r.crash>0)return;r.crash=1.5;r.crashT=0;r.ground=true;r.bx=0;r.by=0;r.bvx=r.spd*0.6;r.bvy=160;r.brot=0;r.wh=0;r.stall=0;
 if(r===G.P){G.shake=Math.max(G.shake,12);AU.crash();pop(r,why,'#FF3B1F');G.combo=1;}
 for(let i=0;i<24;i++)spawn(r.x,contact(r.laneF)-r.y,rnd(-80,120),rnd(-150,-20),rnd(.4,1),'#c79a62',rnd(1,3));}
function spawn(x,y,vx,vy,life,col,sz,grav=300){if(G.parts.length<900)G.parts.push({x,y,vx,vy,life,max:life,col,sz,grav});}

function aiInput(r,pers){const inp={thr:1,turbo:false,brake:false,leanX:0,up:false,down:false,thrPress:false},P=G.P;const ln=Math.round(r.laneF);
 const tb={lark:70,sprocket:94,bricks:45,dozer:80,auto:72}[pers];inp.turbo=r.heat<tb&&!r.stall&&r.ground;
 if(r.stall){inp.thrPress=(Math.abs(((r.stallT%0.5)+0.5)%0.5-0.25)>0.2)&&Math.random()<(pers==='lark'||pers==='auto'?0.5:0.1);return inp;}
 if(r.ground){const m=wrap(r.x);
  const lg=logs.find(l=>l.l===ln&&l.x-m>0&&l.x-m<90);
  if(lg&&r.logPlan!==lg){r.logPlan=lg;r.logWh=pers==='lark'||pers==='auto'||Math.random()<0.75;}
  if(lg&&r.logPlan===lg&&r.logWh&&lg.x-m<75)inp.leanX=-0.65;
  // whoops: skim
  if(inWhoops(r.x+30))inp.leanX=0.7;
  // case protection: double needs speed
  if(m>2150&&m<2260&&r.spd<170)inp.turbo=r.heat<92;
  const want=l=>{if(l<0||l>3)return 1e9;let c=0;for(let d=0;d<160;d+=10){const s=surfAt(r.x+d,l);if(s==='mud')c+=3;if(s==='water'&&r.heat<50)c+=1;if(logs.some(o=>o.l===l&&Math.abs(o.x-wrap(r.x+d))<6))c+=2;}
   for(const o of G.riders)if(o!==r&&Math.round(o.laneF)===l&&o.x-r.x>-10&&o.x-r.x<50&&(o.spd<r.spd-5||o.crash))c+=5;
   if(pers==='dozer'&&o_is(P,l)&&Math.abs(P.x-r.x)<60)c-=4;if(pads.some(p=>p.l===l&&p.x-m>0&&p.x-m<160)&&r.heat>40)c-=3;return c+Math.abs(l-ln)*0.5;};
  if(r.aiLaneCd<=0){const cur=want(ln),u=want(ln-1),d=want(ln+1);if(u<cur-1&&u<=d){inp.up=true;r.aiLaneCd=0.6;}else if(d<cur-1){inp.down=true;r.aiLaneCd=0.6;}}
 }else{ // air: predict landing slope
  let x=r.x,y=r.y,vy=r.vy;for(let i=0;i<120;i++){x+=r.spd*0.02;vy-=GRAV*0.02;y+=vy*0.02;if(y<=hAt(x))break;}
  const tgt=Math.atan(sl(x))+r.err;const carry=-r.lean*Math.abs(r.lean)*ROT/12;inp.leanX=clamp((r.ang+carry-tgt)*6,-1,1);}
 return inp;}
const o_is=(o,l)=>Math.round(o.laneF)===l;

function update(r,inp,dt){
 r.inp=inp;r.aiLaneCd-=dt;r.sideCd-=dt;r.wob=Math.max(0,r.wob-dt);
 if(r.finished){r.spd=Math.max(60,r.spd-80*dt);}
 if(r.crash>0){r.crashT+=dt;r.crash-=dt*(1+(inp.thrPress?0.25:0));r.spd=Math.max(0,r.spd-260*dt);r.x+=r.spd*dt;
  r.bvy-=GRAV*dt;r.by+=r.bvy*dt;r.bx+=r.bvx*dt;r.bvx*=0.98;if(r.by<0){r.by=0;r.bvy*=-0.3;r.bvx*=0.6;}r.brot+=dt*r.bvx*0.08;
  r.y=hAt(r.x);r.heat=Math.max(0,r.heat-15*dt);
  if(r.crash<=0){r.crash=0;r.spd=0;r.ang=Math.atan(sl(r.x));r.vy=0;r.y=hAt(r.x);if(r===G.P)pop(r,'REMOUNT','#F4F1EA');}return;}
 // lean
 const lt=clamp(inp.leanX||0,-1,1);if(Math.abs(lt)>0.05)r.lean+=clamp(lt-r.lean,-4*dt,4*dt);else r.lean+=clamp(-r.lean,-6*dt,6*dt);
 // lane
 if(r.ground&&r.laneT<=0&&!r.finished){if(inp.up&&r.lane>0){r.lane--;r.laneT=0.18;}else if(inp.down&&r.lane<3){r.lane++;r.laneT=0.18;}}
 r.laneT-=dt;r.laneF+=clamp(r.lane-r.laneF,-dt/0.18,dt/0.18);const ln=Math.round(r.laneF);
 const surf=r.ground?surfAt(r.x,ln):'';r.surf=surf;
 // throttle / heat
 let thr=inp.thr||0,turbo=!!inp.turbo&&!r.finished;if(r.finished){thr=0;turbo=false;}
 if(r.stall>0){r.stall-=dt;r.stallT+=dt;thr=0;turbo=false;
  if(inp.thrPress){const ph=r.stallT%0.5;if((ph<0.13||ph>0.37)&&r.hits<3){r.hits++;r.stall-=0.43;if(r===G.P){AU.tone(660+r.hits*220,0.08,'square',0.12);pop(r,'BEAT '+r.hits+'/3','#3FE0F0');}}}
  r.spd=Math.max(r.ground?22:r.spd,r.spd-400*dt);r.heat=Math.max(55,r.heat-20*dt);if(r.stall<=0){r.stall=0;if(r===G.P)pop(r,'RESTARTED','#5FA84A');}}
 let top=(turbo?TTOP:TOP)*r.rb;if(r.ground&&r.wh>15*D2R&&r.wh<35*D2R)top*=1.04;
 r.draft=false;for(const o of G.riders)if(o!==r&&!o.crash&&o_is(o,ln)&&o.x-r.x>16&&o.x-r.x<55)r.draft=true;
 if(r.draft)top*=1.03;if(surf==='mud')top*=0.65;if(surf==='water')top*=0.8;if(r.wob>0)top*=0.85;
 if(r.ground){let a=(turbo?TA:NA*thr)*(1+0.08*r.lean);if(thr>0.05||turbo){if(r.spd<top)r.spd=Math.min(top,r.spd+a*dt);}else r.spd=Math.max(0,r.spd-60*dt);
  if(r.spd>top)r.spd=Math.max(top,r.spd-(surf?320:150)*dt);if(inp.brake)r.spd=Math.max(0,r.spd-(r.lean>0.5?480:300)*dt);
  r.spd=Math.max(0,r.spd-GRAV*0.12*Math.sin(Math.atan(sl(r.x)))*dt);}
 // heat
 if(r.ssFreeze>0)r.ssFreeze-=dt;else if(r.stall<=0){const mul=(r.draft?0.7:1)*(surf==='mud'?1.5:1);
  if(turbo)r.heat+=22*dt*mul;else if(thr>0.05&&r.spd>0.8*TOP)r.heat+=3*dt*mul;else if(thr<0.05)r.heat-=12*dt;else r.heat-=4*dt;
  if(surf==='water')r.heat-=30*dt;
  if(r.heat>=85&&r.prevHeat<85)r.ssWin=0.25;r.ssWin-=dt;if(r.prevTurbo&&!turbo&&r.ssWin>0&&r.heat>=85){r.ssFreeze=0.6;r.ssWin=0;pop(r,'SHORT SHIFT','#3FE0F0');}
  r.heat=clamp(r.heat,0,100);if(r.heat>=100){r.stall=2.5;r.stallT=0;r.hits=0;if(r===G.P){G.overheated=true;pop(r,'OVERHEAT!','#FF3B1F');AU.noise(1.2,3000,0.25,'highpass');AU.tone(90,0.5,'sawtooth',0.2,0.5);G.shake=Math.max(G.shake,5);}}}
 r.prevHeat=r.heat;r.prevTurbo=turbo;
 // pads
 const m0=wrap(r.x);
 if(r.ground){
  const wt=(r.lean<-0.3&&r.spd>100)?(-r.lean)*0.85:(inp.brake&&r.lean>0.5&&r.spd>60?-0.3:0);r.wh+=(wt-r.wh)*Math.min(1,dt*5);
  if(r.wh>45*D2R){crash(r,'LOOPED OUT');return;}
  if(r.lean<-0.6)r.leanHold+=dt;else{if(r.leanHold>0.05&&r.leanHold<0.35&&r.lean>-0.3&&r.spd>40){r.ground=false;r.vy=110;r.ang=Math.atan(sl(r.x))+0.15;r.leanHold=0;r.err=0;if(r===G.P)AU.tone(300,0.06,'square',0.08,1.6);}else r.leanHold=0;}
  if(r.ground){const nx=r.x+r.spd*dt,gy=hAt(nx),by=r.y+r.vy*dt-0.5*GRAV*dt*dt,wz=inWhoops(nx);
   if(sl(nx)>1.6&&!r.finished){r.x=nx-2;crash(r,'HIT THE FACE');return;}
   if(by>gy+0.25&&!wz){r.ground=false;r.ang=Math.atan(sl(r.x))+r.wh;r.wh=0;if(r.lean<-0.5&&r.laneT<=0){r.vy*=1.12;pop(r,'PUMP','#FFB020');}if(r.laneT>0)r.vy*=0.95;
    r.err=r.ai?(r.ai==='lark'||r.ai==='auto'?rnd(-1.5,1.5):(Math.random()<0.08?rnd(-24,24):rnd(-7,7)))*D2R:0;}
   else{const ns=sl(nx),nvy=dt>0?(gy-r.y)/dt:0;r.comp=Math.max(r.comp,clamp((r.vy-nvy)*-0.04,0,6));r.y=gy;r.vy=wz?0:nvy;r.ang=Math.atan(ns);}
   r.x=nx;
   if(wz&&!r.finished){const skim=r.wh>0.15||(r.lean>0.5&&r.spd>160);if(!skim){r.spd=Math.max(90,r.spd-240*dt);r.wob=0.3;if(r===G.P)G.shake=Math.max(G.shake,2);}}}
 }else{
  r.vy-=GRAV*dt;r.y+=r.vy*dt;r.x+=r.spd*dt;r.ang+=(-r.lean*ROT-0.25)*dt;r.ang=clamp(r.ang,-1.4,1.4);
  if(r.y<=hAt(r.x))land(r);}
 r.comp*=Math.pow(0.02,dt);
 // logs & pads crossing
 const m1=wrap(r.x),crossed=x=>(m0<x&&m1>=x)||(m1<m0&&(x>m0||x<=m1));
 for(const lg of logs)if(lg.l===ln&&crossed(lg.x)&&r.y-hAt(r.x)<8&&r.crash===0){if(r.wh>0.15||!r.ground){r.spd*=0.9;r.comp=5;if(r===G.P){AU.land(120);pop(r,'CLEARED','#F4F1EA');G.style+=50*G.combo;}}else if(r.spd>90){crash(r,'LOG!');return;}else r.spd=15;}
 for(const p of pads)if(p.l===ln&&crossed(p.x)&&r.ground){r.heat=Math.max(0,r.heat-40);if(r===G.P){AU.chime();pop(r,'COOL -40','#3FE0F0');}}
 r.wrot+=r.spd*dt/6;
 // particles
 if(r.ground&&r.spd>40&&Math.abs(r.x-G.P.x)<500){const sy=contact(r.laneF)-r.y;
  if(surf==='mud'){if(Math.random()<0.7)spawn(r.x-12,sy-3,rnd(-140,-40),rnd(-120,-40),rnd(.4,.8),Math.random()<.5?'#4a2a17':'#5A3220',rnd(1,3),500);}
  else if(surf==='water'){for(let i=0;i<2;i++)spawn(r.x-10,sy-2,rnd(-120,20),rnd(-160,-60),rnd(.3,.6),Math.random()<.5?'#bfefff':'#6fc3ea',rnd(1,2),500);}
  else if(Math.random()<r.spd/260)spawn(r.x-12,sy-2,rnd(-90,-20)+r.spd*0.2,rnd(-60,-10),rnd(.4,.9),Math.random()<.5?'#d9b27a':'#c79a62',rnd(1,3),40);}
 if(Math.random()<0.3+thr*0.3&&Math.abs(r.x-G.P.x)<500)spawn(r.x-14,contact(r.laneF)-r.y-8,rnd(-40,-10),rnd(-20,-5),rnd(.2,.5),r.heat>60?'#666':'#aaa8',1+(r.heat>60?1:0),-20);
 if(r.stall>0&&Math.random()<0.6)spawn(r.x-4,contact(r.laneF)-r.y-12,rnd(-20,20),rnd(-60,-30),rnd(.5,1),Math.random()<.4?'#ff7b1f':'#eee',2,-40);
 // finish
 if(!r.finished&&r.x>=START_X+FINISH-START_X&&r.x>=FINISH){r.finished=true;r.time=G.t;}
}
function land(r){const s=sl(r.x),sa=Math.atan(s),d=Math.min(...[-5,0,5].map(o=>Math.abs(r.ang-Math.atan(sl(r.x+o)))))/D2R,imp=Math.max(0,-r.vy+r.spd*s);r.ground=true;r.y=hAt(r.x);r.comp=clamp(imp/40,1,6);
 const me=r===G.P;if(me){G.shake=Math.max(G.shake,clamp(imp/60,2,8));AU.land(imp);}
 for(const o of G.riders)if(o!==r&&!o.crash&&o_is(o,Math.round(r.laneF))&&Math.abs(o.x-r.x)<12&&o.ground){crash(r,'LANDED ON RIDER');o.spd*=0.7;return;}
 if(s>1.2){crash(r,'CASED IT');return;}
 const xfer=s<-0.2;
 if(d<=6||(xfer&&d<=9)){r.spd=Math.min(r.spd*1.1,TTOP*1.05);r.heat=Math.max(0,r.heat-15);if(me){G.style+=(xfer?150:100)*G.combo;G.combo=Math.min(4,G.combo+1);pop(r,xfer?'TRANSFER!':'PERFECT!','#FFB020');AU.chime();burst(r,'#FFE08a');}}
 else if(d<=15){if(me)pop(r,'GOOD','#F4F1EA');}
 else if(d<=30){r.spd*=0.75;r.wob=0.5;if(me){G.combo=1;pop(r,'SKETCHY','#FF8A3A');}}
 else crash(r,'BAD LANDING');
 r.ang=sa;r.vy=r.spd*s;}
function burst(r,c){const sy=contact(r.laneF)-r.y;for(let i=0;i<14;i++)spawn(r.x,sy-6,rnd(-120,120),rnd(-140,-20),rnd(.3,.7),c,2,200);}

function collide(){const R=G.riders;for(const a of R)for(const b of R){if(a===b||a.crash||b.crash)continue;
 const dx=b.x-a.x,dl=Math.abs(a.laneF-b.laneF);
 if(dl<0.5&&dx>0&&dx<16&&Math.abs(a.y-b.y)<10){if(a.ground&&b.ground&&a.spd-b.spd>70&&!a.finished)crash(a,'REAR-ENDED');else{a.spd=Math.min(a.spd,b.spd*0.98);a.x=b.x-16;}}
 else if(dl>0.05&&dl<0.75&&Math.abs(dx)<14&&a.sideCd<=0&&(a.laneT>0||b.laneT>0)){a.sideCd=b.sideCd=0.6;a.wob=b.wob=0.4;a.spd*=0.93;b.spd*=0.93;if(a===G.P||b===G.P){AU.noise(0.15,800,0.3);G.shake=Math.max(G.shake,4);}}}}

// ---------- GAME LOOP ----------
function sim(dt){
 const P=G.P;
 if(G.state==='countdown'){G.cd-=dt;const n=Math.ceil(G.cd/0.6);if(n!==G.lastCd&&n>=0){G.lastCd=n;AU.tone(n>0?440:880,n>0?0.15:0.4,'square',0.2);}
  if(G.cd<=0){G.state='race';G.t=0;}
  for(const r of G.riders)r.heat=Math.min(r.heat+ (playerInput().thr&&r===P?0:0),100);}
 if(G.state==='race'||G.state==='finish'){G.t+=dt;
  const pin=G.auto?aiInput(P,'auto'):playerInput();
  for(const r of G.riders){r.rb=r.ai?1+clamp((P.x-r.x)/2000,-0.04,0.04):1;update(r,r===P?pin:aiInput(r,r.ai),dt);}
  collide();
  if(P.finished&&G.state==='race'){G.state='finish';G.finT=0;AU.chime();}
  if(G.state==='finish'){G.finT+=dt;if(G.finT>3)endRace();}}
 for(const p of G.parts){p.life-=dt;p.vy+=p.grav*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}G.parts=G.parts.filter(p=>p.life>0);
 for(const p of G.pops)p.t-=dt;G.pops=G.pops.filter(p=>p.t>0);
 G.shake=Math.max(0,G.shake-dt*40);toastT-=dt;
 if(P){const tgt=P.x-170-Math.min(70,P.spd*0.3);G.camX+=(tgt-G.camX)*Math.min(1,dt*6);}
}
function standings(){return G.riders.slice().sort((a,b)=>(a.finished&&b.finished)?a.time-b.time:a.finished?-1:b.finished?1:b.x-a.x);}
function endRace(){const st=standings().map(r=>({name:r.name,col:r.col,me:r===G.P,time:r.finished?r.time:G.t+(FINISH-r.x)/195}));st.sort((a,b)=>a.time-b.time);
 let nb=false;if(G.P.finished&&(!G.best||G.P.time<G.best)){G.best=G.P.time;nb=true;try{localStorage.setItem('heatline-best',G.best.toFixed(3));}catch(e){}}
 if(!G.overheated)G.style+=500;G.results={st,nb,pos:st.findIndex(s=>s.me)+1};G.state='results';G.menu=0;}

const fmt=t=>{const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2);};
const ord=n=>n+(['th','st','nd','rd'][n]||'th');

function frameInput(){
 const s=G.state;
 if(s==='title'){if(nav.up())G.menu=(G.menu+2)%3;if(nav.down())G.menu=(G.menu+1)%3;if(nav.ok()){AU.tone(660,0.08);if(G.menu===0)newRace();else if(G.menu===1){G.helpFrom='title';G.state='help';}else{AU.on=!AU.on;}}}
 else if(s==='help'){if(nav.back()||nav.ok()){G.state=G.helpFrom;}}
 else if(s==='race'||s==='countdown'||s==='finish'){if(nav.pause()){G.state='paused';G.pausedFrom=s;G.menu=0;AU.tone(330,0.08);}else if(nav.restart())newRace();}
 else if(s==='paused'){if(nav.up())G.menu=(G.menu+3)%4;if(nav.down())G.menu=(G.menu+1)%4;
  if(kpr('Escape','KeyP')||pp(9)||pp(1)){G.state=G.pausedFrom;}
  else if(nav.restart())newRace();
  else if(nav.ok()){AU.tone(660,0.08);if(G.menu===0)G.state=G.pausedFrom;else if(G.menu===1)newRace();else if(G.menu===2){G.helpFrom='paused';G.state='help';}else{G.state='title';G.menu=0;}}}
 else if(s==='results'){if(nav.restart()||kpr('KeyR'))newRace();else if(nav.ok()){if(G.menu===0)newRace();else{G.state='title';G.menu=0;}}else if(nav.back()){G.state='title';G.menu=0;}if(nav.up()||nav.down())G.menu^=1;}
 if(kpr('KeyM'))AU.on=!AU.on;
}

// ---------- RENDER ----------
const far=[],mesa=[];for(let i=0;i<400;i++){far.push(30+Math.sin(i*0.37)*14+Math.sin(i*1.31)*7+Math.random()*3);mesa.push(Math.random());}
function drawBG(){const cx=G.camX;
 const sk=g.createLinearGradient(0,0,0,210);sk.addColorStop(0,'#2f7fc4');sk.addColorStop(0.7,'#7cc0ea');sk.addColorStop(1,'#f3d7a0');g.fillStyle=sk;g.fillRect(0,0,W,215);
 g.fillStyle='#fff6d0';g.beginPath();g.arc(520,60,18,0,7);g.fill();g.fillStyle='#fff6d033';g.beginPath();g.arc(520,60,28,0,7);g.fill();
 // clouds
 g.fillStyle='#ffffffcc';for(let i=0;i<6;i++){const x=((i*170-cx*0.05)%800+800)%800-80,y=30+(i*37)%50;g.fillRect(x,y,50,6);g.fillRect(x+8,y-4,30,4);g.fillRect(x+14,y+6,40,3);}
 // far mountains
 g.fillStyle='#8aa6c8';g.beginPath();g.moveTo(0,215);for(let sx=0;sx<=W;sx+=8){const i=Math.floor((sx+cx*0.1)/8);g.lineTo(sx,170-far[((i%400)+400)%400]);}g.lineTo(W,215);g.fill();
 // mesas
 for(let k=0;k<12;k++){const wx=k*260,sx=((wx-cx*0.3)%3120+3120)%3120-200;if(sx>W+10)continue;const w=60+mesa[k]*90,h=30+mesa[k+20]*45;
  g.fillStyle='#c97a4a';g.fillRect(sx,195-h,w,h+20);g.fillStyle='#e0955c';g.fillRect(sx,195-h,w,3);g.fillStyle='#a8603a';g.fillRect(sx+w-10,195-h,10,h+20);
  g.fillStyle='#b86c40';for(let j=0;j<h;j+=7)g.fillRect(sx,195-h+j+4,w-10,1);}
 // stands
 const sp=0.6,per=700;for(let k=-1;k<3;k++){const base=Math.floor(cx*sp/per)*per+k*per,sx=base-cx*sp;if(sx>W||sx+420<0)continue;
  g.fillStyle='#3b3f4a';g.fillRect(sx,160,420,48);g.fillStyle='#E23B3B';g.fillRect(sx-6,150,432,8);g.fillStyle='#F4F1EA';for(let i=0;i<432;i+=24)g.fillRect(sx-6+i,150,12,8);
  for(let row=0;row<4;row++)for(let i=0;i<70;i++){const px=sx+4+i*6,py=168+row*9,h=(i*7+row*13+k*5)%5;const near=Math.abs(px-(G.P?G.P.x-cx:200))<90;
   g.fillStyle=['#E23B3B','#FFB020','#F4F1EA','#3FE0F0','#5FA84A'][h];g.fillRect(px,py-(near&&((G.t*8+i)|0)%2?2:0),3,4);g.fillStyle='#e8c09a';g.fillRect(px,py-3-(near&&((G.t*8+i)|0)%2?2:0),3,2);}
  // flags
  for(let f=0;f<5;f++){const fx=sx+30+f*90,wv=Math.sin(G.t*8+f)*2;g.fillStyle='#ccc';g.fillRect(fx,128,1,24);g.fillStyle=f%2?'#FFB020':'#E23B3B';g.beginPath();g.moveTo(fx+1,128);g.lineTo(fx+14,131+wv);g.lineTo(fx+1,136);g.fill();}
  g.fillStyle='#121212';g.fillRect(sx+150,140,120,10);g.fillStyle='#FFB020';g.font='bold 8px monospace';g.fillText('HEATLINE',sx+190,148);}
 // back verge
 g.fillStyle='#5FA84A';g.fillRect(0,200,W,14);g.fillStyle='#4c8c3a';for(let sx=-((cx)%12+12)%12;sx<W;sx+=12)g.fillRect(sx,206,6,2);
 // hay & tires
 for(let wx=Math.floor(cx/150)*150;wx<cx+W+150;wx+=150){const sx=wx-cx;const t=(wx/150)%3;if(t===0){g.fillStyle='#E8B464';g.fillRect(sx,198,18,10);g.fillStyle='#c4913f';g.fillRect(sx,201,18,1);g.fillRect(sx,205,18,1);}
  else if(t===1){g.fillStyle='#222';g.fillRect(sx,200,10,8);g.fillStyle='#444';g.fillRect(sx+2,202,6,1);}}}
function laneTopCol(l,s){return s>0.15?(l%2?'#e8b464':'#efc07a'):s<-0.15?(l%2?'#b97b44':'#c6874f'):(l%2?'#c88c55':'#d49a60');}
function drawLane(l){const cx=G.camX,c=contact(l);
 // top surface polygons in 4px columns
 for(let sx=0;sx<W;sx+=2){const wx=cx+sx,h=hAt(wx),h2=hAt(wx+2),s=(h2-h)/2;
  g.fillStyle=laneTopCol(l,s);g.fillRect(sx,c-12-Math.max(h,h2),2,12+Math.abs(h-h2));
  // texture
  if((((wx|0)>>1)*7+l*13)%11===0){g.fillStyle='#00000018';g.fillRect(sx,c-8-h,2,1);}
  // ramp front face
  if(h>0.5){const fg=Math.min(1,h/60);g.fillStyle=s>0?'#9C5B2E':'#7a4526';g.fillRect(sx,c-h,2,h+6);g.fillStyle='#5A3220';g.fillRect(sx,c+4,2,2);g.fillStyle='#00000022';if(((wx|0)>>3)%2)g.fillRect(sx,c-h+4,2,Math.max(0,h-4));}
  else{g.fillStyle='#8a5530';g.fillRect(sx,c,2,6);}
  g.fillStyle='#ffffff55';g.fillRect(sx,c-12-h,2,1);}
 // zones
 for(const z of zones)if(z.lanes.includes(l)){for(let lp=Math.floor((cx-z.b)/L);lp<=Math.floor((cx+W-z.a)/L);lp++){const a=z.a+lp*L-cx,b=z.b+lp*L-cx;if(b<0||a>W)continue;
  if(z.t==='mud'){g.fillStyle='#5A3220';g.fillRect(a,c-11,b-a,10);g.fillStyle='#4a2a17';for(let x=a;x<b;x+=9)g.fillRect(x+((x*3)%5),c-9+((x|0)%4),5,2);g.fillStyle='#7a4a2a';g.fillRect(a,c-11,b-a,1);}
  else{g.fillStyle='#2f86c9';g.fillRect(a,c-11,b-a,11);g.fillStyle='#6fc3ea';for(let x=a;x<b;x+=12)g.fillRect(x+((G.t*20+x)%12),c-9+((x|0)%3)*3,6,1);g.fillStyle='#bfefff';g.fillRect(a,c-11,b-a,1);}}}
 for(const p of pads)if(p.l===l){const sx=((p.x-cx)%L+L)%L;if(sx>W+20)continue;const pulse=(Math.sin(G.t*10)+1)/2;g.fillStyle=`rgba(63,224,240,${0.5+pulse*0.5})`;for(let i=0;i<3;i++){const x=sx-18+i*8;g.beginPath();g.moveTo(x,c-10);g.lineTo(x+6,c-6);g.lineTo(x,c-2);g.lineTo(x+2,c-6);g.fill();}}
 for(const lg of logs)if(lg.l===l){const sx=((lg.x-cx)%L+L)%L;if(sx>W+20)continue;g.fillStyle='#5A3220';g.fillRect(sx-4,c-10,8,8);g.fillStyle='#8a5530';g.fillRect(sx-4,c-10,8,2);g.fillStyle='#c79a62';g.fillRect(sx-3,c-12,6,3);g.fillStyle='#FFB020';g.fillRect(sx-4,c-3,8,1);}
 // start/finish line
 for(let lp=Math.floor(cx/L);lp<=Math.floor((cx+W)/L)+1;lp++){const sx=lp*L-cx+0;if(sx<-10||sx>W+10)continue;for(let i=0;i<6;i++){g.fillStyle=(i+l)%2?'#121212':'#F4F1EA';g.fillRect(sx,c-12+i*2,4,2);g.fillStyle=(i+l+1)%2?'#121212':'#F4F1EA';g.fillRect(sx+4,c-12+i*2,4,2);}}
}
function drawRider(r){const sx=r.x-G.camX,sy=contact(r.laneF)-r.y;if(sx<-60||sx>W+60)return;
 // shadow
 const gh=hAt(r.x),shy=contact(r.laneF)-gh;g.fillStyle='#00000040';const sw=Math.max(6,16-(r.y-gh)*0.15);g.fillRect(sx-sw,shy-1,sw*2,2);
 if(r.crash>0){g.save();g.translate(sx,sy-5);g.rotate(r.crashT*6*(r.crashT<0.8?1:0.1)+0.6);drawBikeBody(r,true);g.restore();
  const rx=sx+r.bx*0.4-10,ry=sy-10-r.by;g.fillStyle=r.col;g.fillRect(rx-3,ry-4,6,7);g.fillStyle='#F4F1EA';g.fillRect(rx-3,ry-9,6,5);g.fillStyle='#121212';g.fillRect(rx,ry-8,3,2);
  if(r.crashT>0.9){const lg=Math.sin(r.crashT*20)*2;g.fillStyle='#333';g.fillRect(rx-2+lg,ry+3,2,4);g.fillRect(rx+1-lg,ry+3,2,4);}return;}
 g.save();const wob=r.wob>0?Math.sin(G.t*40)*0.08:0;g.translate(sx,sy);g.rotate(-(r.ground?r.ang+r.wh:r.ang)+wob);drawBikeBody(r,false);g.restore();
 if(r===G.P){g.fillStyle='#F4F1EA';g.fillRect(sx-1,sy-38,3,3);}}
function drawBikeBody(r,crashed){const comp=r.comp,wr=r.wrot;
 const wheel=(x)=>{g.fillStyle='#121212';g.beginPath();g.arc(x,-6,6,0,7);g.fill();g.fillStyle='#3a3a3a';g.beginPath();g.arc(x,-6,4,0,7);g.fill();g.fillStyle='#9a9a9a';
  for(let k=0;k<3;k++){const a=wr+k*2.09;g.fillRect(x+Math.cos(a)*3-0.5,-6+Math.sin(a)*3-0.5,1.5,1.5);}g.fillStyle='#ddd';g.fillRect(x-1,-7,2,2);};
 wheel(-11);wheel(11);const by=-comp*0.6;
 g.strokeStyle='#bbb';g.lineWidth=1.5;g.beginPath();g.moveTo(11,-6);g.lineTo(7,-15+by);g.moveTo(-11,-6);g.lineTo(-2,-11+by);g.stroke();
 g.fillStyle=r.col;g.beginPath();g.moveTo(-12,-15+by);g.lineTo(-2,-13+by);g.lineTo(8,-17+by);g.lineTo(12,-15+by);g.lineTo(6,-12+by);g.lineTo(-6,-10+by);g.fill();
 g.fillStyle='#2a2a2a';g.fillRect(-8,-11+by,10,4);g.fillStyle='#777';g.fillRect(-12,-10+by,6,2);
 g.fillStyle='#F4F1EA';g.fillRect(7,-17+by,5,3);
 const hot=r.heat>85||r.stall>0;g.fillStyle=hot?(Math.sin(G.t*30)>0?'#FF3B1F':'#FFB020'):'#555';g.fillRect(-13,-10+by,2,2);
 if(crashed)return;
 const lean=r.lean*3;g.fillStyle='#1e1e2a';g.fillRect(-4+lean*0.3,-17+by,3,6);g.fillRect(-1+lean*0.3,-14+by,4,2);
 g.fillStyle=r.col;g.save();g.translate(-3+lean,-22+by);g.rotate(r.lean*0.5);g.fillRect(-2,-3,6,9);g.fillStyle='#F4F1EA';g.fillRect(-1,-3,1,9);g.restore();
 g.strokeStyle=r.col;g.lineWidth=2;g.beginPath();g.moveTo(1+lean,-23+by);g.lineTo(7,-18+by);g.stroke();
 const hx=lean*1.4,hy=-29+by+(r.heat>85?1:0);g.fillStyle=r.col;g.fillRect(-2+hx,hy-3,7,6);g.fillStyle='#121212';g.fillRect(2+hx,hy-1,3,2);g.fillStyle='#F4F1EA';g.fillRect(-2+hx,hy-3,7,1);}
function drawParts(){for(const p of G.parts){const a=p.life/p.max;g.globalAlpha=Math.min(1,a*1.5);g.fillStyle=p.col;g.fillRect(p.x-G.camX,p.y,p.sz,p.sz);}g.globalAlpha=1;}
function drawWorld(){g.save();const sh=G.shake;g.translate(Math.round(rnd(-sh,sh)*0.5),Math.round(rnd(-sh,sh)*0.5));
 drawBG();for(let l=0;l<4;l++){drawLane(l);for(const r of G.riders)if(Math.round(r.laneF)===l)drawRider(r);}
 g.fillStyle='#5FA84A';g.fillRect(0,286,W,16);g.fillStyle='#4c8c3a';for(let sx=-(G.camX%9+9)%9;sx<W;sx+=9)g.fillRect(sx,290+(sx|0)%3,3,2);
 drawParts();
 // foreground posts (parallax 1.4)
 for(let wx=Math.floor(G.camX*1.4/220)*220;wx<G.camX*1.4+W+220;wx+=220){const sx=wx-G.camX*1.4;g.fillStyle='#F4F1EA';g.fillRect(sx,272,4,30);g.fillStyle='#E23B3B';g.fillRect(sx,272,4,5);}
 // motion lines
 const P=G.P;if(P&&P.spd>0.85*TOP&&!P.crash){const n=Math.floor((P.spd-0.85*TOP)/6)+3;g.fillStyle='#ffffff66';for(let i=0;i<n;i++){const y=(i*53+((G.t*997)|0)*7)%200+20,x=((G.t*-1900+i*137)%W+W)%W;g.fillRect(x,y,30+(i%3)*14,1);}}
 for(const p of G.pops){const sx=p.x-G.camX,sy=contact(G.P.laneF)-p.y-44-(1.2-p.t)*24;g.globalAlpha=Math.min(1,p.t*2);txt(p.txt,sx,sy,p.col,10,'center',true);}g.globalAlpha=1;
 g.restore();
 if(P&&(P.heat>85||P.stall>0)){const a=(Math.sin(G.t*(P.stall?6:12))+1)/2*0.35+0.1;const vg=g.createRadialGradient(W/2,H/2,140,W/2,H/2,380);vg.addColorStop(0,'rgba(255,59,31,0)');vg.addColorStop(1,`rgba(255,59,31,${a})`);g.fillStyle=vg;g.fillRect(0,0,W,H);}}
function txt(s,x,y,c='#F4F1EA',sz=10,al='left',ol=false){g.font=`bold ${sz}px monospace`;g.textAlign=al;if(ol){g.fillStyle='#121212';g.fillText(s,x+1,y+1);g.fillText(s,x-1,y);g.fillText(s,x,y-1);}g.fillStyle=c;g.fillText(s,x,y);g.textAlign='left';}
function drawHUD(){const P=G.P;
 g.fillStyle='#121212e8';g.fillRect(0,302,W,58);g.fillStyle='#FFB020';g.fillRect(0,302,W,1);
 // speed
 const kmh=Math.round(P.spd*0.55);txt('SPEED',12,318,'#9aa',8);txt(String(kmh).padStart(3,' '),12,342,'#F4F1EA',22);txt('KM/H',62,342,'#9aa',8);
 g.fillStyle='#333';g.fillRect(12,348,90,4);g.fillStyle=P.spd>TOP?'#3FE0F0':'#F4F1EA';g.fillRect(12,348,90*clamp(P.spd/TTOP,0,1),4);
 // heat meter
 const hx=170,hw=280,hy=322;txt('HEAT',hx,316,'#9aa',8);g.fillStyle='#2a2a2a';g.fillRect(hx,hy,hw,14);
 g.fillStyle='#1d3a20';g.fillRect(hx,hy,hw*0.6,14);g.fillStyle='#3d2c10';g.fillRect(hx+hw*0.6,hy,hw*0.25,14);g.fillStyle='#3d1410';g.fillRect(hx+hw*0.85,hy,hw*0.15,14);
 const hc=P.heat<60?'#5FA84A':P.heat<85?'#FFB020':'#FF3B1F',pul=P.heat>85?(Math.sin(G.t*25)>0?1:0.6):1;g.globalAlpha=pul;g.fillStyle=hc;g.fillRect(hx,hy,hw*P.heat/100,14);g.globalAlpha=1;
 g.fillStyle='#F4F1EA';g.fillRect(hx+hw*0.6,hy-2,1,18);g.fillRect(hx+hw*0.85,hy-2,1,18);g.strokeStyle='#F4F1EA';g.lineWidth=1;g.strokeRect(hx+0.5,hy+0.5,hw-1,13);
 if(P.ssFreeze>0)txt('FROZEN',hx+hw*0.86,hy+11,'#3FE0F0',8);
 let st=P.stall>0?'OVERHEAT — TAP '+gl('thr')+' ON THE BEAT '+'●'.repeat(P.hits)+'○'.repeat(3-P.hits):P.heat>85?'DANGER — LET OFF':P.heat>60?'HOT':P.inp.turbo?'TURBO':'COOL';
 txt(st,hx+hw/2,352,P.stall?'#FF3B1F':hc,9,'center');if(P.stall>0){const ph=(P.stallT%0.5)/0.5,b=ph<0.25||ph>0.75;g.fillStyle=b?'#3FE0F0':'#333';g.fillRect(hx+hw+6,hy,10,14);}
 if(P.draft)txt('DRAFT',hx,352,'#3FE0F0',8);
 // right
 const pos=standings().indexOf(P)+1;txt(ord(pos),W-118,342,'#FFB020',22);txt('/'+G.riders.length,W-74,342,'#9aa',10);
 const lap=Math.min(LAPS,Math.floor(Math.max(0,P.x)/L)+1);txt('LAP '+lap+'/'+LAPS,W-118,318,'#F4F1EA',9);txt(fmt(G.t),W-56,318,'#F4F1EA',9);
 if(G.best)txt('BEST '+fmt(G.best),W-118,354,'#9aa',8);
 txt('STYLE '+G.style+(G.combo>1?'  x'+G.combo:''),W-50,354,'#F4F1EA',8,'center');
 // progress strip
 g.fillStyle='#121212aa';g.fillRect(120,6,400,8);g.fillStyle='#F4F1EA';g.fillRect(120+400*(L/FINISH),5,1,10);g.fillRect(519,4,2,12);
 for(const r of G.riders){const x=120+400*clamp(r.x/FINISH,0,1);g.fillStyle=r.col;g.fillRect(x-2,r===P?4:6,4,r===P?10:6);}
 if(toastT>0)txt(toastMsg,W/2,30,'#3FE0F0',10,'center',true);
 if(G.state==='countdown'){const n=Math.ceil(G.cd/0.6)-1;txt(n>0?String(n):'GO!',W/2,140,n>0?'#F4F1EA':'#5FA84A',48,'center',true);}
 if(G.state==='race'&&G.t<4)txt(`${gl('thr')} THROTTLE  ${gl('turbo')} TURBO  ${gl('lean')} LEAN  ${gl('lane')} LANE  ${gl('pause')} PAUSE`,W/2,32,'#F4F1EA',9,'center',true);
 if(G.state==='finish')txt(P.finished?'FINISH!':'',W/2,120,'#FFB020',36,'center',true);}
function panel(x,y,w,h){g.fillStyle='#121212e0';g.fillRect(x,y,w,h);g.fillStyle='#FFB020';g.fillRect(x,y,w,2);g.fillRect(x,y+h-2,w,2);}
function menuList(items,x,y){items.forEach((s,i)=>{const sel=i===G.menu;if(sel){g.fillStyle='#FFB020';g.fillRect(x-80,y+i*22-12,160,17);}txt(s,x,y+i*22,sel?'#121212':'#F4F1EA',12,'center');});}
function drawTitle(){G.camX+=1.2;drawBG();for(let l=0;l<4;l++)drawLane(l);g.fillStyle='#5FA84A';g.fillRect(0,286,W,74);
 g.fillStyle='#12121299';g.fillRect(0,0,W,H);
 const t=G.realT;g.save();g.translate(W/2,96);g.transform(1,0,-0.2,1,0,0);
 const gr=g.createLinearGradient(0,-30,0,10);gr.addColorStop(0,'#FFE08a');gr.addColorStop(0.5,'#FFB020');gr.addColorStop(1,'#FF3B1F');
 g.font='bold 56px monospace';g.textAlign='center';g.fillStyle='#121212';g.fillText('HEATLINE',4,4);g.fillStyle=gr;g.fillText('HEATLINE',0,0);g.restore();
 g.fillStyle='#FF3B1F';g.fillRect(150,112,340*((Math.sin(t*2)+1)/2*0.4+0.6),3);
 txt('RIDE THE EDGE OF THE HEAT LINE',W/2,134,'#F4F1EA',10,'center');
 menuList(['RACE — RUST GULCH','CONTROLS','SOUND: '+(AU.on?'ON':'OFF')],W/2,182);
 txt(`${lastInput==='pad'?(padType==='ps'?'D-PAD / X':'D-PAD / A'):'ARROWS / ENTER'} TO SELECT`,W/2,262,'#9aa',9,'center');
 if(G.best)txt('BEST TIME '+fmt(G.best),W/2,282,'#FFB020',10,'center');
 txt(pad.connected?'🎮 '+(padType==='ps'?'PLAYSTATION':'XBOX')+' CONTROLLER READY':'KEYBOARD — PLUG IN A CONTROLLER ANYTIME',W/2,340,pad.connected?'#3FE0F0':'#9aa',8,'center');
 if(toastT>0)txt(toastMsg,W/2,30,'#3FE0F0',10,'center',true);}
function drawHelp(){panel(60,30,520,300);txt('CONTROLS',W/2,56,'#FFB020',16,'center');
 const rows=[['THROTTLE','J / X','A / RT','X / R2'],['TURBO (HEATS ENGINE)','K / C','B / LT','O / L2'],['BRAKE (+LEAN FWD = STOPPIE)','SPACE','X','[]'],['LEAN BACK / FORWARD','A / D  ←/→','L-STICK X','L-STICK X'],['LANE UP / DOWN','W / S  ↑/↓','L-STICK Y / D-PAD','L-STICK Y / D-PAD'],['INSTANT RESTART','R','VIEW','SHARE'],['PAUSE','ESC / P','START','OPTIONS']];
 txt('ACTION',80,80,'#9aa',8);txt('KEYBOARD',290,80,lastInput==='kb'?'#FFB020':'#9aa',8);txt('XBOX',390,80,lastInput==='pad'&&padType==='xbox'?'#FFB020':'#9aa',8);txt('PLAYSTATION',480,80,lastInput==='pad'&&padType==='ps'?'#FFB020':'#9aa',8);
 rows.forEach((r,i)=>{const y=98+i*16;txt(r[0],80,y,'#F4F1EA',8);txt(r[1],290,y,'#F4F1EA',8);txt(r[2],390,y,'#F4F1EA',8);txt(r[3],480,y,'#F4F1EA',8);});
 const tips=['• Lean BACK in the air = nose up, FORWARD = nose down. Match the ground to land.','  PERFECT (≤6°) = +10% speed & -15 heat. Land on a downslope = TRANSFER.','• Heat 100 = stall. Tap throttle on the 3 blue beats to restart fast.','• Let off turbo right as heat hits red = SHORT SHIFT (heat freezes).','• Cyan arrows & water cool you. Mud slows & heats. Wheelie over logs.','• Whoops: wheelie or lean forward at speed to skim. Hold lean back too long = loop out.','• Tuck behind a rider to DRAFT. Rear-end someone fast and you go down.'];
 tips.forEach((s,i)=>txt(s,80,222+i*13,'#cfd',8));txt(`${gl('back')} / ${gl('ok')} TO GO BACK`,W/2,320,'#9aa',8,'center');}
function drawPause(){g.fillStyle='#12121299';g.fillRect(0,0,W,H);panel(200,80,240,170);txt('PAUSED',W/2,110,'#FFB020',16,'center');menuList(['RESUME','RESTART','CONTROLS','QUIT TO TITLE'],W/2,145);
 txt(`${gl('ok')} SELECT  ${gl('pause')} RESUME`,W/2,240,'#9aa',8,'center');}
function drawResults(){const R=G.results;g.fillStyle='#12121299';g.fillRect(0,0,W,H);panel(150,40,340,270);txt('RACE RESULTS',W/2,68,'#FFB020',16,'center');
 txt(R.pos===1?'YOU WIN!':'YOU FINISHED '+ord(R.pos),W/2,90,R.pos===1?'#5FA84A':'#F4F1EA',12,'center');
 R.st.forEach((s,i)=>{const y=118+i*18;if(s.me){g.fillStyle='#FFB02033';g.fillRect(170,y-12,300,16);}txt(ord(i+1),180,y,'#9aa',10);g.fillStyle=s.col;g.fillRect(215,y-8,8,8);txt(s.name,230,y,'#F4F1EA',10);txt(fmt(s.time),400,y,'#F4F1EA',10);});
 txt('STYLE '+G.style+(G.overheated?'':'  (+500 NO OVERHEAT)'),W/2,222,'#3FE0F0',9,'center');
 txt((R.nb?'NEW BEST! ':'BEST ')+(G.best?fmt(G.best):'--'),W/2,240,R.nb?'#FFB020':'#9aa',11,'center');
 menuList(['RACE AGAIN','TITLE'],W/2,268);txt(`${gl('restart')} INSTANT RESTART`,W/2,302,'#9aa',8,'center');}
function render(){g.setTransform(1,0,0,1,0,0);
 if(G.state==='title'){drawTitle();}
 else if(G.state==='help'){if(G.helpFrom==='title')drawTitle();else{drawWorld();}drawHelp();}
 else{drawWorld();drawHUD();if(G.state==='paused')drawPause();if(G.state==='results')drawResults();}
 ctx.imageSmoothingEnabled=false;ctx.drawImage(off,0,0,cv.width,cv.height);}

// engine audio from player
function audioTick(){const P=G.P;if(!AU.c)return;const racing=P&&['race','finish','countdown'].includes(G.state);
 if(racing){const rpm=clamp(P.spd/TTOP,0,1)*0.8+(P.inp.thr?0.15:0)+(P.ground?0:0.15);AU.engine(P.crash||P.stall?0.05:rpm,!!P.inp.turbo&&!P.stall,!P.crash);
  if(P.heat>85||P.stall){const rate=P.stall?3:2+(P.heat-85)/15*4;G.alarmT=(G.alarmT||0)-1/60;if(G.alarmT<=0){G.alarmT=1/rate;AU.tone(P.stall?520:1200,0.06,'square',0.08);}}}
 else AU.engine(0,false,false);}

let last=performance.now(),acc=0;G.realT=0;const STEP=1/120;
function loop(now){const dt=Math.min(0.1,(now-last)/1000);last=now;G.realT+=dt;pollPad();frameInput();
 if(G.state!=='paused'&&G.state!=='help'&&G.state!=='title'&&G.state!=='results'){acc+=dt;while(acc>=STEP){sim(STEP);acc-=STEP;for(const k in kp)delete kp[k];}}
 else{for(const p of G.parts)p.life-=dt;toastT-=dt;}
 audioTick();render();for(const k in kp)delete kp[k];requestAnimationFrame(loop);}
requestAnimationFrame(loop);
// test hooks (harmless in prod)
window.HL={G,newRace,sim,hAt,sl,render,pollPad,frameInput,STEP,fast(sec){for(let i=0;i<sec/STEP;i++){if(G.state==='paused'||G.state==='title'||G.state==='results')break;sim(STEP);}}};
