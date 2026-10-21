/* Card-edge connections are independent of internal module geometry. */
(() => {
 const pairs=[['learning-card','situation-card','situation'],['situation-card','agent-card','agent']];
 let queued=false;
 // Preserve the shared-clock interface; section bridges are static.
 function animate(){}
 function connect(){pairs.forEach(([from,to,key])=>{
  const a=document.getElementById(from).getBoundingClientRect(),b=document.getElementById(to).getBoundingClientRect(),host=document.querySelector(`[data-method-bridge="${key}"]`),r=host.getBoundingClientRect(),svg=host.querySelector('svg'),x=a.left+a.width/2-r.left,y=a.bottom-r.top,end=b.top-r.top;
  const color=key==='agent'?'#a3835c':'#8066a5';
  svg.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);
  svg.innerHTML=`<defs><linearGradient id="bridge-${key}" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${x}" y2="${end}"><stop stop-color="#8066a5"/><stop offset="1" stop-color="${color}"/></linearGradient><marker id="bridge-arrow-${key}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8Z" fill="${color}"/></marker></defs><path class="method-wire" d="M${x} ${y}V${end-1}" stroke="url(#bridge-${key})" stroke-width="1.5" fill="none" marker-end="url(#bridge-arrow-${key})"/>`;
 });}
 const observer=new ResizeObserver(()=>{if(!queued){queued=true;requestAnimationFrame(()=>{queued=false;connect();});}});
 ['learning-card','situation-card','agent-card'].forEach(id=>observer.observe(document.getElementById(id)));
 window.addEventListener('resize',connect);document.fonts.ready.then(connect);
 window.WalleBridges={animate,connect};
})();
