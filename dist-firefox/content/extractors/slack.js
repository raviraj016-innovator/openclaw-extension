"use strict";
(() => {
  // src/content/extractors/slack.ts
  var SlackExtractor = {
    name: "slack",
    priority: 10,
    matches(url) {
      return url.hostname === "app.slack.com" || url.hostname === "slack.com";
    },
    extract(doc) {
      const channelName = doc.querySelector('[data-qa="channel_name"]')?.textContent?.trim() ?? doc.querySelector(".p-channel_sidebar__name--overflow")?.textContent?.trim() ?? "";
      if (!channelName) return null;
      const topic = doc.querySelector('[data-qa="channel_topic_text"]')?.textContent?.trim() ?? "";
      const workspace = doc.querySelector('[data-qa="team-name"]')?.textContent?.trim() ?? doc.querySelector(".p-ia__sidebar_header__team_name")?.textContent?.trim() ?? "";
      const messageElements = doc.querySelectorAll('[data-qa="virtual-list-item"]');
      const messages = [];
      const visibleMessages = Array.from(messageElements).slice(-10);
      for (const msgEl of visibleMessages) {
        const author = msgEl.querySelector('[data-qa="message_sender_name"]')?.textContent?.trim() ?? "";
        const text = msgEl.querySelector('[data-qa="message-text"]')?.textContent?.trim() ?? "";
        const time = msgEl.querySelector('[data-qa="message_time"]')?.textContent?.trim() ?? "";
        if (text) {
          messages.push({ author, text: text.slice(0, 500), time });
        }
      }
      const isThread = doc.querySelector('[data-qa="thread_messages"]') !== null;
      return {
        siteName: "Slack",
        entityType: "channel",
        data: {
          workspace,
          channelName,
          topic,
          messages,
          isThread,
          messageCount: messages.length,
          url: location.href
        }
      };
    }
  };
  var slack_default = SlackExtractor;
})();
//# sourceMappingURL=slack.js.map
