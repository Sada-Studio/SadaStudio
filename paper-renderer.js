(() => {
  'use strict';
  const vertex=`
    attribute vec2 aUV;
    uniform vec2 uViewport;
    uniform vec2 uSize;
    uniform vec4 uPose;
    uniform vec3 uFlex;
    varying vec2 vUV;
    varying float vLight;
    void main(){
      vec2 p=(aUV-.5)*uSize;
      float curve=sin(aUV.x*3.14159265);
      float bend=uFlex.x;
      p.y+=curve*bend*uSize.y*.075;
      float z=curve*bend*uSize.x*.15;
      float cx=cos(uFlex.y),sx=sin(uFlex.y);
      float cy=cos(uFlex.z),sy=sin(uFlex.z);
      vec3 q=vec3(p.x*cy+z*sy,p.y,-p.x*sy+z*cy);
      q=vec3(q.x,q.y*cx-q.z*sx,q.y*sx+q.z*cx);
      vec2 face=q.xy*(1100.0/(1100.0-q.z))*uPose.w;
      float a=cos(uPose.z),b=sin(uPose.z);
      vec2 pixel=vec2(face.x*a-face.y*b,face.x*b+face.y*a)+uPose.xy;
      gl_Position=vec4(pixel.x/uViewport.x*2.0-1.0,1.0-pixel.y/uViewport.y*2.0,0.0,1.0);
      vUV=aUV;
      vLight=1.0-abs(bend)*.045*curve;
    }`;
  const fragment=`
    precision mediump float;
    uniform sampler2D uImage;
    uniform vec2 uCrop;
    uniform float uOpacity;
    varying vec2 vUV;
    varying float vLight;
    void main(){
      vec4 color=texture2D(uImage,(vUV-.5)*uCrop+.5);
      gl_FragColor=vec4(color.rgb*vLight,color.a*uOpacity);
    }`;

  class PaperRenderer {
    constructor(deck,cards,wake){
      this.deck=deck;this.cards=cards;this.wake=wake;this.dead=false;
      this.abort=new AbortController();this.textures=new Map();
      this.canvas=document.createElement('canvas');this.canvas.className='paper-canvas';
      this.canvas.setAttribute('aria-hidden','true');deck.prepend(this.canvas);
      this.gl=this.canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false});
      if(!this.gl){this.canvas.remove();return;}
      try{this.init();}catch{this.disable();return;}
      this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;this.showFallback();},{signal:this.abort.signal});
      this.canvas.addEventListener('webglcontextrestored',()=>{
        if(this.dead)return;
        try{this.textures.clear();this.init();this.resize(this.width,this.height);this.wake();}catch{this.disable();}
      },{signal:this.abort.signal});
      for(const card of cards)card.querySelector('img').addEventListener('load',()=>this.wake(),{signal:this.abort.signal});
    }
    init(){
      const g=this.gl;
      const compile=(type,source)=>{
        const shader=g.createShader(type);g.shaderSource(shader,source);g.compileShader(shader);
        if(!g.getShaderParameter(shader,g.COMPILE_STATUS)){g.deleteShader(shader);throw Error('Paper shader unavailable');}
        return shader;
      };
      const v=compile(g.VERTEX_SHADER,vertex),f=compile(g.FRAGMENT_SHADER,fragment);
      this.program=g.createProgram();g.attachShader(this.program,v);g.attachShader(this.program,f);g.linkProgram(this.program);
      g.deleteShader(v);g.deleteShader(f);
      if(!g.getProgramParameter(this.program,g.LINK_STATUS))throw Error('Paper renderer unavailable');
      const mesh=[],nx=20,ny=12;
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
        const a=x/nx,b=y/ny,c=(x+1)/nx,d=(y+1)/ny;
        mesh.push(a,b,c,b,a,d,c,b,c,d,a,d);
      }
      this.vertices=mesh.length/2;this.buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.buffer);
      g.bufferData(g.ARRAY_BUFFER,new Float32Array(mesh),g.STATIC_DRAW);g.useProgram(this.program);
      const location=g.getAttribLocation(this.program,'aUV');g.enableVertexAttribArray(location);g.vertexAttribPointer(location,2,g.FLOAT,false,0,0);
      this.uniforms={};for(const key of ['uViewport','uSize','uPose','uFlex','uImage','uCrop','uOpacity'])this.uniforms[key]=g.getUniformLocation(this.program,key);
      // Paint complete sheets back to front. Their curved surfaces never share
      // a depth buffer, so one sheet cannot slice through another on Safari.
      g.disable(g.DEPTH_TEST);g.disable(g.CULL_FACE);g.enable(g.BLEND);
      g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.clearColor(0,0,0,0);
      g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);this.ready=true;
    }
    resize(width,height){
      this.width=width;this.height=height;
      if(!this.ready)return;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      this.canvas.width=Math.round(width*dpr);this.canvas.height=Math.round(height*dpr);
      this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
    }
    texture(index){
      if(this.textures.has(index))return this.textures.get(index);
      const img=this.cards[index].querySelector('img');
      if(!img.complete||!img.naturalWidth)return null;
      const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);
      try{g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,img);}catch{g.deleteTexture(t);this.disable();return null;}
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
      g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);
      const data={texture:t,aspect:img.naturalWidth/img.naturalHeight};this.textures.set(index,data);return data;
    }
    paint(poses,layout){
      if(!this.ready||this.dead)return;
      const g=this.gl,u=this.uniforms;g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);
      g.uniform2f(u.uViewport,this.width,this.height);g.uniform2f(u.uSize,layout.width,layout.height);g.uniform1i(u.uImage,0);
      const ordered=poses.filter(p=>p.visible).sort((a,b)=>a.order-b.order);
      for(const p of ordered){
        const t=this.texture(p.index);if(!this.ready)return;if(!t)continue;
        const aspect=layout.width/layout.height;
        g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,t.texture);
        g.uniform2f(u.uCrop,t.aspect>aspect?aspect/t.aspect:1,t.aspect>aspect?1:t.aspect/aspect);
        g.uniform4f(u.uPose,layout.x+p.x,layout.y+p.y,p.rz*Math.PI/180,p.scale);
        g.uniform3f(u.uFlex,p.bend,p.rx*Math.PI/180,p.ry*Math.PI/180);
        g.uniform1f(u.uOpacity,p.opacity);g.drawArrays(g.TRIANGLES,0,this.vertices);
        this.cards[p.index].classList.add('is-rendered');
      }
    }
    showFallback(){this.cards.forEach(card=>card.classList.remove('is-rendered'));}
    disable(){this.ready=false;this.canvas.style.display='none';this.showFallback();}
    destroy(){
      this.dead=true;this.abort.abort();this.showFallback();
      const g=this.gl;if(g){for(const t of this.textures.values())g.deleteTexture(t.texture);if(this.buffer)g.deleteBuffer(this.buffer);if(this.program)g.deleteProgram(this.program);g.getExtension('WEBGL_lose_context')?.loseContext();}
      this.canvas.remove();
    }
  }
  window.SadaPaperRenderer=PaperRenderer;
})();
