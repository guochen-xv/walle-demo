/* Capability handoff diagrams and condition views. */
(() => {
 'use strict';
 const $=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
 let direction='to-control',condition='ready';
 const examples={
  'to-control':{
   title:'Is the zipper ready for precise acquisition?',phase:'P0 / P1 → P2 · Grasp zipper',
   checks:['Zipper tab exposed','Feasible approach direction','Sufficient approach clearance','Left-hand support stable'],
   reference:'An exposed target, a feasible approach, and stable support.',
   ready:{checks:[true,true,true,true],title:'Proceed to grasp.',description:'The current scene satisfies the grasp phase’s prerequisites. Ground target-relative control references using the localized target.',action:'Execute Phase 2',target:2,scene:'acquire'},
   unmet:{checks:[true,true,false,true],title:'Restore approach clearance.',description:'The tab is visible, but a fold blocks the approach. Return to Adjust bag to rebuild accessibility, then recheck support and pose evidence.',action:'Revisit Phase 0',target:0,scene:'blocked'},
   uncertain:{checks:[null,null,null,true],title:'Acquire another observation.',description:'The target region is partly occluded. Hold the phase and gather evidence about pose and clearance before choosing an action.',action:'Hold · observe again',target:null,scene:'uncertain'}
  },
  'to-vla':{
   title:'Can this grasp support the demonstrated continuation?',phase:'P2 → P3 · Unzip bag',
   checks:['Zipper contact acquired','Tab grasp stable','Left-hand support stable','Continuation state compatible'],
   reference:'Stable zipper contact and support compatible with the next phase.',
   ready:{checks:[true,true,true,true],title:'Continue with the active phase.',description:'Both acquired contact and continuation compatibility are supported by the observation. Invoke Phase-Conditioned VLA with the Unzip bag phase prompt.',action:'Execute Phase 3',target:3,scene:'continue'},
   unmet:{checks:[true,true,false,false],title:'Restore bag support.',description:'A zipper grasp alone is insufficient: left-hand support has been lost. Revisit Grasp edge and revalidate downstream contact and handoff conditions.',action:'Revisit Phase 1',target:1,scene:'unsupported'},
   uncertain:{checks:[true,null,true,null],title:'Verify the contact before pulling.',description:'Apparent gripper closure does not establish a stable tab grasp. Gather another view and verify contact and continuation compatibility before advancing.',action:'Hold · observe again',target:null,scene:'uncertain'}
  }
 };
 function scene(kind){
  const control=['acquire','blocked'].includes(kind), color=control?'#39877D':'#4C78A8';
  const blocked=kind==='blocked',uncertain=kind==='uncertain',unsupported=kind==='unsupported',pull=kind==='continue';
  return `<svg viewBox="0 0 340 200" role="img" aria-label="${kind} diagram of a bag, zipper and robot grippers">
   <rect width="340" height="200" fill="#FAFAF8"/><path d="M34 169H306" stroke="#E5E5E0"/>
   <path d="M87 69Q164 41 249 76L269 154Q181 182 75 149Z" fill="#E6E6E3" stroke="#A8ABA8" stroke-width="2"/>
   <path d="M94 94Q165 77 245 99M94 101Q165 84 245 106" fill="none" stroke="#8C9290" stroke-width="2"/>
   <rect x="${pull?201:173}" y="91" width="20" height="11" rx="3" fill="#fff" stroke="${color}" stroke-width="2"/>
   ${unsupported?'':`<path d="M35 49L69 78V119M58 119V132H69M80 119V132H69" fill="none" stroke="#4C78A8" stroke-width="4" stroke-linecap="round"/>`}
   ${kind==='prepare'?`<path d="M118 57Q154 25 195 52M187 42L195 52L180 54" fill="none" stroke="${color}" stroke-width="2"/>`:`<path d="M282 41L237 65L${pull?218:190} 86M${pull?209:181} 86V102M${pull?227:199} 86V102" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`}
   ${control?'<path d="M269 53L229 72L185 96" fill="none" stroke="#39877D" stroke-width="2" stroke-dasharray="4 5"/><g fill="#fff" stroke="#39877D" stroke-width="2"><circle cx="269" cy="53" r="4"/><circle cx="229" cy="72" r="4"/><circle cx="185" cy="96" r="4"/></g>':''}
   ${blocked?'<path d="M204 73Q219 89 212 122L234 127Q247 94 223 72Z" fill="#DFC3BC" stroke="#B96B5F" stroke-width="2"/>':''}
   ${uncertain?'<rect x="156" y="73" width="87" height="51" rx="15" fill="#F3EDE4" fill-opacity=".94" stroke="#A3835C" stroke-dasharray="5 4"/><text x="199" y="108" text-anchor="middle" font-size="28" fill="#A3835C">?</text>':''}
   ${pull?'<path d="M213 122H255M246 115L255 122L246 129" stroke="#4C78A8" stroke-width="2" fill="none"/>':''}
   ${unsupported?'<circle cx="68" cy="122" r="18" fill="#F5E6E1" stroke="#B96B5F"/><path d="M61 115L75 129M75 115L61 129" stroke="#B96B5F" stroke-width="2"/>':''}
  </svg>`;
 }
 all('[data-task-scene]').forEach(host=>{const p=window.WALLE_DATA.situation.phases[{prepare:0,acquire:2,continue:3}[host.dataset.taskScene]],view=host.dataset.taskScene==='acquire'?'right':'main';host.innerHTML=`<img class="recorded-motivation" src="${p.views[view]}" alt="Recorded ${p.name} reference">`;});
 function render(){
  if(!$('#handoff-content'))return;
  const example=examples[direction],state=example[condition];
  all('[data-handoff-direction]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.handoffDirection===direction));
  all('[data-handoff-case]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.handoffCase===condition));
  $('#handoff-content').innerHTML=`<div class="handoff-intro"><span class="eyebrow">${example.phase}</span><h3>${example.title}</h3></div><div class="handoff-grid">
   <div class="handoff-comparison"><figure><figcaption>Situation reference</figcaption>${scene(direction==='to-control'?'acquire':'continue')}<p>${example.reference}</p></figure><span class="comparison-arrow" aria-hidden="true">↔</span><figure><figcaption>Current observation · ${condition}</figcaption>${scene(state.scene)}<p>Phase conditions</p></figure></div>
   <div class="handoff-decision"><span class="decision-label ${condition}">${condition==='ready'?'READY':condition==='unmet'?'UNMET':'UNCERTAIN'}</span><ul>${example.checks.map((text,i)=>`<li class="${state.checks[i]===true?'pass':state.checks[i]===false?'fail':'unknown'}"><span>${state.checks[i]===true?'✓':state.checks[i]===false?'×':'?'}</span>${text}</li>`).join('')}</ul><div class="handoff-result" role="status"><h4>${state.title}</h4><p>${state.description}</p>${state.target===null?`<span class="hold-action">${state.action}</span>`:`<a class="outline" href="#situation" data-phase="${state.target}">Inspect Phase ${state.target} contract ↗</a>`}</div></div></div>`;
 }
 all('[data-handoff-direction]').forEach(b=>b.addEventListener('click',()=>{document.dispatchEvent(new Event('walle:inspect'));direction=b.dataset.handoffDirection;render();}));
 all('[data-handoff-case]').forEach(b=>b.addEventListener('click',()=>{document.dispatchEvent(new Event('walle:inspect'));condition=b.dataset.handoffCase;render();}));
 render();
})();
