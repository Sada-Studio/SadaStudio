window.SadaCMS.ready.then(() => {
  'use strict';
  let {site,projects}=window.SADA_CONTENT;
  const media=src=>window.SadaCMS.media(src);
  const value=path=>window.SadaCMS.get(path);
  const editable=(path,multi=false)=>`<span data-cms="${path}" ${multi?'data-cms-multiline class="cms-lines"':''}>${escape(value(path))}</span>`;
  const main=document.querySelector('#main'),footer=document.querySelector('#footer');
  const header=document.querySelector('.header'),menu=document.querySelector('#mobile-menu'),menuButton=document.querySelector('.menu-toggle');
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const normalize=s=>String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  const canonical=s=>s==='Illustrations'?'Illustration':s;
  const isVideo=src=>/\.(mp4|webm|mov)(?:[?#]|$)/i.test(src);
  const projectLink=p=>'#/project/'+encodeURIComponent(p.slug);
  const tags=p=>(p.tags||[]).map(t=>`<span>${escape(t)}</span>`).join('');
  const paragraphs=(items,path,start=0)=>(items||[]).map((p,i)=>`<p ${path?`data-cms="${path}.${i+start}"`:""}>${escape(p)}</p>`).join('');
  const filterLink=t=>'#/work?filter='+encodeURIComponent(canonical(t));
  let services=site.homepage.services;
  let instances=[],gallery=[],galleryIndex=0,previousRoute='',previousRaw='',routeAbort=new AbortController();
  const workScroll=new Map();
  let lastWorkRoute='/work';
  const alive=()=>({signal:routeAbort.signal});
  const card=(p,index,large=false)=>`<a class="project-card ${large?'project-wide':''}" href="${projectLink(p)}" data-cursor="View project"><div class="project-visual"><img src="${escape(media(p.thumbnail))}" alt="${escape(p.title+' — '+p.description)}" loading="lazy" decoding="async"><span class="project-open" aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span><span class="project-number">${pad(index+1)}</span></div><div class="project-meta"><h3>${escape(p.title)}</h3><div class="project-tags">${tags(p)}</div></div><p class="project-description">${escape(p.description)}</p></a>`;
  const cloud=(dark=true)=>`<div class="logo-stage"><canvas class="logo-cloud" tabindex="0" role="button" aria-label="Interactive Sada logo. Move your pointer to part the points; click or press Enter to scatter them." data-dark="${dark}"></canvas><span class="logo-caption">A LITTLE ENERGY GOES A LONG WAY.</span><span class="logo-note">MOVE / CLICK / MAKE WAVES</span></div>`;
  const game=()=>`<section class="echo-run" data-game aria-label="Echo Run game"><div class="game-topline"><span class="mono">ECHO RUN <span class="muted">/ 01</span></span><div class="game-scores"><span>SCORE <b data-score>00000</b></span><span>BEST <b data-best>00000</b></span></div><div class="game-actions"><button data-pause hidden>Pause</button><button data-exit hidden>Exit ×</button></div></div><canvas class="game-canvas" tabindex="0" role="img" aria-label="Echo Run. Activate Play, then press Space or tap the play area to jump over obstacles. P pauses, Escape exits."></canvas><div class="game-overlay"><p data-status aria-live="polite">${editable("experience.game.intro")}</p><button class="pill pill-white" data-play>${editable("experience.game.playLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></button></div><div class="game-bottomline"><span>${editable("experience.game.instruction")}</span><a href="#selected-work" data-scroll="selected-work">${editable("experience.game.skipLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v18M4 13l8 8 8-8"/></svg></a></div></section>`;
  function home(){
    const featured=projects.filter(p=>p.featured).slice(0,3);
    return `<div class="home-universe" data-particle-journey><div class="universe-layer"><canvas class="technical-field" aria-hidden="true"></canvas><canvas class="logo-cloud journey-logo" data-journey-logo role="img" aria-label="Sada's three-dimensional point cloud begins white. Its light shifts slowly through Sada’s colors as you scroll past the featured projects."></canvas></div>
    <section class="hero" data-opening><div class="hero-stage">
      <div class="logo-anchor" aria-hidden="true"></div>
      <h1 class="hero-copy"><span class="opening-word opening-make" data-opening-cue="make" data-cms="experience.opening.make">${escape(value("experience.opening.make"))}</span><span class="opening-word opening-echo" data-opening-cue="echo">${editable("experience.opening.echoPrefix")} <em data-cms="experience.opening.echoWord">${escape(value("experience.opening.echoWord"))}</em></span></h1>
      <div class="opening-thought" data-opening-cue="thought"><p>${editable("workPage.introParagraphs.0")}.</p><a class="text-link" href="#/contact">${editable("experience.opening.contactLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div>
      <div class="opening-bottom" data-opening-cue="hint"><span class="mono">${editable("experience.opening.studioLabel",true)}</span><a href="#echo-run" data-scroll="echo-run">${editable("homepage.scrollLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M4 13l8 8 8-8"/></svg></a></div>
    </div></section>
    <section class="play-interlude" id="echo-run" aria-label="Echo Run">${game()}</section>
    <section class="journey-intro"><div class="journey-intro-top mono"><span>01 / ${editable("homepage.featuredHeading")}</span><span>${editable("experience.journey.followLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v18M4 13l8 8 8-8"/></svg></span></div><p class="journey-intro-bottom">${editable("homepage.featuredTagline",true)}</p></section>
    <section class="featured-voyage" id="selected-work" aria-label="Three featured projects">${featured.map((p,i)=>`<article class="voyage-stop ${i%2?'voyage-left':'voyage-right'}"><div class="voyage-project"><div class="voyage-heading"><span class="mono">${window.SadaBrand.numeral(i+1)}${editable("experience.journey.selectedLabel")}</span><span class="mono">${pad(i+1)} — ${pad(featured.length)}</span></div><a class="voyage-image" href="${projectLink(p)}" data-cursor="View project"><img src="${escape(media(p.thumbnail))}" alt="${escape(p.title+' — '+p.description)}" loading="lazy" decoding="async"><span class="voyage-open" aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a><div class="voyage-caption"><div><h2><a href="${projectLink(p)}">${escape(p.title)}</a></h2><p>${escape(p.description)}</p></div><div class="voyage-tags">${tags(p)}</div></div><a class="text-link voyage-link" href="${projectLink(p)}">${editable("experience.journey.exploreLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div></article>`).join('')}</section>
    <section class="journey-end"><span class="mono">${editable("experience.journey.endLabel")}</span><a class="pill pill-white" href="#/work">${escape(site.homepage.callToAction.button.replace(/\{count\}/g,projects.length))} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a><p>${editable("homepage.callToAction.before")}<br>${editable("homepage.callToAction.after")}</p></section>
    <section class="studio-intro section" data-inversion-section><div class="section-label"><span>02 / ${editable("homepage.aboutHeading")}</span><span>${editable("experience.studio.eyebrow")}</span></div><div class="studio-grid"><h2>${editable("experience.studio.statement",true)} <em data-cms="experience.studio.highlight">${escape(value("experience.studio.highlight"))}</em></h2><div class="studio-copy">${paragraphs([site.homepage.aboutParagraphs[0]],"homepage.aboutParagraphs")}<p>${editable("experience.studio.servicesLine")}</p><a class="pill" href="#/about">${editable("experience.studio.link")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div></div><div class="service-index focus-group">${services.map((s,i)=>`<a class="service-item" href="${filterLink(s)}"><span>${pad(i+1)}</span><span data-cms="homepage.services.${i}">${escape(s)}</span><span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>`).join('')}</div></section></div>`;
  }
  function work(params){
    const selected=params.get('filter')||'All work';
    const listView=params.get('view')==='list';
    const categories=[...new Set(projects.flatMap(p=>p.tags||[]).map(canonical))].sort((a,b)=>a.localeCompare(b));
    const filtered=selected==='All work'?projects:projects.filter(p=>(p.tags||[]).some(t=>normalize(canonical(t))===normalize(canonical(selected))));
    const excerpt=p=>{const text=p.longDescription||p.description;return text.length>250?text.slice(0,250).replace(/\s+\S*$/,'')+'…':text;};
    const stackAttr=listView?'':' data-paper-stack';
    const listMarkup=filtered.length?`<div class="work-list-view" aria-label="Project list">${filtered.map((p,i)=>`<a class="work-list-row" href="${projectLink(p)}" data-cursor="Open project"><span class="work-list-number">${window.SadaBrand.numeral(i+1)}</span><span class="work-list-main"><strong>${escape(p.title)}</strong><span>${escape(p.description)}</span></span><span class="work-list-tags">${tags(p)}</span><span class="work-list-arrow" aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>`).join('')}</div>`:'';
    return `<section class="work-page work-stack-page ${listView?'is-list-view':''}"><div class="work-toolbar"><h1>${editable("experience.work.title")}<span> / ${pad(filtered.length)}</span></h1><span class="work-toolbar-note mono">${editable("experience.work.scrollLabel")}</span><div class="work-toolbar-actions"><button type="button" class="work-view-toggle" data-work-view aria-pressed="${listView}">${listView?'Stack view':'List view'} <span aria-hidden="true">${listView?'▧':'≡'}</span></button><details class="stack-filters"><summary>${escape(selected==='All work'?site.workPage.allWorkLabel:selected)} <span aria-hidden="true">+</span></summary><div class="filters" aria-label="${escape(site.workPage.browseLabel)}"><a class="filter ${selected==='All work'?'active':''}" href="#/work" ${selected==='All work'?'aria-current="true"':''}>${editable("workPage.allWorkLabel")} <sup>${projects.length}</sup></a>${categories.map(t=>`<a class="filter ${canonical(selected)===t?'active':''}" href="${filterLink(t)}" ${canonical(selected)===t?'aria-current="true"':''}>${escape(t)} <sup>${projects.filter(p=>(p.tags||[]).map(canonical).includes(t)).length}</sup></a>`).join('')}</div></details></div></div>
    ${filtered.length?`<div class="paper-scroll"${stackAttr}><div class="paper-stage" tabindex="0" role="region" aria-label="Project paper stack. Scroll, use the previous and next buttons, or press arrow keys to browse."><div class="paper-progress" aria-hidden="true"><span data-paper-progress></span></div><div class="paper-sidebar"><span class="mono paper-sidebar-label">${editable("experience.work.portfolioLabel",true)}</span><div class="paper-roles">${filtered.map((p,i)=>`<div class="paper-role" ${i?'hidden':''}><span class="mono">${editable("experience.work.rolesLabel")}</span><p>${(p.tags||[]).map(escape).join('<br>')}</p>${p.year?`<span class="mono">YEAR</span><p>${escape(p.year)}</p>`:''}</div>`).join('')}</div><div class="paper-count"><span class="mono">${editable("workPage.heading")}</span><div><strong data-paper-number>${window.SadaBrand.numeral(1)}</strong><span>/${pad(filtered.length)}</span></div></div></div>
    <div class="paper-deck">${filtered.map((p,i)=>`<a class="paper-card ${i===0?'is-current':''}" href="${projectLink(p)}" data-title="${escape(p.title)}" data-cursor="Open project" ${i?'inert aria-hidden="true"':''}><div class="paper-image"><img ${i<3?'src':'data-src'}="${escape(media(p.thumbnail))}" alt="${escape(p.title+' — '+p.description)}" decoding="async"></div></a>`).join('')}</div>
    <div class="paper-copy">${filtered.map((p,i)=>`<div class="paper-info" ${i?'hidden':''}><p class="paper-sector">${escape(p.description)}</p><h2>${escape(p.title)}</h2><p class="paper-summary">${escape(excerpt(p))}</p><a class="text-link" href="${projectLink(p)}">${editable("experience.work.viewLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div>`).join('')}</div>
    <div class="paper-bottom"><span class="mono">${editable("experience.work.shuffleLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3v18M4 13l8 8 8-8"/></svg></span><div class="paper-controls"><button type="button" data-paper-prev aria-label="Previous project"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12H3M11 4l-8 8 8 8"/></svg></button><button type="button" data-paper-next aria-label="Next project"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 12h18M13 4l8 8-8 8"/></svg></button></div><span class="mono paper-bottom-note">${escape(selected).toUpperCase()}</span></div><span class="sr-only" data-paper-live aria-live="polite"></span></div></div>`:`<div class="empty section"><h2>More to come.</h2><p>We don't have a published project in ${escape(selected)} here yet.</p><a class="pill" href="#/work">Explore all work <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a><a class="text-link" href="#/contact">Talk to us about ${escape(selected)} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div>`}
    ${listMarkup}
    <section class="work-afterword section"><h2>${editable("workPage.introParagraphs.0")}.</h2><div class="work-intro">${paragraphs(site.workPage.introParagraphs.slice(1),"workPage.introParagraphs",1)}</div><a class="work-callout" href="#/contact"><span>${editable("workPage.calloutHeading")}</span><span class="round-arrow" aria-label="${escape(site.workPage.calloutButton)}"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a></section></section>`;
  }
  function about(){
    return `<section class="about-page section"><div class="section-label"><span>${editable("experience.about.eyebrow")}</span><span>صدى</span></div><div class="about-hero"><div><h1>${editable("experience.about.heading",true)}<br><em data-cms="experience.about.highlight">${escape(value("experience.about.highlight"))}</em></h1><p class="large-copy">${editable("homepage.aboutParagraphs.0")}</p></div>${cloud(false)}</div><div class="about-text"><span class="mono">${editable("experience.about.philosophyLabel")}</span><div>${paragraphs(site.homepage.aboutParagraphs.slice(1),"homepage.aboutParagraphs",1)}</div></div><div class="section-heading services-heading"><h2>${editable("experience.about.servicesHeading",true)}</h2><span class="mono">${services.length} WAYS TO MAKE AN ECHO</span></div><div class="service-index focus-group">${services.map((s,i)=>`<a class="service-item" href="${filterLink(s)}"><span>${pad(i+1)}</span><span data-cms="homepage.services.${i}">${escape(s)}</span><span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>`).join('')}</div></section>`;
  }
  function contact(){
    return `<section class="contact-page section"><div class="section-label"><span>${editable("experience.contact.eyebrow")}</span><span>${editable("experience.contact.intro")}</span></div><h1>${editable("experience.contact.heading",true)}<span class="heading-period">?</span></h1><div class="contact-grid"><div class="contact-details"><h2>${editable("experience.contact.subheading",true)}</h2><a class="contact-email" href="mailto:${escape(site.footer.email)}">${editable("footer.email")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a><a class="contact-phone" href="tel:${escape(site.footer.phone.number)}">${editable("footer.phone.label")}</a><div class="contact-socials">${site.footer.socialLinks.map((s,i)=>`<a href="${escape(window.SadaCMS.url(s.url))}" target="_blank" rel="noopener noreferrer"><span data-cms="footer.socialLinks.${i}.label">${escape(s.label)}</span> <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a>`).join('')}</div></div><form id="contact-form"><label>Your name<input name="name" autocomplete="name" required placeholder="What should we call you?" maxlength="100"></label><label>Your email<input name="email" type="email" autocomplete="email" required placeholder="you@yourbrand.com" maxlength="200"></label><label>What are you thinking?<textarea name="idea" rows="3" required placeholder="A new brand? A fresh direction? Tell us a little." maxlength="4000"></textarea></label><button class="pill" type="submit">Draft an email <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></button><p class="form-note">Opens your email app with your message ready to review and send.</p><p id="form-status" role="status"></p></form></div></section>`;
  }
  function project(slug){
    const p=projects.find(p=>p.slug===slug||p.id===slug);
    if(!p)return `<section class="section not-found"><h1>${escape(site.projectPage.notFoundHeading)}</h1><p>${escape(site.projectPage.notFoundText)}</p><a class="pill" href="#/work">${escape(site.projectPage.notFoundButton)} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></section>`;
    const images=p.images||[];
    const media=p.showCoverOnProject===false?images.filter(src=>src!==p.thumbnail):[p.thumbnail,...images.filter(src=>src!==p.thumbnail)];
    gallery=media.filter(src=>!isVideo(src)).map(src=>window.SadaCMS.media(src));
    const next=projects[(projects.indexOf(p)+1)%projects.length];
    return `<article class="project-page">
      <div class="case-study-layout">
        <div class="case-study-notes">
          <section class="case-study-copy" tabindex="0" aria-labelledby="project-title">
            <div class="section-label"><span>SADA STUDIO / ${pad(projects.indexOf(p)+1)}</span><span>${escape(p.year||'')}</span></div>
            <h1 id="project-title" data-project-field="title" data-project-id="${escape(p.id)}">${escape(p.title)}</h1>
            <p class="case-study-subtitle" data-project-field="description" data-project-id="${escape(p.id)}">${escape(p.description)}</p>
            <div class="detail-tags">${(p.tags||[]).map(t=>`<a href="${filterLink(t)}">${escape(t)}</a>`).join('')}</div>
            <div class="case-study-description cms-lines" data-project-field="longDescription" data-project-id="${escape(p.id)}">${escape(p.longDescription||p.description)}</div>
          </section>
          <a class="text-link project-back" href="${escape('#'+lastWorkRoute)}"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 12H3M11 4l-8 8 8 8"/></svg> ${editable("projectPage.backLabel")}</a>
        </div>
        <div class="project-gallery" aria-label="${escape(p.title)} project gallery">
          ${media.length?media.map((src,i)=>isVideo(src)?`<figure class="gallery-media"><video controls playsinline preload="metadata" aria-label="${escape(p.title)} — video ${i+1}" src="${escape(window.SadaCMS.media(src))}"></video><figcaption>${escape(p.title)} / ${pad(i+1)}</figcaption></figure>`:`<figure class="gallery-media"><button class="gallery-image" type="button" data-image="${gallery.indexOf(window.SadaCMS.media(src))}" aria-label="Open ${escape(p.title)} image ${i+1}"><img src="${escape(window.SadaCMS.media(src))}" alt="${escape(p.title)} — project image ${i+1}" loading="${i===0?'eager':'lazy'}" decoding="async"></button><figcaption>${escape(p.title)} / ${pad(i+1)}</figcaption></figure>`).join(''):`<p>${escape(site.projectPage.emptyGalleryText)}</p>`}
        </div>
      </div>
      <a class="next-project section" href="${projectLink(next)}"><span class="mono">${editable("experience.work.nextLabel")} / ${pad(projects.indexOf(next)+1)}</span><span>${escape(next.title)}</span><span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a>
    </article>`;
  }
  function renderFooter(){
    const taglinePath=(location.hash.slice(1)||window.SADA_ROUTE||'/').startsWith('/project/')?'footer.projectTagline':'footer.tagline';
    footer.innerHTML=`<div class="footer-atmosphere" aria-hidden="true"><video class="footer-video" autoplay muted loop playsinline preload="metadata"><source src="assets/about_us_video.mp4" type="video/mp4"></video></div><div class="footer-top"><span class="mono">${editable("experience.footer.eyebrow")}</span><a class="footer-top-link" href="#/contact">${editable("footer.email")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></div><a href="#/contact" class="footer-callout">${editable(taglinePath+".before",true)} <em data-cms="${taglinePath}.highlight">${escape(value(taglinePath+".highlight"))}</em>${editable(taglinePath+".after")}<span aria-hidden="true"><svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></span></a><div class="footer-bottom"><a class="footer-brand" href="#/" aria-label="Sada Studio home"><img src="assets/sada-logo.png" width="775" height="723" alt="Sada Studio"></a><div class="footer-socials">${site.footer.socialLinks.map((s,i)=>`<a href="${escape(window.SadaCMS.url(s.url))}" target="_blank" rel="noopener noreferrer"><span data-cms="footer.socialLinks.${i}.label">${escape(s.label)}</span></a>`).join('')}</div><a href="tel:${escape(site.footer.phone.number)}">${editable("footer.phone.label")}</a><span class="copyright">© ${new Date().getFullYear()} Sada Studio</span><a href="#top" data-scroll="top">${editable("experience.footer.topLabel")} <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21V3M4 11l8-8 8 8"/></svg></a></div>`;
  }
  function closeMenu(){menu.hidden=true;menuButton.textContent=site.navigation.menuLabel+' +';menuButton.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open');}
  menuButton.addEventListener('click',()=>{
    const open=menu.hidden;menu.hidden=!open;menuButton.textContent=open?'Close ×':site.navigation.menuLabel+' +';menuButton.setAttribute('aria-expanded',String(open));document.body.classList.toggle('menu-open',open);
    if(open)menu.querySelector('a').focus();
  });
  menu.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();menuButton.focus();}});
  function render(options={}){
    const savedScroll=window.scrollY;
    const raw=location.hash.slice(1)||window.SADA_ROUTE||'/';
    if(!raw.startsWith('/'))return;
    const [path,query='']=raw.split('?');const params=new URLSearchParams(query);
    const filterChange=path==='/work'&&previousRoute==='/work';
    if(previousRoute==='/work'){workScroll.set(previousRaw,window.scrollY);lastWorkRoute=previousRaw;}
    instances.forEach(x=>x.destroy());instances=[];routeAbort.abort();routeAbort=new AbortController();gallery=[];
    if(previousRoute&&previousRoute!==path){renderFooter();window.SadaBrand.enhance(footer);}
    closeMenu();document.body.classList.toggle('home-route',path==='/');document.body.classList.toggle('work-route',path==='/work');window.SadaAtmosphere.setRoute(path==='/');
    header.querySelectorAll('nav a').forEach(a=>{
      const active=a.getAttribute('href')==='#'+path;
      if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    if(path==='/')main.innerHTML=home();
    else if(path==='/work')main.innerHTML=work(params);
    else if(path==='/about')main.innerHTML=about();
    else if(path==='/contact')main.innerHTML=contact();
    else if(path.startsWith('/project/'))main.innerHTML=project(decodeURIComponent(path.slice(9)));
    else main.innerHTML=`<section class="section not-found"><h1>Wrong turn.<br>Good company.</h1><a class="pill" href="#/">Back to Sada <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 19 19 5M5 5h14v14"/></svg></a></section>`;
    const p=path.startsWith('/project/')?projects.find(p=>p.slug===decodeURIComponent(path.slice(9))):null;
    document.title=p?(p.seoTitle||p.title+' | Sada Studio'):path==='/work'?site.workPage.seo.title:path==='/about'?site.experience.about.seoTitle:path==='/contact'?site.experience.contact.seoTitle:site.homepage.seo.title;
    document.querySelector('meta[name="description"]').content=p?(p.seoDescription||p.description):path==="/work"?site.workPage.seo.description:path==="/about"?site.experience.about.seoDescription:path==="/contact"?site.experience.contact.seoDescription:site.homepage.seo.description;
    window.SadaBrand.enhance(main);
    document.querySelectorAll('.logo-cloud:not([data-journey-logo])').forEach(c=>instances.push(new window.SadaPointCloud(c,{dark:c.dataset.dark!=='false'})));
    document.querySelectorAll('[data-game]').forEach(el=>instances.push(new window.SadaEchoRun(el)));
    document.querySelectorAll('[data-particle-journey]').forEach(el=>instances.push(new window.SadaParticleJourney(el)));
    document.querySelectorAll('[data-paper-stack]').forEach(el=>instances.push(new window.SadaPaperStack(el)));
    document.querySelector('[data-work-view]')?.addEventListener('click',()=>{
      const view=document.querySelector('.work-stack-page')?.classList.contains('is-list-view')?'stack':'list';
      const q=new URLSearchParams();if(params.get('filter'))q.set('filter',params.get('filter'));if(view==='list')q.set('view','list');
      const suffix=q.toString();location.hash='#/work'+(suffix?'?'+suffix:'');
    },alive());
    document.querySelector('.stack-filters')?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary').focus();}},alive());
    const form=document.querySelector('#contact-form');
    if(form)form.addEventListener('submit',e=>{
      e.preventDefault();if(!form.reportValidity())return;
      const data=new FormData(form),subject='A new echo — '+data.get('name');
      const body=`Hi Sada,\n\n${data.get('idea')}\n\n${data.get('name')}\n${data.get('email')}`;
      const href='mailto:'+site.footer.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      location.href=href;document.querySelector('#form-status').textContent='Your email draft is ready. If your mail app did not open, email us directly using the address alongside.';
    },alive());
    main.querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>openImage(Number(b.dataset.image)),alive()));
    if(previousRoute&&!options.preserveScroll){main.focus({preventScroll:true});window.scrollTo({top:path==='/work'&&!filterChange?(workScroll.get(raw)||0):0,behavior:'instant'});}
    if(options.preserveScroll)window.scrollTo({top:savedScroll,behavior:"instant"});
    instances.forEach(instance=>instance.syncScroll?.());
    previousRoute=path;previousRaw=raw;window.SadaAtmosphere.refresh();window.SadaCMS.mount();window.dispatchEvent(new CustomEvent("sada-route-change"));
  }
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-scroll]');if(!link)return;e.preventDefault();
    const id=link.dataset.scroll;
    if(id==='top')window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    else document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  const lightbox=document.querySelector('#lightbox');
  function openImage(index){
    galleryIndex=(index+gallery.length)%gallery.length;
    lightbox.querySelector('img').src=gallery[galleryIndex];
    lightbox.querySelector('img').alt=`Project gallery image ${galleryIndex+1} of ${gallery.length}`;
    lightbox.querySelector('.lightbox-count').textContent=pad(galleryIndex+1)+' / '+pad(gallery.length);
    if(!lightbox.open)lightbox.showModal();
  }
  lightbox.querySelector('.lightbox-close').addEventListener('click',()=>lightbox.close());
  lightbox.querySelector('.lightbox-prev').addEventListener('click',()=>openImage(galleryIndex-1));
  lightbox.querySelector('.lightbox-next').addEventListener('click',()=>openImage(galleryIndex+1));
  lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close();});
  lightbox.addEventListener('keydown',e=>{if(e.key==='ArrowRight')openImage(galleryIndex+1);if(e.key==='ArrowLeft')openImage(galleryIndex-1);});
  window.addEventListener('hashchange',()=>render());
  renderFooter();window.SadaBrand.enhance(footer);render();
  const footerObserver=new IntersectionObserver(entries=>footer.classList.toggle('is-visible',entries[0].isIntersecting&&!document.hidden));
  footerObserver.observe(footer);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)footer.classList.remove('is-visible');
    else{const rect=footer.getBoundingClientRect();footer.classList.toggle('is-visible',rect.top<innerHeight&&rect.bottom>0);}
  });

  window.SadaCMS.connect(({structure})=>{
    ({site,projects}=window.SADA_CONTENT); services=site.homepage.services;
    if(structure){renderFooter();window.SadaBrand.enhance(footer);render({preserveScroll:true});}
    document.querySelectorAll('a[href^="mailto:"]').forEach(a=>a.href='mailto:'+site.footer.email);
    document.querySelectorAll('a[href^="tel:"]').forEach(a=>a.href='tel:'+site.footer.phone.number);
    const all=document.querySelector('.journey-end .pill');
    if(all&&all.firstChild?.nodeType===3)all.firstChild.textContent=site.homepage.callToAction.button.replace(/\{count\}/g,projects.length)+' ';
    window.SadaBrand.enhance(document);
  });

  // A restrained cursor label; native pointers remain available on touch and
  // when reduced motion is requested.
  if(matchMedia('(hover: hover) and (pointer: fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const cursor=document.querySelector('#cursor');let x=0,y=0,cx=0,cy=0,frame=0,target=null;
    const tick=()=>{cx+=(x-cx)*.24;cy+=(y-cy)*.24;cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`;if(target)frame=requestAnimationFrame(tick);else frame=0;};
    document.addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;const card=e.target.closest('[data-cursor]');target=card;cursor.classList.toggle('visible',!!card);if(card){cursor.textContent=card.dataset.cursor;if(!frame){cx=x;cy=y;frame=requestAnimationFrame(tick);}}});
    document.addEventListener('pointerleave',()=>{target=null;cursor.classList.remove('visible');});
  }
});
