/* Image-space overlay coordinates, normalized to the video frame. */
(() => {
 // Right-fingertip image locations in P2 frames.
 // Times use local clip seconds; x/y use normalized image coordinates.
 const range=window.WalleLearningMedia.range(2);
 const config={video:window.WALLE_DATA.media.videos.main,rate:range.rate,hold:2,fade:.45,nodes:[
  {at:8/13.6,x:.620,y:.600,name:'Pre-grasp',gripper:'Open',labelX:.67,labelY:.69},
  {at:9/13.6,x:.530,y:.595,name:'Approach',gripper:'Open',labelX:.53,labelY:.73},
  {at:12/13.6,x:.458,y:.550,name:'Grasp',gripper:'Close',labelX:.42,labelY:.64}
 ],trace:[
  {at:6/13.6,x:.83,y:.48},{at:7/13.6,x:.72,y:.56},
  {at:8/13.6,x:.620,y:.600},{at:9/13.6,x:.530,y:.595},
  {at:10/13.6,x:.483,y:.558},{at:11/13.6,x:.460,y:.560},
  {at:12/13.6,x:.458,y:.550}
 ]};
 const root=document.querySelector('#control-lane'),video=document.querySelector('#control-video'),overlay=document.querySelector('#control-overlay'),records=document.querySelector('#control-records'),output=root.querySelector('.control-output');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,hold=0,starting=false;
 let loaded=false,loading=false,retryAt=0;
 video.muted=true;video.playbackRate=config.rate;
 function prepare(){if(loaded||loading||performance.now()<retryAt)return;loading=true;
 window.WalleLearningMedia.source('main').then(src=>{video.preload='auto';video.src=src;video.load();loaded=true;}).catch(()=>{retryAt=performance.now()+3000;}).finally(()=>{loading=false;});}
 video.addEventListener('loadedmetadata',()=>{video.currentTime=range.start;});
 const points=config.trace;
 overlay.innerHTML=`<path class="control-trace-base" d="${points.map((p,i)=>`${i?'L':'M'}${p.x*100} ${p.y*75}`).join(' ')}"/><path class="control-trace" d="${points.map((p,i)=>`${i?'L':'M'}${p.x*100} ${p.y*75}`).join(' ')}"/>`+config.nodes.map((p,i)=>`<g class="control-keypoint"><line x1="${p.x*100}" y1="${p.y*75}" x2="${p.labelX*100}" y2="${p.labelY*75}"/><circle cx="${p.x*100}" cy="${p.y*75}" r="1.25"/><circle class="control-number" cx="${p.labelX*100}" cy="${p.labelY*75}" r="2.7"/><text x="${p.labelX*100}" y="${p.labelY*75+1.05}">${i+1}</text></g>`).join('');
 const stepIcons=[
  '<path d="M12 5v5M6 10h12M6 10v10l4 3M18 10v10l-4 3"/><path class="icon-guide" d="M11 19h2"/>',
  '<path d="M12 3v8m-3-3 3 3 3-3M6 14v7l4 3M18 14v7l-4 3"/><path class="icon-guide" d="M9 14h6"/>',
  '<path d="M12 4v6M7 10h10M7 10v9l4 2M17 10v9l-4 2"/><rect x="10" y="18" width="4" height="6" rx="1"/>'
 ];
 records.innerHTML=config.nodes.map((p,i)=>`<li><span class="control-step-icon"><svg viewBox="0 0 24 28" aria-hidden="true">${stepIcons[i]}</svg><b>${i+1}</b></span><div><strong>${p.name}</strong><small>${i===2?'Close gripper':'Gripper open'}</small></div></li>`).join('');
 const trace=overlay.querySelector('.control-trace'),length=trace.getTotalLength(),dots=[...overlay.querySelectorAll('.control-keypoint')],rows=[...records.children];
 const distances=points.slice(1).map((p,i)=>Math.hypot((p.x-points[i].x)*100,(p.y-points[i].y)*75));
 const clamp=x=>Math.max(0,Math.min(1,x));
 function draw(progress,still=false){
  let drawn=0;distances.forEach((d,i)=>drawn+=d*clamp((progress-points[i].at)/(points[i+1].at-points[i].at)));
  overlay.querySelector('.control-trace-base').style.opacity='0';trace.style.strokeDasharray=String(length);trace.style.strokeDashoffset=String(length-drawn);
  config.nodes.forEach((p,i)=>{const reveal=still?1:clamp((progress-p.at)/.012);rows[i].style.opacity='1';rows[i].style.transform=`translateY(${(1-reveal)*5}px)`;dots[i].style.opacity=String(reveal);rows[i].classList.toggle('recorded',progress>=p.at);});
  output.style.opacity='1';output.classList.toggle('material-complete',progress>=.98);
  const opacity=still?1:1-clamp((hold-config.hold)/config.fade);overlay.style.opacity=String(opacity);records.style.opacity='1';
 }
 function reset(){hold=0;video.pause();video.currentTime=range.start;draw(0);}
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)video.pause();},{threshold:.1}).observe(root);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
 window.WalleControl={config,reset,tick(dt,playing){
  if(reduced.matches){video.pause();draw(1,true);return;}
  if(!playing||!visible||document.hidden){video.pause();return;}
  if(!loaded){prepare();return;}
  if(video.readyState<2||video.seeking)return;
  if(video.currentTime<range.start-1/60){video.currentTime=range.start;return;}
  if(!Number.isFinite(video.duration)||!video.duration)return;
  if(video.ended||video.currentTime>=range.end||hold>0){video.pause();if(hold===0&&video.readyState>=1)video.currentTime=range.end-1/30;hold+=dt;draw(1);if(hold>=config.hold+config.fade)reset();return;}
  if(video.paused&&!starting){starting=true;video.playbackRate=config.rate;video.play().catch(()=>{}).finally(()=>starting=false);}
  draw(clamp((video.currentTime-range.start)/(range.end-range.start)));
 }};
 draw(0);
})();
