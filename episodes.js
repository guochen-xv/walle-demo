/* Independent, synchronized three-camera Episode playback. */
(() => {
 const groups=[];let timer,running=true;
 function init(){
  document.querySelectorAll('.mini-episode').forEach(card=>{
   const videos=[...card.querySelectorAll('video')],main=card.querySelector('[data-view="main"]'),button=card.querySelector('button'),status=card.querySelector('.episode-play-state');
   if(!videos.length)return;
   let loading=false,loaded=false;
   const g={card,videos,main,button,status,visible:false,manual:false,busy:false,failed:false,initialized:false};groups.push(g);
   const wanted=()=>running&&card.classList.contains('focus')&&g.visible&&!document.hidden&&!g.manual&&!g.failed;
   const label=()=>{if(button){button.textContent=g.manual?'Play':'Pause';button.setAttribute('aria-label',`${g.manual?'Play':'Pause'} videos`);}if(status)status.textContent=g.failed?'Video unavailable':g.manual?'Paused':!g.visible||document.hidden?'Offscreen':videos.every(v=>!v.paused)?'Playing':'Loading';};
   g.update=()=>{label();if(!wanted()){videos.forEach(v=>v.pause());return;}if(!loaded){if(!loading){loading=true;Promise.all(videos.map(async v=>{v.src=await window.WalleLearningMedia.source(v.dataset.view);v.load();})).then(()=>{loaded=true;}).catch(()=>{g.failed=true;}).finally(()=>{loading=false;g.update();});}return;}if(videos.every(v=>v.readyState>=3))g.initialized=true;if(g.busy||!g.initialized||!videos.every(v=>v.readyState>=2))return;
    if(videos.every(v=>!v.paused))return;g.busy=true;const t=main.currentTime;videos.forEach(v=>{v.playbackRate=1;if(Math.abs(v.currentTime-t)>.1)v.currentTime=t;});
    Promise.all(videos.map(v=>v.play())).catch(error=>{if(error?.name==='NotAllowedError')g.manual=true;videos.forEach(v=>v.pause());}).finally(()=>{g.busy=false;if(!wanted())videos.forEach(v=>v.pause());label();});
   };
   g.loop=()=>{if(g.busy)return;videos.forEach(v=>{v.pause();v.currentTime=0;v.playbackRate=1;});g.update();};
   videos.forEach(v=>{v.muted=true;v.defaultPlaybackRate=1;v.playbackRate=1;v.addEventListener('canplay',g.update);v.addEventListener('loadedmetadata',()=>{v.playbackRate=1;});v.addEventListener('error',()=>{g.failed=true;g.update();});v.addEventListener('ended',g.loop);v.addEventListener('waiting',()=>{if(wanted())videos.forEach(x=>{if(x!==v)x.pause();});});});
   if(button)button.onclick=()=>{g.manual=!g.manual;g.update();};
   card.addEventListener?.('click',()=>{if(g.manual){g.manual=false;g.update();}});
   new IntersectionObserver(entries=>{g.visible=entries[0].isIntersecting&&(entries[0].intersectionRatio??1)>=.2;g.update();},{threshold:[0,.2]}).observe(card);

  });
  document.addEventListener('visibilitychange',()=>groups.forEach(g=>g.update()));
  timer=setInterval(()=>groups.forEach(g=>{if(!g.visible||document.hidden||g.manual||g.failed)return;const {main,videos}=g;if(main.ended){g.loop();return;}if(!main.paused){videos.forEach(v=>{if(v!==main&&v.readyState>=3&&!v.seeking&&Math.abs(v.currentTime-main.currentTime)>.1)v.currentTime=main.currentTime;});}g.update();}),200);
  window.addEventListener('pagehide',()=>{clearInterval(timer);groups.forEach(g=>g.videos.forEach(v=>v.pause()));},{once:true});
 }
 window.WalleEpisodes={init,setPlaying(value){if(running===value)return;running=value;groups.forEach(g=>g.update());},refresh(){groups.forEach(g=>g.update());}};
})();
