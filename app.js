/* Shared task selection and the Situation phase graph. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store=window.WalleTaskStore; if(!store)return;
  let selectedPhase=0, selectedNodeId=null, selectedPathId=null, graphResize;
  const phaseTitle=p=>p.kind==='home'?'Return home':(p.target ? `${p.operation} · ${p.target}` : p.operation || 'Prepared phase');
  const phaseById=t=>new Map(t.phases.map(p=>[p.id,p]));
  function pathTabs(t){const paths=t.graph.paths||[];return `<div class="situation-path-picker" role="tablist" aria-label="Situation paths"><button type="button" role="tab" data-path-select="" aria-selected="${!selectedPathId}">All paths</button>${paths.map((p,i)=>`<button type="button" role="tab" data-path-select="${esc(p.id)}" aria-selected="${selectedPathId===p.id}">Path ${i+1}${p.episode!=null?` · Ep. ${esc(p.episode)}`:''}</button>`).join('')}</div>`;}
  function layoutLevels(t,nodes){
    const by=phaseById(t), placement=nodes.filter(n=>n.kind==='action'&&by.get(n.phase)?.operation==='placement');
    const placementLevel=placement.length>1?Math.max(...placement.map(n=>n.level)):null;
    return new Map(nodes.map(n=>[n.id,placementLevel!=null&&placement.includes(n)?placementLevel:n.level]));
  }
  function route(p){const label=p.kind==='home'?'Home':(p.capability.primary||p.operation||'Prepared');return `<span class="route ${p.kind==='home'?'home':'prepared'}">${esc(label)}</span>`;}
  function graphMarkup(t){
    const by=phaseById(t), nodes=t.graph.nodes.slice(), levels=layoutLevels(t,nodes); nodes.sort((a,b)=>levels.get(a.id)-levels.get(b.id)||(a.displayOrder??a.phase??0)-(b.displayOrder??b.phase??0)); const max=Math.max(0,...nodes.map(n=>levels.get(n.id)));
    const cols=Array.from({length:max+1},()=>[]); nodes.forEach(n=>(cols[levels.get(n.id)]||cols[cols.length-1]).push(n));
    return `${pathTabs(t)}<div class="phase-graph" id="phase-graph"><svg class="phase-graph-edges" aria-hidden="true"></svg><div class="phase-graph-columns">${cols.map((col,i)=>`<div class="phase-graph-column" data-level="${i}">${col.map(n=>{const p=by.get(n.phase), isState=n.kind==='state', isHome=p?.kind==='home'||n.kind==='home', paths=n.paths||[], pathActive=selectedPathId&&paths.includes(selectedPathId), pressed=selectedNodeId===n.id || (!selectedNodeId&&!isState&&n.phase===selectedPhase);return `<button class="phase-node ${isState?'state ':''}${isHome?'home ':''}${pathActive?'path-active':''}" data-graph-node="${esc(n.id)}" data-phase="${n.phase??''}" data-paths="${esc(paths.join('|'))}" title="${esc(isState?n.label:(p?phaseTitle(p):n.label))}" aria-pressed="${pressed}"><span class="phase-node-index">${isState?`STATE${n.phase!=null?` · P${String(n.phase).padStart(2,'0')}`:''}`:'P'+String(n.phase).padStart(2,'0')}</span><strong>${esc(isState?n.label:(p?phaseTitle(p):n.label))}</strong><small>${esc(isState?'Observed boundary state':(p?.prompt||n.label))}</small>${isState?'<span class="state-node-kind">State</span>':(p?route(p):'')}</button>`;}).join('')}</div>`).join('')}</div></div><div class="phase-graph-legend"><span><i class="legend-swatch state"></i>state</span><span><i class="legend-line"></i>action transition</span><span><i class="legend-line branch"></i>alternative transition</span><span class="path-legend-note">Click a node to trace its recorded chain</span></div>`;
  }
  function stateDetailMarkup(t,n){
    const p=Number.isInteger(n.phase)?t.phases.find(x=>x.id===n.phase):null;
    const img=p?.media?.reference||p?.media?.poster;
    const phaseLabel=p?`P${String(p.id).padStart(2,'0')} · ${phaseTitle(p)}`:'Recorded boundary';
    const evidence=(n.evidence||[]).join(' · ');
    return `<div class="phase-detail-panel state-detail-panel"><div class="phase-detail-heading"><div><span class="eyebrow">OBSERVED STATE · ${esc(phaseLabel)}</span><h3>${esc(n.label||'Recorded state')}</h3></div><span class="route state-route">State</span></div><div class="phase-detail-body">${img?`<figure class="phase-detail-image"><img src="${esc(img)}" alt="${esc(n.label||'Observed state')} representative reference" loading="lazy"><figcaption>Representative evidence for this boundary state</figcaption></figure>`:'<div class="phase-detail-image empty">Reference image unavailable</div>'}<div class="phase-detail-copy"><p class="phase-detail-goal">This observed state is the boundary condition carried into the adjacent action. It is retained so the action is interpreted from the demonstrated scene, rather than as an isolated instruction.</p><dl><div><dt>Associated phase</dt><dd>${esc(phaseLabel)}</dd></div>${n.frame!=null?`<div><dt>Recorded frame</dt><dd>${esc(n.frame)}</dd></div>`:''}${evidence?`<div><dt>Evidence reference</dt><dd>${esc(evidence)}</dd></div>`:''}<div><dt>State role</dt><dd>Observed precondition or handoff state</dd></div></dl></div></div></div>`;
  }
  function detailMarkup(t,p){
    const img=p.media.reference||p.media.poster; const branch=t.graph.branches.filter(b=>b.target===p.id);
    return `<div class="phase-detail-panel"><div class="phase-detail-heading"><div><span class="eyebrow">PHASE P${String(p.id).padStart(2,'0')} · ${esc(p.kind==='home'?'REST STATE':'EXECUTION CONTRACT')}</span><h3>${esc(p.prompt||phaseTitle(p))}</h3></div>${route(p)}</div><div class="phase-detail-body">${img?`<figure class="phase-detail-image"><img src="${esc(img)}" alt="${esc(p.prompt)} representative reference" loading="lazy"><figcaption>Representative phase reference</figcaption></figure>`:'<div class="phase-detail-image empty">Reference image unavailable</div>'}<div class="phase-detail-copy"><p class="phase-detail-goal">${esc(p.goal)}</p><dl><div><dt>Object / part</dt><dd>${esc([p.target,p.part].filter(Boolean).join(' · ')||'Recorded task state')}</dd></div><div><dt>Active arm</dt><dd>${esc(p.arm||'Recorded execution')}</dd></div><div><dt>Requires</dt><dd>${esc((p.requires||[]).join(' · ')||'Prior phase state')}</dd></div><div><dt>Completion evidence</dt><dd>${esc((p.evidence||[]).join(' · ')||'Contract evidence')}</dd></div><div><dt>Handoff</dt><dd>${esc(p.handoff)}</dd></div></dl>${branch.length?`<div class="phase-conditions"><strong>Branch entry</strong><p>This phase is selected when the observed scene satisfies a recorded condition.</p></div>`:''}</div></div></div>`;
  }
  function drawEdges(t){
    const host=$('#phase-graph'), svg=host?.querySelector('.phase-graph-edges'); if(!host||!svg)return;
    const sr=svg.getBoundingClientRect(); svg.setAttribute('viewBox',`0 0 ${sr.width} ${sr.height}`); svg.innerHTML='<defs><marker id="phase-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#b6a8c4"/></marker><marker id="phase-arrow-branch" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#b98b75"/></marker></defs>';
    const map=new Map([...host.querySelectorAll('[data-graph-node]')].map(n=>[n.dataset.graphNode,n]));
    for(const e of t.graph.edges){const a=map.get(e.source),b=map.get(e.target);if(!a||!b)continue;const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();const x1=ar.right-sr.left,y1=ar.top+ar.height/2-sr.top,x2=br.left-sr.left,y2=br.top+br.height/2-sr.top;const bend=(x1+x2)/2;const d=`M${x1} ${y1} C${bend} ${y1},${bend} ${y2},${x2-5} ${y2}`;const cls=[e.branch?'branch':'',selectedPathId&&(e.path||[]).includes(selectedPathId)?'active':'',selectedPathId&&!(e.path||[]).includes(selectedPathId)?'dim':''].filter(Boolean).join(' ');svg.insertAdjacentHTML('beforeend',`<path class="phase-graph-edge ${cls}" d="${d}" marker-end="url(#phase-arrow${e.branch?'-branch':''})"/>`);}
  }
  function renderSituation(t=store.current,restoreGraphScroll=true){
    const card=$('#situation-card'); if(!card)return;
    const previousGraph=$('#phase-graph');
    const previousScroll=restoreGraphScroll&&previousGraph?{left:previousGraph.scrollLeft,top:previousGraph.scrollTop}:null;
    const by=phaseById(t), selectedNode=t.graph.nodes.find(n=>n.id===selectedNodeId), p=t.phases.find(x=>x.id===selectedPhase)||t.phases[0]; selectedPhase=p.id;
    card.innerHTML=`<div class="method-header"><div><span class="eyebrow method-eyebrow-logo"><img class="situation-title-logo" src="situation-mark.svg" alt="" width="28" height="15">SHARED TASK REPRESENTATION</span><h2 id="situation-section-title">Situation</h2><p>Task context · observed states · prepared actions</p></div><div class="method-task"><strong>${esc(t.name)}</strong><p>${esc(t.goal)}</p></div></div><div class="situation-graph-intro"><div><span class="eyebrow">PHASES AND PATHS</span><h3>Observed states connect the shared actions.</h3><p>Circles are states and boxes are shared operations. Select a path to trace its recorded chain.</p></div><div class="situation-stats"><span><strong>${t.summary.phaseCount}</strong>phases</span><span><strong>${t.summary.pathCount}</strong>paths</span><span><strong>${t.graph.nodes.filter(n=>n.kind==='state').length}</strong>states</span></div></div>${graphMarkup(t)}<div id="phase-detail">${selectedNode?.kind==='state'?stateDetailMarkup(t,selectedNode):detailMarkup(t,p)}</div><div class="situation-branch-summary">${t.graph.branches.length?`<div><span class="eyebrow">OBSERVATION CONDITIONS</span><h3>Where paths diverge</h3><p>${t.graph.branches.map(b=>`<span class="condition-chip">${esc((b.description||'scene condition').slice(0,52))}</span>`).join(' ')}</p></div>`:'<div><span class="eyebrow">EXECUTION PATH</span><h3>Single demonstrated route</h3><p>All transitions belong to the same recorded path.</p></div>'}</div>`;
    card.querySelectorAll('[data-graph-node]').forEach(b=>b.addEventListener('click',()=>{selectedNodeId=b.dataset.graphNode;selectedPhase=Number(b.dataset.phase)||selectedPhase;const paths=(b.dataset.paths||'').split('|').filter(Boolean);selectedPathId=paths[0]||null;renderSituation(t);}));
    card.querySelectorAll('[data-path-select]').forEach(b=>b.addEventListener('click',()=>{selectedPathId=b.dataset.pathSelect||null;if(b.getAttribute('role')==='tab')selectedNodeId=null;renderSituation(t);}));
    requestAnimationFrame(()=>{
      if(previousScroll){const graph=$('#phase-graph');if(graph){graph.scrollLeft=previousScroll.left;graph.scrollTop=previousScroll.top;}}
      // The node rectangles depend on the restored scroll offset; measure them
      // only after the graph is back at the user's position.
      requestAnimationFrame(()=>drawEdges(t));
    });
  }
  function updateStaticTask(t){
    document.querySelectorAll('[data-task-scene]').forEach(host=>{const p=t.phases.find(x=>x.media.reference)||t.phases[0];if(p?.media.reference)host.innerHTML=`<img class="recorded-motivation" src="${esc(p.media.reference)}" alt="${esc(t.name)} reference">`;});
    const heading=$('#situation-heading');if(heading)heading.textContent=t.name;
  }
  function renderControls(){
    const play=$('#play'),status=$('#play-status');if(play){play.textContent='▶ Review selected task';play.onclick=()=>document.querySelector('#workspace')?.scrollIntoView({behavior:'smooth'});}if(status)status.textContent='Select a task to inspect its local analysis';
    $('#replay')?.remove();$('#motion')?.remove();
  }
  store.on(t=>{selectedPhase=0;selectedNodeId=null;selectedPathId=null;updateStaticTask(t);renderSituation(t,false);renderControls();});
  updateStaticTask(store.current);renderSituation(store.current);renderControls();
  new ResizeObserver(()=>drawEdges(store.current)).observe($('#situation-card'));
  window.addEventListener('resize',()=>drawEdges(store.current));
})();
