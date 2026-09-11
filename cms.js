(() => {
  'use strict';
  const ADMIN_ORIGIN = 'https://admin.sadastudio.me';
  const preview = new URLSearchParams(location.search).get('cmsPreview') === '1' && parent !== window;
  const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
  const sections = new Set(['navigation', 'homepage', 'workPage', 'projectPage', 'footer', 'experience']);
  const clone = value => JSON.parse(JSON.stringify(value));
  const normalizeProjects = list => list.map(p => ({...p, slug:String(p.slug || p.id || p.title).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'untitled'}));
  const publicProjects = list => normalizeProjects(list.filter(p => p.visible !== false && p.status !== 'draft'));
  let onUpdate = null;
  function parts(path) {
    const keys = typeof path === 'string' ? path.split('.') : [];
    return keys.length >= 2 && keys.length <= 8 && sections.has(keys[0]) && keys.every(k => /^[A-Za-z0-9_]+$/.test(k) && !forbidden.has(k)) ? keys : null;
  }
  function get(path, source = window.SADA_CONTENT.site) {
    const keys = parts(path);
    return keys ? keys.reduce((v, k) => v && Object.hasOwn(v, k) ? v[k] : undefined, source) : undefined;
  }
  function set(path, value) {
    const keys = parts(path);
    if (!keys || typeof value !== 'string' || value.length > 20000 || typeof get(path) !== 'string') return false;
    const key = keys.pop();
    keys.reduce((v, k) => v[k], window.SADA_CONTENT.site)[key] = value;
    return true;
  }
  function safeObject(value, depth = 0) {
    if (depth > 9) return false;
    if (typeof value === 'string') return value.length <= 20000;
    if (typeof value === 'boolean' || typeof value === 'number' || value === null) return true;
    return typeof value === 'object' && Object.keys(value).every(key => !forbidden.has(key) && safeObject(value[key], depth + 1));
  }
  function validSnapshot(data) {
    return data && data.site && ['navigation', 'homepage', 'workPage', 'projectPage', 'footer', 'experience'].every(k => data.site[k] && typeof data.site[k] === 'object') &&
      Array.isArray(data.projects) && data.projects.length <= 2000 && data.projects.every(p => p && typeof p.title === 'string' && typeof p.id === 'string' && Array.isArray(p.images) && Array.isArray(p.tags)) &&
      Array.isArray(data.site.homepage.services) && Array.isArray(data.site.homepage.aboutParagraphs) && Array.isArray(data.site.workPage.introParagraphs) && Array.isArray(data.site.footer.socialLinks) && safeObject(data);
  }
  const initial = clone(window.SADA_CONTENT);
  const ready = (async () => {
    if (preview || location.protocol === 'file:') return;
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(new URL('cms-snapshot.json', document.baseURI), {cache:'no-store', signal:controller.signal});
      if (!response.ok) throw new Error('Content unavailable');
      const data = await response.json();
      if (!validSnapshot(data)) throw new Error('Invalid content snapshot');
      window.SADA_CONTENT = {site:data.site, projects:publicProjects(data.projects)};
    } catch (_) { window.SADA_CONTENT = initial; }
    finally { clearTimeout(timeout); }
  })();
  function send(message) { if (preview) parent.postMessage(message, ADMIN_ORIGIN); }
  function writeText(element, value) {
    if (element === document.activeElement) return;
    if (element.dataset.cmsMultiline !== undefined) {
      element.replaceChildren(...String(value).split('\n').flatMap((line, index) => index ? [document.createElement('br'), document.createTextNode(line)] : [document.createTextNode(line)]));
    } else element.textContent = value;
    if (element.classList.contains('echo-word')) element.dataset.echo = value;
  }
  function mount() {
    document.querySelectorAll('[data-cms]').forEach(element => {
      const value = get(element.dataset.cms);
      if (typeof value === 'string') writeText(element, value);
    });
    if (!preview) return;
    document.documentElement.classList.add('cms-preview');
    document.querySelectorAll('[data-cms], [data-project-field]').forEach(element => {
      element.setAttribute('contenteditable', 'plaintext-only');
      element.setAttribute('spellcheck', 'true');
      element.setAttribute('title', 'Click to edit. Changes remain unpublished until you publish in the admin.');
    });
  }
  if (preview) {
    document.addEventListener('click', event => {
      if (event.target.closest('[contenteditable]')) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('keydown', event => {
      if (!event.target.closest('[contenteditable]')) return;
      event.stopImmediatePropagation();
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.target.blur(); }
    }, true);
    document.addEventListener('input', event => {
      const el = event.target.closest('[contenteditable]');
      if (!el) return;
      const value = el.innerText.replace(/\r/g, '');
      if (el.dataset.cms && set(el.dataset.cms, value)) {
        document.querySelectorAll('[data-cms]').forEach(other => { if (other.dataset.cms === el.dataset.cms) writeText(other, value); });
        send({type:'sada-site-content-preview-update', path:el.dataset.cms, value});
      } else if (['title', 'description', 'longDescription'].includes(el.dataset.projectField) && value.length <= 20000) {
        const p = window.SADA_CONTENT.projects.find(p => String(p.id) === el.dataset.projectId);
        if (p) { p[el.dataset.projectField] = value; send({type:'sada-project-preview-update', id:p.id, field:el.dataset.projectField, value}); }
      }
      window.SadaBrand?.enhance(document);
    });
    window.addEventListener('message', event => {
      if (event.origin !== ADMIN_ORIGIN || event.source !== parent || !event.data || event.data.type !== 'sada-site-content-preview') return;
      const message = event.data;
      const data = {site:message.content, projects:message.projects || window.SADA_CONTENT.projects};
      if (!validSnapshot(data)) return;
      data.projects = normalizeProjects(data.projects);
      // Repeated ready/echo messages must not reset the scroll scene or caret.
      const old = window.SADA_CONTENT;
      const sameProjects = JSON.stringify(old.projects) === JSON.stringify(data.projects);
      const sameSite = JSON.stringify(old.site) === JSON.stringify(data.site);
      if (sameProjects && sameSite) { mount(); return; }
      window.SADA_CONTENT = clone(data);
      onUpdate?.({structure:!sameProjects || JSON.stringify(old.site.homepage.services) !== JSON.stringify(data.site.homepage.services) || JSON.stringify(old.site.footer.socialLinks) !== JSON.stringify(data.site.footer.socialLinks) || old.site.homepage.aboutParagraphs.length !== data.site.homepage.aboutParagraphs.length || old.site.workPage.introParagraphs.length !== data.site.workPage.introParagraphs.length});
      mount();
    });
  }
  window.SadaCMS = {
    preview, ready, get, set, mount, validSnapshot,
    connect(callback) { onUpdate = callback; mount(); send({type:'sada-site-content-preview-ready'}); },
    media(src) {
      const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
      return local && window.SADA_ASSET_MAP?.[src] || src || '';
    },
    url(src) { try { const url = new URL(src, document.baseURI); return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : '#'; } catch { return '#'; } }
  };
})();
