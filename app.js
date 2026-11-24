/* Shared task selection and the Situation phase graph. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store=window.WalleTaskStore; if(!store)return;
  const heroScene=$('.hero-scene'), heroPackets=[...document.querySelectorAll('[data-packet]')];
  const scrollToSection = selector => document.querySelector(selector)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  const replayWalkthrough = event => {
    event.preventDefault();
    window.WalleCanvas?.replay();
    scrollToSection('#workspace');
  };
  $('#start-tour')?.addEventListener('click', replayWalkthrough);
  $('#closing-replay')?.addEventListener('click', replayWalkthrough);
  document.querySelectorAll('[data-explore]').forEach(button => button.addEventListener('click', () => scrollToSection('#situation')));
  const heroLabels=[['Task structure','Phase contracts','Prepared skills','Object relations','Grasp waypoints','Phase prompts'],['Task context','Phase dependencies','Execution inputs','Completion evidence','Recovery rules','Prepared skills']];
  let heroTime=0, lastHeroTime=0;
  function animateHeroPackets(time){
    heroPackets.forEach((packet,side)=>{
      const clock=time+(side?1.8:0), cycle=Math.floor(clock/4.2), progress=(clock%4.2)/4.2;
      const lane=cycle%3, startY=[110,165,220][lane];
      const x=side?760+80*progress:395+50*progress;
      const y=side?165+(startY-165)*progress:startY+(165-startY)*progress;
      packet.setAttribute('transform',`translate(${x} ${y})`);
      packet.style.opacity=String(Math.min(1,progress*7,(1-progress)*7));
      const label=heroLabels[side][cycle%heroLabels[side].length];
      const text=packet.querySelector('text');
      if(text&&text.textContent!==label)text.textContent=label;
    });
  }
  function animateHero(now){
    const delta=lastHeroTime?Math.min((now-lastHeroTime)/1000,.1):0; lastHeroTime=now;
    if(!document.hidden&&heroScene&&!heroScene.classList.contains('offscreen')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      heroTime+=delta; animateHeroPackets(heroTime);
    }
    requestAnimationFrame(animateHero);
  }
  let selectedPhase=0, selectedNodeId=null, selectedPathId=null, selectedDetailTab='contract';
  const animateSituationDetail=element=>window.WalleMotion.enter(element,$('#phase-detail'));
  const phaseTitle=p=>p.kind==='home'?'Return home':(p.target ? `${p.operation} · ${p.target}` : p.operation || 'Prepared phase');
  const phaseById=t=>new Map(t.phases.map(p=>[p.id,p]));
  function pathTabs(t){
    return `<div class="situation-path-picker" role="tablist" aria-label="Situation paths"><button type="button" role="tab" data-path-select="" aria-selected="${!selectedPathId}">All paths</button>${(t.graph.paths||[]).map((p,i)=>`<button type="button" role="tab" data-path-select="${esc(p.id)}" aria-selected="${selectedPathId===p.id}">Path ${i+1}</button>`).join('')}</div>`;
  }
  function layoutLevels(t,nodes){
    const by=phaseById(t), placement=nodes.filter(n=>n.kind==='action'&&by.get(n.phase)?.operation==='placement');
    const placementLevel=placement.length>1?Math.max(...placement.map(n=>n.level)):null;
    return new Map(nodes.map(n=>[n.id,placementLevel!=null&&placement.includes(n)?placementLevel:n.level]));
  }
  function route(p){return `<span class="situation-skill-label">${esc(window.WalleLocalization.skillName(store.current,p))}</span>`;}
  const phaseCode=p=>'P'+String(p.id).padStart(2,'0');
  function connectedPhases(t,n,incoming){
    const ids=new Set(t.graph.edges.filter(e=>incoming?e.target===n.id:e.source===n.id).map(e=>incoming?e.source:e.target));
    return t.phases.filter(p=>ids.has(p.sourceId));
  }
  function stateDescription(t,n){
    const text=(n.label||'').trim();
    const normal=value=>String(value||'').trim().replace(/[.!]$/,'').toLowerCase();
    return /^(before:|after:|recorded boundary\b)/i.test(text)||t.phases.some(p=>[p.prompt,p.goal].some(v=>normal(v)===normal(text)))?'':text;
  }
  function stateLabel(t,n){
    const description=stateDescription(t,n);
    if(description)return description;
    const next=connectedPhases(t,n,false),previous=connectedPhases(t,n,true);
    if(next.length)return 'Before '+next.map(phaseCode).join(' / ');
    if(previous.length)return 'After '+previous.map(phaseCode).join(' / ');
    return 'Demonstrated state';
  }
  function graphMarkup(t){
    const by=phaseById(t),nodes=t.graph.nodes.slice(),levels=layoutLevels(t,nodes);
    nodes.sort((a,b)=>levels.get(a.id)-levels.get(b.id)||(a.displayOrder??a.phase??0)-(b.displayOrder??b.phase??0));
    const columns=[...new Set(nodes.map(n=>levels.get(n.id)))].map(level=>({level,nodes:nodes.filter(n=>levels.get(n.id)===level)}));
    const states=nodes.filter(n=>n.kind==='state');
    const sizes=columns.map(c=>c.nodes.every(n=>n.kind==='state')?'104px':'184px').join(' ');
    return `<div class="situation-map-toolbar"><div class="situation-map-summary"><span>PHASES & PATHS</span><small>${nodes.length-states.length} actions · ${states.length} states · ${t.graph.paths.length} paths</small></div>${pathTabs(t)}</div><div class="phase-graph" id="phase-graph"><svg class="phase-graph-edges" aria-hidden="true"></svg><div class="phase-graph-columns" style="grid-template-columns:${sizes}">${columns.map(col=>`<div class="phase-graph-column" data-level="${col.level}">${col.nodes.map(n=>{
      const p=by.get(n.phase),isState=n.kind==='state',isHome=!isState&&p?.kind==='home';
      const name=isState?stateLabel(t,n):p?phaseTitle(p):n.label;
      const index=isState?'S'+String(states.indexOf(n)).padStart(2,'0'):'P'+String(n.phase).padStart(2,'0');
      return `<button type="button" class="phase-node ${isState?'state ':''}${isHome?'home ':''}" data-graph-node="${esc(n.id)}" data-phase="${n.phase??''}" data-paths="${esc((n.paths||[]).join('|'))}" title="${esc(name)}" aria-label="${index} ${esc(name)}" aria-pressed="false"><span class="phase-node-index">${index}</span><strong>${esc(name)}</strong>${!isState&&p?route(p):''}</button>`;
    }).join('')}</div>`).join('')}</div></div><div class="phase-graph-legend"><span><i class="legend-swatch"></i>State</span><span><i class="legend-line"></i>Transition</span><span><i class="legend-line branch"></i>Alternative</span><span class="path-legend-note">Select a node to explore its contract and evidence</span></div>`;
  }
  function renderSituationDetail(t,{animate=true}={}){
    const node=t.graph.nodes.find(n=>n.id===selectedNodeId)||t.graph.nodes.find(n=>n.kind==='action'&&n.phase===selectedPhase);
    if(!node)return;
    selectedNodeId=node.id;
    const host=$('#phase-detail');
    if(host){
      const current=host.querySelector('.situation-detail-panel');
      const template=document.createElement('template');
      template.innerHTML=window.WalleSituationDetails.markup(t,node,selectedDetailTab,node.kind==='state'?stateLabel(t,node):'');
      const next=template.content.firstElementChild;
      const activeTab=panel=>panel.querySelector('[data-situation-detail-tab][aria-selected="true"]')?.dataset.situationDetailTab||'contract';
      if(current?.dataset.selectedNode===node.id){
        if(activeTab(current)!==activeTab(next)){
          current.querySelectorAll('video').forEach(video=>video.pause());
          const content=next.querySelector('#situation-detail-content');
          current.querySelector('#situation-detail-content').replaceWith(content);
          current.querySelectorAll('[data-situation-detail-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.situationDetailTab===activeTab(next))));
          animateSituationDetail(animate?content:null);
        }
      }else{
        current?.querySelectorAll('video').forEach(video=>video.pause());
        host.replaceChildren(next);
        animateSituationDetail(animate&&current?next:null);
      }
    }
    updateSituationSelection(t);
  }

  function updateSituationSelection(t){
    document.querySelectorAll('#situation-card [data-graph-node]').forEach(button=>{
      const paths=button.dataset.paths.split('|');
      button.setAttribute('aria-pressed',String(button.dataset.graphNode===selectedNodeId));
      button.classList.toggle('path-active',Boolean(selectedPathId&&paths.includes(selectedPathId)));
      button.classList.toggle('path-dim',Boolean(selectedPathId&&!paths.includes(selectedPathId)));
    });
    document.querySelectorAll('#situation-card [data-path-select]').forEach(button=>button.setAttribute('aria-selected',String((button.dataset.pathSelect||null)===selectedPathId)));
    drawEdges(t);
  }
  function selectSituationNode(t,id){
    const node=t.graph.nodes.find(n=>n.id===id);
    if(!node)return;
    selectedNodeId=id;selectedDetailTab='contract';
    if(Number.isInteger(node.phase))selectedPhase=node.phase;
    if(!(node.paths||[]).includes(selectedPathId))selectedPathId=(node.paths||[])[0]||null;
    renderSituationDetail(t);
  }
  function drawEdges(t){
    const host=$('#phase-graph'), svg=host?.querySelector('.phase-graph-edges'); if(!host||!svg)return;
    const sr=svg.getBoundingClientRect(); svg.setAttribute('viewBox',`0 0 ${sr.width} ${sr.height}`); svg.innerHTML='<defs><marker id="phase-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#b6a8c4"/></marker><marker id="phase-arrow-branch" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#b98b75"/></marker></defs>';
    const map=new Map([...host.querySelectorAll('[data-graph-node]')].map(n=>[n.dataset.graphNode,n]));
    for(const e of t.graph.edges){const a=map.get(e.source),b=map.get(e.target);if(!a||!b)continue;const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();const x1=ar.right-sr.left,y1=ar.top+ar.height/2-sr.top,x2=br.left-sr.left,y2=br.top+br.height/2-sr.top;const bend=(x1+x2)/2;const d=`M${x1} ${y1} C${bend} ${y1},${bend} ${y2},${x2-5} ${y2}`;const cls=[e.branch?'branch':'',selectedPathId&&(e.path||[]).includes(selectedPathId)?'active':'',selectedPathId&&!(e.path||[]).includes(selectedPathId)?'dim':''].filter(Boolean).join(' ');svg.insertAdjacentHTML('beforeend',`<path class="phase-graph-edge ${cls}" d="${d}" marker-end="url(#phase-arrow${e.branch?'-branch':''})"/>`);}
  }
  function renderSituation(t=store.current){
    const card=$('#situation-card');if(!card)return;
    card.innerHTML=`<div class="method-header"><div><span class="eyebrow method-eyebrow-logo"><img class="situation-title-logo" src="situation-mark.svg" alt="" width="28" height="15">SHARED TASK REPRESENTATION</span><h2 id="situation-section-title">Situation</h2><p>Action contracts · state conditions · branch evidence</p></div><div class="method-task"><strong>${esc(t.name)}</strong></div></div>${graphMarkup(t)}<div id="phase-detail"></div>`;
    renderSituationDetail(t,{animate:false});
    requestAnimationFrame(()=>drawEdges(t));
  }
  const situationCard=$('#situation-card');
  situationCard?.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||!situationCard.contains(button))return;
    const task=store.current;
    if(button.hasAttribute('data-situation-detail-tab')){
      selectedDetailTab=button.dataset.situationDetailTab;renderSituationDetail(task);
    }else if(button.hasAttribute('data-path-select')){
      selectedPathId=button.dataset.pathSelect||null;selectedDetailTab='contract';
      const selected=task.graph.nodes.find(n=>n.id===selectedNodeId);
      if(selectedPathId&&!(selected?.paths||[]).includes(selectedPathId)){
        const first=task.graph.nodes.filter(n=>n.kind==='action'&&(n.paths||[]).includes(selectedPathId)).sort((a,b)=>a.level-b.level)[0];
        if(first){selectedNodeId=first.id;selectedPhase=first.phase;}
      }
      renderSituationDetail(task);
    }else if(button.hasAttribute('data-situation-branch')){
      selectedPathId=button.dataset.branchPath||null;selectSituationNode(task,button.dataset.situationBranch);
    }else if(button.hasAttribute('data-graph-node')){
      selectSituationNode(task,button.dataset.graphNode);
    }
  });
  situationCard?.addEventListener('keydown',event=>{
    const tab=event.target.closest('[role="tab"]');if(!tab)return;
    const tabs=[...tab.parentElement.querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab);
    const index=event.key==='ArrowRight'?(i+1)%tabs.length:event.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
    if(index<0)return;
    event.preventDefault();
    const key=tabs[index].hasAttribute('data-path-select')?'data-path-select':'data-situation-detail-tab';
    const value=tabs[index].getAttribute(key);tabs[index].click();
    situationCard.querySelectorAll('['+key+']').forEach(button=>{if(button.getAttribute(key)===value)button.focus({preventScroll:true});});
  });
  function updateStaticTask(t){
    document.querySelectorAll('[data-task-scene]').forEach(host=>{const p=t.phases.find(x=>x.media.reference)||t.phases[0];if(p?.media.reference)host.innerHTML=`<img class="recorded-motivation" src="${esc(p.media.reference)}" alt="${esc(t.name)} reference">`;});
    const heading=$('#situation-heading');if(heading)heading.textContent=t.name;
  }
  store.on(t=>{selectedPhase=0;selectedNodeId=null;selectedPathId=null;selectedDetailTab='contract';updateStaticTask(t);renderSituation(t);});
  updateStaticTask(store.current);renderSituation(store.current);
  new ResizeObserver(()=>drawEdges(store.current)).observe($('#situation-card'));
  window.addEventListener('resize',()=>drawEdges(store.current));
  requestAnimationFrame(animateHero);
})();
