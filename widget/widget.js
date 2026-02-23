/*!
 * ChatBot Builder Widget v1.0.0
 * Production-ready embeddable chat widget
 * (c) 2024 ChatBot Builder SaaS
 */
(function (window, document) {
  'use strict';

  // Prevent double initialization
  if (window.__ChatBotWidgetLoaded) return;
  window.__ChatBotWidgetLoaded = true;

  const CONFIG = window.ChatBotConfig || {};
  const CHATBOT_ID = CONFIG.chatbotId;
  const API_URL = CONFIG.apiUrl || 'https://api.yourdomain.com';

  if (!CHATBOT_ID) {
    console.error('[ChatBot Widget] Missing chatbotId in ChatBotConfig');
    return;
  }

  // ─── STATE ──────────────────────────────────────────────────────────────────
  const state = {
    isOpen: false,
    isLoading: false,
    messages: [],
    sessionId: null,
    config: null,
    leadCaptured: false,
    showLeadForm: false,
  };

  // Get or create session ID (persisted in sessionStorage)
  function getSessionId() {
    if (state.sessionId) return state.sessionId;
    let sid = sessionStorage.getItem('cbs_session_' + CHATBOT_ID);
    if (!sid) {
      sid = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('cbs_session_' + CHATBOT_ID, sid);
    }
    state.sessionId = sid;
    return sid;
  }

  // ─── STYLES ─────────────────────────────────────────────────────────────────
  function injectStyles(cfg) {
    const primary = cfg.primaryColor || '#6366f1';
    const position = cfg.position || 'bottom-right';
    const isRight = position === 'bottom-right';

    const css = `
      #cbs-widget-container * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #cbs-widget-container { position: fixed; ${isRight ? 'right: 20px' : 'left: 20px'}; bottom: 20px; z-index: 2147483647; display: flex; flex-direction: column; align-items: ${isRight ? 'flex-end' : 'flex-start'}; }
      #cbs-chat-window { width: 380px; height: 560px; background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: flex; flex-direction: column; overflow: hidden; margin-bottom: 12px; transform-origin: bottom ${isRight ? 'right' : 'left'}; animation: cbs-slide-up 0.25s ease; }
      #cbs-chat-window.cbs-hidden { display: none; }
      @keyframes cbs-slide-up { from { opacity:0; transform: scale(0.9) translateY(10px); } to { opacity:1; transform: scale(1) translateY(0); } }
      #cbs-header { background: ${primary}; padding: 16px; display: flex; align-items: center; gap: 10px; color: #fff; flex-shrink: 0; }
      #cbs-header-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; overflow: hidden; }
      #cbs-header-avatar img { width: 100%; height: 100%; object-fit: cover; }
      #cbs-header-title { font-size: 16px; font-weight: 600; flex: 1; }
      #cbs-header-status { font-size: 12px; opacity: 0.85; }
      #cbs-close-btn { background: none; border: none; cursor: pointer; color: #fff; opacity: 0.8; padding: 4px; border-radius: 4px; font-size: 20px; line-height: 1; display: flex; }
      #cbs-close-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
      #cbs-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
      #cbs-messages::-webkit-scrollbar { width: 4px; }
      #cbs-messages::-webkit-scrollbar-track { background: transparent; }
      #cbs-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 2px; }
      .cbs-msg { display: flex; gap: 8px; max-width: 85%; }
      .cbs-msg.cbs-user { align-self: flex-end; flex-direction: row-reverse; }
      .cbs-msg.cbs-bot { align-self: flex-start; }
      .cbs-msg-bubble { padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-break: break-word; }
      .cbs-user .cbs-msg-bubble { background: ${primary}; color: #fff; border-bottom-right-radius: 4px; }
      .cbs-bot .cbs-msg-bubble { background: #f3f4f6; color: #111; border-bottom-left-radius: 4px; }
      .cbs-msg-time { font-size: 11px; color: #9ca3af; margin-top: 4px; text-align: right; }
      .cbs-typing { display: flex; gap: 4px; padding: 12px 14px; background: #f3f4f6; border-radius: 16px; border-bottom-left-radius: 4px; align-self: flex-start; }
      .cbs-typing span { width: 8px; height: 8px; background: #9ca3af; border-radius: 50%; animation: cbs-bounce 1.2s infinite; }
      .cbs-typing span:nth-child(2) { animation-delay: 0.2s; }
      .cbs-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes cbs-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
      #cbs-input-area { padding: 12px 16px; border-top: 1px solid #f0f0f0; background: #fff; flex-shrink: 0; }
      #cbs-input-form { display: flex; gap: 8px; align-items: flex-end; }
      #cbs-input { flex: 1; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 10px 14px; font-size: 14px; outline: none; resize: none; max-height: 100px; min-height: 42px; line-height: 1.5; transition: border-color 0.2s; font-family: inherit; }
      #cbs-input:focus { border-color: ${primary}; }
      #cbs-send-btn { width: 42px; height: 42px; background: ${primary}; border: none; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; transition: opacity 0.2s; }
      #cbs-send-btn:hover { opacity: 0.9; }
      #cbs-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      #cbs-branding { text-align: center; font-size: 11px; color: #9ca3af; padding: 6px 0 2px; }
      #cbs-branding a { color: #9ca3af; text-decoration: none; }
      #cbs-lead-form { padding: 16px; border-top: 1px solid #f0f0f0; background: #fafafa; }
      #cbs-lead-form h4 { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: #374151; }
      .cbs-field { margin-bottom: 10px; }
      .cbs-field label { display: block; font-size: 12px; font-weight: 500; color: #6b7280; margin-bottom: 4px; }
      .cbs-field input { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; font-family: inherit; transition: border-color 0.2s; }
      .cbs-field input:focus { border-color: ${primary}; }
      #cbs-lead-submit { width: 100%; background: ${primary}; color: #fff; border: none; border-radius: 8px; padding: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
      #cbs-lead-submit:hover { opacity: 0.9; }
      #cbs-toggle-btn { width: 56px; height: 56px; background: ${primary}; border: none; border-radius: 50%; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; position: relative; }
      #cbs-toggle-btn:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(0,0,0,0.25); }
      #cbs-unread-badge { position: absolute; top: -2px; right: -2px; width: 20px; height: 20px; background: #ef4444; border-radius: 50%; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; color: #fff; display: none; }
      @media (max-width: 420px) { #cbs-chat-window { width: calc(100vw - 20px); height: calc(100vh - 80px); border-radius: 12px; } }
    `;

    const style = document.createElement('style');
    style.id = 'cbs-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── DOM BUILDER ─────────────────────────────────────────────────────────────
  function buildWidget(cfg) {
    const container = document.createElement('div');
    container.id = 'cbs-widget-container';

    const chatWindow = document.createElement('div');
    chatWindow.id = 'cbs-chat-window';
    chatWindow.className = 'cbs-hidden';
    chatWindow.setAttribute('role', 'dialog');
    chatWindow.setAttribute('aria-label', 'Chat window');

    // Header
    const avatarHtml = cfg.avatar
      ? `<img src="${escHtml(cfg.avatar)}" alt="Bot">`
      : '🤖';
    chatWindow.innerHTML = `
      <div id="cbs-header">
        <div id="cbs-header-avatar">${avatarHtml}</div>
        <div>
          <div id="cbs-header-title">${escHtml(cfg.headerTitle || 'Chat Support')}</div>
          <div id="cbs-header-status">Online</div>
        </div>
        <button id="cbs-close-btn" aria-label="Close chat">✕</button>
      </div>
      <div id="cbs-messages" role="log" aria-live="polite"></div>
      <div id="cbs-input-area">
        <form id="cbs-input-form">
          <textarea id="cbs-input" placeholder="${escHtml(cfg.placeholder || 'Type a message...')}" rows="1" aria-label="Message input"></textarea>
          <button type="submit" id="cbs-send-btn" aria-label="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
      ${cfg.showBranding !== false ? '<div id="cbs-branding">Powered by <a href="https://chatbotbuilder.app" target="_blank" rel="noopener">ChatBot Builder</a></div>' : ''}
    `;

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'cbs-toggle-btn';
    toggleBtn.setAttribute('aria-label', 'Open chat');
    toggleBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span id="cbs-unread-badge">1</span>
    `;

    container.appendChild(chatWindow);
    container.appendChild(toggleBtn);
    document.body.appendChild(container);

    return { container, chatWindow, toggleBtn };
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function addMessage(role, content) {
    const messagesEl = document.getElementById('cbs-messages');
    if (!messagesEl) return;

    const now = new Date();
    const msgEl = document.createElement('div');
    msgEl.className = `cbs-msg ${role === 'user' ? 'cbs-user' : 'cbs-bot'}`;

    // Parse markdown-like formatting
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');

    msgEl.innerHTML = `
      <div>
        <div class="cbs-msg-bubble">${formatted}</div>
        <div class="cbs-msg-time">${formatTime(now)}</div>
      </div>
    `;

    messagesEl.appendChild(msgEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    state.messages.push({ role, content, time: now.toISOString() });

    return msgEl;
  }

  function showTyping() {
    const messagesEl = document.getElementById('cbs-messages');
    if (!messagesEl) return null;
    const el = document.createElement('div');
    el.id = 'cbs-typing-indicator';
    el.className = 'cbs-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function hideTyping() {
    const el = document.getElementById('cbs-typing-indicator');
    if (el) el.remove();
  }

  // ─── LEAD CAPTURE FORM ───────────────────────────────────────────────────────
  function showLeadForm(fields) {
    if (state.leadCaptured || state.showLeadForm) return;
    state.showLeadForm = true;

    const inputArea = document.getElementById('cbs-input-area');
    if (!inputArea) return;

    const formEl = document.createElement('div');
    formEl.id = 'cbs-lead-form';

    const fieldsHtml = fields
      .map(
        (f) => `
        <div class="cbs-field">
          <label>${escHtml(f.label)}${f.required ? ' *' : ''}</label>
          <input type="${f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}" 
                 name="${escHtml(f.name)}" 
                 ${f.required ? 'required' : ''}
                 placeholder="${escHtml(f.label)}">
        </div>
      `
      )
      .join('');

    formEl.innerHTML = `
      <h4>Before we continue</h4>
      ${fieldsHtml}
      <button id="cbs-lead-submit">Continue Chat</button>
    `;

    inputArea.before(formEl);

    document.getElementById('cbs-lead-submit')?.addEventListener('click', async () => {
      const data = {};
      let valid = true;

      fields.forEach((f) => {
        const input = formEl.querySelector(`[name="${f.name}"]`);
        if (f.required && !input?.value.trim()) {
          valid = false;
          input?.style.setProperty('border-color', '#ef4444');
        } else if (input) {
          data[f.name] = input.value.trim();
        }
      });

      if (!valid) return;

      try {
        await fetch(`${API_URL}/api/chat/${CHATBOT_ID}/lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: getSessionId(), data }),
        });
      } catch (e) { /* fail silently */ }

      state.leadCaptured = true;
      state.showLeadForm = false;
      formEl.remove();
    });
  }

  // ─── API CALLS ────────────────────────────────────────────────────────────────
  async function loadConfig() {
    const response = await fetch(`${API_URL}/api/chat/${CHATBOT_ID}/config`);
    if (!response.ok) throw new Error('Failed to load chatbot config');
    const { data } = await response.json();
    return data;
  }

  async function sendMessage(message) {
    const response = await fetch(`${API_URL}/api/chat/${CHATBOT_ID}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': getSessionId(),
      },
      body: JSON.stringify({
        message,
        sessionId: getSessionId(),
        metadata: {
          pageUrl: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to send message');
    }

    const { data } = await response.json();
    return data;
  }

  // ─── EVENT HANDLERS ──────────────────────────────────────────────────────────
  function setupEventHandlers(cfg) {
    const toggleBtn = document.getElementById('cbs-toggle-btn');
    const closeBtn = document.getElementById('cbs-close-btn');
    const form = document.getElementById('cbs-input-form');
    const input = document.getElementById('cbs-input');
    const chatWindow = document.getElementById('cbs-chat-window');
    const badge = document.getElementById('cbs-unread-badge');

    toggleBtn?.addEventListener('click', () => {
      state.isOpen = !state.isOpen;
      if (state.isOpen) {
        chatWindow?.classList.remove('cbs-hidden');
        badge && (badge.style.display = 'none');
        input?.focus();
        toggleBtn.setAttribute('aria-label', 'Close chat');
      } else {
        chatWindow?.classList.add('cbs-hidden');
        toggleBtn.setAttribute('aria-label', 'Open chat');
      }
    });

    closeBtn?.addEventListener('click', () => {
      chatWindow?.classList.add('cbs-hidden');
      state.isOpen = false;
    });

    // Auto-grow textarea
    input?.addEventListener('input', () => {
      if (!input) return;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Submit on Enter (Shift+Enter for newline)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form?.dispatchEvent(new Event('submit'));
      }
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const sendBtn = document.getElementById('cbs-send-btn');
      const userInput = input?.value.trim();
      if (!userInput || state.isLoading) return;

      // Check lead capture (show form after 3rd message if not captured)
      if (
        cfg.leadCaptureEnabled &&
        !state.leadCaptured &&
        state.messages.filter((m) => m.role === 'user').length >= 2
      ) {
        showLeadForm(cfg.leadCaptureFields || []);
        if (state.showLeadForm) return; // Block until form submitted
      }

      if (input) input.value = '';
      if (input) input.style.height = 'auto';
      addMessage('user', userInput);

      state.isLoading = true;
      if (sendBtn) sendBtn.disabled = true;

      const typing = showTyping();

      try {
        const result = await sendMessage(userInput);
        hideTyping();
        addMessage('bot', result.message);

        // Show unread badge if window is closed
        if (!state.isOpen && badge) {
          badge.style.display = 'flex';
        }
      } catch (err) {
        hideTyping();
        addMessage('bot', 'Sorry, I encountered an error. Please try again.');
        console.error('[ChatBot Widget]', err);
      } finally {
        state.isLoading = false;
        if (sendBtn) sendBtn.disabled = false;
        input?.focus();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) {
        chatWindow?.classList.add('cbs-hidden');
        state.isOpen = false;
      }
    });
  }

  // ─── INIT ─────────────────────────────────────────────────────────────────────
  async function init() {
    try {
      const cfg = await loadConfig();
      const widgetCfg = cfg.widgetConfig || {};
      Object.assign(state, { config: cfg });

      // Inject styles
      injectStyles(widgetCfg);

      // Build DOM
      buildWidget(widgetCfg);

      // Setup events
      setupEventHandlers({ ...cfg, ...widgetCfg });

      // Show welcome message
      if (widgetCfg.welcomeMessage) {
        addMessage('bot', widgetCfg.welcomeMessage);
      }

      // Show unread badge to draw attention
      const badge = document.getElementById('cbs-unread-badge');
      if (badge && widgetCfg.welcomeMessage) {
        badge.style.display = 'flex';
      }
    } catch (err) {
      console.error('[ChatBot Widget] Failed to initialize:', err);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
