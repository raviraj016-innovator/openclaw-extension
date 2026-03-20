/**
 * Interaction recorder — captures ALL meaningful user actions.
 *
 * Events tracked:
 * - Clicks on interactive elements (links, buttons, etc.)
 * - Form submissions
 * - Form input changes
 * - Copy/paste events (high signal: user wants to use this content)
 * - Scroll events (debounced: tracks how far user scrolled)
 * - Tab focus/blur (attention tracking: is user actually looking?)
 */

import type { UserAction, UserActionType } from '../shared/types.js';

export type RecorderCallback = (action: UserAction) => void;

export class RecorderHooks {
  private callback: RecorderCallback;
  private tabId: number;
  private isRecording = false;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastScrollEmit = 0;

  constructor(tabId: number, callback: RecorderCallback) {
    this.tabId = tabId;
    this.callback = callback;
  }

  start(): void {
    if (this.isRecording) return;
    this.isRecording = true;

    document.addEventListener('click', this.handleClick, { capture: true, passive: true });
    document.addEventListener('submit', this.handleSubmit, { capture: true, passive: true });
    document.addEventListener('change', this.handleChange, { capture: true, passive: true });
    document.addEventListener('copy', this.handleCopy, { capture: true, passive: true });
    document.addEventListener('paste', this.handlePaste, { capture: true, passive: true });
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('focus', this.handleFocus);
    window.addEventListener('blur', this.handleBlur);
  }

  stop(): void {
    this.isRecording = false;
    document.removeEventListener('click', this.handleClick, { capture: true });
    document.removeEventListener('submit', this.handleSubmit, { capture: true });
    document.removeEventListener('change', this.handleChange, { capture: true });
    document.removeEventListener('copy', this.handleCopy, { capture: true });
    document.removeEventListener('paste', this.handlePaste, { capture: true });
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('blur', this.handleBlur);
    if (this.scrollTimer) clearTimeout(this.scrollTimer);
  }

  /** Update tab ID (set by service worker after content script ready) */
  setTabId(id: number): void {
    this.tabId = id;
  }

  private handleClick = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const interactiveTags = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
    const clickableEl = target.closest('a, button, [role="button"], [onclick]');
    if (!interactiveTags.has(target.tagName) && !clickableEl) return;

    const el = clickableEl ?? target;
    this.emit('click', el as HTMLElement, null);
  };

  private handleSubmit = (event: Event): void => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    this.emit('submit', form, null);
  };

  private handleChange = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;

    if (target instanceof HTMLInputElement && target.type === 'password') return;

    // Capture actual values for search/filter fields, sanitize others
    let value: string;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      value = String(target.checked);
    } else if (target instanceof HTMLInputElement && (target.type === 'search' || target.name.includes('search') || target.name.includes('query') || target.name.includes('filter'))) {
      value = target.value.slice(0, 200); // Keep search queries — high signal
    } else if (target instanceof HTMLSelectElement) {
      value = target.options[target.selectedIndex]?.text ?? target.value;
    } else {
      value = '[changed]';
    }

    this.emit('input', target, value);
  };

  private handleCopy = (): void => {
    const selection = window.getSelection();
    const text = selection?.toString().trim().slice(0, 500) ?? '';
    if (!text) return;

    this.emit('copy', document.body, text);
  };

  private handlePaste = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    // Don't capture paste content for privacy, just record that a paste happened
    this.emit('paste', target, '[pasted]');
  };

  /** Debounced scroll tracking — emit at most once per 3 seconds */
  private handleScroll = (): void => {
    if (this.scrollTimer) return;

    const now = Date.now();
    if (now - this.lastScrollEmit < 3000) return;

    this.scrollTimer = setTimeout(() => {
      this.scrollTimer = null;
      this.lastScrollEmit = Date.now();

      const scrollHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight ?? 0,
      );
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      const depth = scrollHeight <= viewportHeight
        ? 1.0
        : Math.min(1.0, (scrollTop + viewportHeight) / scrollHeight);

      this.emit('scroll', document.body, `${Math.round(depth * 100)}%`);
    }, 1000);
  };

  private handleFocus = (): void => {
    this.emit('focus', document.body, 'tab_focused');
  };

  private handleBlur = (): void => {
    this.emit('blur', document.body, 'tab_blurred');
  };

  private emit(type: UserActionType, element: HTMLElement, value: string | null): void {
    if (!this.isRecording) return;

    // For body-level events (focus/blur/scroll) or any element with huge text,
    // use page title. Prevents dumping inline JS/CSS or entire page content.
    const isBodyLevel = element === document.body || element === document.documentElement;
    const rawText = isBodyLevel ? null : element.textContent?.trim().slice(0, 100) ?? null;

    // Detect garbage: if text starts with code-like patterns, use title instead
    const looksLikeCode = rawText && (
      rawText.startsWith('(function') ||
      rawText.startsWith('var ') ||
      rawText.startsWith('const ') ||
      rawText.startsWith('let ') ||
      rawText.startsWith('{') ||
      rawText.includes('function(){') ||
      rawText.includes('=>') ||
      rawText.length > 80 && !rawText.includes(' ')  // long string with no spaces = minified
    );

    // Clean up the text: collapse whitespace, use title as fallback
    let targetText = (isBodyLevel || looksLikeCode) ? document.title : rawText;
    if (targetText) {
      targetText = targetText.replace(/\s+/g, ' ').trim();
      // If text is still too generic/long (parent container text), prefer title
      if (targetText.length > 60 && element.children.length > 5) {
        targetText = document.title;
      }
    }

    const action: UserAction = {
      type,
      timestamp: new Date().toISOString(),
      tabId: this.tabId,
      url: location.href,
      target: {
        selector: isBodyLevel ? 'body' : this.getSelector(element),
        tagName: element.tagName.toLowerCase(),
        text: targetText,
        href: element instanceof HTMLAnchorElement ? element.href : null,
      },
      value,
    };

    this.callback(action);
  }

  private getSelector(el: HTMLElement): string {
    if (el.id) return `#${CSS.escape(el.id)}`;

    const tag = el.tagName.toLowerCase();
    const classes = Array.from(el.classList).slice(0, 2).map(c => `.${CSS.escape(c)}`).join('');

    if (classes) return `${tag}${classes}`;

    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(el) + 1;
      return `${tag}:nth-child(${index})`;
    }

    return tag;
  }
}
