(() => {
'use strict';
const D=window.WALLE_DATA,E=window.WalleEngine,P=D.situation.phases;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ui={learningTime:0,agentPlaying:false,runtime:E.initial(),playing:true,learningPausedByUser:false,heroPaused:false,started:true,tour:false,view:'offline',node:0,phase:0,situationPhase:0,evidence:'main',frame:0,episode:0,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,visualTime:0,heroTime:0};
const loopNames=['Observe','Identify Situation','Select Phase','Execute','Verify','Transition'];
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const route=p=>`<span class="route ${p.method==='VLA'?'blue':'teal'}">${p.method}</span>`;
const timestamp=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
function schematic(p){return `<div class="schematic"><svg viewBox="0 0 220 120" aria-hidden="true">${p.id===4?'<path d="M20 105H85M45 100V76L79 50L61 24L103 14L134 49M127 48L139 43L151 59M132 51L132 65M151 105H207M177 100V76L150 50"/><circle cx="79" cy="50" r="6"/><circle cx="45" cy="76" r="6"/>':'<rect x="65" y="40" width="110" height="65" rx="14"/><path d="M75 52H166M20 15L45 40L45 65M35 65V80H52V65M53 73L67 72"/><circle cx="68" cy="72" r="5"/>'}</svg><span>${p.id===4?'Release → retract → home':'Left hand → stable edge support'}</span></div>`;}
function image(p,mode='main',runtime=false){
 if(mode==='mask'||mode==='trajectory')return `<div class="artifact-pending"><span>◇</span><h4>${mode==='mask'?'SAM segmentation':'Target-relative grasp waypoints'}</h4><p>${mode==='mask'?'Reference images':'Grasp references'}</p><small>Recorded images are available below. </small></div>`;
 const view=mode==='wrist'?'left':mode,source=p.views?.[view]||p.image;
 return `<div class="image-wrap"><img src="${esc(source)}" alt="${esc(p.name)} · ${view} camera · Ep 0 frame ${p.referenceFrame}" loading="lazy"><span class="image-label">Ep 0 · ${view==='main'?'Main camera':view==='left'?'Left wrist':'Right wrist'} · Frame ${p.referenceFrame}${runtime?' · Situation reference':''}</span></div>`;
}
function referenceViews(p){return `<div class="reference-views">${['main','left','right'].map(v=>image(p,v)).join('')}</div><p class="reference-note">Recorded phase-end references · Frame ${p.referenceFrame}. </p>`;}
function phasePicker(){return `<div class="node-phase-picker" role="group" aria-label="Inspect phase material">${P.map(p=>`<button data-phase="${p.id}" aria-pressed="${ui.phase===p.id}">P${p.id}</button>`).join('')}</div>`;}

function nodeDetail(i){const n=D.offline[i],p=P[ui.phase];let content='';
 if(i===0)content=`<div class="node-demo-list">${D.episodes.map(ep=>`<div class="node-demo-record"><video src="${ep.video}" poster="${ep.poster}" controls muted playsinline preload="none" aria-label="${ep.id} recorded demonstration"></video><span><strong>${ep.id}</strong><small>${ep.annotated?'Main case · four annotated phases':'Preview only · unannotated'}</small></span></div>`).join('')}</div>`;
 else if(i===1)content=`<div class="dataset-facts"><span><b>2,855</b> frames</span><span><b>30</b> fps</span><span><b>3</b> views</span></div><dl><dt>Robot</dt><dd>IMetaY1 · two arms</dd><dt>Recorded proprioception</dt><dd>12 joint positions + 2 gripper values; two end-effector poses</dd><dt>Video duration</dt><dd>95.17 seconds · separate from narrative playback</dd></dl><a class="outline" href="#situation">Inspect recorded references ↗</a>`;
 else if(i===2)content=`<span class="source-chip">11 clips · user-confirmed inclusive cuts</span><p>${D.coarse.clips.map(c=>`C${c.id+1}: ${c.frames.join('–')} → P${c.phaseId}`).join('<br>')}</p><div class="boundary-list">${P.map(x=>`<button data-phase="${x.id}" aria-pressed="${ui.phase===x.id}"><span>P${x.id} · ${x.name}</span><small>${x.frames.join('–')}</small></button>`).join('')}</div><p class="reference-note">Gripper changes are observations, not automatic phase or success labels.</p>`;
 else if(i===3||i===4)content=`${phasePicker()}<h4>P${p.id} · ${p.name}</h4>${image(p)}<dl><dt>${i===3?'Recorded action':'Object / Part'}</dt><dd>${i===3?p.action:p.object+' / '+p.part}</dd><dt>${i===3?'Expected end state':'Local goal'}</dt><dd>${i===3?p.evidence.join('; '):p.goal}</dd></dl><span class="source-chip">Phase description</span>`;
 else if(i===5)content=`<div class="method-list">${P.map(x=>`<button data-phase="${x.id}" aria-pressed="${ui.phase===x.id}"><span>P${x.id} · ${x.name}</span>${route(x)}</button>`).join('')}</div><h4>P${p.id} · ${p.name}</h4><p>${p.reason}</p><span class="source-chip">Intended capability route · not a trained output</span>`;
 else if(i===6)content=`${phasePicker()}<div class="route-branches"><div><span class="route blue">VLA · P0 / P1 / P3</span><p>Phase clips + prompts</p><span class="material-status available">Materials available</span><p>Policy training / progress model</p><span class="material-status">Policy training</span></div><div><span class="route teal">Control · P2</span><p>Goals, prerequisites and reference images</p><span class="material-status available">Requirements available</span><p>SAM mask / stereo localization / grasp waypoints</p><span class="material-status">Control materials</span></div></div><a class="outline" href="#situation">Inspect source evidence ↗</a>`;
 else if(i===7)content=`${phasePicker()}<h4>P${p.id} · ${p.name}</h4>${referenceViews(p)}<p class="prompt">${p.prompt}</p><dl><dt>Goal</dt><dd>${p.goal}</dd><dt>Preconditions</dt><dd>${p.preconditions.join("; ")}</dd><dt>Completion evidence</dt><dd>${p.evidence.join("; ")}</dd><dt>Recovery</dt><dd>${p.recovery}</dd></dl><div class="phase-video"><label>Recorded phase · frames ${p.frames.join("–")}<select id="phase-video-view"><option value="main">Main camera</option><option value="left">Left wrist</option><option value="right">Right wrist</option></select></label><video id="phase-video" controls muted playsinline preload="metadata" src="${D.media.videos.main}"></video></div><dl><dt>Contract source</dt><dd>${p.annotationSource}</dd><dt>Available</dt><dd>Prompt, goal, preconditions, recovery and three-view references</dd><dt>Capability artifacts</dt><dd>${p.method==='VLA'?'Policy checkpoint and progress model':p.id===4?'Home joint target configuration':'SAM, stereo pose and target-relative waypoints'}</dd></dl>`;
 else content=`<div class="situation-parts"><span>Task context</span><span>Phase dependencies</span><span>Four phase contracts</span><span>Material references + preparation status</span></div><p class="reference-note">Task context, phase contracts and skill references for Unzip bag.</p><button class="outline" data-explore>Explore Situation ↗</button>`;
 return `<div class="eyebrow learning-text">LEARNING / ${String(i+1).padStart(2,'0')}</div><h3>${n[0]}</h3><p>${n[4]}</p><dl><dt>Input</dt><dd>${n[2]}</dd><dt>Output</dt><dd>${n[3]}</dd></dl>${content}`;
}

function renderOffline(){window.WalleCanvas.render(ui);if($('#learning-detail-dialog').open)$('#node-detail').innerHTML=nodeDetail(ui.node);}
function drawConnections(){window.WalleCanvas.connect();window.WalleCanvas.animate(ui.learningTime);}
function status(i){const s=ui.runtime;return s.complete.includes(i)?'Complete':s.section==='online'&&s.phase===i?s.status:'Pending';}
const toolIcons={policy:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 9h8M8 15h8M9 9v6m6-6v6"/>',mask:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="7" y="7" width="10" height="10" rx="3"/>',stereo:'<circle cx="7" cy="12" r="4"/><circle cx="17" cy="12" r="4"/><path d="M7 5h10M7 19h10"/>',path:'<path d="M5 18l7-12 7 12"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="19" cy="18" r="2"/>'};
const situationIcons={
 images:'<rect x="6" y="6" width="15" height="15" rx="3"/><path d="M17 3H6a3 3 0 0 0-3 3v11m4 0 4-4 3 3 3-4 4 5"/><circle cx="11" cy="10" r="1"/>',
 contract:'<rect x="5" y="3" width="14" height="18" rx="3"/><path d="m8 8 1 1 2-2m2 1h3m-8 5h2m3 0h3m-8 4h2m3 0h3"/>',
 goal:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>',
 conditions:'<rect x="3" y="7" width="18" height="10" rx="5"/><circle cx="8" cy="12" r="2"/>',
 evidence:'<circle cx="12" cy="12" r="8"/><path d="m8 12 3 3 5-6"/>',
 recovery:'<path d="M8 5 3 10l5 5m-5-5h12a5 5 0 0 1 0 10h-3"/>',
 tools:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 17h7m-3.5-3.5v7"/>',
 arm:'<path d="M4 21h14M7 21v-5l5-5-4-5 7-2 3 5m-3 1 5-2 2 5m-7-4 2 5"/><circle cx="7" cy="16" r="2"/><circle cx="12" cy="11" r="2"/>'
};
const situationIcon=key=>`<svg class="situation-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${situationIcons[key]}</svg>`;
let situationRendered=-1,situationAnimation;
function situationMarkup(p){
 return `<div class="situation-columns"><div class="situation-visual-column"><div class="situation-phase-intro"><div><span class="eyebrow purple-text">PHASE ${String(p.id).padStart(2,'0')}</span><h3>${esc(p.name)}</h3></div><p>${esc(p.prompt)}</p></div>
 <div class="situation-references"><h4>${situationIcon('images')}Reference images</h4><div class="situation-photos">${['left','main','right'].map(view=>`<figure><img src="${esc(p.views?.[view]||p.image)}" alt="${esc(p.name)} — ${view==='main'?'main view':view+' wrist'} reference, frame ${p.referenceFrame}"><figcaption hidden>Reference image unavailable</figcaption></figure>`).join('')}</div></div>
 </div><div class="situation-contract-column"><div class="situation-knowledge"><h4>${situationIcon('contract')}Phase Contract</h4><dl class="situation-contract">${[['Local goal',p.goal,'goal'],['Preconditions',p.preconditions.join('; '),'conditions'],['Completion evidence',p.evidence.join('; '),'evidence'],['Recovery',p.recovery,'recovery']].map(([label,value,icon])=>`<div${label==='Recovery'?' class="recovery-row"':''}><dt>${situationIcon(icon)}<span>${label}</span></dt><dd>${esc(value)}</dd></div>`).join('')}</dl><p class="contract-dependencies">${esc(D.situation.dependencies.join(' · '))}</p></div>
 <div class="situation-tools"><div class="situation-tools-heading"><h4>${situationIcon('tools')}Tools &amp; execution</h4>${route(p)}<span>${esc(p.hand)}</span></div><p class="situation-routing">${esc(p.reason)}</p><div class="situation-tool-list ${p.method==='VLA'?'vla':'control'}">${p.tools.map(t=>`<div class="situation-tool"><span class="situation-tool-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${t.name==='cuRobo'?situationIcons.arm:toolIcons[t.icon]}</svg></span><div><strong>${esc(t.name)}</strong><p>${esc(t.purpose)}</p></div></div>`).join('')}</div></div></div></div>`;
}
let situationWidth=0;
function measureSituation(force=false){
 const detail=$('#phase-detail'),width=detail.getBoundingClientRect().width;
 if(!width||(!force&&Math.abs(width-situationWidth)<.5))return;
 situationWidth=width;
 // Measure all phases at the actual responsive width, without touching the visible selection.
 const probe=document.createElement('div');
 probe.className='phase-detail situation-measure';probe.setAttribute('aria-hidden','true');probe.inert=true;
 probe.style.width=width+'px';detail.parentElement.append(probe);
 let maximum=0;
 for(const phase of P){probe.innerHTML=situationMarkup(phase);maximum=Math.max(maximum,probe.querySelector('.situation-columns').getBoundingClientRect().height);}
 probe.remove();detail.style.setProperty('--situation-content-height',Math.ceil(maximum)+'px');
}
new ResizeObserver(()=>measureSituation()).observe($('#phase-detail'));
document.fonts?.ready.then(()=>measureSituation(true));
function renderSituation(){
 const p=P[ui.situationPhase];
 if(situationRendered===p.id)return;
 situationRendered=p.id;

 const cards=$('#phase-cards');
 if(!cards.children.length)cards.innerHTML=P.map(x=>`<button class="phase-card" data-situation-phase="${x.id}" aria-pressed="false"><small>PHASE ${String(x.id).padStart(2,'0')}</small><h4>${esc(x.name)}</h4>${route(x)}</button>`).join('');
 cards.querySelectorAll('button').forEach(b=>{const selected=Number(b.dataset.situationPhase)===p.id;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
 const detail=$('#phase-detail');
 detail.innerHTML=situationMarkup(p);
 measureSituation();
 detail.querySelectorAll('img').forEach(img=>{img.addEventListener('error',()=>{img.hidden=true;img.nextElementSibling.hidden=false;});});
}
let situationAuto=!matchMedia('(prefers-reduced-motion: reduce)').matches,situationElapsed=0;
function updateSituationAutoplay(){const b=$('#situation-autoplay');b.textContent=situationAuto?'Pause slideshow':'Play slideshow';b.setAttribute('aria-pressed',String(situationAuto));}
$('#situation-autoplay').onclick=()=>{situationAuto=!situationAuto;updateSituationAutoplay();};
updateSituationAutoplay();
function selectSituation(id,automatic=false){
 if(!automatic){situationAuto=false;situationElapsed=0;updateSituationAutoplay();}
 if(!P[id]||id===ui.situationPhase)return;
 ui.tour=false;ui.situationPhase=id;
 const detail=$('#phase-detail');situationAnimation?.cancel();
 if(!ui.motion||matchMedia('(prefers-reduced-motion: reduce)').matches){renderSituation();return;}
 situationAnimation=detail.animate([{opacity:1},{opacity:0}],{duration:100,fill:'forwards'});
 situationAnimation.onfinish=()=>{renderSituation();situationAnimation=detail.animate([{opacity:0},{opacity:1}],{duration:120,fill:'forwards'});};
}

function renderOnline(){}
function controls(){
 $('#play').textContent=ui.playing?'Ⅱ Pause learning':ui.started?'▶ Continue learning':'▶ Play learning';$('#play').disabled=false;$('#play').setAttribute('aria-label',ui.playing?'Pause learning':ui.started?'Continue learning':'Play learning');
 window.WalleCanvas.setPlaying(ui.playing&&ui.motion);window.WalleEpisodes.setPlaying(ui.playing&&ui.motion);document.body.classList.toggle('motion-off',!ui.motion);document.body.classList.toggle('learning-paused',!ui.playing);$('#motion').textContent=ui.motion?'Motion on':'Motion off';$('#motion').setAttribute('aria-pressed',String(ui.motion));
 $('#play-status').textContent=ui.playing?'Demonstration → phases → skills → Situation':ui.started?'Paused · inspect any stage':'From demonstrations to Situation';

}
function render(){controls();renderOffline();drawConnections();renderSituation();renderOnline();}
function pause(freezeHero=false){if(freezeHero)ui.heroPaused=true;ui.playing=false;ui.tour=false;controls();$$('video:not(.demo-inline-video):not(.agent-video):not(.phase-preview-video)').forEach(v=>v.pause());}
function scrollToSection(id){$(id).scrollIntoView({behavior:ui.motion?'smooth':'instant',block:'start'});}
function explore(){scrollToSection('#situation');}
function reset(){ui.learningPausedByUser=false;window.WalleControl?.reset();ui.learningTime=0;ui.node=0;ui.started=true;ui.playing=true;ui.tour=false;ui.heroPaused=false;render();}

function start(){reset();ui.started=true;ui.playing=true;ui.tour=true;controls();scrollToSection('#workspace');}
function inspectPhase(id){ui.tour=false;ui.phase=id;ui.frame=P[id].frames[0];render();if($('#learning-detail-dialog').open)setupPhaseVideo();}
function openDetail(i){pause();ui.node=i;$('#node-detail').innerHTML=nodeDetail(i);$('#learning-detail-dialog').showModal();setupPhaseVideo();}
const videoBlobs=new Map();
async function setupPhaseVideo(){const v=$('#phase-video');if(!v)return;const range=P[ui.phase].frames,speed=D.media.encodedSpeed||1;let current=range[0]/30/speed;v.playbackRate=1/speed;
 async function source(view){const url=D.media.videos[view];if(location.protocol==='http:'&&!videoBlobs.has(url)){try{const head=await fetch(url,{method:'HEAD'});if(!head.headers.get('Accept-Ranges'))videoBlobs.set(url,URL.createObjectURL(await (await fetch(url)).blob()));}catch{}}
 if(!v.isConnected)return;v.src=videoBlobs.get(url)||url;v.onloadedmetadata=()=>{v.currentTime=current;};}
 v.ontimeupdate=()=>{if(v.currentTime>(range[1]+1)/30/speed){v.pause();v.currentTime=range[1]/30/speed;}};
 $('#phase-video-view').onchange=e=>{current=v.currentTime;source(e.target.value);};source('main');}
$('#close-learning-detail').onclick=()=>$('#learning-detail-dialog').close();
$('#learning-detail-dialog').addEventListener('close',()=>$$('#learning-detail-dialog video').forEach(v=>v.pause()));
$('#start-tour').onclick=start;$('#closing-replay').onclick=start;$('#replay').onclick=reset;
$('#play').onclick=()=>{if(ui.playing){ui.learningPausedByUser=true;pause();}else{ui.learningPausedByUser=false;ui.started=true;ui.heroPaused=false;syncLearningPlayback();renderOffline();}};
$('#motion').onclick=()=>{ui.motion=!ui.motion;ui.heroPaused=false;renderOffline();controls();window.WalleCanvas.animate(ui.learningTime);};

document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;
 if(b.hasAttribute('data-explore'))explore();
 if(b.dataset.situationPhase!==undefined)selectSituation(Number(b.dataset.situationPhase));



 if(b.dataset.coarse!==undefined){const clip=D.coarse.clips[Number(b.dataset.coarse)];inspectPhase(clip.phaseId);}
 if(b.dataset.phase!==undefined)inspectPhase(Number(b.dataset.phase));if(b.dataset.timelinePhase!==undefined)inspectPhase(Number(b.dataset.timelinePhase));
 if(b.matches('a[href^="#"]')){const target=b.getAttribute('href');if(target.length>1&&$(target)){e.preventDefault();$('#learning-detail-dialog').close();scrollToSection(target);}}
});
document.addEventListener('agent-state',e=>{ui.runtime=e.detail;renderSituation();});
// User scrolling interrupts narrated auto-scroll; programmatic scroll does not.
for(const event of ['wheel','touchmove'])window.addEventListener(event,()=>{ui.tour=false;},{passive:true});
document.addEventListener('keydown',e=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End'].includes(e.key))ui.tour=false;});
document.addEventListener('visibilitychange',()=>{if(document.hidden)ui.agentPlaying=false;syncLearningPlayback();});
let last=0,renderKey='',visibleHero=true,visibleLearning=true,visibleSituation=true,visibleAgent=true;
function syncLearningPlayback(){
 const dialogOpen=Boolean(document.querySelector('dialog[open]'));
 ui.playing=!ui.learningPausedByUser&&!document.hidden&&visibleLearning&&!dialogOpen;
 controls();
}
new IntersectionObserver(e=>{visibleLearning=e[0].isIntersecting;syncLearningPlayback();}).observe($('#workspace'));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',syncLearningPlayback));
new IntersectionObserver(e=>{visibleAgent=e[0].isIntersecting;}).observe($('#agent'));
new IntersectionObserver(e=>{visibleSituation=e[0].isIntersecting;}).observe($('#situation'));
// The overview runs only while visible; its clock freezes off screen.
new IntersectionObserver(entries=>{visibleHero=entries[0].isIntersecting;$('.hero-scene').classList.toggle('offscreen',!visibleHero);}).observe($('.hero-scene'));
const heroPackets=$$('[data-packet]');
const heroLabels=[['Task structure','Phase contracts','Prepared skills','Object relations','Grasp waypoints','Phase prompts'],['Task context','Phase dependencies','Execution inputs','Completion evidence','Recovery rules','Prepared skills']];
function animateHeroPackets(time){
 heroPackets.forEach((packet,side)=>{
  const clock=time+(side?1.8:0),cycle=Math.floor(clock/4.2),t=(clock%4.2)/4.2;
  const lane=cycle%3,startY=[110,165,220][lane];
  const x=side?760+80*t:395+50*t;
  const y=side?165+(startY-165)*t:startY+(165-startY)*t;
  packet.setAttribute('transform',`translate(${x} ${y})`);
  packet.style.opacity=String(Math.min(1,t*7,(1-t)*7));
  const label=heroLabels[side][cycle%heroLabels[side].length];
  if(packet.querySelector('text').textContent!==label)packet.querySelector('text').textContent=label;
 });
}
function tick(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;
 window.WalleControl?.tick(dt,ui.playing&&ui.motion&&!document.hidden&&visibleLearning);
 if(!document.hidden){
  if(situationAuto&&ui.motion&&visibleSituation&&!document.querySelector('dialog[open]')){situationElapsed+=dt;if(situationElapsed>=3){situationElapsed=0;selectSituation((ui.situationPhase+1)%P.length,true);}}
  if(ui.playing&&ui.motion&&visibleLearning){ui.learningTime+=dt;const node=Math.min(8,Math.floor(ui.learningTime/2));if(node!==ui.node){ui.node=node;renderOffline();}controls();window.WalleCanvas.animate(ui.learningTime);}

  if(ui.motion&&!ui.heroPaused&&visibleHero){ui.heroTime+=dt;$$('.flow-light').forEach(p=>p.style.strokeDashoffset=-ui.heroTime*35);animateHeroPackets(ui.heroTime);}
 }requestAnimationFrame(tick);
}
const frameworkDialog=$('#framework-dialog');
const diagramViewport=$('.framework-dialog-scroll'),diagramImage=diagramViewport.querySelector('img');
const diagram={scale:1,x:0,y:0,fit:1,width:1200,height:800,drag:null};
function constrainDiagram(){
 const inset=16;
 const limit=(position,size,viewport)=>size<=viewport-inset*2?(viewport-size)/2:Math.max(viewport-size-inset,Math.min(inset,position));
 diagram.x=limit(diagram.x,diagram.width*diagram.scale,diagramViewport.clientWidth);
 diagram.y=limit(diagram.y,diagram.height*diagram.scale,diagramViewport.clientHeight);
}
function drawDiagram(){
 constrainDiagram();
 // Resize the SVG viewport itself so the browser redraws vectors at the target size.
 diagramImage.style.width=diagram.width*diagram.scale+'px';diagramImage.style.height=diagram.height*diagram.scale+'px';
 diagramImage.style.left=diagram.x+'px';diagramImage.style.top=diagram.y+'px';
 $('#framework-zoom-level').textContent=Math.round(diagram.scale/diagram.fit*100)+'%';
 $('#framework-zoom-out').disabled=diagram.scale<=diagram.fit+1e-6;
 $('#framework-zoom-in').disabled=diagram.scale>=diagram.fit*8-1e-6;
}
function centerDiagram(scale){diagram.scale=scale;diagram.x=(diagramViewport.clientWidth-diagram.width*scale)/2;diagram.y=(diagramViewport.clientHeight-diagram.height*scale)/2;drawDiagram();}
function fitDiagram(){
 diagram.width=diagramImage.naturalWidth||1200;diagram.height=diagramImage.naturalHeight||800;
 diagram.fit=Math.min((diagramViewport.clientWidth-32)/diagram.width,(diagramViewport.clientHeight-32)/diagram.height);
 centerDiagram(diagram.fit);
}
function zoomDiagram(factor,x=diagramViewport.clientWidth/2,y=diagramViewport.clientHeight/2){
 const scale=Math.max(diagram.fit,Math.min(diagram.fit*8,diagram.scale*factor));
 const ratio=scale/diagram.scale;diagram.x=x-(x-diagram.x)*ratio;diagram.y=y-(y-diagram.y)*ratio;diagram.scale=scale;drawDiagram();
}
function openFramework(){pause();frameworkDialog.showModal();fitDiagram();}
$('#framework-fit').onclick=fitDiagram;
$('#framework-reset').onclick=fitDiagram;
$('#framework-zoom-in').onclick=()=>zoomDiagram(1.25);
$('#framework-zoom-out').onclick=()=>zoomDiagram(.8);
diagramImage.addEventListener('load',()=>{if(frameworkDialog.open)fitDiagram();});
diagramImage.draggable=false;
diagramViewport.addEventListener('wheel',e=>{e.preventDefault();const r=diagramViewport.getBoundingClientRect();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?diagramViewport.clientHeight:1);zoomDiagram(Math.exp(-Math.max(-160,Math.min(160,delta))*.0025),e.clientX-r.left,e.clientY-r.top);},{passive:false});
diagramViewport.addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;diagram.drag={id:e.pointerId,x:e.clientX,y:e.clientY};diagramViewport.setPointerCapture(e.pointerId);diagramViewport.classList.add('dragging');diagramViewport.focus({preventScroll:true});});
diagramViewport.addEventListener('pointermove',e=>{if(diagram.drag?.id!==e.pointerId)return;diagram.x+=e.clientX-diagram.drag.x;diagram.y+=e.clientY-diagram.drag.y;diagram.drag.x=e.clientX;diagram.drag.y=e.clientY;drawDiagram();});
function endDiagramDrag(){diagram.drag=null;diagramViewport.classList.remove('dragging');}
diagramViewport.addEventListener('pointerup',endDiagramDrag);
diagramViewport.addEventListener('pointercancel',endDiagramDrag);
diagramViewport.addEventListener('lostpointercapture',endDiagramDrag);
frameworkDialog.addEventListener('close',endDiagramDrag);
frameworkDialog.addEventListener('keydown',e=>{if(e.key==='Escape')return;const pan={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];if(pan){e.preventDefault();diagram.x+=pan[0];diagram.y+=pan[1];drawDiagram();}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')fitDiagram();else zoomDiagram(e.key==='-'?.8:1.25);}});
window.addEventListener('resize',()=>{if(frameworkDialog.open)fitDiagram();});
$('#open-framework').onclick=openFramework;
$('#enlarge-framework').onclick=openFramework;
$('#close-framework').onclick=()=>frameworkDialog.close();
frameworkDialog.addEventListener('click',e=>{if(e.target===frameworkDialog){const r=frameworkDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)frameworkDialog.close();}});

document.addEventListener('walle:inspect',()=>{ui.tour=false;});
document.addEventListener('walle:phase-request',e=>inspectPhase(e.detail));
document.addEventListener('walle:recording-frame',e=>{const changed=ui.phase!==e.detail.phase;ui.frame=e.detail.frame;ui.phase=e.detail.phase;if(changed){renderSituation();renderOffline();drawConnections();}});
window.addEventListener('resize',()=>{renderOffline();drawConnections();});render();requestAnimationFrame(tick);
})();

// Navigation follows the visible main region.
(()=>{const links=[...document.querySelectorAll('header nav a')];window.addEventListener('scroll',()=>{let id='overview';for(const x of ['workspace','situation','agent'])if(document.getElementById(x).getBoundingClientRect().top<180)id=x;links.forEach(a=>a.toggleAttribute('aria-current',a.getAttribute('href')==='#'+id));},{passive:true});})();
