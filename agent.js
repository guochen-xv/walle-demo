/* Task playback, phase transitions and contract checks. */
(() => {
'use strict';
const D=window.WALLE_AGENT_DATA,P=window.WALLE_DATA.situation.phases,root=document.querySelector('#agent-app');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const offsets=D.clips.map((_,i)=>D.clips.slice(0,i).reduce((s,c)=>s+c.duration,0)),total=D.clips.reduce((s,c)=>s+c.duration,0);
let s,loadToken=0,loaded=false,buffering=false,last=0,revision='',seekTarget=0,mediaError='';
window.WalleLearningMedia?.preloadAgent(D.clips);
let lastMediaPhase=null,phaseTransition=false,transitionOutDone=true;
let scrubbing=false,resumeAfterScrub=false;
root.innerHTML=`<div class="ag-toolbar"><div class="ag-buttons"><button id="ag-play" class="primary">▶ Play task</button><button id="ag-reset" class="outline">↺ Replay</button><label>Speed <select id="ag-speed" aria-label="Playback speed"><option value="1">1×</option><option value="2">2×</option><option value="3" selected>3×</option><option value="4">4×</option></select></label></div><label>Scenario walkthrough <select id="ag-scenario"><option value="success">Successful sequence</option></select></label></div>

<div class="ag-context"><span>✳ SITUATION</span><span>Expose → support → establish contact → pull</span><span id="ag-stage" role="status"></span></div>
<div class="ag-layout"><div class="ag-observation"><div class="ag-camera-bar"><span>CURRENT OBSERVATION</span><span>THREE SYNCHRONIZED VIEWS</span></div><div class="ag-camera-stage"><div class="ag-three-views">${['left','main','right'].map(v=>`<figure class="ag-camera-view"><div class="ag-screen"><video class="agent-video" id="${v==='main'?'ag-video':'ag-video-'+v}" muted playsinline preload="metadata" aria-label="Recorded ${v} camera"></video></div></figure>`).join('')}</div><div id="ag-placeholder" hidden></div><div id="ag-media-status"></div></div><div class="ag-caption" id="ag-caption"></div><div class="ag-loop">${['Observe','Identify','Select','Execute','Verify','Transition'].map((x,i)=>`<span data-ag-loop="${i}">${x}</span>`).join('')}</div></div>
<aside class="ag-contract"><div id="ag-contract-header"></div><div class="ag-panel-stack"><div id="ag-execute-view"><div id="ag-contract-content"></div><div class="ag-execution"><div class="ag-progress-label"><span id="ag-method"></span><b id="ag-percent"></b></div><div class="ag-progress" role="progressbar" aria-label="Phase progress" aria-valuemin="0" aria-valuemax="100"><i></i></div><div id="ag-waypoints"></div><small>Progress triggers verification before transition.</small></div></div><section id="ag-verify-view" aria-label="Phase verification" aria-hidden="true"><figure class="ag-reference"><div class="ag-reference-frame"><img id="ag-reference-image" alt="Situation reference"><div id="ag-reference-fallback" hidden>Reference image unavailable</div><div id="ag-verified-badge" hidden><span aria-hidden="true">✓</span><div><strong>VERIFIED</strong><small>Contract check</small></div></div></div><figcaption id="ag-reference-caption"></figcaption></figure><p id="ag-observation-note"></p><div id="ag-checks"></div><div id="ag-verdict" role="status"></div><button id="ag-resume" class="primary" hidden>Resume after intervention →</button></section></div></aside></div>
<div class="ag-task"><div class="ag-time-heading"><strong>Task timeline</strong><span id="ag-time"></span></div><div class="ag-phase-track">${P.map(p=>`<button data-ag-phase="${p.id}" data-method="${p.method}"><small>PHASE 0${p.id} · ${p.method}</small><strong>${p.name}</strong><span>${fmt(D.clips[p.id].duration)}</span><em></em></button>`).join('')}</div><div class="ag-duration-track" aria-label="Phase durations to scale">${D.clips.map((c,i)=>`<span data-method="${P[c.phase].method}" style="flex:${c.duration}" title="Phase ${i} · ${P[c.phase].method}: ${c.duration.toFixed(2)} seconds${c.videos?' recorded':''}">P${i}</span>`).join('')}</div><label class="ag-scrubber">Playback position<input id="ag-seek" type="range" min="0" max="${total}" step="0.05" value="0"></label><p class="ag-inspect-note">Click a phase to jump to its start. Seeking preserves playback; evidence is checked again.</p></div>
`;
const $=id=>root.querySelector(id),video=$('#ag-video');
const cameras={left:$('#ag-video-left'),main:video,right:$('#ag-video-right')},videos=Object.values(cameras),ready=new Set();
function pauseMedia(){videos.forEach(v=>v.pause());}
function emit(){document.dispatchEvent(new CustomEvent('agent-state',{detail:{section:'online',phase:s.phase,complete:[...s.complete],status:s.mode==='complete'?'Complete':s.mode==='intervention'?'Awaiting intervention':s.mode==='recovery'?'Recovery':s.playing?'Running':'Ready'}}));}
function log(message){s.events.unshift(message);s.events=s.events.slice(0,20);}
function pause(){if(scrubbing)resumeAfterScrub=false;s.playing=false;pauseMedia();render();}
async function mediaURL(url){
 if(!location.protocol.startsWith('http'))return url;
 return window.WalleLearningMedia.agentSource(url);
}
function finishPhaseTransition(){
 if(!phaseTransition)return;
 if(!transitionOutDone)return;
 if(D.clips[s.phase].videos&&(!loaded||videos.some(v=>v.readyState<3||v.seeking)))return;
 phaseTransition=false;root.classList.remove('ag-switching');
}
function clearPhaseTransition(){
 phaseTransition=false;transitionOutDone=true;root.classList.toggle('ag-switching',false);
}
async function load(){const token=++loadToken;loaded=false;buffering=false;ready.clear();mediaError='';pauseMedia();const clip=D.clips[s.phase];seekTarget=s.time;
 const changed=lastMediaPhase!==null&&lastMediaPhase!==s.phase;lastMediaPhase=s.phase;
 const showTransition=(changed||phaseTransition)&&typeof window.setTimeout==='function'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(showTransition){
  phaseTransition=true;transitionOutDone=false;root.classList.add('ag-switching');
  await new Promise(resolve=>setTimeout(resolve,260));
  if(token!==loadToken)return;
  transitionOutDone=true;
 }else clearPhaseTransition();
 $('.ag-three-views').hidden=!clip.videos;$('#ag-placeholder').hidden=!!clip.videos;
 videos.forEach(v=>{v.removeAttribute('src');v.load();});render();
 if(!clip.videos){$('#ag-placeholder').innerHTML='<span>◇</span><h3>Phase overview</h3><p>Follow the phase contract and execution sequence.</p>';finishPhaseTransition();render();return;}
 try{
 const sources=await Promise.all(Object.entries(cameras).map(async([view,v])=>[v,await mediaURL(clip.videos[view])]));
 if(token!==loadToken)return;
 sources.forEach(([v,url])=>{v.src=url;v.load();});
 }catch{if(token===loadToken){clearPhaseTransition();mediaError='A camera could not load. Check local assets and press Play to retry.';pause();}}
}
function playMedia(){
 finishPhaseTransition();
 if(phaseTransition||!s.playing||s.mode!=='execute'||!loaded||!D.clips[s.phase].videos)return;
 if(videos.some(v=>v.readyState<3||v.seeking)){buffering=true;pauseMedia();return;}
 buffering=false;const token=loadToken;
 videos.forEach(v=>{v.playbackRate=s.speed;if(v.paused)v.play().catch(e=>{if(token===loadToken&&e.name!=='AbortError'){mediaError='Playback paused by the browser. Press Play to continue.';pause();}});});
}
for(const v of videos){
 v.addEventListener('loadedmetadata',()=>{v.currentTime=Math.min(seekTarget,Math.max(0,v.duration-1/30));ready.add(v);loaded=ready.size===3;playMedia();render();});
 v.addEventListener('waiting',()=>{if(s.playing&&s.mode==='execute'){buffering=true;pauseMedia();render();}});
 for(const event of ['canplay','seeked'])v.addEventListener(event,()=>{playMedia();render();});
 v.addEventListener('error',()=>{if(!v.getAttribute('src'))return;clearPhaseTransition();mediaError='A camera could not load. Press Play to retry.';pause();});
}
video.addEventListener('ended',()=>{if(s.mode==='execute'){s.time=D.clips[s.phase].duration;verify();}});
function snapshot(){if(!D.clips[s.phase].videos||video.readyState<2)return null;const c=document.createElement('canvas');c.width=640;c.height=480;try{c.getContext('2d').drawImage(video,0,0,640,480);return c.toDataURL('image/jpeg',.88);}catch{return null;}}
function verify(){pauseMedia();s.outcome=null;s.mode='verify';s.hold=0;s.capture=D.clips[s.phase].endFrames?.[s.view]||snapshot();s.verdict='Checking phase contract';log(`P${s.phase}: progress reached 95%. Return to Agent for evidence and handoff checks.`);render();}
function returnTo(target,reason){s.outcome=null;s.complete=s.complete.filter(x=>x<target);s.phase=target;s.inspect=target;s.time=0;s.mode='recovery';s.hold=0;s.capture=null;s.verdict='Unmet · transition held';log(reason);load();render();emit();}
function decide(){
 let outcome={type:'success',label:s.phase===3?'Verified → Task complete':'Verified → Next phase',reason:D.clips[s.phase].videos?'Completion evidence and handoff conditions satisfied.':'Continue to the next phase in the walkthrough.'};
 if(s.phase===2&&!s.triggered&&s.scenario!=='success'){
  if(s.scenario==='human'&&s.retries<2){s.retries++;outcome={type:'recover',target:2,label:'Retry',reason:`Grasp retry ${s.retries}: stable contact not established.`,failed:'grasp'};}
  else{
   s.triggered=true;
   if(s.scenario==='human')outcome={type:'human',label:'Human intervention required',reason:'Repeated recovery failed. Human confirmation is required.',failed:'grasp'};
   else if(s.scenario==='uncertain')outcome={type:'observe',label:'Observe again',reason:'Insufficient evidence. Acquire another observation before advancing.'};
   else if(s.scenario==='occluded')outcome={type:'recover',target:0,label:'Restore conditions',reason:'Tab occluded. Return to Adjust bag and recheck downstream conditions.',failed:'reachable'};
   else if(s.scenario==='support')outcome={type:'recover',target:1,label:'Restore conditions',reason:'Support lost. Return to Grasp edge and recheck downstream conditions.',failed:'support'};
   else outcome={type:'recover',target:2,label:'Retry',reason:'Grasp failed; prerequisites still hold. Retry grasp.',failed:'grasp'};
  }
 }
 s.outcome=outcome;s.hold=0;
 if(outcome.type==='success'){
  s.mode='verified';s.verdict=D.clips[s.phase].videos?outcome.label:'Logic passed · observation unavailable';
  s.complete=[...new Set([...s.complete,s.phase])];emit();
 }else{s.mode='result';s.verdict=outcome.label;}
 log(`P${s.phase}: ${s.verdict}. ${outcome.reason}`);
}
function applyResult(){
 const o=s.outcome;
 if(o.type==='recover'){returnTo(o.target,o.reason);return;}
 if(o.type==='observe'){s.mode='observe';s.hold=0;s.verdict='Observing again';return;}
 if(o.type==='human'){s.mode='intervention';s.playing=false;emit();}
}
function advance(dt){if(!s.playing||phaseTransition)return;
 if(s.mode==='execute'){
  if(D.clips[s.phase].videos){if(loaded&&!video.seeking&&!buffering){s.time=Math.min(video.currentTime,D.clips[s.phase].duration);for(const v of videos){if(v!==video&&!v.seeking&&Math.abs(v.currentTime-video.currentTime)>.12){buffering=true;pauseMedia();v.currentTime=video.currentTime;}}}}
  else{s.time=Math.min(D.clips[s.phase].duration,s.time+dt*s.speed);if(s.time>=D.clips[s.phase].duration)verify();}
 }else if(['verify','verified','result','observe','recovery'].includes(s.mode)){
  s.hold+=dt;
  if(s.mode==='verify'&&s.hold>=D.verificationSeconds)decide();
  else if(s.mode==='result'&&s.hold>=1.5)applyResult();
  else if(s.mode==='verified'&&s.hold>=1.5){if(s.phase===3){s.mode='complete';s.playing=false;log('Task replay complete.');emit();}else{const next=s.phase+1;s.phase=next;s.inspect=next;s.time=0;s.mode='execute';s.capture=null;s.outcome=null;s.verdict='Waiting for execution';log(`Transition to P${next}: ${P[next].name}.`);load();emit();}}
  else if(s.mode==='observe'&&s.hold>=3){s.outcome=null;s.mode='verify';s.hold=0;s.verdict='Rechecking evidence';}
  else if(s.mode==='recovery'&&s.hold>=2){s.mode='execute';s.verdict='Waiting for execution';playMedia();}
 }
}
function render(){
 const p=P[s.phase],viewed=P[s.inspect],clip=D.clips[s.phase],percent=['verified','complete'].includes(s.mode)?100:Math.min(95,Math.round(s.time/clip.duration*95));
 $('#ag-play').textContent=s.playing?'Ⅱ Pause':s.phase===0&&s.time===0?'▶ Play task':'▶ Continue';$('#ag-play').disabled=['complete','intervention'].includes(s.mode);$('#ag-speed').value=s.speed;
 $('#ag-stage').textContent=`P${s.phase} · ${s.mode}${s.playing?'':' · paused'}`;
 $('#ag-caption').textContent=clip.videos?`Agent dataset · Episode ${clip.episode} · synchronized main + wrists · frame ${Math.min(clip.frames-1,Math.floor(s.time*30))} / ${clip.frames-1}`:'Phase execution overview';
 $('#ag-media-status').textContent=mediaError||(buffering&&s.playing?'Buffering · progress held':'');
 $('#ag-time').textContent=`${fmt(offsets[s.phase]+s.time)} / ${fmt(total)} · ${s.speed}×`;
 if(!scrubbing)$('#ag-seek').value=offsets[s.phase]+s.time;
 $('#ag-percent').textContent=percent+'%';$('.ag-progress i').style.width=percent+'%';$('.ag-progress').setAttribute('aria-valuenow',percent);$('.ag-progress').style.setProperty('--method-color',p.method==='Control'?'#39877D':'#4C78A8');
 $('#ag-method').textContent=`Executing P${s.phase} · ${p.method==='Control'?'Control':'Phase-Conditioned VLA'}`;
 root.querySelectorAll('.ag-waypoint-steps span').forEach((b,i)=>b.classList.toggle('active',i===Math.min(2,Math.floor(percent/32))));
 root.querySelectorAll('[data-ag-phase]').forEach(b=>{const i=+b.dataset.agPhase;b.classList.toggle('executing',i===s.phase);b.classList.toggle('inspected',i===s.inspect);b.setAttribute('aria-pressed',i===s.inspect);b.querySelector('em').textContent=s.complete.includes(i)?'✓ Complete':i===s.phase?'● Current execution':'Pending';});
 root.querySelectorAll('[data-ag-loop]').forEach(b=>b.classList.toggle('active',+b.dataset.agLoop===({execute:3,verify:4,result:4,verified:5,observe:0,recovery:2,intervention:4,complete:5}[s.mode])));
 if(phaseTransition&&!transitionOutDone)return;
 const key=[s.phase,s.inspect,s.mode,s.verdict,s.view,s.capture?'frame':'none'].join('|');if(key===revision){updateVerification();return;}revision=key;
 $('#ag-contract-header').innerHTML=`<div class="eyebrow">CURRENT · PHASE 0${p.id}</div><h3>${esc(p.name)}</h3><span class="route ${p.method==='Control'?'teal':'blue'}">${p.method}</span> <small>${esc(p.hand)}</small>`;
 $('#ag-contract-content').innerHTML=`<p class="ag-prompt">“${esc(p.prompt)}”</p><dl>${[['Local goal',p.goal],['Preconditions',p.preconditions.join(' · ')],['Completion evidence',p.evidence.join(' · ')],['Recovery',p.recovery]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
 $('#ag-waypoints').innerHTML=p.method==='Control'?'<div class="ag-waypoint-steps"><span>① Approach</span><span>② Align</span><span>③ Close gripper</span></div><small>Approach → Align → Grasp</small>':`<p>${esc(p.action)}</p>`;
 const checking=['verify','result','verified','observe','intervention','complete'].includes(s.mode);
 $('.ag-contract').classList.toggle('ag-show-verification',checking);
 $('#ag-execute-view').setAttribute('aria-hidden',String(checking));$('#ag-verify-view').setAttribute('aria-hidden',String(!checking));
 const ref=$('#ag-reference-image'),refSource=p.views[s.view];
 if(ref.getAttribute('src')!==refSource){ref.hidden=false;$('#ag-reference-fallback').hidden=true;ref.src=refSource;}
 $('#ag-reference-caption').textContent=`Situation reference · Learning Ep 0 · Frame ${p.referenceFrame}`;
 $('#ag-observation-note').textContent=clip.videos?'Compare with the current observation.':'Current observation unavailable · logic demonstration only';
 const prerequisites=s.phase<3?P[s.phase+1].preconditions:[window.WALLE_DATA.situation.goal];
 let index=0;
 $('#ag-checks').innerHTML=[['Completion evidence',p.evidence],[s.phase<3?'Next-phase readiness':'Task goal',prerequisites]].map(([label,items])=>`<div class="ag-check-group"><strong>${label}</strong>${items.map(x=>`<div class="ag-check-row" data-check-index="${index++}" data-check-text="${esc(x.toLowerCase())}"><span class="ag-check-icon">○</span><span>${esc(x)}</span></div>`).join('')}</div>`).join('');
 $('#ag-verdict').innerHTML=`<strong>${esc(s.verdict)}</strong>${s.outcome?`<p>${esc(s.outcome.reason)}</p>`:''}`;
 $('#ag-verdict').className=s.outcome&&s.outcome.type!=='success'?'unmet':s.outcome?.type==='success'&&clip.videos?'ag-success':'';
 if(s.outcome?.type==='success'&&clip.videos)$('#ag-verdict strong').textContent='✓ '+s.verdict;
 $('#ag-resume').hidden=s.mode!=='intervention';
 updateVerification();
}
function updateVerification(){
 const rows=[...root.querySelectorAll('[data-check-index]')];
 const resolved=!!s.outcome&&['result','verified','observe','intervention','complete'].includes(s.mode);
 const verified=resolved&&s.outcome.type==='success'&&!!D.clips[s.phase].videos;
 $('.ag-reference-frame').classList.toggle('ag-reference-verified',verified&&!$('#ag-reference-image').hidden);
 $('#ag-verified-badge').hidden=!verified||$('#ag-reference-image').hidden;
 const elapsed=s.hold||0,reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 rows.forEach((row,i)=>{
  const start=.3+i*(2.1/Math.max(1,rows.length));
  row.style.opacity=resolved||reduced?'1':String(Math.max(0,Math.min(1,(elapsed-start)/.22)));
  let icon='○',state='pending';
  if(resolved){
   const o=s.outcome;
   if(o.type==='success'){icon=D.clips[s.phase].videos?'✓':'◇';state=D.clips[s.phase].videos?'passed':'pending';}
   else if(o.type==='observe'){icon='?';state='uncertain';}
   else if((row.dataset.checkText||'').includes(o.failed||'__none__')){icon='×';state='failed';}
   else{icon='?';state='uncertain';}
  }
  row.querySelector('.ag-check-icon').textContent=icon;row.setAttribute('data-state',state);
 });
 $('#ag-verified-badge').style.opacity=reduced||s.mode==='complete'?'1':String(Math.min(1,elapsed/.25));
 $('#ag-verdict').style.opacity=resolved?String(reduced||s.mode==='intervention'||s.mode==='complete'||s.mode==='observe'?1:Math.min(1,elapsed/.25)):'1';
}
$('#ag-reference-image').onerror=()=>{$('#ag-reference-image').hidden=true;$('#ag-reference-fallback').hidden=false;$('#ag-verified-badge').hidden=true;$('.ag-reference-frame').classList.toggle('ag-reference-verified',false);};
function reset(){scrubbing=false;resumeAfterScrub=false;const scenario=$('#ag-scenario').value;s={phase:0,inspect:0,time:0,mode:'execute',playing:false,speed:3,view:'main',hold:0,complete:[],events:[],scenario,triggered:false,retries:0,capture:null,outcome:null,verdict:'Waiting for execution'};revision='';log('Ready. Two separate recordings assembled into a four-phase task replay.');load();render();emit();}
$('#ag-play').onclick=()=>{if(s.playing)pause();else{s.playing=true;if(mediaError)load();else playMedia();render();emit();}};
$('#ag-reset').onclick=reset;$('#ag-speed').onchange=e=>{s.speed=+e.target.value;videos.forEach(v=>v.playbackRate=s.speed);render();};$('#ag-scenario').onchange=reset;
$('#ag-resume').onclick=()=>{s.playing=true;returnTo(2,'Human confirmed correction. Rebuild prerequisites and retry.');};

function seekTask(position,keepPlaying=s.playing){
 const t=Math.max(0,Math.min(total,position)),i=Math.max(0,offsets.findLastIndex(x=>t>=x));
 pauseMedia();s.playing=keepPlaying;s.phase=i;s.inspect=i;s.time=Math.min(t-offsets[i],D.clips[i].duration);
 s.complete=s.complete.filter(x=>x<i);s.mode='execute';s.hold=0;s.capture=null;s.outcome=null;s.verdict='Seeked · verification required';s.triggered=false;s.retries=0;
 log(`Seek to P${i}; invalidate this phase and downstream checks.`);load();render();emit();
}
root.querySelectorAll('[data-ag-phase]').forEach(b=>b.onclick=()=>seekTask(offsets[+b.dataset.agPhase]));
const scrubber=$('#ag-seek');
scrubber.addEventListener('pointerdown',()=>{scrubbing=true;resumeAfterScrub=s.playing;s.playing=false;pauseMedia();});
scrubber.oninput=e=>seekTask(Number(e.target.value),scrubbing?false:s.playing);
function finishScrub(){if(!scrubbing)return;scrubbing=false;s.playing=resumeAfterScrub;resumeAfterScrub=false;playMedia();render();emit();}
scrubber.addEventListener('change',finishScrub);
document.addEventListener('pointerup',finishScrub);
document.addEventListener('pointercancel',finishScrub);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&s.playing)pause();}).observe(document.querySelector('#agent'));
function tick(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;if(!document.hidden&&s.playing){advance(dt);render();}requestAnimationFrame(tick);}
reset();requestAnimationFrame(tick);
})();
