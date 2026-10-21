/* Pure demo state machine. No timers, DOM, network, or robot calls. */
(function(root){
 const durations=[.45,.45,.4,2,.7,.4];
 function initial(){return {section:'offline',offline:0,elapsed:0,total:0,phase:0,step:0,status:'Ready',complete:[],events:[],scenario:'success',triggered:false,retries:0,verification:'Pending',done:false};}
 function log(s,message){s.events.unshift({time:s.total,message});s.events=s.events.slice(0,12);}
 function recover(s,target,reason){s.complete=s.complete.filter(x=>x<target);s.phase=target;s.step=0;s.elapsed=0;s.status='Recovery';s.verification='Unmet';log(s,reason);}
 function boundary(s){
  s.elapsed=0;
  if(s.section==='offline'){if(s.offline<8)s.offline++;else s.section='situation';return;}
  if(s.section==='situation'){s.section='online';s.status='Running';log(s,'Situation matched: unzip a flexible bag.');return;}
  if(s.status==='Recovery'){s.status='Running';s.verification='Pending';return;}
  if(s.status==='Observing'){s.status='Running';s.verification='Evidence sufficient';log(s,'New observation resolves uncertainty. Verify again.');return;}
  if(s.step===4){
   if(s.phase===2 && !s.triggered && s.scenario!=='success'){
    if(s.scenario==='human' && s.retries<2){s.retries++;recover(s,2,'Grasp retry '+s.retries+': stable contact not established.');return;}
    s.triggered=true;
    if(s.scenario==='human'){s.status='Awaiting intervention';s.verification='Unmet';log(s,'Repeated failures. Execution stopped for human intervention.');return;}
    if(s.scenario==='uncertain'){s.status='Observing';s.verification='Insufficient evidence';log(s,'Uncertain contact. Acquire another observation; do not advance.');return;}
    if(s.scenario==='occluded'){recover(s,0,'Tab occluded. Rebuild accessibility; invalidate downstream results.');return;}
    if(s.scenario==='support'){recover(s,1,'Support lost. Regrasp bag edge; invalidate downstream results.');return;}
    recover(s,2,'Grasp failed; support and accessibility still hold. Retry Phase 2.');return;
   }
   s.verification='Verified';log(s,'Phase '+s.phase+': completion evidence and transition conditions verified.');
  }
  if(s.step<5){s.step++;return;}
  s.complete.push(s.phase);
  if(s.phase===3){s.done=true;s.status='Complete';log(s,'Task complete. Zipper opening verified.');return;}
  s.phase++;s.step=0;s.verification='Pending';log(s,'Transition to Phase '+s.phase+'.');
 }
 function duration(s){return s.section==='offline'?2:s.section==='situation'?5:['Recovery','Observing'].includes(s.status)?2:durations[s.step];}
 function advance(s,dt){if(s.done||s.status==='Awaiting intervention')return s;let remaining=dt;while(remaining>0&&!s.done&&s.status!=='Awaiting intervention'){let use=Math.min(remaining,duration(s)-s.elapsed);s.elapsed+=use;s.total+=use;remaining-=use;if(s.elapsed>=duration(s)-1e-8)boundary(s);}return s;}
 function step(s){return advance(s,Math.max(.001,duration(s)-s.elapsed));}
 function resume(s){if(s.status==='Awaiting intervention'){s.status='Running';s.step=0;s.elapsed=0;s.verification='Pending';log(s,'Human confirmed correction. Recheck prerequisites before retry.');}}
 root.WalleEngine={initial,advance,step,resume,duration};
})(typeof window==='undefined'?globalThis:window);
