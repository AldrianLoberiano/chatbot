// ========================================
//  CHAT PAGE — JavaScript
// ========================================

const API = "";
let currentChatId = null;
let isStreaming = false;
let currentUser = null;

// DOM Elements
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const chatList = document.getElementById("chatList");
const chatMessages = document.getElementById("chatMessages");
const chatTitle = document.getElementById("chatTitle");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");

const menuBtn = document.getElementById("menuBtn");
const welcomeScreen = document.getElementById("welcomeScreen");
const userAvatar = document.getElementById("userAvatar");
const userName = document.getElementById("userName");
const searchChats = document.getElementById("searchChats");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const iconMoon = document.getElementById("iconMoon");
const iconSun = document.getElementById("iconSun");
const voiceBtn = document.getElementById("voiceBtn");

// ======== INIT ========
(async function init() {
    // Load theme
    loadTheme();

    try {
        const res = await fetch(`${API}/api/auth/me`);
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            userName.textContent = currentUser.username;
            userAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
        }
    } catch (e) { /* guest session created on first API call */ }

    await loadChatHistory();
})();

// ======== THEME TOGGLE ========
function loadTheme() {
    const theme = localStorage.getItem("chatbot-theme") || "dark";
    if (theme === "light") {
        document.body.classList.add("light");
        iconMoon.style.display = "none";
        iconSun.style.display = "block";
    } else {
        document.body.classList.remove("light");
        iconMoon.style.display = "block";
        iconSun.style.display = "none";
    }
}

themeToggleBtn.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem("chatbot-theme", isLight ? "light" : "dark");
    iconMoon.style.display = isLight ? "none" : "block";
    iconSun.style.display = isLight ? "block" : "none";
});

// ======== VOICE COMMAND ========
let recognition = null;
let isRecording = false;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        isRecording = true;
        voiceBtn.classList.add("recording");
        voiceBtn.title = "Listening...";
    };

    recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
        }
        messageInput.value = transcript;
        sendBtn.disabled = !transcript.trim();
        autoResizeTextarea();
    };

    recognition.onend = () => {
        isRecording = false;
        voiceBtn.classList.remove("recording");
        voiceBtn.title = "Voice input";

        // Auto-send if we got text
        if (messageInput.value.trim()) {
            sendMessage();
        }
    };

    recognition.onerror = (event) => {
        isRecording = false;
        voiceBtn.classList.remove("recording");
        voiceBtn.title = "Voice input";
        if (event.error !== "no-speech" && event.error !== "network") {
            console.error("Speech recognition error:", event.error);
        }
    };
} else {
    // Browser doesn't support speech recognition
    voiceBtn.style.display = "none";
}

voiceBtn.addEventListener("click", () => {
    if (!recognition) return;

    if (isRecording) {
        recognition.stop();
    } else {
        messageInput.value = "";
        recognition.start();
    }
});


// ======== SIDEBAR ========
menuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    sidebarOverlay.classList.toggle("show");
});

sidebarOverlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
});

// ======== CHAT HISTORY ========
async function loadChatHistory() {
    try {
        const res = await fetch(`${API}/api/chat/history`);
        const data = await res.json();
        renderChatList(data.chats);
    } catch (e) {
        console.error("Failed to load chat history:", e);
    }
}

function renderChatList(chats) {
    if (!chats || chats.length === 0) {
        chatList.innerHTML = `<div class="sidebar-empty">
      <p>No conversations yet.</p>
      <p style="margin-top:4px;">Start a new chat!</p>
    </div>`;
        return;
    }

    chatList.innerHTML = chats
        .map(
            (chat) => `
    <div class="chat-item ${chat.id === currentChatId ? "active" : ""}" data-id="${chat.id}">
      <div class="chat-item-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      </div>
      <div class="chat-item-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</div>
      <button class="chat-item-delete" data-id="${chat.id}" title="Delete">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
      </button>
    </div>
  `
        )
        .join("");

    chatList.querySelectorAll(".chat-item").forEach((el) => {
        el.addEventListener("click", (e) => {
            if (e.target.closest(".chat-item-delete")) return;
            loadChat(el.dataset.id);
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("show");
        });
    });

    chatList.querySelectorAll(".chat-item-delete").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteChat(btn.dataset.id);
        });
    });
}

searchChats.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    chatList.querySelectorAll(".chat-item").forEach((el) => {
        const title = el.querySelector(".chat-item-title").textContent.toLowerCase();
        el.style.display = title.includes(query) ? "flex" : "none";
    });
});

// ======== LOAD CHAT ========
async function loadChat(chatId) {
    currentChatId = chatId;
    try {
        const res = await fetch(`${API}/api/chat/${chatId}`);
        const data = await res.json();
        renderMessages(data.chat.messages);
        highlightActiveChat();
    } catch (e) {
        console.error("Failed to load chat:", e);
    }
}

function renderMessages(messages) {
    if (!messages || messages.length === 0) {
        chatMessages.innerHTML = "";
        chatMessages.appendChild(createWelcomeScreen());
        return;
    }

    const ws = chatMessages.querySelector(".welcome-screen");
    if (ws) ws.style.display = "none";

    chatMessages.innerHTML = "";
    messages.forEach((msg) => appendMessage(msg.role, msg.content));
    scrollToBottom();
}

function createWelcomeScreen() {
    const ws = welcomeScreen.cloneNode(true);
    ws.style.display = "flex";
    ws.querySelectorAll(".suggestion-card").forEach((card) => {
        card.addEventListener("click", () => {
            messageInput.value = card.dataset.prompt;
            sendMessage();
        });
    });
    return ws;
}

