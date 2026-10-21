/* One reusable media resource per demonstration camera. */
(() => {
 const pending=new Map(),urls=[];
 const D=window.WALLE_DATA,speed=D.media.encodedSpeed||1,fps=D.episodes[0].fps;
 function resource(path){
  if(!pending.has(path))pending.set(path,(async()=>{
   if(location.protocol==='file:')return path;
   try{const response=await fetch(path);if(!response.ok)throw Error('Media unavailable');
    const url=URL.createObjectURL(await response.blob());urls.push(url);return url;
   }catch(error){pending.delete(path);throw error;}
  })());
  return pending.get(path);
 }
 function source(view){return resource(D.media.videos[view]);}
 const ready=Promise.allSettled(['main','left','right'].map(source));
 let agentWarmup;
 function preloadAgent(clips){
  if(!agentWarmup)agentWarmup=(async()=>{
   await ready;
   for(const clip of clips)await Promise.allSettled(Object.values(clip.videos||{}).map(resource));
  })();
  return agentWarmup;
 }
 async function agentSource(path){await ready;return resource(path);}
 function range(id){const p=D.situation.phases.find(p=>p.id===id);return {start:p.frames[0]/fps/speed,end:(p.frames[1]+1)/fps/speed,rate:3/speed,framesPerSecond:fps*speed};}
 window.WalleLearningMedia={source,range,ready,preloadAgent,agentSource};
 window.addEventListener('pagehide',()=>{urls.forEach(url=>URL.revokeObjectURL(url));pending.clear();},{once:true});
})();
