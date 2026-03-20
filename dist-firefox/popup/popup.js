// src/popup/popup.ts
var statusDot = document.getElementById("status-dot");
var statusText = document.getElementById("status-text");
var greeting = document.getElementById("greeting");
var setupPanel = document.getElementById("setup-panel");
var connectedPanel = document.getElementById("connected-panel");
var tabAllowed = document.getElementById("tab-allowed");
var tabBlocked = document.getElementById("tab-blocked");
var queueDepth = document.getElementById("queue-depth");
var btnPause = document.getElementById("btn-pause");
var btnSidepanel = document.getElementById("btn-sidepanel");
var btnDisconnect = document.getElementById("btn-disconnect");
var btnOauth = document.getElementById("btn-oauth");
var btnApikey = document.getElementById("btn-apikey");
var apikeyForm = document.getElementById("apikey-form");
var inputUrl = document.getElementById("input-url");
var inputKey = document.getElementById("input-key");
var btnConnect = document.getElementById("btn-connect");
var teachPrompt = document.getElementById("teach-prompt");
var teachDomain = document.getElementById("teach-domain");
var btnTeachYes = document.getElementById("btn-teach-yes");
var btnTeachNo = document.getElementById("btn-teach-no");
var currentState = null;
var pendingTeachDomain = null;
function sendRequest(request) {
  try {
    chrome.runtime.sendMessage(request).catch(() => {
    });
  } catch {
  }
}
function render(state) {
  currentState = state;
  const statusMap = {
    connected: { dot: "connected", text: "Connected" },
    connecting: { dot: "connecting", text: "Connecting..." },
    reconnecting: { dot: "connecting", text: "Reconnecting..." },
    disconnected: { dot: "disconnected", text: "Disconnected" }
  };
  const status = statusMap[state.connection] ?? statusMap["disconnected"];
  statusDot.className = `status-dot ${status.dot}`;
  statusText.textContent = status.text;
  const hour = (/* @__PURE__ */ new Date()).getHours();
  const tabCount = state.tabs.length;
  if (hour < 12) {
    greeting.textContent = `Good morning \u2014 OpenClaw is watching ${tabCount} tab${tabCount !== 1 ? "s" : ""}`;
  } else if (hour < 17) {
    greeting.textContent = `Good afternoon \u2014 ${tabCount} tab${tabCount !== 1 ? "s" : ""} in view`;
  } else if (hour < 22) {
    greeting.textContent = `Good evening \u2014 tracking ${tabCount} tab${tabCount !== 1 ? "s" : ""}`;
  } else {
    greeting.textContent = `Late night? OpenClaw has your back on ${tabCount} tab${tabCount !== 1 ? "s" : ""}`;
  }
  if (state.connection === "disconnected" && !state.auth) {
    setupPanel.style.display = "block";
    connectedPanel.style.display = "none";
  } else {
    setupPanel.style.display = "none";
    connectedPanel.style.display = "block";
  }
  const counts = { allowed: 0, blocked: 0 };
  for (const tab of state.tabs) {
    if (tab.classification.classification === "allowed") counts.allowed++;
    else counts.blocked++;
  }
  tabAllowed.textContent = String(counts.allowed);
  tabBlocked.textContent = String(counts.blocked);
  queueDepth.textContent = String(state.offlineQueueDepth);
  btnPause.textContent = state.isPaused ? "\u25B6 Resume" : "\u23F8 Pause";
}
btnPause.addEventListener("click", () => {
  sendRequest({ type: currentState?.isPaused ? "RESUME_STREAMING" : "PAUSE_STREAMING" });
});
btnSidepanel.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
btnDisconnect.addEventListener("click", () => {
  sendRequest({ type: "DISCONNECT" });
});
btnOauth.addEventListener("click", () => {
  sendRequest({ type: "START_AUTH", method: "oauth", instanceUrl: "https://app.openclawcloud.com" });
});
btnApikey.addEventListener("click", () => {
  apikeyForm.style.display = apikeyForm.style.display === "none" ? "block" : "none";
});
btnConnect.addEventListener("click", () => {
  const url = inputUrl.value.trim();
  const key = inputKey.value.trim();
  if (url && key) {
    sendRequest({ type: "START_AUTH", method: "api_key", instanceUrl: url, apiKey: key });
  }
});
btnTeachYes.addEventListener("click", () => {
  if (pendingTeachDomain) {
    sendRequest({ type: "TEACH_DOMAIN", domain: pendingTeachDomain, isWorkTool: true });
    teachPrompt.style.display = "none";
    pendingTeachDomain = null;
  }
});
btnTeachNo.addEventListener("click", () => {
  if (pendingTeachDomain) {
    sendRequest({ type: "TEACH_DOMAIN", domain: pendingTeachDomain, isWorkTool: false });
    teachPrompt.style.display = "none";
    pendingTeachDomain = null;
  }
});
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case "STATE_UPDATE":
      render(message.state);
      break;
    case "CLASSIFICATION_PROMPT":
      pendingTeachDomain = message.domain;
      teachDomain.textContent = message.domain;
      teachPrompt.style.display = "block";
      break;
    case "NOTIFICATION":
      greeting.textContent = `${message.title}: ${message.body}`;
      break;
  }
});
try {
  chrome.runtime.sendMessage({ type: "GET_STATE" }, (response) => {
    if (response && typeof response === "object" && "connection" in response) {
      render(response);
    }
  });
} catch {
}
//# sourceMappingURL=popup.js.map
