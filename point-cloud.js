(() => {
  'use strict';
  const VERTEX = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec4 aScatter;
  uniform vec3 uRotation;
  uniform vec2 uSize;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uActive;
  uniform float uBurst;
  uniform float uDpr;
  uniform vec2 uOffset;
  uniform float uScale;
  uniform float uOpacity;
  uniform mediump float uGlow;
  uniform float uEnergy;
  uniform vec3 uColor;
  varying mediump float vAlpha;
  varying lowp vec3 vColor;
  mat3 rotate(vec3 r) {
    float a=cos(r.x),b=sin(r.x),c=cos(r.y),d=sin(r.y),e=cos(r.z),f=sin(r.z);
    return mat3(c*e,c*f,-d,b*d*e-a*f,b*d*f+a*e,b*c,a*d*e+b*f,a*d*f-b*e,a*c);
  }
  void main() {
    mat3 rotation=rotate(uRotation);
    vec3 p=rotation*aPosition,n=rotation*aNormal;
    float seed=aScatter.w;
    float perspective=3.8/(3.8-p.z);
    float scale=min(uSize.x*.47,uSize.y*.44)*uScale;
    vec2 screen=p.xy*scale*perspective+uOffset;
    vec2 delta=screen-uPointer;
    float distance=length(delta);
    float field=exp(-distance*distance/max(1.0,scale*scale*.075))*uActive;
    vec2 direction=delta/max(distance,1.0);
    screen+=(direction*.22+vec2(-direction.y,direction.x)*.07)*field*scale;
    screen+=vec2(sin(uTime*.45+seed*50.0),cos(uTime*.38+seed*32.0))*.42;
    // The explosion morphs into an independent, rotating point volume.
    vec3 volume=rotate(vec3(uTime*.024,uTime*.046,uTime*.018))*aScatter.xyz;
    float depth=3.4/(3.4-volume.z);
    vec2 dispersed=volume.xy*uSize*vec2(.74,.84)*depth;
    screen=mix(screen,dispersed,uBurst);
    gl_Position=vec4(screen/uSize*2.0,0.0,1.0);
    float size=1.05+perspective*.65+pow(seed,4.0)*2.1;
    size=mix(size,.95+depth*.8+seed,uBurst);
    if(uGlow>.5)size*=uGlow>1.5?15.0:5.5;
    gl_PointSize=size*uDpr;
    float lighting=.60+.40*abs(dot(normalize(n),normalize(vec3(-.4,.7,1.0))));
    vAlpha=lighting*(.42+.48*seed)*uOpacity;
    vAlpha*=mix(1.0,step(fract(seed*23.413+.117),.16)*(.35+.5*depth),uBurst);
    if(uGlow>.5)vAlpha*=uEnergy*(uGlow>1.5?step(.97,seed):step(.70,seed));
    vColor=uColor;
  }`;
  const FRAGMENT = `
  precision mediump float;
  uniform mediump float uGlow;
  uniform float uInvert;
  varying mediump float vAlpha;
  varying lowp vec3 vColor;
  void main(){
    float d=length(gl_PointCoord-vec2(.5));
    if(d>.5||vAlpha<.001)discard;
    float alpha;
    vec3 color;
    if(uGlow>.5){
      alpha=exp(-d*d*22.0)*(1.0-smoothstep(.35,.5,d))*(uGlow>1.5?.11:.22);
      color=vColor;
    }else{
      alpha=1.0-smoothstep(.13,.5,d);
      color=mix(vec3(1.0),vColor,smoothstep(.22,.48,d)*.82);
    }
    color=mix(color,vec3(.02),uInvert);
    gl_FragColor=vec4(color,vAlpha*alpha);
  }`;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
  const palette=[[1,1,1],[25/255,73/255,249/255],[130/255,38/255,237/255],[242/255,20/255,211/255],[1,106/255,23/255]];
  function tintAt(phase){
    phase=clamp(phase,0,4);
    const i=Math.min(3,Math.floor(phase)),t=phase-i;
    return palette[i].map((c,k)=>c+(palette[i+1][k]-c)*t);
  }
  function rotatePoint(x,y,z,rx,ry,rz){
    const a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
    return [(c*e)*x+(b*d*e-a*f)*y+(a*d*e+b*f)*z,(c*f)*x+(b*d*f+a*e)*y+(a*d*f-b*e)*z,-d*x+b*c*y+a*c*z];
  }
  class PointCloud{
    constructor(canvas,options={}){
      this.canvas=canvas;this.options=options;this.frame=0;this.time=0;this.dead=false;this.visible=true;
      this.pointer={x:0,y:0,active:0,target:0};this.rotation={x:0,y:0};this.rotationTarget={x:0,y:0};
      this.burst=0;this.burstTarget=0;this.pose=null;
      this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.coarse=matchMedia('(pointer: coarse)').matches;
      this.abort=new AbortController();const opts={signal:this.abort.signal};
      this.positions=new Float32Array(window.SADA_LOGO.positions);this.normals=new Float32Array(window.SADA_LOGO.normals);
      this.count=this.coarse?9000:window.SADA_LOGO.count;
      this.scatterData=new Float32Array(window.SADA_LOGO.count*4);
      let seed=24827;
      const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
      for(let i=0;i<window.SADA_LOGO.count;i++){
        const a=random()*Math.PI*2,z=random()*2-1,r=Math.cbrt(random())*1.4,s=Math.sqrt(1-z*z);
        this.scatterData.set([Math.cos(a)*s*r,Math.sin(a)*s*r,z*r,random()],i*4);
      }
      this.initRenderer();
      this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
      this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.wake();});this.observer.observe(canvas);
      const target=options.pointerTarget||canvas;
      target.addEventListener('pointermove',e=>{
        if(e.target.closest('a,button,input,textarea,[data-game]')){this.pointer.target=0;return;}
        const r=canvas.getBoundingClientRect();
        this.pointer.x=e.clientX-r.left-r.width/2;this.pointer.y=-(e.clientY-r.top-r.height/2);this.pointer.target=1;
        this.rotationTarget.x=-this.pointer.y/r.height*.28;this.rotationTarget.y=this.pointer.x/r.width*.5;this.wake();
      },opts);
      target.addEventListener('pointerleave',()=>{this.pointer.target=0;this.rotationTarget.x=0;this.rotationTarget.y=0;this.wake();},opts);
      target.addEventListener('click',e=>{if(!e.target.closest('a,button,input,textarea,[data-game]'))this.scatter();},opts);
      canvas.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();this.scatter();}},opts);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.last=0;this.wake();}},opts);
      this.motion.addEventListener('change',()=>this.wake(),opts);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(this.frame);this.frame=0;this.contextLost=true;},opts);
      canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.initRenderer();this.resize();this.wake();},opts);
      this.resize();
    }
    initRenderer(){
      // Premultiplied RGB and separate alpha blending prevent double-alpha
      // dimming when desktop Chrome composites the transparent canvas.
      const gl=this.canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'low-power'});
      this.gl=gl;if(!gl){this.ctx=this.canvas.getContext('2d');return;}
      const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
      const program=gl.createProgram(),vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);
      gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
      gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(program);this.program=program;this.buffers=[];
      for(const [name,data,size] of [['aPosition',this.positions,3],['aNormal',this.normals,3],['aScatter',this.scatterData,4]]){
        const b=gl.createBuffer();this.buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
        const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,0,0);
      }
      this.uniforms={};
      for(const name of ['uRotation','uSize','uPointer','uTime','uActive','uBurst','uDpr','uColor','uOffset','uScale','uOpacity','uGlow','uInvert','uEnergy'])this.uniforms[name]=gl.getUniformLocation(program,name);
      gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    }
    resize(){
      const r=this.canvas.getBoundingClientRect();this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);
      this.dpr=Math.min(devicePixelRatio||1,this.coarse?1.5:2);
      this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);
      if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.wake();
    }
    wake(){if(!this.frame&&!this.dead&&this.visible&&!this.contextLost&&!document.hidden)this.frame=requestAnimationFrame(t=>this.draw(t));}
    setPose(pose){this.pose=pose;this.wake();}
    scatter(){this.burstTarget=.6;window.SadaSound?.play('score');this.wake();}
    draw(t){
      this.frame=0;if(this.dead||!this.visible||document.hidden||this.contextLost)return;
      const dt=Math.min((t-(this.last||t))/1000,.05);this.last=t;if(!this.motion.matches)this.time+=dt;
      const ease=1-Math.exp(-Math.max(dt,.001)*7);
      this.pointer.active+=(this.pointer.target-this.pointer.active)*ease;
      for(const axis of ['x','y'])this.rotation[axis]+=(this.rotationTarget[axis]-this.rotation[axis])*ease;
      this.burst+=(this.burstTarget-this.burst)*ease;this.burstTarget*=Math.exp(-dt*2.8);
      const pose={x:0,y:0,scale:1,opacity:1,burst:0,invert:0,tint:0,rx:0,ry:0,rz:0,...this.pose};
      const rx=pose.rx+(this.motion.matches?0:Math.sin(this.time*.17)*.09)+this.rotation.x;
      const ry=pose.ry+(this.motion.matches?0:this.time*.075)+this.rotation.y;
      const rz=pose.rz+(this.motion.matches?0:Math.sin(this.time*.12)*.035);
      const burst=this.motion.matches?0:clamp(pose.burst+this.burst);
      const invert=this.options.dark===false?1:clamp(pose.invert),tint=this.options.brand?tintAt(pose.tint):[1,1,1];
      if(this.gl){
        const g=this.gl,u=this.uniforms;g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);
        g.uniform3f(u.uRotation,rx,ry,rz);g.uniform2f(u.uSize,this.width,this.height);g.uniform2f(u.uPointer,this.pointer.x,this.pointer.y);
        g.uniform1f(u.uTime,this.motion.matches?0:this.time);g.uniform1f(u.uActive,this.motion.matches?0:this.pointer.active);g.uniform1f(u.uBurst,burst);
        g.uniform1f(u.uDpr,this.dpr);g.uniform3f(u.uColor,...tint);g.uniform2f(u.uOffset,pose.x,pose.y);
        g.uniform1f(u.uScale,pose.scale);g.uniform1f(u.uOpacity,pose.opacity);g.uniform1f(u.uInvert,invert);
        const radius=Math.min(this.width*.47,this.height*.44)*pose.scale;
        g.uniform1f(u.uEnergy,clamp(radius/190,.4,1.25)*(this.coarse?1:.76));
        if(this.options.brand){
          g.blendFuncSeparate(g.SRC_ALPHA,invert>.01?g.ONE_MINUS_SRC_ALPHA:g.ONE,g.ONE,g.ONE_MINUS_SRC_ALPHA);
          for(const pass of [2,1]){g.uniform1f(u.uGlow,pass);g.drawArrays(g.POINTS,0,this.count);}
        }
        g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
        g.uniform1f(u.uGlow,0);g.drawArrays(g.POINTS,0,this.count);
      }else if(this.ctx){
        const c=this.ctx,scale=Math.min(this.width*.47,this.height*.44)*pose.scale;
        c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
        const rgb=tint.map(v=>Math.round((v*(1-invert)+.02*invert)*255)),ink='rgb('+rgb.join(',')+')';
        for(let i=0;i<this.count;i+=3){
          const k=i*3,j=i*4,s=this.scatterData[j+3];if(burst>.9&&s>.16)continue;
          const p=rotatePoint(...this.positions.slice(k,k+3),rx,ry,rz),q=rotatePoint(...this.scatterData.slice(j,j+3),this.time*.024,this.time*.046,this.time*.018);
          const perspective=3.8/(3.8-p[2]),depth=3.4/(3.4-q[2]);
          let x=p[0]*scale*perspective+pose.x,y=p[1]*scale*perspective+pose.y;
          x+=(q[0]*this.width*.74*depth-x)*burst;y+=(q[1]*this.height*.84*depth-y)*burst;
          x+=this.width/2;y=this.height/2-y;
          if(this.options.brand&&s>.66){c.globalAlpha=.06*pose.opacity;c.fillStyle=ink;c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();}
          c.globalAlpha=(.4+s*.5)*pose.opacity;c.fillStyle=invert>.5?ink:'#fff';c.fillRect(x,y,1.3,1.3);
        }c.globalAlpha=1;
      }
      if(!this.motion.matches)this.wake();
    }
    destroy(){
      this.dead=true;cancelAnimationFrame(this.frame);this.abort.abort();this.resizeObserver.disconnect();this.observer.disconnect();
      if(this.gl){for(const b of this.buffers||[])this.gl.deleteBuffer(b);this.gl.deleteProgram(this.program);}
    }
  }
  window.SadaPointCloud=PointCloud;
  window.SadaPointMath={rotatePoint,tintAt};
})();