function highlightActiveChat() {
    chatList.querySelectorAll(".chat-item").forEach((el) => {
        el.classList.toggle("active", el.dataset.id === currentChatId);
    });
}

// ======== NEW CHAT ========
newChatBtn.addEventListener("click", createNewChat);

async function createNewChat() {
    try {
        const res = await fetch(`${API}/api/chat/new`, { method: "POST" });
        const data = await res.json();
        currentChatId = data.chat.id;
        chatMessages.innerHTML = "";
        chatMessages.appendChild(createWelcomeScreen());
        await loadChatHistory();
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
    } catch (e) {
        console.error("Failed to create new chat:", e);
    }
}

// ======== DELETE CHAT ========
async function deleteChat(chatId) {
    if (!confirm("Delete this conversation?")) return;
    try {
        await fetch(`${API}/api/chat/${chatId}`, { method: "DELETE" });
        if (currentChatId === chatId) {
            currentChatId = null;
            chatMessages.innerHTML = "";
            chatMessages.appendChild(createWelcomeScreen());
        }
        await loadChatHistory();
    } catch (e) {
        console.error("Failed to delete chat:", e);
    }
}

// ======== SEND MESSAGE ========
messageInput.addEventListener("input", () => {
    sendBtn.disabled = !messageInput.value.trim() || isStreaming;
    autoResizeTextarea();
});

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendMessage();
    }
});

sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isStreaming) return;

    if (!currentChatId) {
        await createNewChat();
    }

    const ws = chatMessages.querySelector(".welcome-screen");
    if (ws) ws.remove();

    appendMessage("user", text);
    messageInput.value = "";
    autoResizeTextarea();
    sendBtn.disabled = true;
    isStreaming = true;

    const typingEl = appendTypingIndicator();
    scrollToBottom();

    try {
        const res = await fetch(`${API}/api/chat/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chatId: currentChatId, message: text }),
        });

        const data = await res.json();
        typingEl.remove();

        if (res.ok) {
            appendMessage("bot", data.response);
            if (data.title) {
                await loadChatHistory();
            }
        } else {
            appendMessage("error", data.error || "Failed to get a response.");
        }
    } catch (err) {
        typingEl.remove();
        appendMessage("error", "Network error. Please check your connection and try again.");
    } finally {
        isStreaming = false;
        sendBtn.disabled = !messageInput.value.trim();
    }

    scrollToBottom();
}

function appendMessage(role, content) {
    const isError = role === "error";
    const isBot = isError || role === "bot" || role === "model" || role === "assistant";
    const div = document.createElement("div");
    div.className = `message ${isError ? "error bot" : (isBot ? "bot" : "user")}`;
    const displayContent = isError
        ? escapeHtml(content).replace(
            /(https?:\/\/[\w.\-/?=&%#+:@]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
          )
        : (isBot ? renderMarkdown(content) : escapeHtml(content));
    div.innerHTML = `
    <div class="message-wrapper">
      <div class="message-avatar">${isBot ? "AI" : "U"}</div>
      <div class="message-content">
        <div class="message-role">${isBot ? "Assistant" : "You"}</div>
        <div class="message-text">${displayContent}</div>
        ${!isError ? `<div class="message-actions">
          <button class="msg-action-btn copy-msg-btn" title="Copy message">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy
          </button>
        </div>` : ""}
      </div>
    </div>
  `;
    const msgText = div.querySelector(".message-text");
    if (isBot && !isError) addCodeCopyButtons(msgText);
    const copyBtn = div.querySelector(".copy-msg-btn");
    if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
            await copyToClipboard(content);
            showToast("Copied to clipboard");
            copyBtn.classList.add("copied");
            copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
            setTimeout(() => {
                copyBtn.classList.remove("copied");
                copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
            }, 2000);
        });
    }
    chatMessages.appendChild(div);
    scrollToBottom();
}

function appendTypingIndicator() {
    const div = document.createElement("div");
    div.className = "message bot";
    div.innerHTML = `
    <div class="message-wrapper">
      <div class="message-avatar">AI</div>
      <div class="message-content">
        <div class="message-role">Assistant</div>
        <div class="typing-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      </div>
    </div>
  `;
    chatMessages.appendChild(div);
    return div;
}

// ======== HELPERS ========
function renderMarkdown(text) {
    if (typeof marked !== "undefined") {
        return marked.parse(text);
    }
    return escapeHtml(text).replace(/\n/g, "<br>");
}

function addCodeCopyButtons(container) {
    container.querySelectorAll("pre").forEach((pre) => {
        if (pre.querySelector(".code-block-header")) return;
        const code = pre.querySelector("code");
        if (!code) return;
        const langClass = [...(code.classList || [])].find((c) => c.startsWith("language-"));
        const lang = langClass ? langClass.replace("language-", "") : "code";
        const header = document.createElement("div");
        header.className = "code-block-header";
        header.innerHTML = `
            <span class="code-block-lang">${escapeHtml(lang)}</span>
            <button class="code-copy-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                Copy
            </button>`;
        header.querySelector(".code-copy-btn").addEventListener("click", async () => {
            const btn = header.querySelector(".code-copy-btn");
            await copyToClipboard(code.textContent || "");
            btn.classList.add("copied");
            btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
            setTimeout(() => {
                btn.classList.remove("copied");
                btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy`;
            }, 2000);
        });
        pre.insertBefore(header, code);
    });
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;top:-999px;left:-999px;";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
    }
}

function showToast(msg, duration = 2000) {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function autoResizeTextarea() {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 140) + "px";
}

// Suggestion cards
document.querySelectorAll(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
        messageInput.value = card.dataset.prompt;
        sendMessage();
    });
});
