/**
 * Shared mock Platform for unit tests.
 * Import this instead of copy-pasting the mock in every test file.
 */

import { vi } from 'vitest';
import type { Platform } from '../../src/platform/platform.js';

export function createMockPlatform(): Platform {
  return {
    name: 'chrome' as const,
    isEphemeral: true,
    sessionStorage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    persistentStorage: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    onWake: vi.fn(),
    setBadge: vi.fn().mockResolvedValue(undefined),
    openSidePanel: vi.fn(),
    getActiveTab: vi.fn(),
    sendToTab: vi.fn(),
    onMessage: vi.fn(),
    createContextMenu: vi.fn(),
    onContextMenuClick: vi.fn(),
    onCommand: vi.fn(),
    onTabActivated: vi.fn(),
    onTabRemoved: vi.fn(),
    onNavigationCommitted: vi.fn(),
  };
}
