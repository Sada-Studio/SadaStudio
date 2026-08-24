(() => {
  "use strict";

  const STORAGE_KEY = "sada-public-ai-conversation-v1";
  const API_BASE = "/api/sada-ai";

  let conversationId = "";
  let loaded = false;
  let sending = false;
  let submitted = false;

  try {
    conversationId =
      localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    conversationId = "";
  }

  const root = document.createElement("div");
  root.className = "sada-guide-root";

  root.innerHTML = [
    '<button class="sada-guide-launch" type="button" aria-label="Ask Sada">',
      '<span class="sada-guide-launch-mark">✦</span>',
      '<span>Ask Sada</span>',
    '</button>',

    '<div class="sada-guide-overlay" aria-hidden="true"></div>',

    '<aside class="sada-guide-drawer" aria-hidden="true" aria-label="Sada Guide">',
      '<div class="sada-guide-header">',
        '<div>',
          '<div class="sada-guide-kicker">SADA STUDIO</div>',
          '<div class="sada-guide-title">Ask Sada</div>',
        '</div>',
        '<button class="sada-guide-close" type="button" aria-label="Close">×</button>',
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
        '<textarea class="sada-guide-input" rows="1" maxlength="2500" placeholder="Ask about Sada, our work, or your project..."></textarea>',
        '<button class="sada-guide-send" type="button">Send</button>',
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

  function currentPage() {
    return {
      path: window.location.pathname,
      title: document.title
    };
  }

  function currentPageLabel() {
    const match = window.location.pathname.match(/^\/projects\/([^/]+)\/?$/i);

    if (match) {
      const heading = document.querySelector(".project-details-column h1");
      return heading && heading.textContent.trim()
        ? "Viewing: " + heading.textContent.trim()
        : "Viewing a Sada project";
    }

    if (document.querySelector(".work-page-main")) {
      return "Viewing: All Projects";
    }

    return "Viewing: Sada Studio";
  }

  function updateContext() {
    context.textContent = currentPageLabel();
  }

  function openDrawer() {
    drawer.classList.add("open");
    overlay.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("sada-guide-open");

    updateContext();

    if (!loaded) {
      loadConversation();
    }

    if (!isMobile()) {
      window.setTimeout(() => input.focus(), 80);
    }
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sada-guide-open");
    input.blur();
  }

  function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  function scrollMessages() {
    window.requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function renderEmptyState() {
    messages.innerHTML = "";

    const empty = document.createElement("div");
    empty.className = "sada-guide-empty";
    empty.innerHTML =
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
      button.textContent = label;
      button.addEventListener("click", () => {
        input.value = label;
        sendMessage();
      });
      prompts.appendChild(button);
    });

    empty.appendChild(prompts);
    messages.appendChild(empty);
  }

  function appendMessage(role, content) {
    const wrapper = document.createElement("div");
    wrapper.className = "sada-guide-message " + role;

    const label = document.createElement("div");
    label.className = "sada-guide-message-label";
    label.textContent = role === "user" ? "You" : "Sada";

    const bubble = document.createElement("div");
    bubble.className = "sada-guide-bubble";
    bubble.innerHTML = safeMarkdown(content);

    wrapper.appendChild(label);
    wrapper.appendChild(bubble);
    messages.appendChild(wrapper);
    scrollMessages();

    return wrapper;
  }

  function safeMarkdown(value) {
    let text = String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    text = text.replace(
      /\*\*([^*\n]+)\*\*/g,
      "<strong>$1</strong>"
    );

    text = text.replace(
      /(^|[^*])\*([^*\n]+)\*(?!\*)/g,
      "$1<em>$2</em>"
    );

    text = text.replace(/\n/g, "<br>");

    return text;
  }

  function appendProjects(projects) {
    if (!Array.isArray(projects) || !projects.length) {
      return;
    }

    const group = document.createElement("div");
    group.className = "sada-guide-projects";

    projects.slice(0, 4).forEach((project) => {
      if (!project || !project.url || !project.title) {
        return;
      }

      const card = document.createElement("a");
      card.className = "sada-guide-project-card";
      card.href = project.url;

      card.target = "_blank";
      card.rel = "noopener";

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

      body.appendChild(title);
      body.appendChild(description);
      card.appendChild(body);
      group.appendChild(card);
    });

    messages.appendChild(group);
    scrollMessages();
  }

  function appendSubmitPrompt() {
    if (submitted || messages.querySelector(".sada-guide-submit-prompt")) {
      return;
    }

    const box = document.createElement("div");
    box.className = "sada-guide-submit-prompt";

    const text = document.createElement("div");
    text.innerHTML =
      "<strong>Want Sada to review this?</strong><br>" +
      "You can send this conversation as a project request.";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Submit project request";
    button.addEventListener("click", showSubmitPanel);

    box.appendChild(text);
    box.appendChild(button);
    messages.appendChild(box);
    scrollMessages();
  }

  function showSubmitPanel() {
    if (submitted) {
      return;
    }

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

    if (!conversationId) {
      renderEmptyState();
      return;
    }

    try {
      const response = await fetch(
        API_BASE + "/conversation?id=" + encodeURIComponent(conversationId),
        {
          headers: {
            "Accept": "application/json"
          },
          cache: "no-store"
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok || !data.conversationId) {
        resetConversation();
        renderEmptyState();
        return;
      }

      submitted = data.submitted === true;
      messages.innerHTML = "";

      (data.messages || []).forEach((message) => {
        appendMessage(message.role, message.content);

        if (
          message.role === "assistant" &&
          Array.isArray(message.suggestedProjects) &&
          message.suggestedProjects.length
        ) {
          appendProjects(message.suggestedProjects);
        }
      });

      if (!(data.messages || []).length) {
        renderEmptyState();
      }
    } catch (error) {
      console.warn("Could not restore Sada conversation:", error);
      renderEmptyState();
    }
  }

  function resetConversation() {
    conversationId = "";
    submitted = false;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  }

  function setSending(value) {
    sending = Boolean(value);
    send.disabled = sending;
    input.disabled = sending;
    send.textContent = sending ? "..." : "Send";
  }

  async function sendMessage() {
    if (sending) {
      return;
    }

    const text = input.value.trim();

    if (!text) {
      return;
    }

    const empty = messages.querySelector(".sada-guide-empty");
    if (empty) {
      empty.remove();
    }

    appendMessage("user", text);
    input.value = "";
    input.style.height = "auto";
    hideSubmitPanel();
    setSending(true);

    const thinking = appendMessage("assistant", "Thinking…");
    thinking.classList.add("thinking");

    try {
      const response = await fetch(API_BASE + "/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversationId,
          message: text,
          page: currentPage()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Sada Guide could not answer.");
      }

      conversationId = data.conversationId || conversationId;

      if (conversationId) {
        try {
          localStorage.setItem(STORAGE_KEY, conversationId);
        } catch {
        }
      }

      thinking.remove();
      appendMessage("assistant", data.reply);
      appendProjects(data.suggestedProjects);

      if (data.suggestSubmit) {
        appendSubmitPrompt();
      }
    } catch (error) {
      thinking.remove();
      appendMessage(
        "assistant",
        "I couldn’t answer that just now. Please try again."
      );
      console.error(error);
    } finally {
      setSending(false);

      if (isMobile()) {
        input.blur();
      } else {
        input.focus();
      }
    }
  }

  async function submitRequest() {
    if (!conversationId || submitted) {
      return;
    }

    const values = {};

    root.querySelectorAll(".sada-guide-contact").forEach((field) => {
      values[field.dataset.field] = field.value.trim();
    });

    if (!values.email && !values.phone) {
      submitError.textContent =
        "Add an email address or phone / WhatsApp number.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Submitting…";
    submitError.textContent = "";

    try {
      const response = await fetch(API_BASE + "/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          conversationId,
          name: values.name,
          company: values.company,
          email: values.email,
          phone: values.phone
        })
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not submit the request.");
      }

      submitted = true;
      hideSubmitPanel();
      appendMessage("assistant", data.reply);

      root
        .querySelectorAll(".sada-guide-submit-prompt")
        .forEach((item) => item.remove());
    } catch (error) {
      submitError.textContent = error.message;
    } finally {
      submitButton.disabled = submitted;
      submitButton.textContent =
        submitted ? "Submitted" : "Submit request";
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
    input.style.height =
      Math.min(input.scrollHeight, 160) + "px";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drawer.classList.contains("open")) {
      closeDrawer();
    }
  });

  updateContext();
})();
