/* Interactive viewer for the exported paper SVG. */
(() => {
'use strict';
const $=selector=>document.querySelector(selector);
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
function openFramework(){frameworkDialog.showModal();fitDiagram();}
$('#framework-fit').onclick=fitDiagram;
$('#framework-reset').onclick=fitDiagram;
$('#framework-zoom-in').onclick=()=>zoomDiagram(1.25);
$('#framework-zoom-out').onclick=()=>zoomDiagram(.8);
diagramImage.addEventListener('load',()=>{if(frameworkDialog.open)fitDiagram();});
diagramImage.draggable=false;
diagramViewport.addEventListener('wheel',e=>{e.preventDefault();const r=diagramViewport.getBoundingClientRect();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?diagramViewport.clientHeight:1);zoomDiagram(Math.exp(-Math.max(-160,Math.min(160,delta))*.0025),e.clientX-r.left,e.clientY-r.top);},{passive:false});
const diagramPointers=new Map();let diagramGesture=null,lastDiagramTap=null,tapStart=null,lastDiagramTouch=-Infinity;
function gestureSnapshot(){
 const points=[...diagramPointers.values()],r=diagramViewport.getBoundingClientRect();
 if(points.length>=2){const [a,b]=points;return {x:(a.x+b.x)/2-r.left,y:(a.y+b.y)/2-r.top,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};}
 return points.length?{x:points[0].x-r.left,y:points[0].y-r.top}:null;
}
diagramViewport.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 if(e.pointerType!=='mouse')lastDiagramTouch=performance.now();
 e.preventDefault();diagramPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 diagramViewport.setPointerCapture(e.pointerId);diagramGesture=gestureSnapshot();
 tapStart=diagramPointers.size===1?{x:e.clientX,y:e.clientY,time:performance.now(),touch:e.pointerType!=='mouse'}:null;
 if(diagramPointers.size>1)lastDiagramTap=null;
 diagramViewport.classList.add('dragging');diagramViewport.focus({preventScroll:true});
});
diagramViewport.addEventListener('pointermove',e=>{
 if(!diagramPointers.has(e.pointerId))return;e.preventDefault();
 if(tapStart&&Math.hypot(e.clientX-tapStart.x,e.clientY-tapStart.y)>8)tapStart=null;
 diagramPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=gestureSnapshot(),previous=diagramGesture;
 if(previous&&next){
  if(previous.distance&&next.distance){
   const scale=Math.max(diagram.fit,Math.min(diagram.fit*8,diagram.scale*next.distance/previous.distance)),ratio=scale/diagram.scale;
   diagram.x=next.x-(previous.x-diagram.x)*ratio;diagram.y=next.y-(previous.y-diagram.y)*ratio;diagram.scale=scale;
  }else{diagram.x+=next.x-previous.x;diagram.y+=next.y-previous.y;}
  drawDiagram();
 }
 diagramGesture=next;
});
function toggleDiagramZoom(x,y){if(diagram.scale>diagram.fit*1.05)fitDiagram();else zoomDiagram(2.5,x,y);}
function finishDiagramPointer(e){
 if(!diagramPointers.has(e.pointerId))return;
 if(e.type==='pointerup'&&tapStart?.touch&&performance.now()-tapStart.time<300){
  const r=diagramViewport.getBoundingClientRect(),now=performance.now();
  if(lastDiagramTap&&now-lastDiagramTap.time<350&&Math.hypot(e.clientX-lastDiagramTap.x,e.clientY-lastDiagramTap.y)<24){toggleDiagramZoom(e.clientX-r.left,e.clientY-r.top);lastDiagramTap=null;}
  else lastDiagramTap={x:e.clientX,y:e.clientY,time:now};
 }
 tapStart=null;diagramPointers.delete(e.pointerId);diagramGesture=gestureSnapshot();
 if(!diagramPointers.size)diagramViewport.classList.remove('dragging');
}
function endDiagramDrag(){diagramPointers.clear();diagramGesture=null;tapStart=null;lastDiagramTap=null;diagramViewport.classList.remove('dragging');}
['pointerup','pointercancel','lostpointercapture'].forEach(event=>diagramViewport.addEventListener(event,finishDiagramPointer));
diagramViewport.addEventListener('dblclick',e=>{if(e.sourceCapabilities?.firesTouchEvents||performance.now()-lastDiagramTouch<600)return;const r=diagramViewport.getBoundingClientRect();toggleDiagramZoom(e.clientX-r.left,e.clientY-r.top);});
frameworkDialog.addEventListener('close',endDiagramDrag);
frameworkDialog.addEventListener('keydown',e=>{if(e.key==='Escape')return;const pan={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[e.key];if(pan){e.preventDefault();diagram.x+=pan[0];diagram.y+=pan[1];drawDiagram();}else if(['+','=','-','0'].includes(e.key)){e.preventDefault();if(e.key==='0')fitDiagram();else zoomDiagram(e.key==='-'?.8:1.25);}});
window.addEventListener('resize',()=>{if(frameworkDialog.open)fitDiagram();});
$('#open-framework').onclick=openFramework;
$('#enlarge-framework').onclick=openFramework;
$('#close-framework').onclick=()=>frameworkDialog.close();
frameworkDialog.addEventListener('click',e=>{if(e.target===frameworkDialog){const r=frameworkDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)frameworkDialog.close();}});
})();
