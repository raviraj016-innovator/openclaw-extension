/**
 * Slack site-specific extractor.
 *
 * Extracts structured data from Slack workspace:
 * - Current channel name and topic
 * - Recent visible messages (last 10)
 * - Thread context if in a thread
 */

import type { SiteExtractor, SiteData } from '../../shared/types.js';

const SlackExtractor: SiteExtractor = {
  name: 'slack',
  priority: 10,

  matches(url: URL): boolean {
    return url.hostname === 'app.slack.com' || url.hostname === 'slack.com';
  },

  extract(doc: Document): SiteData | null {
    // Channel name
    const channelName = doc.querySelector('[data-qa="channel_name"]')?.textContent?.trim()
      ?? doc.querySelector('.p-channel_sidebar__name--overflow')?.textContent?.trim()
      ?? '';

    if (!channelName) return null;

    // Channel topic
    const topic = doc.querySelector('[data-qa="channel_topic_text"]')?.textContent?.trim() ?? '';

    // Workspace name
    const workspace = doc.querySelector('[data-qa="team-name"]')?.textContent?.trim()
      ?? doc.querySelector('.p-ia__sidebar_header__team_name')?.textContent?.trim()
      ?? '';

    // Recent messages (last 10 visible)
    const messageElements = doc.querySelectorAll('[data-qa="virtual-list-item"]');
    const messages: Array<{ author: string; text: string; time: string }> = [];

    const visibleMessages = Array.from(messageElements).slice(-10);
    for (const msgEl of visibleMessages) {
      const author = msgEl.querySelector('[data-qa="message_sender_name"]')?.textContent?.trim() ?? '';
      const text = msgEl.querySelector('[data-qa="message-text"]')?.textContent?.trim() ?? '';
      const time = msgEl.querySelector('[data-qa="message_time"]')?.textContent?.trim() ?? '';

      if (text) {
        messages.push({ author, text: text.slice(0, 500), time });
      }
    }

    // Thread detection
    const isThread = doc.querySelector('[data-qa="thread_messages"]') !== null;

    return {
      siteName: 'Slack',
      entityType: 'channel',
      data: {
        workspace,
        channelName,
        topic,
        messages,
        isThread,
        messageCount: messages.length,
        url: location.href,
      },
    };
  },
};

export default SlackExtractor;
