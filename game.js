/* APEX NIGHTSHIFT — original offline 3D-perspective Canvas racing engine.
   Built for PC and mobile. No CDN, external models or game libraries required. */
'use strict';
(() => {
 const $ = id => document.getElementById(id);
 const C=$('world'), ctx=C.getContext('2d',{alpha:false});
 const graph=$('graph'), gc=graph.getContext('2d');
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const lerp=(a,b,t)=>a+(b-a)*t;
 const mod=(n,m)=>((n%m)+m)%m;
 const rad=Math.PI/180;
 const rng=(()=>{let seed=316102;return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};})();
 const colors=['#121b35','#182342','#1d294c','#162138','#1c2a48','#1b2847'];
 const points=[ [0,0],[0,-510],[110,-890],[430,-1160],[850,-1100],[1130,-770],[1170,-320],[960,100],[610,310],[270,260],[-85,110],[-230,-55] ];
 // Dense Catmull-Rom ring; arclength resampling allows one endlessly repeating real circuit.
 function spline(p0,p1,p2,p3,t){const t2=t*t,t3=t2*t;return {x:.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),z:.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)};}
 const ring=[];
 for(let i=0;i<points.length;i++) for(let j=0;j<100;j++){const n=points.length;ring.push(spline(points[mod(i-1,n)],points[i],points[(i+1)%n],points[(i+2)%n],j/100));}
 let length=0;for(let i=0;i<ring.length;i++){const q=ring[i],p=ring[(i+1)%ring.length];q.s=length;length+=Math.hypot(p.x-q.x,p.z-q.z);}const lapLength=length;
 function findAt(d){d=mod(d,lapLength);let lo=0,hi=ring.length-1;while(lo<hi){const mid=(lo+hi+1)>>>1;if(ring[mid].s<=d)lo=mid;else hi=mid-1;}
  const a=ring[lo],b=ring[(lo+1)%ring.length],d0=a.s,d1=lo+1===ring.length?lapLength:b.s,t=clamp((d-d0)/Math.max(1e-8,d1-d0),0,1);
  return {x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t)};
 }
 function trackAt(s){const p=findAt(s),a=findAt(s-3),b=findAt(s+3);const dX=b.x-a.x,dZ=b.z-a.z,m=Math.hypot(dX,dZ)||1,dx=dX/m,dz=dZ/m;const h=Math.atan2(dx,-dz);return {...p,dx,dz,rx:-dz,rz:dx,heading:h};}
 function curvatureAt(s){const a=trackAt(s-12),b=trackAt(s+12);let angle=b.heading-a.heading;while(angle>Math.PI)angle-=Math.PI*2;while(angle< -Math.PI)angle+=Math.PI*2;const k=angle/24;return {k,radius:Math.abs(k)<.00002?Infinity:1/Math.abs(k)};}
 const scene=[];
 for(let s=0;s<lapLength;s+=43){const t=trackAt(s);const sector=mod(s/lapLength,1);
  for(const side of [-1,1]){
   const n=rng(),d=25+rng()*43,place={s,side,x:t.x+side*t.rx*d,z:t.z+side*t.rz*d};
   if(sector<.38||sector>.79){scene.push({...place,type:'building',height:26+rng()*85,width:10+rng()*22,depth:12+rng()*20,shade:Math.floor(rng()*6),bright:rng(),neon:rng()>.74});if(n>.34)scene.push({...place,x:place.x+side*t.rx*(28+rng()*30),z:place.z+side*t.rz*14,type:'building',height:45+rng()*120,width:14+rng()*24,depth:14+rng()*20,shade:Math.floor(rng()*6),bright:rng(),neon:rng()>.8});}
   else if(sector<.66){if(n>.18)scene.push({...place,type:'palm',height:9+rng()*9});else scene.push({...place,type:'billboard',width:12,height:8});}
   else scene.push({...place,type:n>.46?'tree':'billboard',height:10+rng()*14,width:11});
  }
 }
 const cars=[];
 for(let i=0;i<15;i++)cars.push({s:(430+i*260)%lapLength,lane:[-.7,-.38,0,.32,.68][i%5],speed:22+i%6*4.7,color:['#4997fc','#e3e9fa','#f5b04f','#88d7ff','#f7577e','#96e0ba'][i%6],seed:i});
 const state={mode:'menu',s:0,lap:1,time:0,totalTime:0,best:null,speed:0,accel:0,lane:0,theta:0,omega:0,ac:0,turnRadius:Infinity,nitro:1,boosting:false,engine:6.5,brake:11,grip:1.05,radius:.34,paint:'#da273b',camHeading:trackAt(0).heading,camX:0,camZ:0,lastFrame:0,sound:false,lapBanner:0,alert:0,alertText:'',graph:[],graphTick:0,sparks:[],countdown:0,progress:0,collisionLock:0};
 let W=1280,H=720,DPR=1,camera=null;
 const keys={left:false,right:false,gas:false,brake:false,nitro:false};
 const controls={'ArrowLeft':'left','KeyA':'left','ArrowRight':'right','KeyD':'right','ArrowUp':'gas','KeyW':'gas','ArrowDown':'brake','KeyS':'brake','ShiftLeft':'nitro','ShiftRight':'nitro','Space':'nitro'};
 function resize(){W=window.innerWidth;H=window.innerHeight;DPR=Math.min(window.devicePixelRatio||1,(W<800?1.5:1.8));C.width=Math.round(W*DPR);C.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);}
 window.addEventListener('resize',resize);resize();
 function changeMode(m){state.mode=m;$('menu').classList.toggle('hidden',m!=='menu');$('pauseOverlay').classList.toggle('hidden',m!=='pause');$('hud').style.opacity=m==='menu'?'0':'1';$('touchControls').style.opacity=m==='menu'?'0':'1';}
 function start(){state.s=0;state.lap=1;state.time=0;state.totalTime=0;state.speed=0;state.accel=0;state.lane=0;state.theta=0;state.omega=0;state.ac=0;state.nitro=1;state.graph=[];state.graphTick=0;state.lapBanner=0;state.camHeading=trackAt(0).heading;$('finishOverlay').classList.add('hidden');cars.forEach((car,i)=>car.s=mod(260+i*250,lapLength));changeMode('countdown');state.countdown=3.2;$('countdown').classList.remove('hidden');$('countdownText').textContent='3';}
 $('startBtn').onclick=start;
 function paused(){if(state.mode!=='race')return;changeMode('pause');$('countdown').classList.add('hidden');}
 $('pauseBtn').onclick=paused;
 $('resumeBtn').onclick=()=>changeMode('race');
 $('restartBtn').onclick=start;
 $('raceAgainBtn').onclick=()=>{ $('finishOverlay').classList.add('hidden'); start(); };
 $('continueBtn').onclick=()=>{ $('finishOverlay').classList.add('hidden'); changeMode('race'); };
 function activatePanel(name){const old=state.mode;state.returnMode=(old==='garage'||old==='lab')?state.returnMode:(old==='countdown'?'menu':old);state.mode=name;$('garagePanel').classList.toggle('hidden',name!=='garage');$('labPanel').classList.toggle('hidden',name!=='lab');$('pauseOverlay').classList.add('hidden');}
 function closePanel(){const prev=state.returnMode||'menu';$('garagePanel').classList.add('hidden');$('labPanel').classList.add('hidden');changeMode(prev);}
 $('garageBtn').onclick=()=>activatePanel('garage');$('labBtn').onclick=()=>activatePanel('lab');$('menuLabBtn').onclick=()=>activatePanel('lab');document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closePanel));
 for(const [id,key,lab] of [['engineRange','engine','engineVal'],['brakeRange','brake','brakeVal'],['gripRange','grip','gripVal'],['wheelRange','radius','wheelVal']])$(id).addEventListener('input',e=>{state[key]=+e.target.value;$(lab).textContent=(+e.target.value).toFixed(id==='wheelRange'?2:1);});
 document.querySelectorAll('[data-paint]').forEach(b=>b.onclick=()=>{state.paint=b.dataset.paint;document.querySelectorAll('[data-paint]').forEach(x=>x.classList.toggle('active',x===b));});
 window.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;const k=controls[e.code];if(k){e.preventDefault();keys[k]=true;}if(e.code==='Escape'){if(state.mode==='race')paused();else if(state.mode==='pause')changeMode('race');else if(state.mode==='garage'||state.mode==='lab')closePanel();}});
 window.addEventListener('keyup',e=>{const k=controls[e.code];if(k){keys[k]=false;e.preventDefault();}});
 window.addEventListener('blur',()=>Object.keys(keys).forEach(k=>keys[k]=false));
 document.querySelectorAll('[data-touch]').forEach(b=>{const k=b.dataset.touch;function press(e){e.preventDefault();keys[k]=true;b.classList.add('pressed');}function release(e){e.preventDefault();keys[k]=false;b.classList.remove('pressed');}b.addEventListener('pointerdown',press);['pointerup','pointercancel','lostpointercapture'].forEach(n=>b.addEventListener(n,release));});
 // Synthesized sound uses user-gesture activated Web Audio. No audio assets or downloads.
 let audio=null,osc1=null,osc2=null,gain=null;
 $('soundBtn').onclick=()=>{state.sound=!state.sound;if(state.sound){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();osc1=osc1||audio.createOscillator();osc2=osc2||audio.createOscillator();gain=gain||audio.createGain();osc1.type='sawtooth';osc2.type='triangle';osc1.connect(gain);osc2.connect(gain);gain.connect(audio.destination);if(!osc1.started){osc1.start();osc2.start();osc1.started=true;}audio.resume();gain.gain.setTargetAtTime(.024,audio.currentTime,.1);}catch(e){state.sound=false;}}else if(audio&&gain){gain.gain.setTargetAtTime(0,audio.currentTime,.1);} $('soundBtn').style.color=state.sound?'#73e5ff':'#fff';};
 function lerpAngle(a,b,t){let d=mod(b-a+Math.PI,Math.PI*2)-Math.PI;return a+d*clamp(t,0,1);}
 function calculatePhysics(v0,a,t,r){return {v:v0+a*t,x:v0*t+.5*a*t*t,w:(v0+a*t)/r,theta:(v0*t+.5*a*t*t)/r};}
 window.APEX={calculatePhysics,trackLength:lapLength,state};
 function update(dt){if(state.mode==='countdown'){state.countdown-=dt;const n=state.countdown>2.25?'3':state.countdown>1.45?'2':state.countdown>.65?'1':'GO';$('countdownText').textContent=n;if(state.countdown<=0){$('countdown').classList.add('hidden');changeMode('race');}return;}
  if(state.mode!=='race')return;const oldV=state.speed;
  const aero=.00082*state.speed*state.speed;
  const rolling=.19+.013*state.speed;
  let a=(keys.gas?state.engine*(1-.38*state.speed/98):0)-(keys.brake?state.brake:0)-aero-rolling;
  state.boosting=keys.nitro&&state.nitro>.001&&state.speed>8&&!keys.brake;
  if(state.boosting){a+=10;state.nitro=clamp(state.nitro-dt*.17,0,1);}else state.nitro=clamp(state.nitro+dt*.027,0,1);
  const curv=curvatureAt(state.s+15);state.turnRadius=curv.radius;state.ac=Number.isFinite(curv.radius)?state.speed**2/curv.radius:0;
  const maxLateral=state.grip*9.81;
  if(state.ac>maxLateral){a-=Math.min(14,(state.ac-maxLateral)*1.2);state.alertText='TRACTION LIMIT · BRAKE FOR TURN';state.alert=1.0;}
  if(Math.abs(state.lane)>.91){a-=8;state.alertText='OFF THE RACING LINE';state.alert=.65;}
  state.speed=clamp(state.speed+a*dt,0,state.boosting?110:88);state.accel=(state.speed-oldV)/dt;
  const steer=(keys.right?1:0)-(keys.left?1:0);state.lane=clamp(state.lane+steer*(.43+.30*Math.min(1,state.speed/45))*dt, -1.15,1.15);
  // Assisted steering: wheel input controls lateral road position, while chassis follows the curved circuit.
  const ds=(state.speed+oldV)*.5*dt;state.s+=ds;state.totalTime+=dt;state.time+=dt;state.theta+=ds/state.radius;state.omega=state.speed/state.radius;
  if(state.s>=lapLength){state.s-=lapLength;const split=state.time;state.best=state.best===null?split:Math.min(state.best,split);state.lap++;state.time=0;state.lapBanner=2.7;$('finishedLap').textContent='LAP '+String(state.lap-1).padStart(2,'0');$('finishedTime').textContent=fmt(split);$('lapBanner').classList.remove('hidden');state.nitro=Math.min(1,state.nitro+.25);$('finishTime').textContent=fmt(split);$('finishBest').textContent=fmt(state.best);$('finishOverlay').classList.remove('hidden');state.mode='finish';$('lapBanner').classList.add('hidden');}
  state.progress=state.s/lapLength;
  for(let i=0;i<cars.length;i++){const c=cars[i];c.s=mod(c.s+c.speed*dt,lapLength);const delta=mod(c.s-state.s,lapLength);if(delta<3.5&&delta>0&&Math.abs(c.lane-state.lane)<.27&&state.collisionLock<=0){state.speed*=.58;state.alert=1.5;state.alertText='COLLISION · SPEED REDUCED';state.collisionLock=1.5;state.nitro=Math.max(0,state.nitro-.08);}}
  state.collisionLock=Math.max(0,state.collisionLock-dt);
  state.alert=Math.max(0,state.alert-dt);state.lapBanner=Math.max(0,state.lapBanner-dt);if(state.lapBanner===0)$('lapBanner').classList.add('hidden');
  state.graphTick+=dt;if(state.graphTick>.16){state.graphTick=0;state.graph.push([state.totalTime,state.speed]);while(state.graph.length&&state.totalTime-state.graph[0][0]>35)state.graph.shift();}
  if(state.boosting){for(let i=0;i<4;i++){state.sparks.push({x:(rng()-.5)*220,y:H*.84,dx:(rng()-.5)*9,dy:5+rng()*20,life:.2+rng()*.28,color:rng()>.5?'#51d7ff':'#f16bdf'});}}for(const p of state.sparks){p.x+=p.dx;p.y+=p.dy;p.life-=dt;}state.sparks=state.sparks.filter(p=>p.life>0);
  if(state.sound&&audio&&osc1){osc1.frequency.setTargetAtTime(70+state.speed*6,audio.currentTime,.05);osc2.frequency.setTargetAtTime(50+state.speed*4.1,audio.currentTime,.07);}
 }
 function fmt(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}.${String(Math.floor((t%1)*100)).padStart(2,'0')}`;}
 function cameraSetup(dt){const car=trackAt(state.s),targetHeading=car.heading;state.camHeading=lerpAngle(state.camHeading,targetHeading,clamp(dt*2,0,1));const aim=state.camHeading;const rightX=Math.cos(aim),rightZ=Math.sin(aim),forwardX=Math.sin(aim),forwardZ=-Math.cos(aim);const realX=car.x+car.rx*state.lane*8.25,realZ=car.z+car.rz*state.lane*8.25;const shake=state.speed>55?Math.sin(performance.now()*.09)*.008*(state.speed-55):0;const pitch=.158+state.speed*.00035;
 camera={x:realX-forwardX*16,y:5.0,z:realZ-forwardZ*16,fx:forwardX,fz:forwardZ,rx:rightX,rz:rightZ,pitch: pitch+shake,focal:Math.min(W*1.16,H*1.58),cy:H*.56};return camera;}
 function project(x,y,z){const dx=x-camera.x,dy=y-camera.y,dz=z-camera.z;const lateral=dx*camera.rx+dz*camera.rz;const forward=dx*camera.fx+dz*camera.fz;const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);const dep=forward*cp-dy*sp;const up=dy*cp+forward*sp;if(dep<1)return null;const scale=camera.focal/dep;return {x:W/2+lateral*scale,y:camera.cy-up*scale,scale,depth:dep};}
 function projTrack(s,offset=0,y=0){const t=trackAt(s);return project(t.x+t.rx*offset,y,t.z+t.rz*offset);}
 function polygon(arr,fill,stroke,lineW=1){if(arr.some(p=>!p))return;ctx.beginPath();ctx.moveTo(arr[0].x,arr[0].y);for(let i=1;i<arr.length;i++)ctx.lineTo(arr[i].x,arr[i].y);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lineW;ctx.stroke();}}
 function roundRect(x,y,w,h,r){const rr=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}
 function glow(x,y,r,color,alpha=.5){if(r<1)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color.replace('ALPHA',String(alpha)));g.addColorStop(.2,color.replace('ALPHA',String(alpha*.45)));g.addColorStop(1,color.replace('ALPHA','0'));ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);}
 function sky(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#030918');g.addColorStop(.28,'#152449');g.addColorStop(.54,'#402946');g.addColorStop(.68,'#a75055');g.addColorStop(.8,'#221d35');g.addColorStop(1,'#0b121d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const van=state.camHeading;const sunX=W*.66-Math.sin(van)*W*.2;const sunY=H*.28;glow(sunX,sunY,Math.max(W*.3,H*.38),'rgba(255,113,140,ALPHA)',.20);glow(sunX,sunY,Math.max(75,H*.13),'rgba(255,180,151,ALPHA)',.11);
  for(let i=0;i<130;i++){const px=mod((i*179.3+Math.sin(i*2.1)*24-van*210),W),py=((i*63.73)%Math.round(H*.42));if(py>H*.33)continue;ctx.globalAlpha=.2+.5*((i%7)/7);ctx.fillStyle='#cce5ff';ctx.fillRect(px,py, i%11===0?2:1,i%11===0?2:1);}ctx.globalAlpha=1;
  // layered distant skyline and coastal hills, intentionally atmospheric rather than horizontal road strips
  for(let layer=0;layer<3;layer++){const base=H*(.47+layer*.035), shift=Math.sin(van)*140/(layer+1);ctx.beginPath();ctx.moveTo(0,H);for(let x=-30;x<W+40;x+=10){let y=base+Math.sin((x+shift)*.004+layer)*26/(layer+1)+Math.sin((x+shift)*.012+layer)*10;ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=['#172544','#101a32','#0d1b2c'][layer];ctx.fill();}
  ctx.save();ctx.fillStyle='#111b31';for(let i=0;i<58;i++){const x=mod(i*69+Math.sin(i*5)*20-van*40,W+200)-100,bh=20+(i*79%92),bw=20+(i*13%35);ctx.fillRect(x,H*.53-bh,bw,bh+H*.5);ctx.fillStyle='rgba(129,188,225,.28)';for(let yy=H*.53-bh+7;yy<H*.53-5;yy+=10)for(let xx=x+6;xx<x+bw-5;xx+=9)if((xx*yy|0)%3===0)ctx.fillRect(xx,yy,2,3);ctx.fillStyle='#111b31';}ctx.restore();
  const fog=ctx.createLinearGradient(0,H*.35,0,H*.72);fog.addColorStop(0,'#cc63810a');fog.addColorStop(.5,'#ff6d7538');fog.addColorStop(1,'#ff9c5b00');ctx.fillStyle=fog;ctx.fillRect(0,H*.35,W,H*.4);
 }
 function pathForOffset(steps,offset){const a=[];for(const s of steps){const p=projTrack(s,offset);if(p&&Number.isFinite(p.x)&&Math.abs(p.x)<W*8&&Math.abs(p.y)<H*8)a.push(p);else a.push(null);}return a;}
 function pathStroke(pts,stroke,width){ctx.beginPath();let active=false;for(const p of pts){if(!p){active=false;continue;}if(!active){ctx.moveTo(p.x,p.y);active=true;}else ctx.lineTo(p.x,p.y);}ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
 function ribbon(a,b,fill){const first=a.findIndex(x=>x);const last=a.length-1;if(first<0)return;const verts=[];for(let i=0;i<a.length;i++)if(a[i]&&b[i])verts.push([a[i],b[i]]);if(verts.length<2)return;ctx.beginPath();for(let i=0;i<verts.length;i++){const p=verts[i][0];if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}for(let i=verts.length-1;i>=0;i--){const p=verts[i][1];ctx.lineTo(p.x,p.y);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
 function road(){const steps=[];for(let d=-5;d<460;){steps.push(state.s+d);d+=d<125?3.8:d<300?8:12;}steps.push(state.s+470);
  // All pavement layers are continuous ribbons—no horizontal-strip aliasing.
  const outerL=pathForOffset(steps,-27), outerR=pathForOffset(steps,27),shoulderL=pathForOffset(steps,-14.0),shoulderR=pathForOffset(steps,14.0),edgeL=pathForOffset(steps,-11.2),edgeR=pathForOffset(steps,11.2),laneL=pathForOffset(steps,-3.72),laneR=pathForOffset(steps,3.72);
  ribbon(outerL,outerR,'#18272b');ribbon(shoulderL,shoulderR,'#171d29');ribbon(edgeL,edgeR,'#252a36');
  // Soft wet-surface reflection stripe, not an artificial horizontal texture pattern
  const wetA=pathForOffset(steps,1.45),wetB=pathForOffset(steps,2.2);ribbon(wetA,wetB,'#30354844');
  pathStroke(shoulderL,'#662f47',7);pathStroke(shoulderR,'#662f47',7);
  pathStroke(edgeL,'#eee9e3',3);pathStroke(edgeR,'#eee9e3',3);
  const glowL=pathForOffset(steps,-11.6),glowR=pathForOffset(steps,11.6);pathStroke(glowL,'#ff4d7e83',3);pathStroke(glowR,'#58d4ff75',3);
  // 3D dash segments distributed by world distance rather than stripes across the road.
  const start=Math.floor((state.s-10)/28)*28;for(let s=start;s<state.s+450;s+=28){for(const lane of [-3.72,3.72]){const q=[projTrack(s,lane-.12,.035),projTrack(s+11,lane-.12,.035),projTrack(s+11,lane+.12,.035),projTrack(s,lane+.12,.035)];if(q.every(Boolean))polygon(q,'rgba(250,247,232,.9)');}}
  // Thin road-edge rumble segments
  for(let s=Math.floor((state.s-10)/12)*12;s<state.s+430;s+=12){for(const side of [-1,1]){const off=side*12.4;const p=[projTrack(s,off-1.05,.04),projTrack(s+5,off-1.05,.04),projTrack(s+5,off+1.05,.04),projTrack(s,off+1.05,.04)];polygon(p,side<0?'#ec6774':'#d5d8df');}}
  // Neon road gantries — every few hundred metres, tracked in actual world coordinates.
  for(let s=Math.floor((state.s-20)/400)*400;s<state.s+430;s+=400){if(s<state.s+32)continue;const a=projTrack(s,-14,0),b=projTrack(s,14,0),at=projTrack(s,-14,9.6),bt=projTrack(s,14,9.6);if([a,b,at,bt].every(Boolean)){const line=Math.max(1,Math.min(6,(at.scale||1)*.075));pathStroke([a,at,bt,b],'#77869e',line);pathStroke([at,bt],'#7ee1ff',line*1.5);const m=projTrack(s,0,9.1);if(m&&m.scale>1.5){ctx.save();ctx.font=`900 ${clamp(m.scale*.24,9,29)}px system-ui`;ctx.fillStyle='#f3f5ff';ctx.textAlign='center';ctx.fillText('APEX NIGHTSHIFT',m.x,m.y);ctx.restore();}}}
  // Road start/finish checkerboard drawn as a world-space transverse band.
  if(state.s<85||state.s>lapLength-85){for(let s=lapLength-4;s<lapLength+4;s+=2){if(s<state.s-12||s>state.s+380)continue;for(let i=0;i<12;i++){const x=-11.1+i*(22.2/12);polygon([projTrack(s,x,.06),projTrack(s+2,x,.06),projTrack(s+2,x+22.2/12,.06),projTrack(s,x+22.2/12,.06)],(i+Math.floor((s-(lapLength-4))/2))%2?'#12151c':'#f3f2e6');}}}
 }
 function drawBox(x,z,y,height,width,depth,shade,neon){const p=(xx,yy,zz)=>project(xx,yy,zz);const c=[p(x-width/2,y,z-depth/2),p(x+width/2,y,z-depth/2),p(x+width/2,y,z+depth/2),p(x-width/2,y,z+depth/2),p(x-width/2,y+height,z-depth/2),p(x+width/2,y+height,z-depth/2),p(x+width/2,y+height,z+depth/2),p(x-width/2,y+height,z+depth/2)];if(c.some(x=>!x))return;const cs=colors[shade]||'#17223d';polygon([c[0],c[1],c[5],c[4]],'#172947');polygon([c[1],c[2],c[6],c[5]],cs);polygon([c[3],c[0],c[4],c[7]],'#233456');polygon([c[4],c[5],c[6],c[7]],'#334265');
  const heightPx=Math.abs(c[7].y-c[3].y),widthPx=Math.abs(c[2].x-c[3].x);if(heightPx<9)return;
  const alpha=clamp((heightPx-9)/45,0,.8);ctx.save();ctx.globalAlpha=alpha;
  // facade windows: vertical grid projected in actual 3D, with warm and icy city lights.
  const nx=Math.min(8,Math.max(2,Math.floor(width/5))),ny=Math.min(24,Math.max(2,Math.floor(height/5)));
  for(let j=1;j<ny;j++){const py=y+j*height/ny;for(let i=1;i<nx;i++){if((i*j+shade*3)%5===0||(j+i+shade)%7===0){const vx=x-width/2+i*width/nx,vz=z+depth/2+.1,a=p(vx,py,vz),b=p(vx+Math.max(.8,width/nx*.35),py+1.2,vz);if(a&&b){ctx.fillStyle=(j+i)%3===0?'#ffbd7a':'#7db6e5';ctx.fillRect(a.x,b.y,Math.max(1,Math.abs(b.x-a.x)),Math.max(1,Math.abs(a.y-b.y)));}}}}
  ctx.restore();if(neon&&heightPx>24){const a=p(x-width/2-.08,y+height*.56,z+depth/2+.2),b=p(x+width/2+.08,y+height*.56,z+depth/2+.2);if(a&&b){pathStroke([a,b],'#ec63b8',clamp(a.scale*.06,1,5));if(heightPx>75)glow((a.x+b.x)/2,(a.y+b.y)/2,Math.min(100,heightPx*.4),'rgba(255,76,192,ALPHA)',.1);}}
 }
 function billboard(o){const p=project(o.x,0,o.z);if(!p||p.scale<.22||p.scale>150)return;const t=project(o.x,o.height||12,o.z);if(!t)return;const w=clamp(p.scale*15,3,230),h=clamp(p.scale*7,3,120),yy=t.y-h*.45;
  ctx.strokeStyle='#6b829a';ctx.lineWidth=clamp(p.scale*.10,1,4);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(t.x,t.y);ctx.stroke();ctx.save();ctx.fillStyle='#09142c';ctx.shadowBlur=14;ctx.shadowColor='#f6488b';ctx.fillRect(t.x-w/2,yy,w,h);ctx.shadowBlur=0;ctx.strokeStyle='#ff548d';ctx.lineWidth=clamp(p.scale*.10,1,3);ctx.strokeRect(t.x-w/2,yy,w,h);ctx.fillStyle='#ffe6fa';ctx.textAlign='center';ctx.font=`900 ${clamp(h*.29,5,24)}px system-ui`;ctx.fillText(o.side<0?'NITRO //':'APEX //',t.x,yy+h*.48);ctx.fillStyle='#73e2ff';ctx.font=`800 ${clamp(h*.17,4,14)}px system-ui`;ctx.fillText('DRIVE BEYOND',t.x,yy+h*.72);ctx.restore();}
 function tree(o,palm=false){const p=project(o.x,0,o.z),top=project(o.x,o.height,o.z);if(!p||!top)return;const size=Math.abs(p.y-top.y);if(size<3)return;const trunk=clamp(size*.055,1,9);ctx.strokeStyle=palm?'#4b3240':'#413747';ctx.lineWidth=trunk;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo(p.x+size*.065,(p.y+top.y)*.5,top.x,top.y);ctx.stroke();if(palm){for(let i=0;i<7;i++){const a=i*2*Math.PI/7,dx=Math.sin(a)*size*.45,dy=Math.cos(a)*size*.11;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.quadraticCurveTo(top.x+dx*.6,top.y-size*.18,top.x+dx,top.y+dy+size*.1);ctx.strokeStyle=i%2?'#1b5b58':'#23544f';ctx.lineWidth=Math.max(1,size*.055);ctx.stroke();}}else{glow(top.x,top.y,size*.68,'rgba(19,88,79,ALPHA)',.16);ctx.fillStyle='#163847';ctx.beginPath();ctx.arc(top.x,top.y,size*.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#205357';ctx.beginPath();ctx.arc(top.x+size*.14,top.y-size*.12,size*.2,0,Math.PI*2);ctx.fill();}}
 function lamp(s,side){const t=trackAt(s),edge=side*16.2,x=t.x+t.rx*edge,z=t.z+t.rz*edge,p=project(x,0,z),q=project(x,12,z);if(!p||!q)return;const height=Math.abs(p.y-q.y);if(height<4||height>1200)return;const line=clamp(q.scale*.10,1,6);ctx.strokeStyle='#8b99b6';ctx.lineWidth=line;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.lineTo(q.x-side*Math.min(27,height*.17),q.y);ctx.stroke();const lx=q.x-side*Math.min(27,height*.17),ly=q.y;glow(lx,ly,Math.min(70,height*.4),'rgba(91,219,255,ALPHA)',.24);ctx.fillStyle='#d8f7ff';ctx.beginPath();ctx.ellipse(lx,ly,Math.max(2,line*1.5),Math.max(1,line),0,0,Math.PI*2);ctx.fill();}
 function sceneObjects(){const objs=[];for(const obj of scene){let dist=mod(obj.s-state.s,lapLength);if(dist>650&&dist<lapLength-75)continue;const dx=obj.x-camera.x,dz=obj.z-camera.z,depth=dx*camera.fx+dz*camera.fz;if(depth>0&&depth<820)objs.push({obj,depth});}objs.sort((a,b)=>b.depth-a.depth);
  for(const e of objs){const o=e.obj;if(o.type==='building')drawBox(o.x,o.z,0,o.height,o.width,o.depth,o.shade,o.neon);else if(o.type==='palm'||o.type==='tree')tree(o,o.type==='palm');else billboard(o);}
  for(let s=Math.floor((state.s-20)/54)*54;s<state.s+620;s+=54)for(const side of [-1,1])if(s>state.s-18)lamp(s,side);
 }
 function drawOpponent(relative,lane,color,scaleBoost=1){const t=trackAt(state.s+relative),wp=project(t.x+t.rx*lane*8.25,.5,t.z+t.rz*lane*8.25);if(!wp)return;const w=clamp(wp.scale*2.6,1,320),h=w*.72;if(w<2)return;
  ctx.save();ctx.translate(wp.x,wp.y);ctx.scale(w/160,h/115);drawCarGraphic(color,false);ctx.restore();}
 function traffic(){const ons=[];for(const car of cars){const delta=mod(car.s-state.s,lapLength);if(delta>7&&delta<500)ons.push({car,delta});}ons.sort((a,b)=>b.delta-a.delta);for(const e of ons)drawOpponent(e.delta,e.car.lane,e.car.color);}
 function hexRgb(hex){const n=parseInt(hex.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];}
 function tint(hex,amt){const [r,g,b]=hexRgb(hex);return `rgb(${clamp(r+amt,0,255)},${clamp(g+amt,0,255)},${clamp(b+amt,0,255)})`;}
 function drawCarGraphic(color,player=true){
  // Rear three-quarter sports-car illustration with a narrow glasshouse, shoulder lines, LED taillamps,
  // wing uprights, vented engine deck, ceramic diffuser and twin metallic exhausts.
  const grad=ctx.createLinearGradient(-78,-60,84,72);grad.addColorStop(0,tint(color,48));grad.addColorStop(.26,tint(color,15));grad.addColorStop(.55,color);grad.addColorStop(.78,tint(color,-12));grad.addColorStop(1,tint(color,-60));
  ctx.save();
  ctx.fillStyle='#01040ac7';ctx.beginPath();ctx.ellipse(0,50,103,26,0,0,Math.PI*2);ctx.fill();
  if(player){glow(0,65,105,'rgba(248,43,107,ALPHA)',.16);}
  ctx.fillStyle='#090d13';roundRect(-94,3,25,68,8);ctx.fill();roundRect(69,3,25,68,8);ctx.fill();
  // Body: carefully tapered toward the windscreen; widest at the rear fenders.
  ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(-47,-70);ctx.quadraticCurveTo(0,-79,47,-70);ctx.lineTo(60,-52);ctx.quadraticCurveTo(72,-30,77,-8);ctx.lineTo(87,30);ctx.lineTo(82,60);ctx.quadraticCurveTo(70,75,47,73);ctx.lineTo(-47,73);ctx.quadraticCurveTo(-70,75,-82,60);ctx.lineTo(-87,30);ctx.lineTo(-77,-8);ctx.quadraticCurveTo(-72,-30,-60,-52);ctx.closePath();ctx.fill();
  // Bonnet and racing accent lines
  ctx.fillStyle='rgba(255,255,255,.16)';ctx.beginPath();ctx.moveTo(-36,-69);ctx.lineTo(-28,-72);ctx.lineTo(-40,-40);ctx.lineTo(-49,-35);ctx.fill();ctx.beginPath();ctx.moveTo(36,-69);ctx.lineTo(28,-72);ctx.lineTo(40,-40);ctx.lineTo(49,-35);ctx.fill();
  // High roof/short smoked rear glass
  const glass=ctx.createLinearGradient(0,-62,0,-11);glass.addColorStop(0,'#6a98b5');glass.addColorStop(.23,'#1d405b');glass.addColorStop(.6,'#0c2338');glass.addColorStop(1,'#091628');ctx.fillStyle=glass;ctx.beginPath();ctx.moveTo(-28,-58);ctx.quadraticCurveTo(0,-67,28,-58);ctx.lineTo(43,-20);ctx.quadraticCurveTo(0,-14,-43,-20);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#daefff66';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-28,-58);ctx.quadraticCurveTo(0,-67,28,-58);ctx.stroke();
  ctx.fillStyle='rgba(234,247,255,.18)';ctx.beginPath();ctx.moveTo(-22,-57);ctx.lineTo(-15,-60);ctx.lineTo(-34,-19);ctx.lineTo(-41,-20);ctx.fill();
  // Powerful rear haunch reflections and engine vent deck
  ctx.fillStyle='rgba(255,255,255,.23)';ctx.beginPath();ctx.moveTo(-69,-22);ctx.lineTo(-56,-33);ctx.lineTo(-50,20);ctx.lineTo(-68,38);ctx.lineTo(-78,24);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(0,0,0,.23)';ctx.beginPath();ctx.moveTo(69,-22);ctx.lineTo(56,-33);ctx.lineTo(50,20);ctx.lineTo(68,38);ctx.lineTo(78,24);ctx.closePath();ctx.fill();
  const vents=ctx.createLinearGradient(0,-16,0,35);vents.addColorStop(0,'#121727');vents.addColorStop(1,'#343847');ctx.fillStyle=vents;roundRect(-48,-12,96,35,8);ctx.fill();for(let i=0;i<7;i++){ctx.fillStyle=i%2?'#080e1b':'#0c1424';roundRect(-38+i*12,-6,7,24,2);ctx.fill();}
  // rear bumper, extremely low stance
  ctx.fillStyle='#141420';roundRect(-81,35,162,28,9);ctx.fill();ctx.fillStyle=tint(color,-28);roundRect(-80,33,160,13,5);ctx.fill();
  // sculptural LED L lights + continuous light blade
  ctx.save();ctx.shadowBlur=player?17:10;ctx.shadowColor='#ff2350';ctx.strokeStyle='#ff3757';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-69,36);ctx.lineTo(-69,44);ctx.lineTo(-43,44);ctx.moveTo(69,36);ctx.lineTo(69,44);ctx.lineTo(43,44);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#ff6d8b';ctx.beginPath();ctx.moveTo(-39,42);ctx.lineTo(39,42);ctx.stroke();ctx.restore();
  ctx.fillStyle='#0a0c12';roundRect(-76,53,152,17,5);ctx.fill();ctx.fillStyle='#465365';ctx.fillRect(-70,53,140,2);
  // carbon fins
  ctx.fillStyle='#313945';for(let i=0;i<4;i++){roundRect(-55+i*33,58,16,11,2);ctx.fill();}
  // machined twin exhausts
  for(const x of [-39,39]){ctx.fillStyle='#c5d0df';ctx.beginPath();ctx.ellipse(x,65,12,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#161f2b';ctx.beginPath();ctx.ellipse(x,65,7.5,3.5,0,0,Math.PI*2);ctx.fill();}
  // lightweight high-mounted rear wing and stays
  ctx.fillStyle='#0b1019';roundRect(-77,11,11,28,4);ctx.fill();roundRect(66,11,11,28,4);ctx.fill();let wing=ctx.createLinearGradient(0,8,0,24);wing.addColorStop(0,'#8999ac');wing.addColorStop(.2,'#323d4b');wing.addColorStop(1,'#090d16');ctx.fillStyle=wing;roundRect(-98,11,196,16,4);ctx.fill();ctx.fillStyle='#d4edff66';ctx.fillRect(-88,12,176,2);
  // license plate / badge
  ctx.fillStyle='#ccd7e8';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText('APEX',0,58);
  if(player&&state.boosting){ctx.save();ctx.shadowBlur=25;ctx.shadowColor='#39e6ff';for(const x of [-39,39]){ctx.fillStyle='#7feaff';ctx.beginPath();ctx.moveTo(x-5,68);ctx.lineTo(x+5,68);ctx.lineTo(x+(rng()-.5)*15,104+rng()*26);ctx.closePath();ctx.fill();}ctx.restore();}
  ctx.restore();
 }
 function player(){const t=trackAt(state.s),p=project(t.x+t.rx*state.lane*8.25,0,t.z+t.rz*state.lane*8.25);const scaleBase=p?clamp(p.scale*2.55,150,400):260;
  const desired=clamp(Math.min(W*.285,H*.47),160,360);const w=lerp(scaleBase,desired,.58);const h=w*.74;
  const x=(p?p.x:W/2)+Math.sin(performance.now()*.0032)*Math.min(state.speed*.022,1.6);const y=(p?p.y:H*.76)+h*.03;
  ctx.save();ctx.translate(x,y);const tilt=(keys.left?-1:0)+(keys.right?1:0);ctx.rotate(tilt*.026);ctx.scale(w/160,h/115);drawCarGraphic(state.paint,true);ctx.restore();
  if(state.speed>14){const intensity=clamp((state.speed-15)/100,0,.22);ctx.fillStyle=`rgba(185,226,255,${intensity})`;ctx.beginPath();ctx.ellipse(x,y+h*.34,w*.57,h*.1,0,0,Math.PI*2);ctx.fill();}
  for(const s of state.sparks){ctx.strokeStyle=s.color;ctx.globalAlpha=clamp(s.life*2,0,1);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x+s.x,y+h*.44+s.y-H*.84);ctx.lineTo(x+s.x+s.dx*2,y+h*.44+s.y-H*.84+17);ctx.stroke();}ctx.globalAlpha=1;
 }
 function speedStreaks(){if(state.speed<40)return;const v=clamp((state.speed-40)/70,0,1);ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<Math.round(23*v);i++){const yy=H*(.42+(i*71%46)/100),side=i%2?-1:1,xx=W/2+side*(W*.22+i*16),length=clamp(state.speed*.28,2,36);ctx.strokeStyle=`rgba(109,203,254,${.025+.08*v})`;ctx.lineWidth=1+(i%2);ctx.beginPath();ctx.moveTo(xx,yy);ctx.lineTo(xx+side*length,yy+length*1.1);ctx.stroke();}ctx.restore();}
 function draw(){ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);cameraSetup(Math.min(.07,(performance.now()-(state.prevDraw||performance.now()))/1000));state.prevDraw=performance.now();sky();road();sceneObjects();traffic();speedStreaks();player();if(state.boosting){ctx.save();ctx.strokeStyle='#64d6ff26';ctx.lineWidth=11;ctx.strokeRect(0,0,W,H);ctx.restore();}
 }
 function renderUI(){const kph=Math.round(state.speed*3.6);$('speedNum').textContent=String(kph).padStart(3,'0');$('speedMs').textContent=state.speed.toFixed(2)+' m/s';$('wheelOmega').textContent=state.omega.toFixed(2)+' rad/s';$('speedBarFill').style.width=(state.speed/110*100)+'%';$('nitroFill').style.width=(state.nitro*100)+'%';$('nitroPct').textContent=Math.round(state.nitro*100)+'%';$('gearNum').textContent='D '+clamp(Math.floor(state.speed/14)+1,1,6);$('lapNum').textContent=String(state.lap).padStart(2,'0');$('lapTime').textContent=fmt(state.time);$('bestTime').textContent=state.best===null?'--:--.--':fmt(state.best);$('progressFill').style.width=(state.s/lapLength*100).toFixed(2)+'%';$('progressLabel').textContent=Math.round(state.s/lapLength*100)+'% COMPLETE';$('accelHud').innerHTML=state.accel.toFixed(2)+' <span>m/s²</span>';$('centripetalHud').innerHTML=state.ac.toFixed(2)+' <span>m/s²</span>';
  const sectors=['MIDNIGHT STRAIGHT','NEON QUARTER','VICTORIA VIADUCT','HARBOR SWEEP','SKYLINE SPRINT','WESTERN CHICANE'];$('sectorName').textContent=sectors[clamp(Math.floor(state.s/lapLength*sectors.length),0,sectors.length-1)];$('topAlert').textContent=state.alertText;$('topAlert').classList.toggle('active',state.alert>0);}
 function updateLab(){const values={labDistance:state.s+(state.lap-1)*lapLength,labVelocity:state.speed,labAcceleration:state.accel,labAngular:state.omega,labRotation:state.theta,labCentripetal:state.ac};for(const id in values)$(id).textContent=values[id].toFixed(2);}
 function drawGraph(){const w=graph.width,h=graph.height;gc.clearRect(0,0,w,h);gc.fillStyle='#0c1830';gc.fillRect(0,0,w,h);const p={l:48,r:18,t:20,b:35};gc.strokeStyle='#29415e';gc.lineWidth=1;gc.font='15px system-ui';gc.fillStyle='#9ab2ce';for(let i=0;i<=5;i++){const y=p.t+(h-p.t-p.b)*i/5;gc.beginPath();gc.moveTo(p.l,y);gc.lineTo(w-p.r,y);gc.stroke();gc.fillText(String((5-i)*22),6,y+4);}for(let i=0;i<=7;i++){const x=p.l+(w-p.l-p.r)*i/7;gc.beginPath();gc.moveTo(x,p.t);gc.lineTo(x,h-p.b);gc.stroke();gc.fillText(String(Math.round(i*5)),x-6,h-9);}const points=state.graph;gc.strokeStyle='#6ce2ff';gc.lineWidth=4;gc.beginPath();const current=state.totalTime;for(let i=0;i<points.length;i++){const [t,v]=points[i],x=p.l+(w-p.l-p.r)*clamp((t-current+35)/35,0,1),y=p.t+(h-p.t-p.b)*(1-clamp(v/110,0,1));if(i===0)gc.moveTo(x,y);else gc.lineTo(x,y);}gc.stroke();}
 function calc(){const ids=['exV','exA','exT','exR'],v=ids.map(id=>$(id).value.trim()===''?NaN:Number($(id).value));if(v.some(x=>!Number.isFinite(x))||v[0]<0||v[0]>100||Math.abs(v[1])>20||v[2]<0||v[2]>120||v[3]<=0||v[3]>2){$('experimentError').textContent='Use valid numbers: speed 0–100 m/s, acceleration −20 to 20 m/s², time 0–120 s, wheel radius greater than 0 and at most 2 m.';$('experimentOut').textContent='';return;}if(v[0]+v[1]*v[2]<0){$('experimentError').textContent='Choose a time before this model would reverse direction; the constant-acceleration experiment assumes forward motion.';return;}$('experimentError').textContent='';const r=calculatePhysics(...v);$('experimentOut').innerHTML=`<span>FINAL SPEED <strong>${r.v.toFixed(3)} m/s</strong></span><span>DISPLACEMENT <strong>${r.x.toFixed(3)} m</strong></span><span>ANGULAR SPEED <strong>${r.w.toFixed(3)} rad/s</strong></span><span>WHEEL ANGLE <strong>${r.theta.toFixed(3)} rad</strong></span>`;}
 $('calcBtn').onclick=calc;
 function validate(){const data=[{inputs:[0,2,5,.32],manual:{v:10,x:25,w:31.25,theta:78.125}},{inputs:[4,1.5,6,.28],manual:{v:13,x:51,w:46.42857142857143,theta:182.14285714285714}},{inputs:[8,-1.2,4,.35],manual:{v:3.2,x:22.4,w:9.142857142857144,theta:64}}],names={v:'Final speed (m/s)',x:'Displacement (m)',w:'Wheel ω (rad/s)',theta:'Wheel θ (rad)'};let good=0,total=0;const rows=[];for(let i=0;i<data.length;i++){const d=data[i],p=calculatePhysics(...d.inputs);for(const k of ['v','x','w','theta']){const pass=Math.abs(p[k]-d.manual[k])<.0000001;good+=pass?1:0;total++;rows.push(`<tr><td>${String(i+1).padStart(2,'0')}</td><td>v₀=${d.inputs[0]}, a=${d.inputs[1]}, t=${d.inputs[2]}, r=${d.inputs[3]}</td><td>${names[k]}</td><td>${d.manual[k].toFixed(3)}</td><td>${p[k].toFixed(3)}</td><td class="${pass?'passed':''}">${pass?'PASS':'CHECK'}</td></tr>`);}}$('validationBody').innerHTML=rows.join('');$('validationNote').textContent=`${good} of ${total} checks match independently computed reference results within ±0.0000001 before display rounding.`;}
 calc();validate();changeMode('menu');const dtFixed=1/120;let accumulator=0,last=0,uiTick=0;
 function loop(now){const dt=clamp((now-(last||now))/1000,0,.06);last=now;accumulator+=dt;let steps=0;while(accumulator>=dtFixed&&steps<6){update(dtFixed);accumulator-=dtFixed;steps++;}if(steps===6)accumulator=0;draw();uiTick+=dt;if(uiTick>.06){uiTick=0;renderUI();if(state.mode==='lab'){updateLab();drawGraph();}}requestAnimationFrame(loop);}
 requestAnimationFrame(loop);
})();
