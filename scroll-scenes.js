(() => {
  'use strict';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const mod=(v,n)=>((v%n)+n)%n;
  function advanceTravel(state,delta,dt,height,reduced=false){
    if(reduced)return {travel:0,velocity:0};
    const velocity=clamp(state.velocity+delta/Math.max(1,height)*11,-9,9);
    const decay=Math.exp(-dt*2.7);
    return {travel:state.travel+.2*dt+velocity*(1-decay)/2.7,velocity:velocity*decay};
  }
  function mobileLogoSlot(width,height,header=0){
    const zone=clamp((height-header)*.32,170,245),base=Math.min(width*.47,height*.44);
    return {zone,y:height/2-(header+zone/2),scale:(zone-32)/(2.2*base)};
  }
  function samplePose(keys,scroll){
    if(scroll<=keys[0].at)return {...keys[0]};
    if(scroll>=keys[keys.length-1].at)return {...keys[keys.length-1]};
    let i=0;while(i<keys.length-2&&keys[i+1].at<scroll)i++;
    const a=keys[i],b=keys[i+1],t=smooth((scroll-a.at)/Math.max(1,b.at-a.at)),out={};
    for(const name of ['x','y','scale','rx','ry','rz','opacity','burst','invert'])out[name]=mix(a[name]??0,b[name]??0,t);
    return out;
  }
  function paperLayout(width,height){
    const mobile=width<761,portrait=mobile&&height>width*.48;
    const cardWidth=portrait?Math.min(width*.56,330,height*.70):Math.min(width*.27,570,height*.66);
    const cardHeight=cardWidth/1.55;
    return {width:cardWidth,height:cardHeight,x:width*(mobile&&!portrait?.44:.49),y:height*(portrait?.43:.47),
      topY:-cardHeight*.06,bottomY:height+cardHeight*.035,cornerX:width*(portrait?.38:.125),
      copyTop:height*.68,mobile,portrait};
  }
  function paperPose(relative,layout,index,reduced=false,velocity=0){
    const d=relative,abs=Math.abs(d),side=Math.sign(d),leave=smooth(abs),depth=clamp(abs-1,0,3.8);
    const active=abs<.50001;
    if(reduced)return {index,x:0,y:0,rx:0,ry:0,rz:0,scale:1,opacity:active?1:0,bend:0,visible:active,order:active?1000:0};
    return {index,
      x:-side*(layout.cornerX*leave+depth*layout.width*.12),
      y:((side<0?layout.topY:layout.bottomY)-layout.y)*leave+side*depth*layout.height*.045,
      rx:-side*leave*11,ry:side*leave*9,rz:-side*(leave*6+depth*2.4),
      scale:1-leave*.12-depth*.025,
      opacity:1-smooth((abs-3.65)/.95),
      bend:clamp(velocity*.12,-.65,.65)*(1-smooth(abs/3))+side*Math.sin(Math.min(abs,1)*Math.PI)*.13,
      visible:abs<4.6,order:1000-Math.round(abs*100)
    };
  }
  function paperContour(bend){
    if(Math.abs(bend)<.002)return 'none';
    const points=[],amount=clamp(bend,-.7,.7)*5;
    for(let i=0;i<=8;i++)points.push(`${i*12.5}% ${(Math.sin(i*Math.PI/8)*Math.max(0,amount)).toFixed(3)}%`);
    for(let i=8;i>=0;i--)points.push(`${i*12.5}% ${(100-Math.sin(i*Math.PI/8)*Math.max(0,-amount)).toFixed(3)}%`);
    return `polygon(${points.join(',')})`;
  }

  class ParticleJourney {
    constructor(root){
      this.root=root;this.layer=root.querySelector('.universe-layer');
      this.canvas=root.querySelector('.technical-field');this.ctx=this.canvas.getContext('2d');
      this.cloud=new window.SadaPointCloud(root.querySelector('[data-journey-logo]'),{pointerTarget:root,brand:true});
      this.hero=root.querySelector('[data-opening]');this.stage=root.querySelector('.hero-stage');
      this.cues=[...root.querySelectorAll('[data-opening-cue]')];this.game=root.querySelector('[data-game]');
      this.stops=[...root.querySelectorAll('.voyage-stop')];this.inversion=root.querySelector('[data-inversion-section]');
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.abort=new AbortController();
      this.dead=false;this.frame=0;this.active=true;this.time=0;this.scroll=window.scrollY;this.lastScroll=this.scroll;
      this.travel={travel:0,velocity:0};this.inputScroll=this.scroll;this.paper=0;
      const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
      this.floaters=Array.from({length:matchMedia('(pointer: coarse)').matches?230:400},(_,i)=>({x:(random(i*5)-.5)*30,y:(random(i*5+1)-.5)*26,z:random(i*5+2)*24,size:.75+random(i*5+3)*1.4,alpha:.35+random(i*5+4)*.45}));
      const opts={signal:this.abort.signal,passive:true};
      window.addEventListener('scroll',()=>this.wake(),opts);window.addEventListener('resize',()=>this.measure(),opts);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.last=0;this.wake();}},opts);
      this.motion.addEventListener('change',()=>this.measure(),opts);
      this.resizeObserver=new ResizeObserver(()=>this.measure());this.resizeObserver.observe(this.hero);this.resizeObserver.observe(root);
      this.observer=new IntersectionObserver(entries=>{this.active=entries[0].isIntersecting;if(this.active){this.scroll=window.scrollY;this.inputScroll=this.scroll;this.wake();}});this.observer.observe(root);
      this.measure();
    }
    measure(){
      if(this.dead)return;
      const header=document.querySelector('.header').getBoundingClientRect().height;
      this.root.style.setProperty('--header-height',header+'px');
      this.width=this.layer.clientWidth;this.height=this.layer.clientHeight;
      const W=this.width,H=this.height,Y=window.scrollY,base=Math.min(W*.47,H*.44);
      const h=this.hero.getBoundingClientRect();this.heroTop=h.top+Y;this.heroEnd=h.bottom+Y;
      this.mobile=W<761;
      const slot=mobileLogoSlot(W,H,header),zone=slot.zone;
      this.root.style.setProperty('--mobile-logo-zone',zone+'px');
      const initialScale=(this.mobile?Math.min(W*.44,H*.28):Math.min(W*.205,H*.285))/base;
      const pose=(at,x,y,scale,ry,opacity=1)=>({at,x,y,scale,ry,rx:0,rz:0,opacity,burst:0,invert:0});
      this.keys=[pose(this.heroTop,0,-H*.015,initialScale,-.14),pose(this.heroEnd-H,0,-H*.015,initialScale,.95),
        pose(this.heroEnd-H*.15,0,0,initialScale,1.5,.08)];
      this.bounds=this.stops.map((stop,i)=>{
        const r=stop.getBoundingClientRect(),start=r.top+Y,end=r.bottom+Y,side=i%2===0?-1:1;
        this.keys.push(pose(start-H*.72,0,0,initialScale,Math.PI*(i*2+1.15),.6));
        this.keys.push(pose(start-H*.06,this.mobile?0:side*W*.33,this.mobile?slot.y:-H*.02,this.mobile?slot.scale:.53,Math.PI*(i+1)*2-side*.15));
        this.keys.push(pose(end-H*.95,this.mobile?0:side*W*.33,this.mobile?slot.y:-H*.02,this.mobile?slot.scale:.53,Math.PI*(i+1)*2+side*.2));
        return {start,end,panel:stop.querySelector('.voyage-project')};
      });
      const inv=this.inversion.getBoundingClientRect();
      this.inversionBounds={start:inv.top+Y,end:inv.bottom+Y};
      // The all-projects link crossing the viewport centre releases the logo;
      // the following statement retains its own black-to-white transition.
      this.cue=this.inversionBounds.start-H*.42;this.cueDuration=H*.44;
      const allProjects=this.root.querySelector('.journey-end .pill').getBoundingClientRect();
      this.explosionCue=allProjects.top+Y+allProjects.height/2-H/2;
      this.explosionDuration=Math.max(1,this.cue-this.explosionCue);
      const turn=Math.PI*(this.stops.length*2+1);
      this.keys.push(pose(this.explosionCue-H*.5,0,-H*.02,initialScale,turn-.35,.85));
      this.keys.push(pose(this.explosionCue,0,0,initialScale,turn,1));
      this.keys.push(pose(this.cue,0,0,initialScale,turn+.15,.55));
      this.keys.push(pose(this.cue+this.cueDuration,0,0,initialScale,turn+.3,.42));
      this.keys.push(pose(Math.max(this.cue+this.cueDuration+1,this.inversionBounds.end-H*.85),0,0,initialScale,turn+.65,.32));
      this.keys.push(pose(this.inversionBounds.end-H*.04,0,0,initialScale,turn+.8,0));
      this.keys.sort((a,b)=>a.at-b.at);
      this.dpr=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(W*this.dpr);this.canvas.height=Math.round(H*this.dpr);
      this.cloud.resize();this.syncScroll();
    }
    syncScroll(){
      this.scroll=window.scrollY;this.lastScroll=this.scroll;this.inputScroll=this.scroll;
      if(this.motion.matches)this.travel={travel:0,velocity:0};
      this.wake();
    }
    wake(){if(!this.frame&&!this.dead&&this.active&&!document.hidden)this.frame=requestAnimationFrame(t=>this.draw(t));}
    draw(t){
      this.frame=0;if(this.dead||!this.active||document.hidden)return;
      const dt=Math.min(.06,(t-(this.last||t))/1000);this.last=t;this.time+=dt;
      const target=window.scrollY,H=this.height;
      this.travel=advanceTravel(this.travel,target-this.inputScroll,dt,H,this.motion.matches);this.inputScroll=target;
      this.scroll=this.motion.matches?target:mix(this.scroll,target,1-Math.exp(-dt*13));
      if(Math.abs(this.scroll-target)<.05)this.scroll=target;
      const pose=samplePose(this.keys,this.scroll);
      const progress=clamp((this.scroll-this.heroTop)/Math.max(1,this.heroEnd-this.heroTop-H));
      const envelope=(p,a,b,c,d)=>smooth((p-a)/(b-a))*(1-smooth((p-c)/(d-c)));
      for(const element of this.cues){
        const cue=element.dataset.openingCue;
        let alpha=cue==='hint'?1-smooth(progress/.18):
          cue==='make'?envelope(progress,.06,.21,.46,.64):
          cue==='echo'?envelope(progress,.28,.44,.72,.9):envelope(progress,.66,.8,.95,1.1);
        if(this.motion.matches)alpha=1;
        element.style.opacity=alpha.toFixed(4);
        element.style.filter=this.motion.matches?'none':'blur('+((1-alpha)*9).toFixed(2)+'px)';
        element.style.transform=this.motion.matches?'none':'translate3d(0,'+((1-alpha)*14).toFixed(2)+'px,0)';
        element.inert=alpha<.3;
      }
      const explosion=smooth((this.scroll-this.explosionCue)/this.explosionDuration);
      const inversion=smooth((this.scroll-this.cue)/this.cueDuration);
      window.SadaAtmosphere?.setJourney(inversion);
      this.paper=window.SadaAtmosphere?.getJourneyPaper()??inversion;
      pose.burst=explosion;pose.invert=this.paper;
      pose.tint=4*smooth((this.scroll-H*.16)/Math.max(H,this.cue-H*.16));
      if(this.motion.matches){pose.rx=0;pose.ry=-.14;pose.rz=0;}
      if(this.game?.dataset.state==='playing'||this.game?.dataset.state==='paused')pose.opacity*=.12;
      this.cloud.setPose(pose);
      for(const {start,end,panel} of this.bounds){
        const enter=this.mobile?smooth((this.scroll-(start-H*.06))/(H*.22)):smooth((this.scroll-(start-H*.72))/(H*.53));
        const exit=this.mobile?1-smooth((this.scroll-(end-H*1.18))/(H*.23)):1-smooth((this.scroll-(end-H*.99))/(H*.49));
        const alpha=enter*exit;
        panel.style.opacity=this.motion.matches?'1':alpha.toFixed(4);
        panel.style.filter=this.motion.matches?'none':'blur('+((1-alpha)*8).toFixed(2)+'px)';
        panel.style.transform=this.motion.matches?'none':'translate3d(0,'+((1-enter)*35-(1-exit)*28).toFixed(2)+'px,0)';
        panel.inert=!this.motion.matches&&alpha<.25;
      }
      const focus=this.motion.matches?1:smooth((inversion-.28)/.7);
      this.inversion.style.setProperty('--statement-focus',focus.toFixed(4));
      this.inversion.style.setProperty('--statement-blur',((1-focus)*9).toFixed(2)+'px');
      this.root.classList.toggle('is-inverted',this.paper>.5);
      this.drawField();this.lastScroll=this.scroll;
      if(!this.motion.matches||this.scroll!==target)this.wake();
    }
    drawField(){
      const c=this.ctx;if(!c)return;
      const W=this.width,H=this.height;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,W,H);
      const pitch=clamp(W/23,42,68),origin=W/2;
      const travel=this.motion.matches?0:this.scroll*.06+this.travel.travel*H*.075;
      const first=Math.floor(travel/pitch)-1,last=Math.ceil((travel+H)/pitch)+1;
      const cols=Math.ceil(W/pitch/2),quiet=this.game?.dataset.state==='playing'?.22:1;
      const ink='rgb('+Array(3).fill(Math.round(255-246*(this.paper||0))).join(',')+')';
      c.fillStyle=c.strokeStyle=ink;c.lineWidth=.55;
      // An even dot register, with the centre quieter for the logo and type.
      for(let row=first;row<=last;row++){
        const y=row*pitch-travel,edge=smooth(y/75)*smooth((H-y)/75);
        for(let col=-cols;col<=cols;col++){
          const x=origin+col*pitch,margin=clamp(Math.abs(x-W/2)/(W*.45));
          c.globalAlpha=(.065+margin*.08)*edge*quiet;
          c.beginPath();c.arc(x,y,.65,0,Math.PI*2);c.fill();
        }
      }
      // Perspective stars coast after the gesture, like the original site's
      // motion cues. Short trails appear only while moving through the volume.
      const drift=this.motion.matches?0:this.travel.travel;
      for(const dot of this.floaters){
        const z=mod(dot.z-drift,24)+2;
        const x=W/2+dot.x*W*.8/z,y=H*.46+dot.y*H*.9/z;
        if(x<0||x>W||y<0||y>H)continue;
        const fade=clamp((26-z)/2)*clamp((z-2)/1.3),depth=.32+.68*(1-z/26);
        const alpha=dot.alpha*fade*depth*quiet,radius=clamp(dot.size*6/z,.65,2.2);
        const priorZ=Math.max(1.5,z+this.travel.velocity*.026);
        const dx=dot.x*W*.8*(1/priorZ-1/z),dy=dot.y*H*.9*(1/priorZ-1/z),length=Math.hypot(dx,dy);
        if(!this.motion.matches&&length>.5){
          const limit=Math.min(1,14/length);c.globalAlpha=alpha*.42;c.lineWidth=radius*.7;
          c.beginPath();c.moveTo(x+dx*limit,y+dy*limit);c.lineTo(x,y);c.stroke();
        }
        c.globalAlpha=alpha;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();
      }
      c.globalAlpha=1;
    }
    destroy(){this.dead=true;cancelAnimationFrame(this.frame);this.abort.abort();this.resizeObserver.disconnect();this.observer.disconnect();this.cloud.destroy();}
  }

  class PaperStack {
    constructor(root){
      this.root=root;this.stage=root.querySelector('.paper-stage');this.cards=[...root.querySelectorAll('.paper-card')];
      this.info=[...root.querySelectorAll('.paper-info')];this.roles=[...root.querySelectorAll('.paper-role')];
      this.copy=root.querySelector('.paper-copy');this.indexEl=root.querySelector('[data-paper-number]');this.live=root.querySelector('[data-paper-live]');
      this.previous=root.querySelector('[data-paper-prev]');this.next=root.querySelector('[data-paper-next]');
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.abort=new AbortController();
      this.current=0;this.selected=-1;this.displayed=-1;this.metaFocus=1;this.velocity=0;this.frame=0;this.dead=false;this.active=true;this.last=0;this.snapTimer=0;this.snapDelay=180;this.snapTarget=null;this.touching=false;
      const opts={signal:this.abort.signal,passive:true};
      window.addEventListener('scroll',()=>{this.wake();this.scheduleSnap();},opts);window.addEventListener('resize',()=>this.measure(),opts);
      const interrupt=()=>{this.snapTarget=null;clearTimeout(this.snapTimer);};
      window.addEventListener('wheel',interrupt,opts);
      this.stage.addEventListener('pointerdown',interrupt,opts);
      this.stage.addEventListener('touchstart',()=>{this.touching=true;interrupt();},opts);
      const release=e=>{this.touching=!!e.touches?.length;if(!this.touching)this.scheduleSnap();};
      window.addEventListener('touchend',release,opts);window.addEventListener('touchcancel',release,opts);
      window.addEventListener('scrollend',()=>this.scheduleSnap(),opts);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.wake();},opts);
      this.motion.addEventListener('change',()=>this.syncScroll(),{signal:this.abort.signal});
      this.previous.addEventListener('click',()=>this.goTo(this.selected-1),{signal:this.abort.signal});
      this.next.addEventListener('click',()=>this.goTo(this.selected+1),{signal:this.abort.signal});
      this.stage.addEventListener('click',e=>{
        const card=e.target.closest('.paper-card');if(!card)return;
        const index=this.cards.indexOf(card);if(index<0||(index===this.selected&&Math.abs(this.current-index)<.035))return;
        e.preventDefault();this.goTo(index);
      },{signal:this.abort.signal});
      this.stage.addEventListener('keydown',e=>{
        if(e.target.closest('input,textarea,summary,select'))return;
        const next=['ArrowDown','ArrowRight','PageDown'].includes(e.key),prev=['ArrowUp','ArrowLeft','PageUp'].includes(e.key);
        if(next||prev){e.preventDefault();this.goTo(this.selected+(next?1:-1));}
        else if(e.key==='Home'){e.preventDefault();this.goTo(0);}
        else if(e.key==='End'){e.preventDefault();this.goTo(this.cards.length-1);}
      },{signal:this.abort.signal});
      this.observer=new IntersectionObserver(entries=>{this.active=entries[0].isIntersecting;if(this.active)this.wake();});this.observer.observe(root);
      this.renderer=window.SadaPaperRenderer?new window.SadaPaperRenderer(root.querySelector('.paper-deck'),this.cards,()=>this.wake()):null;
      this.measure();this.syncScroll();
    }
    measure(){
      if(this.dead)return;
      const progress=this.step?this.target():0,oldHeight=this.height,oldWidth=this.width;
      const onStack=this.step&&window.scrollY>=this.start&&window.scrollY<=this.start+(this.cards.length-1)*this.step;
      const header=document.querySelector('.header').offsetHeight,toolbar=document.querySelector('.work-toolbar').offsetHeight;
      this.top=header+toolbar;this.root.style.setProperty('--stack-top',this.top+'px');
      // CSS uses the small viewport height. The iPhone address bar opening or
      // closing no longer changes the distance assigned to each project.
      this.height=Math.max(180,this.stage.clientHeight||window.innerHeight-this.top);
      this.width=this.stage.clientWidth||window.innerWidth;this.layout=paperLayout(this.width,this.height);
      this.root.style.setProperty('--paper-width',this.layout.width+'px');this.root.style.setProperty('--paper-height',this.layout.height+'px');
      this.root.style.setProperty('--copy-top',this.layout.copyTop+'px');
      this.step=Math.max(340,this.height*.88);
      this.root.style.height=(this.height+Math.max(0,this.cards.length-1)*this.step)+'px';
      this.start=this.root.getBoundingClientRect().top+window.scrollY-this.top;
      if(onStack&&(oldWidth!==this.width||oldHeight!==this.height))window.scrollTo({top:this.start+progress*this.step,behavior:'instant'});
      this.renderer?.resize(this.width,this.height);this.wake();
    }
    target(){return clamp((window.scrollY-this.start)/this.step,0,this.cards.length-1);}
    scheduleSnap(){
      clearTimeout(this.snapTimer);
      if(this.dead||this.touching||!this.step||!this.cards.length)return;
      const lower=this.start-2,upper=this.start+(this.cards.length-1)*this.step+24;
      if(window.scrollY<lower||window.scrollY>upper){this.snapTarget=null;return;}
      this.snapTimer=setTimeout(()=>{
        if(this.dead||this.touching||window.scrollY<lower||window.scrollY>upper)return;
        // Preserve the intended corner card throughout a long smooth scroll.
        const target=this.target(),index=this.snapTarget??Math.round(target);
        if(Math.abs(target-index)>.001)this.goTo(index);
        else this.snapTarget=null;
      },this.snapDelay);
    }
    syncScroll(){this.current=this.motion.matches?Math.round(this.target()):this.target();this.velocity=0;this.paint(1,true);this.wake();}
    goTo(index){
      index=clamp(index,0,this.cards.length-1);
      clearTimeout(this.snapTimer);this.snapTarget=index;
      window.scrollTo({top:this.start+index*this.step,behavior:this.motion.matches?'instant':'smooth'});this.wake();
    }
    wake(){if(!this.frame&&!this.dead&&this.active&&!document.hidden)this.frame=requestAnimationFrame(t=>this.draw(t));}
    draw(t){
      this.frame=0;if(this.dead||!this.active||document.hidden)return;
      const dt=Math.min(.05,Math.max(.001,(t-(this.last||t-16.67))/1000));this.last=t;
      const target=this.motion.matches?Math.round(this.target()):this.target(),old=this.current;
      if(this.snapTarget!==null&&Math.abs(this.target()-this.snapTarget)<.001)this.snapTarget=null;
      this.current=this.motion.matches?Math.round(target):mix(this.current,target,1-Math.exp(-dt*12));
      if(Math.abs(this.current-target)<.0003)this.current=target;
      this.velocity=this.motion.matches?0:mix(this.velocity,(this.current-old)/dt,1-Math.exp(-dt*16));
      if(Math.abs(this.velocity)<.0003)this.velocity=0;
      this.paint(dt);if(Math.abs(this.current-target)>.0002||Math.abs(this.velocity)>.0003||this.metaSettling)this.wake();
    }
    displayMetadata(index){
      for(let i=0;i<this.info.length;i++){this.info[i].hidden=i!==index;this.roles[i].hidden=i!==index;}
      this.displayed=index;this.indexEl.innerHTML=window.SadaBrand.numeral(index+1);
    }
    paint(dt=1/60,instant=false){
      const selected=clamp(Math.floor(this.current+.5),0,this.cards.length-1),poses=[];
      for(let i=0;i<this.cards.length;i++){
        const card=this.cards[i],d=i-this.current,p=paperPose(d,this.layout,i,this.motion.matches,this.velocity),active=i===selected;
        poses.push(p);card.style.visibility=p.visible?'visible':'hidden';card.style.zIndex=String(p.order+1);
        card.style.opacity=String(p.opacity);
        card.style.transform=`translate3d(${(this.layout.x+p.x-this.layout.width/2).toFixed(2)}px,${(this.layout.y+p.y-this.layout.height/2).toFixed(2)}px,0) rotate(${p.rz.toFixed(2)}deg) scale(${p.scale.toFixed(4)})`;
        // A light curved edge also survives external textures being denied to
        // WebGL, including browsers opening the downloaded site through file://.
        const surface=card.querySelector('.paper-image');
        surface.style.transform=`perspective(1100px) rotateX(${p.rx.toFixed(2)}deg) rotateY(${p.ry.toFixed(2)}deg)`;
        surface.style.clipPath=this.motion.matches?'none':paperContour(p.bend);
        card.classList.toggle('is-current',active);card.inert=!p.visible;
        card.style.pointerEvents=p.visible?'auto':'none';
        card.setAttribute('aria-hidden',String(!p.visible));
        if(Math.abs(d)<5.5){const img=card.querySelector('img[data-src]');if(img){img.src=img.dataset.src;img.removeAttribute('data-src');}}
      }
      this.renderer?.paint(poses,this.layout);
      if(selected!==this.selected){
        if(this.selected>=0&&this.cards[this.selected]?.contains(document.activeElement))this.stage.focus({preventScroll:true});
        if(this.selected>=0)window.SadaSound?.play('hover');
        this.selected=selected;this.previous.disabled=selected===0;this.next.disabled=selected===this.cards.length-1;
        this.root.querySelector('[data-paper-progress]').style.transform=`scaleX(${(selected+1)/this.cards.length})`;
      }
      let focusTarget=1;
      if(instant||this.motion.matches||this.displayed<0){this.displayMetadata(selected);this.metaFocus=1;}
      else {
        focusTarget=this.displayed!==selected?0:(1-smooth((Math.abs(this.current-selected)-.08)/.40))*(1-smooth(Math.abs(this.velocity)/2.5));
        this.metaFocus=mix(this.metaFocus,focusTarget,1-Math.exp(-dt*18));
        // Swap all three content areas only while they are fully out of focus.
        if(this.displayed!==selected&&this.metaFocus<.08)this.displayMetadata(selected);
      }
      this.root.style.setProperty('--meta-blur',((1-this.metaFocus)*10).toFixed(2)+'px');
      this.root.style.setProperty('--meta-opacity',(.06+.94*this.metaFocus*this.metaFocus).toFixed(4));
      this.copy.inert=this.displayed!==selected||this.metaFocus<.5;
      this.metaSettling=!this.motion.matches&&(Math.abs(this.metaFocus-focusTarget)>.002||this.displayed!==selected);
      if(this.metaFocus>.9&&this.announced!==this.displayed){
        this.announced=this.displayed;this.live.textContent=`Project ${this.displayed+1} of ${this.cards.length}: ${this.cards[this.displayed].dataset.title}`;
      }
    }
    destroy(){this.dead=true;clearTimeout(this.snapTimer);cancelAnimationFrame(this.frame);this.abort.abort();this.observer.disconnect();this.renderer?.destroy();}
  }
  window.SadaScrollMath={clamp,smooth,samplePose,paperLayout,paperPose,paperContour,advanceTravel,mobileLogoSlot};
  window.SadaParticleJourney=ParticleJourney;
  window.SadaPaperStack=PaperStack;
})();
