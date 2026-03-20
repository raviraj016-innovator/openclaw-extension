import type { Platform, PlatformStorage } from './platform.js';
import { ok, err, type Result } from '../shared/result.js';

class ChromeSessionStorage implements PlatformStorage {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.session.get(key);
    return (result[key] as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.session.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.session.remove(key);
  }
}

class ChromePersistentStorage implements PlatformStorage {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key);
    return (result[key] as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key);
  }
}

export class ChromePlatform implements Platform {
  readonly name = 'chrome' as const;
  readonly isEphemeral = true;
  readonly sessionStorage = new ChromeSessionStorage();
  readonly persistentStorage = new ChromePersistentStorage();

  onWake(callback: () => void): void {
    // Service worker wakes when it receives a message or alarm.
    // We hook into the runtime.onStartup and runtime.onInstalled events.
    chrome.runtime.onStartup.addListener(callback);
    // Also trigger on any message received (SW was woken)
    let hasWoken = false;
    chrome.runtime.onMessage.addListener(() => {
      if (!hasWoken) {
        hasWoken = true;
        callback();
      }
    });
  }

  async setBadge(text: string, color: string): Promise<void> {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color });
  }

  async openSidePanel(tabId: number): Promise<Result<void, Error>> {
    try {
      await chrome.sidePanel.open({ tabId });
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  }

  async getActiveTab(): Promise<Result<{ tabId: number; url: string; title: string }, Error>> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
      const response = await chrome.tabs.sendMessage(tabId, message);
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
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      callback(message, { tabId: sender.tab?.id }, sendResponse);
      return true; // keep sendResponse channel open for async
    });
  }

  createContextMenu(options: { id: string; title: string; contexts: string[] }): void {
    chrome.contextMenus.create({
      id: options.id,
      title: options.title,
      contexts: options.contexts as chrome.contextMenus.ContextType[],
    });
  }

  onContextMenuClick(
    callback: (
      info: { menuItemId: string; selectionText?: string; linkUrl?: string; pageUrl?: string },
      tabId?: number,
    ) => void,
  ): void {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
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
    chrome.commands.onCommand.addListener(callback);
  }

  onTabActivated(callback: (tabId: number) => void): void {
    chrome.tabs.onActivated.addListener((info) => {
      callback(info.tabId);
    });
  }

  onTabRemoved(callback: (tabId: number) => void): void {
    chrome.tabs.onRemoved.addListener((tabId) => {
      callback(tabId);
    });
  }

  onNavigationCommitted(callback: (tabId: number, url: string) => void): void {
    chrome.webNavigation.onCommitted.addListener((details) => {
      // Only care about main frame navigations
      if (details.frameId === 0) {
        callback(details.tabId, details.url);
      }
    });
  }
}
