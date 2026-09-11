(() => {
  'use strict';
  let context, enabled = false, lastHover = 0, previousSessionType;
  const sounds = {
    hover: [[820, 690, .027, .023, 'sine']],
    click: [[440, 620, .075, .045, 'sine']],
    jump: [[230, 690, .15, .055, 'triangle']],
    land: [[125, 65, .07, .03, 'sine']],
    score: [[523, 523, .09, .04, 'sine'], [784, 1046, .16, .035, 'sine', .09]],
    fail: [[240, 80, .32, .055, 'triangle']],
    toggle: [[660, 990, .1, .04, 'sine']]
  };
  function selectSession(playback){
    try{
      if(!navigator.audioSession)return;
      if(playback){
        if(previousSessionType===undefined)previousSessionType=navigator.audioSession.type;
        navigator.audioSession.type='playback';
      }else if(previousSessionType!==undefined){
        navigator.audioSession.type=previousSessionType;previousSessionType=undefined;
      }
    }catch{ /* AudioSession is optional; ordinary Web Audio remains available. */ }
  }
  function wakeAudio(){
    if(!enabled||document.hidden)return;
    try {
      selectSession(true);
      context ||= new (window.AudioContext || window.webkitAudioContext)();
      if(context.state==='suspended'||context.state==='interrupted')return context.resume();
    }catch{}
  }
  function emit(name){
    if(!enabled||document.hidden||!context||context.state!=='running')return;
    try{
      for (const [from,to,duration,volume,type,delay = 0] of sounds[name] || sounds.click) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = context.currentTime + delay;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(from,start);
        oscillator.frequency.exponentialRampToValueAtTime(to,start+duration);
        gain.gain.setValueAtTime(.0001,start);
        gain.gain.exponentialRampToValueAtTime(volume,start+.007);
        gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(start); oscillator.stop(start+duration+.02);
        oscillator.onended=() => { oscillator.disconnect(); gain.disconnect(); };
      }
    } catch { /* The site and game remain usable without audio support. */ }
  }
  function play(name) {
    if(!enabled||document.hidden)return;
    if(name==='hover'){
      const now=performance.now();if(now-lastHover<110)return;lastHover=now;
    }
    const pending=wakeAudio();
    if(pending?.then)pending.then(()=>emit(name)).catch(()=>{});
    else emit(name);
  }
  document.querySelector('.sound-toggle').addEventListener('click', e => {
    enabled=!enabled;
    e.currentTarget.setAttribute('aria-pressed',String(enabled));
    e.currentTarget.textContent=enabled?'Sound on':'Sound off';
    if(enabled)play('toggle');
    else {context?.suspend().catch(()=>{});selectSession(false);}
  });
  // The explicit Sound tap requests media playback on supporting iPhones.
  // No muted media loop is needed, and Sound off releases the session.
  document.addEventListener('pointerdown',()=>{wakeAudio()?.catch(()=>{});},{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){context?.suspend().catch(()=>{});selectSession(false);}
    else if(enabled)wakeAudio()?.catch(()=>{});
  });
  document.addEventListener('pointerover',e => {
    const control=e.target.closest('a,button,summary');
    if(control && !control.contains(e.relatedTarget)) play('hover');
  });
  document.addEventListener('click',e => {
    if(e.target.closest('a,button') && !e.target.closest('[data-game],.sound-toggle')) play('click');
  });
  window.SadaSound={play};
})();
