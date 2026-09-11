(() => {
  'use strict';
  // Units are independent of device pixels; simulation always advances at 120 Hz.
  const PHYSICS={gravity:1900,jump:775,startSpeed:315,maxSpeed:560,playerWidth:100,playerHeight:104};
  class EchoRun {
    constructor(root){
      this.root=root;this.canvas=root.querySelector('canvas');this.ctx=this.canvas.getContext('2d');
      this.play=root.querySelector('[data-play]');this.exit=root.querySelector('[data-exit]');this.pause=root.querySelector('[data-pause]');
      this.scoreEl=root.querySelector('[data-score]');this.bestEl=root.querySelector('[data-best]');this.status=root.querySelector('[data-status]');
      this.overlay=root.querySelector('.game-overlay');this.hero=root.closest('.hero');
      this.state='idle';this.score=0;this.distance=0;this.best=0;this.y=0;this.vy=0;this.obstacles=[];this.spawnIn=1.8;this.accumulator=0;
      this.elapsed=0;this.idleTime=0;this.frame=0;this.dead=false;this.visible=true;this.holding=false;this.jumpBuffer=0;
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.abort=new AbortController();const opts={signal:this.abort.signal};
      try{this.best=Number(localStorage.getItem('sada-echo-run-best'))||0;}catch{}
      this.bestEl.textContent=String(this.best).padStart(5,'0');
      this.play.addEventListener('click',()=>this.start(),opts);
      this.exit.addEventListener('click',()=>this.stop(),opts);
      this.pause.addEventListener('click',()=>this.togglePause(),opts);
      this.canvas.addEventListener('pointerdown',e=>{
        if(e.button!==0&&e.pointerType==='mouse')return;
        if(this.state==='idle'||this.state==='over'){this.start();return;}
        if(this.state==='paused'){this.togglePause();return;}
        e.preventDefault();this.canvas.focus({preventScroll:true});this.holding=true;this.requestJump();
      },opts);
      window.addEventListener('pointerup',()=>{this.holding=false;},opts);
      this.root.addEventListener('keydown',e=>{
        if(e.target.closest('button,input,textarea,a')&&e.code!=='Escape')return;
        if(['Space','ArrowUp','KeyW'].includes(e.code)){
          e.preventDefault();if(e.repeat)return;
          if(this.state==='idle'||this.state==='over')this.start();
          else if(this.state==='paused')this.togglePause();
          else{this.holding=true;this.requestJump();}
        }else if(e.code==='Escape'){e.preventDefault();this.stop();}
        else if(e.code==='KeyP'){e.preventDefault();this.togglePause();}
      },opts);
      window.addEventListener('keyup',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code))this.holding=false;},opts);
      window.addEventListener('blur',()=>{if(this.state==='playing')this.togglePause();this.holding=false;},opts);
      document.addEventListener('visibilitychange',()=>{
        if(document.hidden&&this.state==='playing')this.togglePause();
        if(!document.hidden)this.wake();
      },opts);
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.canvas);
      this.observer=new IntersectionObserver(entries=>{
        this.visible=entries[0].isIntersecting;
        if(!this.visible&&this.state==='playing')this.togglePause();
        if(this.visible)this.wake();
      });this.observer.observe(root);
      this.resize();this.updateUI();this.wake();
    }
    resize(){
      const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);
      this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
      this.scale=this.width<600?.7:1;this.worldWidth=this.width/this.scale;this.worldHeight=this.height/this.scale;
      this.playerX=Math.min(150,this.worldWidth*.19);this.ground=this.worldHeight-39;
      this.wake();
    }
    start(){
      this.state='playing';this.score=0;this.distance=0;this.elapsed=0;this.y=0;this.vy=0;this.obstacles=[];this.spawnIn=1.8;this.accumulator=0;this.last=0;this.jumpBuffer=0;this.holding=false;
      this.hero?.classList.add('is-playing');this.root.classList.add('game-active');
      this.resize();this.updateUI();this.canvas.focus({preventScroll:true});window.SadaSound?.play('click');this.wake();
    }
    stop(){
      this.state='idle';this.y=0;this.vy=0;this.obstacles=[];this.holding=false;
      this.hero?.classList.remove('is-playing');this.root.classList.remove('game-active');this.updateUI();this.resize();this.play.focus({preventScroll:true});this.wake();
    }
    togglePause(){
      if(this.state!=='playing'&&this.state!=='paused')return;
      this.state=this.state==='playing'?'paused':'playing';this.holding=false;this.last=0;this.accumulator=0;
      this.updateUI();this.wake();
    }
    requestJump(){this.jumpBuffer=.12;}
    jump(){this.vy=PHYSICS.jump;this.jumpBuffer=0;window.SadaSound?.play('jump');}
    update(dt){
      if(this.state!=='playing')return;
      this.elapsed+=dt;const speed=Math.min(PHYSICS.maxSpeed,PHYSICS.startSpeed+this.elapsed*2.1);
      this.distance+=speed*dt;this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);
      if(this.jumpBuffer>0&&this.y<=.01)this.jump();
      const wasAbove=this.y>0;
      this.vy-=PHYSICS.gravity*dt*(this.holding&&this.vy>0?.68:1);this.y+=this.vy*dt;
      if(this.y<0){this.y=0;this.vy=0;if(wasAbove)window.SadaSound?.play('land');}
      this.spawnIn-=dt;
      if(this.spawnIn<=0){
        // All gaps allow a full jump plus recovery, even at maximum speed.
        const tall=Math.random()>.62;
        this.obstacles.push({x:this.worldWidth+90,width:tall?37:49,height:tall?66:46,passed:false,type:tall?'deadline':'block'});
        this.spawnIn=1.35+Math.random()*.7;
      }
      const player={left:this.playerX+33,right:this.playerX+PHYSICS.playerWidth-13,bottom:this.y+7,top:this.y+PHYSICS.playerHeight-14};
      for(const o of this.obstacles){
        o.x-=speed*dt;
        if(player.right>o.x+6&&player.left<o.x+o.width-6&&player.bottom<o.height-3&&player.top>0){this.gameOver();return;}
        if(!o.passed&&o.x+o.width<player.left){o.passed=true;window.SadaSound?.play('score');}
      }
      this.obstacles=this.obstacles.filter(o=>o.x+o.width>-30);
      this.score=Math.floor(this.distance/35);this.scoreEl.textContent=String(this.score).padStart(5,'0');
    }
    gameOver(){
      this.state='over';this.holding=false;
      if(this.score>this.best){this.best=this.score;try{localStorage.setItem('sada-echo-run-best',String(this.best));}catch{}}
      this.updateUI();window.SadaSound?.play('fail');
    }
    updateUI(){
      const active=this.state!=='idle';this.exit.hidden=!active;this.pause.hidden=!['playing','paused'].includes(this.state);
      this.pause.textContent=this.state==='paused'?'Resume':'Pause';this.play.hidden=this.state==='playing';
      this.play.innerHTML=this.state==='over'?'One more run <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg>':this.state==='paused'?'New run <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg>':'Play Echo Run <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg>';
      this.overlay.classList.toggle('game-message',this.state==='over'||this.state==='paused');
      this.root.dataset.state=this.state;
      this.status.textContent=this.state==='over'?`Good run. ${this.score} echoes made.`:this.state==='paused'?'Taking a catnap.':this.state==='playing'?'SPACE / TAP TO JUMP · P TO PAUSE':'A little play before the work.';
      this.scoreEl.textContent=String(this.score).padStart(5,'0');this.bestEl.textContent=String(this.best).padStart(5,'0');
    }
    drawCharacter(c,frame,x,y,width){
      const rows=window.ECHO_ASCII.frames[frame];const cell=width/window.ECHO_ASCII.width;
      c.font=`${cell/.61}px "Courier New",monospace`;c.textBaseline='top';c.textAlign='left';c.fillStyle='#fff';
      for(let row=0;row<rows.length;row++){
        // Fixed character cells make the authored sprite independent of fonts.
        for(let col=0;col<rows[row].length;col++)if(rows[row][col]!==' ')c.fillText(rows[row][col],x+col*cell,y+row*cell*1.9);
      }
    }
    render(){
      const c=this.ctx;if(!c)return;c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,0);c.clearRect(0,0,this.worldWidth,this.worldHeight);
      const active=this.state!=='idle',time=active?this.elapsed:this.idleTime;
      c.textAlign='left';c.textBaseline='top';
      // A moving typographic floor, quietly echoing the studio's name.
      c.font='11px "Courier New",monospace';c.fillStyle='#686868';
      const offset=(active?this.distance:time*42)%36;
      for(let x=-offset;x<this.worldWidth;x+=36)c.fillText('_ .',x,this.ground+4);
      c.fillStyle='#333';
      if(active){
        for(let i=0;i<14;i++){
          const x=((i*149-this.distance*.18)% (this.worldWidth+80)+this.worldWidth+80)%(this.worldWidth+80)-40;
          c.fillText(i%3===0?'+':'.',x,22+(i*31)%Math.max(24,this.ground-145));
        }
      }
      const playerWidth=active?PHYSICS.playerWidth:110;
      const playerHeight=playerWidth/54*29*1.9;
      const x=active?this.playerX:Math.max(18,this.worldWidth*.11);
      const y=this.ground-playerHeight-(active?this.y:0);
      const frame=this.state==='paused'||this.state==='over'||this.motion.matches&&this.state==='idle'?0:Math.floor(time*8)%3;
      c.save();if(this.state==='over')c.globalAlpha=.5;this.drawCharacter(c,frame,x,y,playerWidth);c.restore();
      c.font='11px "Courier New",monospace';c.fillStyle='#555';
      c.fillText('· · · · · ·',x+18,this.ground+16);
      for(const o of this.obstacles){
        c.fillStyle='#ddd';c.font='12px "Courier New",monospace';
        const rows=Math.floor(o.height/11),cols=Math.floor(o.width/7);
        for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){
          c.fillText(r===0||col===0||col===cols-1?'+':'#',o.x+col*7,this.ground-o.height+r*11);
        }
        c.fillStyle='#727272';c.font='10px "Courier New",monospace';c.fillText(o.type==='deadline'?'DUE':'404',o.x,this.ground+17);
      }
    }
    wake(){if(!this.frame&&!this.dead&&this.visible&&!document.hidden)this.frame=requestAnimationFrame(t=>this.tick(t));}
    tick(t){
      this.frame=0;if(this.dead||!this.visible||document.hidden)return;
      const dt=Math.min((t-(this.last||t))/1000,.06);this.last=t;
      if(this.state==='playing'){
        this.accumulator+=dt;while(this.accumulator>=1/120){this.update(1/120);this.accumulator-=1/120;}
      }else if(this.state==='idle'&&!this.motion.matches)this.idleTime+=dt;
      this.render();
      if(this.state==='playing'||this.state==='idle'&&!this.motion.matches)this.wake();
    }
    destroy(){this.dead=true;cancelAnimationFrame(this.frame);this.abort.abort();this.resizeObserver.disconnect();this.observer.disconnect();}
  }
  window.SadaEchoRun=EchoRun;window.SadaGamePhysics=PHYSICS;
})();
