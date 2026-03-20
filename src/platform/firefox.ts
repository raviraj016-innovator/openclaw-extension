import browser from 'webextension-polyfill';
import type { Platform, PlatformStorage } from './platform.js';
import { ok, err, type Result } from '../shared/result.js';

/** Firefox uses in-memory storage for session-scoped data (event page is persistent) */
class FirefoxSessionStorage implements PlatformStorage {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}

class FirefoxPersistentStorage implements PlatformStorage {
  async get<T>(key: string): Promise<T | null> {
    const result = await browser.storage.local.get(key);
    return (result[key] as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await browser.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await browser.storage.local.remove(key);
  }
}

export class FirefoxPlatform implements Platform {
  readonly name = 'firefox' as const;
  readonly isEphemeral = false;
  readonly sessionStorage = new FirefoxSessionStorage();
  readonly persistentStorage = new FirefoxPersistentStorage();

  onWake(_callback: () => void): void {
    // Firefox event pages are persistent — no wake event needed.
    // No-op.
  }

  async setBadge(text: string, color: string): Promise<void> {
    await browser.browserAction.setBadgeText({ text });
    await browser.browserAction.setBadgeBackgroundColor({ color });
  }

  async openSidePanel(_tabId: number): Promise<Result<void, Error>> {
    // Firefox sidebars are toggled globally, not per-tab
    try {
      await browser.sidebarAction.open();
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async getActiveTab(): Promise<Result<{ tabId: number; url: string; title: string }, Error>> {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        return err(new Error('No active tab found'));
      }
      return ok({ tabId: tab.id, url: tab.url, title: tab.title ?? '' });
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async sendToTab(tabId: number, message: unknown): Promise<Result<unknown, Error>> {
    try {
      const response = await browser.tabs.sendMessage(tabId, message);
      return ok(response);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  onMessage(
    callback: (
      message: unknown,
      sender: { tabId?: number },
      sendResponse: (response: unknown) => void,
    ) => void,
  ): void {
    browser.runtime.onMessage.addListener((message: unknown, sender: browser.Runtime.MessageSender) => {
      return new Promise((resolve) => {
        callback(message, { tabId: sender.tab?.id }, resolve);
      });
    });
  }

  createContextMenu(options: { id: string; title: string; contexts: string[] }): void {
    browser.contextMenus.create({
      id: options.id,
      title: options.title,
      contexts: options.contexts as browser.Menus.ContextType[],
    });
  }

  onContextMenuClick(
    callback: (
      info: { menuItemId: string; selectionText?: string; linkUrl?: string; pageUrl?: string },
      tabId?: number,
    ) => void,
  ): void {
    browser.contextMenus.onClicked.addListener((info, tab) => {
      callback(
        {
          menuItemId: String(info.menuItemId),
          selectionText: info.selectionText,
          linkUrl: info.linkUrl,
          pageUrl: info.pageUrl,
        },
        tab?.id,
      );
    });
  }

  onCommand(callback: (command: string) => void): void {
    browser.commands.onCommand.addListener(callback);
  }

  onTabActivated(callback: (tabId: number) => void): void {
    browser.tabs.onActivated.addListener((info) => {
      callback(info.tabId);
    });
  }

  onTabRemoved(callback: (tabId: number) => void): void {
    browser.tabs.onRemoved.addListener((tabId) => {
      callback(tabId);
    });
  }

  onNavigationCommitted(callback: (tabId: number, url: string) => void): void {
    browser.webNavigation.onCommitted.addListener((details) => {
      if (details.frameId === 0) {
        callback(details.tabId, details.url);
      }
    });
  }
}
