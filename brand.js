(() => {
  'use strict';
  // Ratios are from the supplied artwork. The zero's scale and vertical
  // position follow page 47 of the company profile; digits run left to right.
  const ratios=[612/745,588/2048,1177/2048,1465/2048,938/2048,1144/1466,1293/2048,1409/2048,1408/2048,1131/2048];
  function numeral(value){
    const number=Math.max(0,Math.floor(Number(value)||0)),digits=String(number).split('');
    return `<span class="chrome-number" role="img" aria-label="${number}">${digits.map((d,i)=>{
      const height=d==='0'?.35:1,gap=i?(d==='0'?.075:.04):0;
      return `<img src="assets/numerals/${d}.png" alt="" aria-hidden="true" draggable="false" width="${Math.round(ratios[+d]*height*640)}" height="${Math.round(height*640)}" style="width:${(ratios[+d]*height).toFixed(5)}em;height:${height}em;margin-left:${gap}em;margin-top:${d==='0'?.5:0}em">`;
    }).join('')}</span>`;
  }
  function enhance(root){
    root.querySelectorAll('.hero-copy em,.footer-callout em,.studio-grid h2 em').forEach(word=>{
      word.classList.add('echo-word');word.dataset.echo=word.textContent;
    });
  }
  // Preload the entire small set before a number changes at the blurred phase.
  const digits=Array.from({length:10},(_,i)=>{const img=new Image();img.src=`assets/numerals/${i}.png`;return img;});
  window.SadaBrand={numeral,enhance,digits};
})();
