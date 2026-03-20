import { describe, it, expect, beforeEach } from 'vitest';
import { TabRegistry } from '../../src/background/tab-registry.js';
import type { ClassificationResult } from '../../src/shared/types.js';

const allowedClassification: ClassificationResult = {
  classification: 'allowed',
  source: 'known_allow_list',
  domain: 'github.com',
  reason: 'Known work tool',
};

const blockedClassification: ClassificationResult = {
  classification: 'blocked',
  source: 'known_block_list',
  domain: 'chase.com',
  reason: 'Known sensitive site',
};

describe('TabRegistry', () => {
  let registry: TabRegistry;

  beforeEach(() => {
    registry = new TabRegistry();
  });

  it('starts empty', () => {
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.getActiveTabId()).toBeNull();
  });

  it('upserts tabs', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get(1)?.url).toBe('https://github.com');
  });

  it('activates tabs', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    registry.upsert(2, 'https://chase.com', 'Chase', blockedClassification);

    registry.activate(1);
    expect(registry.getActiveTabId()).toBe(1);
    expect(registry.get(1)?.isActive).toBe(true);
    expect(registry.get(2)?.isActive).toBe(false);
  });

  it('deactivates previous tab on activate', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    registry.upsert(2, 'https://github.com/other', 'Other', allowedClassification);

    registry.activate(1);
    registry.activate(2);
    expect(registry.get(1)?.isActive).toBe(false);
    expect(registry.get(2)?.isActive).toBe(true);
  });

  it('removes tabs', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    registry.remove(1);
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.get(1)).toBeUndefined();
  });

  it('clears activeTabId when active tab is removed', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    registry.activate(1);
    registry.remove(1);
    expect(registry.getActiveTabId()).toBeNull();
  });

  it('gets background tabs (non-active, allowed only)', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    registry.upsert(2, 'https://linear.app', 'Linear', allowedClassification);
    registry.upsert(3, 'https://chase.com', 'Chase', blockedClassification);
    registry.activate(1);

    const background = registry.getBackgroundTabs();
    expect(background).toHaveLength(1); // Only tab 2 (allowed + not active)
    expect(background[0]?.tabId).toBe(2);
  });

  it('counts tabs by classification', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    registry.upsert(2, 'https://chase.com', 'Chase', blockedClassification);

    const counts = registry.getCounts();
    expect(counts.allowed).toBe(1);
    expect(counts.blocked).toBe(1);
    expect(counts.total).toBe(2);
  });

  it('serializes and deserializes', () => {
    registry.upsert(1, 'https://github.com', 'GitHub', allowedClassification);
    registry.activate(1);

    const serialized = registry.serialize();
    const restored = new TabRegistry();
    restored.deserialize(serialized);

    expect(restored.getAll()).toHaveLength(1);
    expect(restored.getActiveTabId()).toBe(1);
    expect(restored.get(1)?.url).toBe('https://github.com');
  });

  it('handles corrupt deserialization gracefully', () => {
    const registry2 = new TabRegistry();
    registry2.deserialize('not valid json');
    expect(registry2.getAll()).toHaveLength(0);
  });
});
