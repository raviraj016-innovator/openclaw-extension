// src/sidepanel/sidepanel.ts
var statusEl = document.getElementById("sp-status");
var messagesEl = document.getElementById("chat-messages");
var inputEl = document.getElementById("chat-input");
var sendBtn = document.getElementById("btn-send");
var suggestionBanner = document.getElementById("suggestion-banner");
var suggestionTitle = document.getElementById("suggestion-title");
var suggestionBody = document.getElementById("suggestion-body");
var suggestionActions = document.getElementById("suggestion-actions");
var conversationId = null;
var messages = [];
function sendRequest(request) {
  try {
    chrome.runtime.sendMessage(request).catch(() => {
    });
  } catch {
  }
}
function addMessage(msg) {
  messages.push(msg);
  const empty = messagesEl.querySelector(".chat-empty");
  if (empty) empty.remove();
  const el = document.createElement("div");
  el.className = `chat-msg ${msg.role}`;
  el.textContent = msg.text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
function showSuggestion(suggestion) {
  suggestionTitle.textContent = suggestion.title;
  suggestionBody.textContent = suggestion.body;
  suggestionActions.innerHTML = "";
  for (const action of suggestion.actions) {
    const btn = document.createElement("button");
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      if (action.url) {
        chrome.tabs.create({ url: action.url });
      }
      suggestionBanner.style.display = "none";
    });
    suggestionActions.appendChild(btn);
  }
  suggestionBanner.style.display = "block";
}
function updateStatus(state) {
  const statusMap = {
    connected: "\u{1F7E2} Connected",
    connecting: "\u{1F7E1} Connecting...",
    reconnecting: "\u{1F7E1} Reconnecting...",
    disconnected: "\u26AB Disconnected"
  };
  statusEl.textContent = statusMap[state.connection] ?? "Unknown";
}
function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  const userMsg = {
    id: crypto.randomUUID(),
    conversationId: conversationId ?? "",
    role: "user",
    text,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  addMessage(userMsg);
  if (!conversationId) {
    conversationId = crypto.randomUUID();
  }
  sendRequest({
    type: "SEND_CHAT",
    text,
    conversationId
  });
  inputEl.value = "";
  inputEl.style.height = "auto";
}
sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
});
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case "STATE_UPDATE":
      updateStatus(message.state);
      break;
    case "CHAT_RESPONSE":
      addMessage(message.message);
      break;
    case "SUGGESTION":
      showSuggestion(message.suggestion);
      break;
  }
});
try {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response && typeof response === "object" && "connection" in response) {
      updateStatus(response);
    }
  });
} catch {
}
//# sourceMappingURL=sidepanel.js.map
