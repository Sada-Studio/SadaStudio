(() => {
  'use strict';
  const root=document.documentElement;
  const clamp=v=>Math.max(0,Math.min(1,v));
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  const color=(a,b,t)=>'rgb('+a.map((c,i)=>Math.round(c+(b[i]-c)*t)).join(' ')+')';
  const dark=[9,9,9],paper=[243,243,241],white=[247,247,245];
  let isHome=root.dataset.home==='true',journey=0,footerPhase=0,frame=0,lastKey='',video=null;
  function paint(){
    const pageLight=1-footerPhase,homeLight=journey*pageLight,headerLight=isHome?homeLight:pageLight;
    const key=[isHome,homeLight.toFixed(3),footerPhase.toFixed(3)].join('/');
    if(key===lastKey)return;lastKey=key;
    const set=(name,value)=>root.style.setProperty(name,value);
    set('--page-bg',color(dark,paper,pageLight));
    set('--page-ink',color(white,dark,pageLight));
    set('--page-muted',color([181,181,179],[101,101,99],pageLight));
    set('--page-line',color([65,65,64],[200,200,196],pageLight));
    set('--journey-bg',color(dark,paper,homeLight));
    set('--journey-ink',color(white,dark,homeLight));
    set('--journey-muted',color([173,173,170],[100,100,98],homeLight));
    set('--journey-line',color([64,64,62],[200,200,196],homeLight));
    set('--header-ink',color(white,dark,headerLight));
    set('--logo-invert',(1-headerLight).toFixed(3));
    set('--glass-ink',color(white,dark,headerLight));
    set('--footer-video-opacity',(footerPhase*.60).toFixed(3));
    set('--footer-logo-invert',footerPhase.toFixed(3));
    root.classList.toggle('footer-dark',footerPhase>.7);
  }
  function update(){
    frame=0;
    const footer=document.getElementById('footer');
    if(footer){
      const r=footer.getBoundingClientRect(),h=window.innerHeight;
      footerPhase=smooth((h*.84-r.top)/(h*.66));
      video=footer.querySelector('video');
      if(video){
        if(r.top<h+160&&r.bottom>0&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
          if(video.paused)video.play().catch(()=>{});
        }else if(!video.paused)video.pause();
      }
    }
    paint();
  }
  function refresh(){if(!frame)frame=requestAnimationFrame(update);}
  window.addEventListener('scroll',refresh,{passive:true});
  window.addEventListener('resize',refresh,{passive:true});
  document.addEventListener('visibilitychange',refresh);
  window.SadaAtmosphere={
    setRoute(home){isHome=home;journey=0;footerPhase=0;root.dataset.home=String(home);paint();refresh();},
    setJourney(value){journey=clamp(value);paint();},
    getJourneyPaper(){return journey*(1-footerPhase);},
    refresh
  };
  paint();
})();
