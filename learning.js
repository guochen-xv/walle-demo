/* Compact, paper-like Learning canvas. Rendering and animation share the app clock. */
(() => {
 const D=window.WALLE_DATA,P=D.situation.phases,S=window.WALLE_SIGNALS,$=s=>document.querySelector(s);
 const groups=D.coarse.cuts.map(frame=>({frame}));
 D.offline[3][0]='Foundation Model Reasoning';D.offline[3][4]='The framework uses foundation-model reasoning to refine coarse clips and describe actions, objects, goals and phase contracts.';
 D.offline[4][0]='Semantic Phase Refinement';D.offline[4][4]='Coarse event clips are merged or refined into four meaningful phases. Semantic boundaries organize the event-based clips into task phases.';
 D.offline[5][0]='Phase Contracts & Routing';
 $('#mini-episodes').innerHTML=D.episodes.map((e,i)=>`<article class="mini-episode ${i===0?'focus':''}" data-episode="${e.episodeId}" data-position="${i===0?'center':i===1?'right':'left'}" aria-label="Robot demonstration"><p class="demo-task">Task: <strong>Unzip bag</strong></p><div class="episode-views">${[['left','Left wrist'],['main','Main camera'],['right','Right wrist']].map(([view,label])=>`<figure>${i===0?`<video class="demo-inline-video" data-view="${view}" data-src="${e.videos[view]}" muted playsinline preload="none" aria-label="${label} demonstration"></video>`:`<img class="demo-inline-video" src="${e.images[view]}" alt="${label} demonstration" loading="lazy">`}</figure>`).join('')}</div></article>`).join('');
 window.WalleEpisodes.init();
 $('#coarse-count').textContent=`${D.coarse.clips.length} candidate clips`;
 $('#coarse-tracks').innerHTML=['left','right'].map(side=>`<div><span>${side==='left'?'L':'R'}</span><svg viewBox="0 0 2659 28" preserveAspectRatio="none" aria-label="Recorded ${side} gripper"><path d="${S[side].slice(0,2659).map((v,i)=>`${i?'L':'M'}${i+.5} ${(24-v*20).toFixed(2)}`).join('')}"/>${groups.map(g=>`<line x1="${g.frame+1}" x2="${g.frame+1}" y1="0" y2="28"/>`).join('')}</svg></div>`).join('');
 $('#coarse-tracks').querySelectorAll('svg').forEach(svg=>{const line=svg.querySelector('path'),area=line.cloneNode();area.setAttribute('class','coarse-signal-area');area.setAttribute('d',line.getAttribute('d')+' L2659 28 L0 28 Z');svg.insertBefore(area,line);});
 $('#coarse-clips').innerHTML=D.coarse.clips.map(c=>`<button data-coarse="${c.id}" title="Clip ${c.id+1}: frames ${c.frames.join('–')}" style="left:${c.frames[0]/2659*100}%;width:${(c.frames[1]-c.frames[0]+1)/2659*100}%" aria-label="Coarse clip ${c.id+1}, frames ${c.frames.join(' to ')}"><span>${c.id+1}</span></button>`).join('');
 function chip(p){return `<button data-phase="${p.id}" class="routed-phase ${p.method.toLowerCase()}" aria-pressed="false"><img src="${p.image}" alt=""><span><small>P${p.id}</small>${p.name}</span></button>`;}
 function phaseTracks(p){const [start,end]=p.frames,clips=D.coarse.clips.filter(c=>c.phaseId===p.id),length=end-start;
  return ['left','right'].map(side=>`<div class="phase-gripper-row"><span>${side==='left'?'L':'R'}</span><svg viewBox="0 0 ${length} 28" preserveAspectRatio="none" aria-label="Phase ${p.id} recorded ${side} gripper"><path d="${S[side].slice(start,end+1).map((v,i)=>`${i?'L':'M'}${i} ${(24-v*20).toFixed(2)}`).join('')}"/>${clips.slice(0,-1).map(c=>`<line class="phase-cut" x1="${c.frames[1]-start}" x2="${c.frames[1]-start}" y1="0" y2="28"/>`).join('')}<line class="phase-video-cursor" x1="0" x2="0" y1="0" y2="28"/></svg></div>`).join('')+`<div class="phase-coarse-segments">${clips.map(c=>`<span style="flex:${c.frames[1]-c.frames[0]+1}" title="Coarse clip ${c.id+1}: ${c.frames.join('–')}">${c.id+1}</span>`).join('')}</div>`;
 }
 $('#semantic-phases').innerHTML=P.map(p=>`<button type="button" data-phase="${p.id}" aria-pressed="${p.id===0}"><span class="phase-option-heading"><small>P${p.id}</small><strong>${p.name}</strong><em>${p.method}</em></span></button>`).join('');
 $('#semantic-preview').innerHTML=P.map(p=>`<article class="semantic-video-card" data-preview-panel="${p.id}" ${p.id!==0?'hidden':''}><div class="phase-preview-prompt"><small>PROMPT</small><p>${p.prompt}</p></div><div class="phase-three-views">${['left','main','right'].map(view=>`<video class="phase-preview-video" data-phase-preview="${p.id}" data-camera="${view}"  poster="${p.views[view]}" muted playsinline preload="none" aria-label="${p.name} · ${view==='main'?'Main camera':view+' wrist'}"></video>`).join('')}</div><div class="phase-gripper-evidence">${phaseTracks(p)}</div><div class="phase-frame-caption">Frames ${p.frames.join('–')} · Clip${p.id===0?'s 1–7':' '+(p.id+7)}</div><span class="phase-video-error" hidden>Preview unavailable</span></article>`).join('');
 const phasePreviews=initPhasePreviews();
 function initPhasePreviews(){
  const button=$('#phase-video-toggle'),reduce=matchMedia('(prefers-reduced-motion: reduce)');let manual=reduce.matches,active=0,disposed=false,running=true;
  const groups=[...document.querySelectorAll('#semantic-preview article')].map(card=>({card,range:window.WalleLearningMedia.range(Number(card.dataset.previewPanel)),videos:[...card.querySelectorAll('video')],main:card.querySelector('[data-camera="main"]'),visible:false,busy:false,attempt:0,started:0,lastTime:0,lastAdvance:performance.now(),lastReload:-Infinity,stalled:false,prepared:false,preparing:null,urls:[]}));
  const wanted=g=>running&&!disposed&&!manual&&!document.hidden&&!g.card.hidden&&g.visible;
  const stop=g=>{g.attempt++;g.busy=false;g.videos.forEach(v=>v.pause());};
  function label(){if(!button)return;const g=groups[active];button.textContent=manual||g.stalled?'Play video':'Pause video';button.setAttribute('aria-label',button.textContent);}
  async function prepare(g){
   if(g.prepared||g.preparing)return;
   g.preparing=Promise.all(g.videos.map(async v=>{
    const source=await window.WalleLearningMedia.source(v.dataset.camera);
    if(!disposed){v.src=source;v.preload='auto';v.load();}

   })).then(()=>{g.prepared=true;}).catch(()=>{g.stalled=true;g.lastReload=performance.now();g.card.querySelector('.phase-video-error').hidden=false;}).finally(()=>{g.preparing=null;if(g.prepared&&!disposed)update();});
  }
  function restart(g,reload=false){
   stop(g);const time=g.main.ended||g.main.currentTime<g.range.start-1/60||g.main.currentTime>=g.range.end?g.range.start:g.main.currentTime;g.lastAdvance=performance.now();g.lastTime=time;
   g.videos.forEach(v=>{if(reload){v.load();}if(v.readyState>=1&&Number.isFinite(time)){try{v.currentTime=Math.min(time,Math.max(0,(v.duration||time+.1)-.05));}catch{}}});
  }
  function update(){
   groups.forEach(g=>{
    if(!wanted(g)){if(g.busy||g.videos.some(v=>!v.paused))stop(g);return;}
    if(!g.prepared){if(performance.now()-g.lastReload>3000)prepare(g);return;}
    if(g.busy||!g.videos.every(v=>v.readyState>=1&&!v.seeking))return;
    if(g.videos.every(v=>!v.paused))return;
    const time=g.main.ended||g.main.currentTime<g.range.start-1/60||g.main.currentTime>=g.range.end?g.range.start:g.main.currentTime;
    // Seek first; seeked events resume the group once all views have a decoded frame.
    let seeking=false;g.videos.forEach(v=>{v.playbackRate=g.range.rate;if(v.ended||v.currentTime<g.range.start-1/60||v.currentTime>=g.range.end||Math.abs(v.currentTime-time)>.15){try{v.currentTime=time;seeking=true;}catch{}}});if(seeking||!g.videos.every(v=>v.readyState>=2))return;
    g.busy=true;g.started=performance.now();const attempt=++g.attempt;
    Promise.all(g.videos.map(v=>v.play())).catch(error=>{if(g.attempt!==attempt)return;g.videos.forEach(v=>v.pause());if(error?.name==='NotAllowedError'){manual=true;g.stalled=true;}}).finally(()=>{if(g.attempt!==attempt)return;g.busy=false;if(!wanted(g))stop(g);label();});
   });label();
  }
  const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{const g=groups.find(g=>g.card===e.target);g.visible=e.isIntersecting&&e.intersectionRatio>=.15;if(g.visible){g.lastAdvance=performance.now();g.lastTime=g.main.currentTime;}});update();},{threshold:[0,.15]});
  groups.forEach(g=>{observer.observe(g.card);
   g.videos.forEach(v=>{v.muted=true;v.defaultPlaybackRate=g.range.rate;v.playbackRate=g.range.rate;
    ['loadedmetadata','canplay','loadeddata','seeked'].forEach(event=>v.addEventListener(event,update));
    v.addEventListener('error',()=>{g.stalled=true;g.card.querySelector('.phase-video-error').hidden=false;label();});
    v.addEventListener('ended',()=>{if(!wanted(g))return;restart(g);g.videos.forEach(other=>{if(other.readyState>=1)other.currentTime=g.range.start;});update();});
   });
   const enforceEnd=()=>{if(wanted(g)&&g.main.currentTime>=g.range.end){stop(g);g.videos.forEach(v=>{if(v.readyState>=1)v.currentTime=g.range.start;});update();}};
   if(g.main.requestVideoFrameCallback){const frame=()=>{if(disposed)return;enforceEnd();g.main.requestVideoFrameCallback(frame);};g.main.requestVideoFrameCallback(frame);}
   g.main.addEventListener('timeupdate',enforceEnd);
  });
  const drawCursors=()=>{groups.forEach(g=>{const p=P[Number(g.card.dataset.previewPanel)],x=Math.min(p.frames[1]-p.frames[0],Math.max(0,(g.main.currentTime-g.range.start)*g.range.framesPerSecond));g.card.querySelectorAll('.phase-video-cursor').forEach(line=>{line.setAttribute('x1',x);line.setAttribute('x2',x);});});};
  const cursorFrame=()=>{if(disposed)return;drawCursors();requestAnimationFrame(cursorFrame);};
  cursorFrame();
  const sync=setInterval(()=>{const now=performance.now();groups.forEach(g=>{if(!wanted(g))return;
   if(g.main.currentTime>=g.range.end){stop(g);g.videos.forEach(v=>{if(v.readyState>=1)v.currentTime=g.range.start;});g.lastTime=g.range.start;g.lastAdvance=now;}
   if(Math.abs(g.main.currentTime-g.lastTime)>.01){g.lastTime=g.main.currentTime;g.lastAdvance=now;g.stalled=false;g.card.querySelector('.phase-video-error').hidden=true;}
   if(g.busy&&now-g.started>2000){stop(g);g.stalled=true;}
   if(g.prepared&&now-g.lastAdvance>3000){g.stalled=true;if(now-g.lastReload>8000){g.lastReload=now;restart(g,true);}}
   if(!g.busy&&!g.main.paused)g.videos.forEach(v=>{if(v!==g.main&&v.readyState>=2&&!v.seeking&&Math.abs(v.currentTime-g.main.currentTime)>.2)v.currentTime=g.main.currentTime;});
  });update();},200);
  if(button)button.onclick=()=>{const g=groups[active];if(manual||g.stalled||g.videos.every(v=>v.paused)){manual=false;restart(g,g.videos.some(v=>v.error));g.stalled=false;g.card.querySelector('.phase-video-error').hidden=true;}else{manual=true;stop(g);}update();};
  document.addEventListener('visibilitychange',()=>{groups.forEach(g=>{g.lastAdvance=performance.now();g.lastTime=g.main.currentTime;});update();});reduce.addEventListener('change',()=>{manual=reduce.matches;update();});
  window.addEventListener('pagehide',()=>{disposed=true;clearInterval(sync);observer.disconnect();groups.forEach(g=>{stop(g);g.urls.forEach(url=>URL.revokeObjectURL(url));});},{once:true});update();
  return {setRunning(value){running=value;update();},select(id){if(id===active)return;active=id;groups.forEach(g=>{g.card.hidden=Number(g.card.dataset.previewPanel)!==id;if(g.card.hidden)stop(g);else{g.lastAdvance=performance.now();g.lastTime=g.main.currentTime;}});update();}};
 }
 $('#vla-inputs').innerHTML=P.filter(p=>p.method==='VLA').map(chip).join('');
 $('#control-inputs').innerHTML=chip(P[2]);
 let paths=[],vlaInputs=[];
 function connectVlaInputs(){
  const lane=$('#vla-lane'),svg=$('.vla-input-connections'),r=lane.getBoundingClientRect(),body=$('#vla-model-body').getBoundingClientRect(),art=$('.vla-original-art').getBoundingClientRect();
  svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
  const inputs=$('#vla-inputs');
  inputs.style.width='100%';
  inputs.style.marginLeft='0px';
  const group=inputs.getBoundingClientRect(),x=group.left+group.width/2-r.left;
  const routes=[-30,0,30].map(offset=>`M${x+offset} ${group.top-r.top-2} L${x+offset} ${body.bottom-r.top+5}`);
  svg.innerHTML='<defs><marker id="vla-input-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#4c78a8"/></marker></defs>'+routes.map(d=>`<path class="vla-input-wire" d="${d}" marker-end="url(#vla-input-arrow)"/><circle class="vla-input-dot" r="3"/>`).join('');
  vlaInputs=[...svg.querySelectorAll('.vla-input-wire')].map(el=>({el,dot:el.nextElementSibling}));
 }

 function render(ui){const p=P[ui.phase];phasePreviews.select(ui.phase);
 $('#offline-view').querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.phase)===ui.phase));
 $('#offline-view').querySelectorAll('[data-flow-step]').forEach(n=>n.classList.toggle('flow-active',ui.playing));
 $('#vla-lane').classList.toggle('selected-route',p.method==='VLA');$('#control-lane').classList.toggle('selected-route',p.id===2);
 }
 function connect(){connectVlaInputs();const board=$('#offline-view'),svg=$('#learning-connections'),r=board.getBoundingClientRect();
 const box=id=>{const b=$(id).getBoundingClientRect();return {l:b.left-r.left,r:b.right-r.left,t:b.top-r.top,b:b.bottom-r.top,cx:b.left+b.width/2-r.left,cy:b.top+b.height/2-r.top};};
 const demo=box('#demo-module'),b=box('#coarse-module'),c=box('#reasoning-module'),d=box('#refinement-module'),v=box('#vla-lane'),k=box('#control-lane'),pa=box('#parsing-module'),sk=box('#skills-module'),sit={t:r.height,cx:r.width/2};
 const mobile=innerWidth<1200;svg.style.height=Math.max(r.height,sit.t+1)+'px';svg.setAttribute('viewBox',`0 0 ${r.width} ${Math.max(r.height,sit.t+1)}`);
 const elbow=points=>{let out=`M${points[0][0]} ${points[0][1]}`;for(let i=1;i<points.length-1;i++){const [x,y]=points[i],[px,py]=points[i-1],[nx,ny]=points[i+1],l=Math.hypot(x-px,y-py),n=Math.hypot(nx-x,ny-y),rad=Math.min(6,l/2,n/2);if(!l||!n)continue;out+=` L${x-(x-px)/l*rad} ${y-(y-py)/l*rad} Q${x} ${y} ${x+(nx-x)/n*rad} ${y+(ny-y)/n*rad}`;}return out+` L${points.at(-1)[0]} ${points.at(-1)[1]}`;};
 const down=(from,to)=>`M${from.cx} ${from.b+2} L${to.cx} ${to.t-4}`;
 const midY=(demo.b+pa.t)/2;
 const incomingX=mobile?b.r+12:(pa.r+sk.l)/2;
 const incoming=elbow([[demo.cx,demo.b+2],[demo.cx,midY],[incomingX,midY],[incomingX,b.cy],[b.r+4,b.cy]]);
 const junction={x:(pa.r+sk.l)/2,y:d.t+Math.min(48,d.b-d.t)};
 const vy=v.cy,ky=k.cy;
 // The visible branches and moving packets reuse the same rounded endpoints.
 const turn=target=>{const direction=target.cy<junction.y?-1:1;return `L${junction.x} ${target.cy-direction*6} Q${junction.x} ${target.cy} ${junction.x+6} ${target.cy} L${target.l-4} ${target.cy}`;};
 const branch=target=>`M${d.r+2} ${junction.y} L${junction.x} ${junction.y} ${turn(target)}`;
 const strip=box('#compact-routing');
 const vlaPath=mobile?`M${v.cx} ${strip.b+2} L${v.cx} ${v.t-4}`:branch(v);
 const controlPath=mobile?`M${k.cx} ${k.t-22} L${k.cx} ${k.t-4}`:branch(k);
 const leftX=mobile?r.width*.32:pa.cx,rightX=mobile?r.width*.68:sk.cx;
 const mergeY=sit.t-24, mergeX=sit.cx;
 const output=(x,y)=>elbow([[x,y+2],[x,mergeY],[mergeX,mergeY]]);
 const defs=[['incoming',incoming,'#4C78A8'],['coarse',down(b,c),'#8066A5'],['refine',down(c,d),'#8066A5'],['vla',vlaPath,'#4C78A8'],['control',controlPath,'#39877D'],['contracts',output(leftX,mobile?sk.b:pa.b),'#8066A5'],['skills',output(rightX,sk.b),'#8066A5']];
 const visiblePath=(id,path,color,arrow=true)=>`<path class="canvas-flow-path" d="${path}" stroke="${color}" ${arrow?`marker-end="url(#arrow-${id})"`:''}/><path class="canvas-flow-energy" d="${path}" stroke="${color}"/>`;
 let drawn=defs.filter(([id])=>mobile||!['vla','control'].includes(id)).map(([id,path,color])=>visiblePath(id,path,color,!['contracts','skills'].includes(id))).join('');
 drawn+=visiblePath('skills',`M${mergeX} ${mergeY} L${mergeX} ${sit.t}`,'#8066A5',false);

 if(!mobile){drawn+=visiblePath('coarse',`M${d.r+2} ${junction.y} L${junction.x} ${junction.y}`,'#8066A5',false)+visiblePath('coarse',`M${junction.x} ${Math.min(vy+6,junction.y)} L${junction.x} ${Math.max(ky-6,junction.y)}`,'#8066A5',false)+visiblePath('vla',`M${junction.x} ${vy+6} ${turn(v)}`,'#4C78A8')+visiblePath('control',`M${junction.x} ${ky-6} ${turn(k)}`,'#39877D')+`<circle cx="${junction.x}" cy="${junction.y}" r="2.5" fill="#8066A5"/>`;}
 svg.innerHTML=`<defs>${defs.map(([id,,color])=>`<marker id="arrow-${id}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${color}"/></marker>`).join('')}</defs>`+drawn+defs.map(([id,path])=>`<path id="learning-path-${id}" d="${path}" fill="none" stroke="none"/>`).join('');
 const labels={incoming:'Demonstration',coarse:'Coarse clips',refine:'Phases + contracts',control:'P2 · Grasp',contracts:'Task structure & contracts',skills:'Prepared skills'},vlaLabels=['P0 · Adjust','P1 · Support','P3 · Unzip'];
 $('#learning-travel').innerHTML=defs.flatMap(([id,,color])=>(id==='vla'?vlaLabels:[labels[id]]).map((label,index)=>`<div class="learning-travel ${mobile&&!['contracts','skills'].includes(id)?'compact-packet':''}" data-path="${id}" data-delay="${id==='vla'?index*4/3:id==='skills'?2:0}" style="color:${color}"><span>${label}</span></div>`)).join('');
 paths=defs.map(([id,,color])=>({id,color,el:$('#learning-path-'+id),packets:[...document.querySelectorAll('#learning-travel [data-path="'+id+'"]')]}));animate(lastTime);
 }

 let lastTime=0;
 let queued=false;const observer=new ResizeObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;connect();});}});
 ['#demo-module','#parsing-module','#skills-module','#situation'].forEach(id=>observer.observe($(id)));
 document.fonts.ready.then(()=>connect());
 function animateVlaSequence(time){
  const still=time===0||matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cycle=(time%5)/5,clamp=x=>Math.min(1,Math.max(0,x));
  const input=clamp(cycle/.3),inside=clamp((cycle-.3)/.27),output=clamp((cycle-.57)/.18),result=clamp((cycle-.75)/.12);
  vlaInputs.forEach(({el,dot})=>{const length=el.getTotalLength(),p=el.getPointAtLength(length*input);el.style.strokeDasharray=still?'none':`${length} ${length}`;el.style.strokeDashoffset=still?'0':String(length*(1-input));el.style.opacity=still?'1':String(.25+.75*input);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);dot.style.opacity=!still&&cycle<.3?'1':'0';});
  const reveal=$('#vla-reveal-window');reveal.setAttribute('y','70');reveal.setAttribute('height',still?'105':String(inside*102+1));
  document.querySelectorAll('.vla-model-loop').forEach(el=>{el.style.opacity=still?'1':String(.15+.85*inside);el.style.strokeDashoffset=String(-inside*18);});
  document.querySelectorAll('.vla-output-arrow,.vla-progress-arrow').forEach(el=>{const length=el.getTotalLength();el.style.strokeDasharray=still?'none':`${length} ${length}`;el.style.strokeDashoffset=still?'0':String(length*(1-output));el.style.opacity=still?'1':String(output);});
  document.querySelectorAll('.vla-action-result,.vla-progress-result').forEach(el=>el.style.opacity=still?'1':String(.35+.65*result));
  const model=$('#vla-model-body');model.style.fill=!still&&cycle>=.3&&cycle<.75?'#E3EEF7':'#EEF4F9';
 }
 function animateCoarseSegmentation(time){
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cycle=time%4,step=.24,start=.15,fade=cycle>3.65?Math.max(0,(4-cycle)/.35):1;
  const clamp=x=>Math.max(0,Math.min(1,x));
  $('#coarse-tracks').querySelectorAll('svg').forEach(svg=>{
   svg.querySelectorAll('line').forEach((line,i)=>{
    const progress=still?1:clamp((cycle-start-i*step)/.14);
    line.setAttribute('y2',String(28*progress));
    line.style.opacity=still?'1':String(progress*fade);
    line.style.strokeWidth=!still&&progress>0&&progress<1?'2':'1';
   });
  });
  $('#coarse-clips').querySelectorAll('button').forEach((clip,i)=>{
   const progress=still?1:clamp((cycle-start-i*step-.1)/.18);
   clip.style.transformOrigin='left center';
   clip.style.transform=`scaleX(${still?1:progress})`;
   clip.style.opacity=still?'1':String(progress*fade);
  });
 }
 function animateReasoning(time){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phase=(time%2)*2;
  const pulse=(start,width)=>reduced?0:Math.sin(Math.PI*Math.max(0,Math.min(1,(phase-start)/width)))**2;
  const glow=pulse(.65,1.35),module=$('#reasoning-module');
  module.style.boxShadow=`0 0 0 ${glow*4}px rgba(128,102,165,${glow*.09}),inset 0 0 ${glow*28}px rgba(128,102,165,${glow*.08})`;
  module.style.borderColor=`rgba(128,102,165,${.22+glow*.38})`;
  module.querySelectorAll('.reasoning-model-logos img').forEach((img,i)=>{
   const light=pulse(.7+i*.35,.7);
   img.style.filter=`drop-shadow(0 0 ${light*5}px rgba(128,102,165,${light*.4}))`;
   img.style.transform=`scale(${1+light*.07})`;
  });
 }
 function animate(time){lastTime=time;if(!paths.length)return;
 // All routes share one clock; VLA phases launch at staggered intervals on the same path.
 animateVlaSequence(time);
 animateCoarseSegmentation(time);
 animateReasoning(time);
 window.WalleBridges?.animate(time);

 paths.forEach(path=>{const length=path.el.getTotalLength();path.packets.forEach(packet=>{const duration=path.id==='vla'?4*length/Math.max(1,paths.find(p=>p.id==='control').el.getTotalLength()):4;const elapsed=time-Number(packet.dataset.delay)*duration/4;const progress=Math.max(0,elapsed%duration)/duration;const point=path.el.getPointAtLength(length*progress);packet.style.transform=`translate(${point.x}px,${point.y}px)`;const fadeWindow=Math.min(duration*.45,Math.max(.35,duration*38/Math.max(1,length))); const localTime=progress*duration;const fade=Math.max(0,Math.min(1,localTime/fadeWindow,(duration-localTime)/fadeWindow));packet.style.opacity=elapsed>=0?String(fade*fade*(3-2*fade)):'0';});});
 $('#semantic-phases').querySelectorAll('button').forEach(b=>b.classList.toggle('generated-phase',time>0));
 $('#learning-connections').querySelectorAll('.canvas-flow-energy').forEach(p=>{p.style.strokeDashoffset=String(-time*32);p.style.opacity='.7';});
 }
 window.WalleCanvas={render,connect,animate,setPlaying(value){phasePreviews.setRunning(value);}};
})();
