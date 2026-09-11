(() => {
  'use strict';
  // Keep the original Sada feeling: the loading screen stays for at least
  // three seconds, even when the local files are already cached.
  const started=Date.now();
  let timer=null,hidden=false;
  const hide=()=>{
    if(hidden)return;
    hidden=true;
    const preloader=document.getElementById('preloader');
    if(!preloader)return;
    preloader.classList.add('hidden');
    window.setTimeout(()=>preloader.remove(),520);
  };
  const release=()=>{
    if(timer!==null)return;
    const wait=Math.max(0,3000-(Date.now()-started));
    timer=window.setTimeout(()=>requestAnimationFrame(hide),wait);
  };
  document.addEventListener('DOMContentLoaded',release,{once:true});
  window.addEventListener('load',release,{once:true});
})();
