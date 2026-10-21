/* One reusable media resource per demonstration camera. */
(() => {
 const pending=new Map(),urls=[];
 const D=window.WALLE_DATA,speed=D.media.encodedSpeed||1,fps=D.episodes[0].fps;
 function source(view){
  const path=D.media.videos[view];
  if(!pending.has(path))pending.set(path,(async()=>{
   if(location.protocol==='file:')return path;
   try{const response=await fetch(path);if(!response.ok)throw Error('Media unavailable');
    const url=URL.createObjectURL(await response.blob());urls.push(url);return url;
   }catch(error){pending.delete(path);throw error;}
  })());
  return pending.get(path);
 }
 function range(id){const p=D.situation.phases.find(p=>p.id===id);return {start:p.frames[0]/fps/speed,end:(p.frames[1]+1)/fps/speed,rate:3/speed,framesPerSecond:fps*speed};}
 window.WalleLearningMedia={source,range};
 window.addEventListener('pagehide',()=>{urls.forEach(url=>URL.revokeObjectURL(url));pending.clear();},{once:true});
})();
