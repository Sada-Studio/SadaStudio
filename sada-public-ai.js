(() => {
  "use strict";

  const STORAGE_KEY = "sada-public-ai-conversation-v1";
  const API_BASE = "/api/sada-ai";
  const liveApi = ['sadastudio.me','www.sadastudio.me'].includes(location.hostname) && !window.SadaCMS?.preview;
  const sendArrow = '<svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V3M4 11l8-8 8 8"/></svg>';
  const ECHO_COMPRESSED_BASE = "https://assets.sadastudio.me/echo/animation/compressed";
  const ECHO_HIGHRES_BASE = "https://assets.sadastudio.me/echo/animation";
  const ECHO_VERSION = "20260909c";
  const ECHO_SETS = {
    // The uploaded files are named "neurtal" inside the "neutral" folder.
    neutral: { frames: 5, fps: 2.2, filename: "neurtal" },
    angry: { frames: 4, fps: 4 },
    confused: { frames: 3, fps: 3 },
    loading: { frames: 5, fps: 6 },
    love: { frames: 5, fps: 4 },
    sad: { frames: 3, fps: 3 },
    scared: { frames: 2, fps: 3 },
    run: { frames: 3, fps: 7 }
  };
  const ECHO_REACTION_LABELS = {
    neutral: "Echo is ready",
    angry: "Echo is feeling annoyed",
    sad: "Echo is feeling sad",
    love: "Echo is feeling loved",
    confused: "Echo is feeling puzzled",
    scared: "Echo is feeling startled"
  };

  let conversationId = "";
  let loaded = false;
  let sending = false;
  let submitted = false;
  let echoReactionTimer = null;
  const echoFrames = new Map();
  const echoAnimations = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  try {
    conversationId = localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    conversationId = "";
  }

  const root = document.createElement("div");
  root.className = "sada-guide-root";
  root.innerHTML = [
    '<button class="sada-guide-launch echo-launch" type="button" aria-label="Ask Echo" aria-expanded="false" aria-controls="sada-guide-drawer">',
      '<span class="sada-guide-launch-visual" aria-hidden="true"></span>',
      '<span>Ask Echo <svg class="ui-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg></span>',
    '</button>',
    '<div class="sada-guide-overlay" aria-hidden="true"></div>',
    '<aside id="sada-guide-drawer" class="sada-guide-drawer" aria-hidden="true" aria-label="Ask Echo">',
      '<div class="sada-guide-header">',
        '<div>',
          '<div class="sada-guide-kicker">SADA STUDIO</div>',
          '<div class="sada-guide-title">Ask Echo</div>',
        '</div>',
        '<div class="sada-guide-header-actions">',
          '<div class="sada-guide-header-echo" role="img" aria-label="Echo is ready"></div>',
          '<button class="sada-guide-close" type="button" aria-label="Close">×</button>',
        '</div>',
      '</div>',
      '<div class="sada-guide-context"></div>',
      '<div class="sada-guide-messages" aria-live="polite"></div>',
      '<div class="sada-guide-submit-panel" hidden>',
        '<div class="sada-guide-submit-title">Send this project to Sada</div>',
        '<div class="sada-guide-submit-copy">Add a way for the team to contact you. Your conversation is included with the request.</div>',
        '<div class="sada-guide-submit-grid">',
          '<input class="sada-guide-contact" data-field="name" placeholder="Name">',
          '<input class="sada-guide-contact" data-field="company" placeholder="Company / brand">',
          '<input class="sada-guide-contact" data-field="email" type="email" placeholder="Email">',
          '<input class="sada-guide-contact" data-field="phone" placeholder="Phone / WhatsApp">',
        '</div>',
        '<div class="sada-guide-submit-actions">',
          '<button class="sada-guide-submit-cancel" type="button">Not now</button>',
          '<button class="sada-guide-submit-button" type="button">Submit request</button>',
        '</div>',
        '<div class="sada-guide-submit-error" role="alert"></div>',
      '</div>',
      '<div class="sada-guide-composer">',
        '<div class="sada-guide-input-row">',
          '<textarea class="sada-guide-input" rows="1" maxlength="2500" placeholder="Ask about Sada, our work, or your project..."></textarea>',
          '<button class="sada-guide-send" type="button" aria-label="Send message">&#8593;&#65038;</button>',
        '</div>',
        '<div class="sada-guide-privacy">Conversations are stored by Sada Studio so we can understand inquiries and improve the experience. Avoid sharing sensitive information.</div>',
      '</div>',
    '</aside>'
  ].join("");
  document.body.appendChild(root);

  const launch = root.querySelector(".sada-guide-launch");
  const overlay = root.querySelector(".sada-guide-overlay");
  const drawer = root.querySelector(".sada-guide-drawer");
  const close = root.querySelector(".sada-guide-close");
  const context = root.querySelector(".sada-guide-context");
  const messages = root.querySelector(".sada-guide-messages");
  const input = root.querySelector(".sada-guide-input");
  const send = root.querySelector(".sada-guide-send");
  const submitPanel = root.querySelector(".sada-guide-submit-panel");
  const submitButton = root.querySelector(".sada-guide-submit-button");
  const submitCancel = root.querySelector(".sada-guide-submit-cancel");
  const submitError = root.querySelector(".sada-guide-submit-error");
  const headerEcho = root.querySelector(".sada-guide-header-echo");
  const headerEchoImage = makeEchoImage("sada-guide-echo-face", "neutral", "");
  headerEcho.appendChild(headerEchoImage);
  root.querySelector(".sada-guide-launch-visual").appendChild(
    makeEchoImage("sada-guide-echo-face sada-guide-launch-image", "neutral", "")
  );

  function highResEchoUrl(setName, frame) {
    if (setName === "loading" && frame === 1) {
      return ECHO_HIGHRES_BASE + "/loading/sprite%20animations_1.png?v=" + ECHO_VERSION;
    }
    return ECHO_HIGHRES_BASE + "/" + setName + "/sprite%20animations_" + setName + "-" + frame + ".png?v=" + ECHO_VERSION;
  }

  function echoCandidates(setName, frame) {
    const filename = ECHO_SETS[setName].filename || setName;
    const uploaded = ECHO_COMPRESSED_BASE + "/" + setName + "/" + filename + "-" + frame + ".png?v=" + ECHO_VERSION;
    const compressed = ECHO_COMPRESSED_BASE + "/" + setName + "/" + setName + "-" + frame + ".png?v=" + ECHO_VERSION;
    const underscore = ECHO_COMPRESSED_BASE + "/" + setName + "/" + setName + "_" + frame + ".png?v=" + ECHO_VERSION;
    const highres = highResEchoUrl(setName, frame);
    return [...new Set([...(setName === "neutral" ? [new URL("assets/echo-neutral-" + frame + ".png", document.baseURI).href] : []), uploaded, compressed, underscore, highres])];
  }

  function loadEchoFrame(setName, frame) {
    const key = setName + ":" + frame;
    if (!echoFrames.has(key)) {
      // Resolve each asset once, offscreen. Animation never interrupts a load
      // or repeatedly retries a missing filename in the visible image.
      echoFrames.set(key, new Promise((resolve) => {
        const candidates = echoCandidates(setName, frame);
        const tryCandidate = (index) => {
          if (index >= candidates.length) {
            resolve(null);
            return;
          }
          const preload = new Image();
          const finish = (ok) => {
            window.clearTimeout(timeout);
            preload.onload = null;
            preload.onerror = null;
            if (ok) resolve({ url: candidates[index], setName, frame });
            else tryCandidate(index + 1);
          };
          const timeout = window.setTimeout(() => finish(false), 12000);
          preload.onload = () => finish(true);
          preload.onerror = () => finish(false);
          preload.src = candidates[index];
        };
        tryCandidate(0);
      }).then((frame) => {
        if (!frame) echoFrames.delete(key);
        return frame;
      }));
    }
    return echoFrames.get(key);
  }

  function showEchoFrame(image, frame) {
    if (!frame) return;
    image.dataset.echoSet = frame.setName;
    image.dataset.echoFrame = String(frame.frame);
    image.src = frame.url;
    image.classList.remove("sada-guide-echo-missing");
  }

  function stopEchoAnimation(image) {
    const animation = echoAnimations.get(image);
    if (animation) window.clearInterval(animation.timer);
    echoAnimations.delete(image);
  }

  function stopEchoAnimationsWithin(container) {
    echoAnimations.forEach((animation, image) => {
      if (container.contains(image)) stopEchoAnimation(image);
    });
  }

  function refreshEchoAnimations() {
    const drawerOpen = drawer.classList.contains("open");
    echoAnimations.forEach((animation, image) => {
      window.clearInterval(animation.timer);
      if (!image.isConnected) {
        stopEchoAnimation(image);
        return;
      }
      const visible = image.classList.contains("sada-guide-launch-image") ? !drawerOpen : drawerOpen;
      if (!visible || document.hidden || reducedMotion.matches || animation.frames.length < 2) return;
      animation.timer = window.setInterval(() => {
        animation.index = (animation.index + 1) % animation.frames.length;
        showEchoFrame(image, animation.frames[animation.index]);
      }, animation.delay);
    });
  }

  function animateEchoImage(image, setName, options = {}) {
    if (!image || !ECHO_SETS[setName]) return null;
    stopEchoAnimation(image);
    const config = ECHO_SETS[setName];
    const animation = {
      frames: [], index: 0, timer: null,
      delay: Math.max(90, Math.round(1000 / (options.fps || config.fps)))
    };
    echoAnimations.set(image, animation);
    const isCurrent = () => echoAnimations.get(image) === animation;
    let firstFrameShown = false;
    const count = options.animate === false || reducedMotion.matches ? 1 : config.frames;
    Promise.all(Array.from({ length: count }, (_, index) =>
      loadEchoFrame(setName, index + 1).then((frame) => {
        if (isCurrent() && frame && !firstFrameShown) {
          firstFrameShown = true;
          showEchoFrame(image, frame);
        }
        return frame;
      })
    ))
      .then(async (frames) => {
        if (!isCurrent()) return;
        animation.frames = frames.filter(Boolean);
        if (!animation.frames.length && setName !== "neutral") {
          const fallback = await loadEchoFrame("neutral", 1);
          if (!isCurrent()) return;
          if (fallback) animation.frames = [fallback];
        }
        showEchoFrame(image, animation.frames[0]);
        refreshEchoAnimations();
      });
    return animation;
  }

  function makeEchoImage(className, setName, altText = "Echo", options = {}) {
    const image = document.createElement("img");
    image.className = className + " sada-guide-echo-missing";
    image.alt = altText;
    image.decoding = "async";
    image.width = 328;
    image.height = 448;
    animateEchoImage(image, setName, options);
    return image;
  }

  function setEchoMood(expression, label) {
    window.clearTimeout(echoReactionTimer);
    echoReactionTimer = null;
    headerEcho.setAttribute("aria-label", label);
    animateEchoImage(headerEchoImage, expression);
  }

  function reactEcho(expression, delay = 7000) {
    setEchoMood(expression, ECHO_REACTION_LABELS[expression]);
    if (expression !== "neutral") {
      echoReactionTimer = window.setTimeout(() => setEchoMood("neutral", ECHO_REACTION_LABELS.neutral), delay);
    }
  }

  function echoExpression(value) {
    const emotion = typeof value === "string" ? value.trim().toLowerCase() : "";
    // Only the server-selected facial expressions are allowed. Older replies
    // and invalid metadata stay neutral without interpreting message phrases.
    return Object.prototype.hasOwnProperty.call(ECHO_REACTION_LABELS, emotion) ? emotion : "neutral";
  }

  function currentPage() {
    const route = location.hash.slice(1) || window.SADA_ROUTE || '/';
    const path = route.startsWith('/project/') ? '/projects/' + route.slice(9).split('?')[0] + '/' : route.split('?')[0] === '/work' ? '/work.html' : route;
    return {path, title:document.title};
  }

  function currentPageLabel() {
    const match = currentPage().path.match(/^\/projects\/([^/]+)\/?$/i);
    if (match) {
      const heading = document.querySelector("#project-title");
      return heading && heading.textContent.trim()
        ? "Viewing: " + heading.textContent.trim()
        : "Viewing a Sada project";
    }
    if (document.querySelector(".work-page")) return "Viewing: All Projects";
    return "Viewing: Sada Studio";
  }

  function updateContext() {
    context.textContent = currentPageLabel();
  }

  function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  function openDrawer() {
    drawer.classList.add("open");
    overlay.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("sada-guide-open");
    launch.setAttribute("aria-expanded", "true");
    refreshEchoAnimations();
    updateContext();
    if (!loaded) loadConversation();
    if (!isMobile()) window.setTimeout(() => input.focus(), 80);
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sada-guide-open");
    launch.setAttribute("aria-expanded", "false");
    refreshEchoAnimations();
    input.blur();
  }

  function scrollMessages() {
    window.requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function renderEmptyState() {
    stopEchoAnimationsWithin(messages);
    messages.innerHTML = "";

    const empty = document.createElement("div");
    empty.className = "sada-guide-empty";

    const hero = document.createElement("div");
    hero.className = "sada-guide-echo-hero";

    const heroVisual = document.createElement("div");
    heroVisual.className = "sada-guide-echo-hero-visual";
    heroVisual.appendChild(makeEchoImage("sada-guide-echo-hero-image", "neutral", "Echo, Sada AI mascot"));

    const echoName = document.createElement("div");
    echoName.className = "sada-guide-echo-name";
    echoName.textContent = "ECHO";

    const tagline = document.createElement("div");
    tagline.className = "sada-guide-echo-tagline";
    tagline.innerHTML = "Your creative partner.<br>Ask me anything.";

    const fetcher = document.createElement("div");
    fetcher.className = "sada-guide-echo-fetcher";
    const runVisual = document.createElement("div");
    runVisual.className = "sada-guide-echo-run-visual";
    runVisual.appendChild(makeEchoImage("sada-guide-echo-run-image", "run", "Echo running"));
    const fetchLabel = document.createElement("div");
    fetchLabel.className = "sada-guide-fetch-label";
    fetchLabel.textContent = "Fetching projects...";
    const progress = document.createElement("div");
    progress.className = "sada-guide-fetch-progress";
    progress.innerHTML = '<span class="sada-guide-fetch-progress-fill"></span>';
    fetcher.append(runVisual, fetchLabel, progress);

    hero.append(heroVisual, echoName, tagline, fetcher);

    const divider = document.createElement("div");
    divider.className = "sada-guide-empty-divider";

    const intro = document.createElement("div");
    intro.className = "sada-guide-empty-intro";
    intro.innerHTML =
      '<div class="sada-guide-empty-title">What are you looking for?</div>' +
      '<div class="sada-guide-empty-copy">Explore our work, understand what Sada can do for your business, or tell us about something you’re planning.</div>';

    const prompts = document.createElement("div");
    prompts.className = "sada-guide-prompts";
    [
      "Show me branding projects",
      "What can Sada do for my business?",
      "Help me plan my project",
      "Find work similar to my idea"
    ].forEach((label) => {
      const button = document.createElement("button");
      button.type = "button";
      const text = document.createElement("span");
      text.textContent = label;
      const arrow = document.createElement("span");
      arrow.className = "sada-guide-prompt-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      button.append(text, arrow);
      button.addEventListener("click", () => {
        input.value = label;
        sendMessage();
      });
      prompts.appendChild(button);
    });

    empty.append(hero, divider, intro, prompts);
    messages.appendChild(empty);
  }

  function appendMessage(role, content, expression = "neutral") {
    const wrapper = document.createElement("div");
    wrapper.className = "sada-guide-message " + role;

    if (role === "assistant") {
      const avatarWrap = document.createElement("div");
      avatarWrap.className = "sada-guide-message-avatar-wrap";
      avatarWrap.appendChild(makeEchoImage("sada-guide-message-avatar", expression, "Echo", { animate: false }));
      wrapper.appendChild(avatarWrap);
    }

    const body = document.createElement("div");
    body.className = "sada-guide-message-body";
    const label = document.createElement("div");
    label.className = "sada-guide-message-label";
    label.textContent = role === "user" ? "You" : "Echo";
    const bubble = document.createElement("div");
    bubble.className = "sada-guide-bubble";
    bubble.innerHTML = safeMarkdown(content);
    body.append(label, bubble);
    wrapper.appendChild(body);
    messages.appendChild(wrapper);
    scrollMessages();
    return wrapper;
  }

  function appendThinkingStatus(projectMode) {
    const status = document.createElement("div");
    status.className = "sada-guide-thinking-status";
    const visual = document.createElement("div");
    visual.className = "sada-guide-thinking-visual";
    visual.appendChild(makeEchoImage(
      "sada-guide-thinking-image" + (projectMode ? " run" : ""),
      projectMode ? "run" : "loading",
      projectMode ? "Echo fetching projects" : "Echo thinking"
    ));
    const copy = document.createElement("div");
    copy.className = "sada-guide-thinking-copy";
    copy.textContent = projectMode ? "Fetching projects..." : "Echo is thinking...";
    status.append(visual, copy);
    messages.appendChild(status);
    scrollMessages();
    return status;
  }

  function safeMarkdown(value) {
    let text = String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
    text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    text = text.replace(/\n/g, "<br>");
    return text;
  }

  function appendProjects(projects) {
    if (!Array.isArray(projects) || !projects.length) return;
    const group = document.createElement("div");
    group.className = "sada-guide-projects";
    projects.slice(0, 4).forEach((project) => {
      if (!project || !project.url || !project.title) return;
      const card = document.createElement("a");
      card.className = "sada-guide-project-card";
      let address;
      try { address = new URL(project.url, 'https://sadastudio.me'); } catch { return; }
      if (!['http:','https:'].includes(address.protocol)) return;
      const slug = address.pathname.match(/^\/projects\/([^/]+)\/?$/);
      if (slug && ['sadastudio.me','www.sadastudio.me'].includes(address.hostname)) {
        card.href = '#/project/' + slug[1];
        card.addEventListener('click', closeDrawer);
      } else {card.href=address.href;card.target='_blank';card.rel='noopener noreferrer';}
      if (project.thumbnail) {
        const image = document.createElement("img");
        image.src = project.thumbnail;
        image.alt = "";
        image.loading = "lazy";
        card.appendChild(image);
      }
      const body = document.createElement("div");
      body.className = "sada-guide-project-body";
      const title = document.createElement("div");
      title.className = "sada-guide-project-title";
      title.textContent = project.title;
      const description = document.createElement("div");
      description.className = "sada-guide-project-description";
      description.textContent = project.description || "";
      body.append(title, description);
      card.appendChild(body);
      group.appendChild(card);
    });
    messages.appendChild(group);
    scrollMessages();
  }

  function appendSubmitPrompt() {
    if (submitted || messages.querySelector(".sada-guide-submit-prompt")) return;
    const box = document.createElement("div");
    box.className = "sada-guide-submit-prompt";
    const text = document.createElement("div");
    text.innerHTML = "<strong>Want Sada to review this?</strong><br>You can send this conversation as a project request.";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Submit project request";
    button.addEventListener("click", showSubmitPanel);
    box.append(text, button);
    messages.appendChild(box);
    scrollMessages();
  }

  function showSubmitPanel() {
    if (submitted) return;
    submitPanel.hidden = false;
    submitError.textContent = "";
    scrollMessages();
  }

  function hideSubmitPanel() {
    submitPanel.hidden = true;
    submitError.textContent = "";
  }

  async function loadConversation() {
    loaded = true;
    if (!liveApi) {
      renderEmptyState();
      root.querySelector('.sada-guide-privacy').innerHTML = 'The live Echo chat is available on <a href="https://sadastudio.me/" target="_blank" rel="noopener noreferrer">sadastudio.me</a>. This preview does not store conversations.';
      input.disabled = true;send.disabled = true;
      return;
    }
    if (!conversationId) {
      renderEmptyState();
      return;
    }

    try {
      const response = await fetch(API_BASE + "/conversation?id=" + encodeURIComponent(conversationId), {
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.conversationId) {
        resetConversation();
        renderEmptyState();
        return;
      }
      submitted = data.submitted === true;
      stopEchoAnimationsWithin(messages);
      messages.innerHTML = "";
      (data.messages || []).forEach((message) => {
        const expression = message.role === "assistant" ? echoExpression(message.emotion) : "neutral";
        appendMessage(message.role, message.content, expression);
        if (message.role === "assistant" && Array.isArray(message.suggestedProjects) && message.suggestedProjects.length) {
          appendProjects(message.suggestedProjects);
        }
      });
      if (!(data.messages || []).length) renderEmptyState();
    } catch (error) {
      console.warn("Could not restore Sada conversation:", error);
      renderEmptyState();
    }
  }

  function resetConversation() {
    conversationId = "";
    submitted = false;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function setSending(value) {
    sending = Boolean(value);
    send.disabled = sending;
    input.disabled = sending;
    send.classList.toggle("is-sending", sending);
    send.innerHTML = sendArrow;
  }

  function messageLooksProjectRelated(text) {
    return /(project|work|portfolio|branding|brand|identity|packaging|social|similar|example|case study)/i.test(text);
  }

  async function sendMessage() {
    if (!liveApi) return;
    if (sending) return;
    const text = input.value.trim();
    if (!text) return;

    const empty = messages.querySelector(".sada-guide-empty");
    if (empty) {
      stopEchoAnimationsWithin(messages);
      empty.remove();
    }

    appendMessage("user", text);
    input.value = "";
    input.style.height = "auto";
    hideSubmitPanel();
    setSending(true);
    const projectMode = messageLooksProjectRelated(text);
    const thinkingLabel = projectMode ? "Echo is fetching projects" : "Echo is thinking";
    setEchoMood("loading", thinkingLabel);
    const thinking = appendThinkingStatus(projectMode);

    try {
      const response = await fetch(API_BASE + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text, page: currentPage() })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Sada Guide could not answer.");

      conversationId = data.conversationId || conversationId;
      if (conversationId) {
        try { localStorage.setItem(STORAGE_KEY, conversationId); } catch {}
      }

      stopEchoAnimationsWithin(thinking);
      thinking.remove();
      const expression = echoExpression(data.emotion);
      reactEcho(expression);
      appendMessage("assistant", data.reply, expression);
      appendProjects(data.suggestedProjects);
      if (data.suggestSubmit) appendSubmitPrompt();
    } catch (error) {
      stopEchoAnimationsWithin(thinking);
      thinking.remove();
      setEchoMood("sad", "Echo could not answer. Please try again.");
      appendMessage("assistant", "I couldn’t answer that just now. Please try again.", "sad");
      console.error(error);
    } finally {
      setSending(false);
      if (isMobile()) input.blur();
      else input.focus();
    }
  }

  async function submitRequest() {
    if (!liveApi) return;
    if (!conversationId || submitted) return;
    const values = {};
    root.querySelectorAll(".sada-guide-contact").forEach((field) => {
      values[field.dataset.field] = field.value.trim();
    });
    if (!values.email && !values.phone) {
      submitError.textContent = "Add an email address or phone / WhatsApp number.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";
    submitError.textContent = "";

    setEchoMood("loading", "Echo is sending your project request");
    try {
      const response = await fetch(API_BASE + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          name: values.name,
          company: values.company,
          email: values.email,
          phone: values.phone
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not submit the request.");
      submitted = true;
      hideSubmitPanel();
      setEchoMood("love", "Echo has sent your project request");
      appendMessage("assistant", data.reply, "love");
      root.querySelectorAll(".sada-guide-submit-prompt").forEach((item) => item.remove());
    } catch (error) {
      submitError.textContent = error.message;
      setEchoMood("sad", "Echo could not send your project request");
    } finally {
      submitButton.disabled = submitted;
      submitButton.textContent = submitted ? "Submitted" : "Submit request";
    }
  }

  launch.addEventListener("click", openDrawer);
  close.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  submitCancel.addEventListener("click", hideSubmitPanel);
  submitButton.addEventListener("click", submitRequest);
  send.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("open")) closeDrawer();
  });

  document.addEventListener("visibilitychange", refreshEchoAnimations);
  reducedMotion.addEventListener("change", refreshEchoAnimations);

  window.addEventListener('sada-route-change',updateContext);
  // Keep keyboard focus inside the open drawer and restore it to the launcher.
  drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');
  drawer.inert = true;
  new MutationObserver(()=>{drawer.inert=!drawer.classList.contains('open');}).observe(drawer,{attributes:true,attributeFilter:['class']});
  drawer.addEventListener('keydown',event=>{
    if(event.key!=='Tab')return;
    const nodes=[...drawer.querySelectorAll('button,a[href],textarea,input')].filter(el=>!el.disabled&&el.getClientRects().length);
    const first=nodes[0],last=nodes[nodes.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  });
  send.innerHTML = sendArrow;
  updateContext();
})();

