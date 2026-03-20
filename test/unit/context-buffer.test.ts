import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextBuffer } from '../../src/background/context-buffer.js';
import type { OutboundProtocolMessage } from '../../src/shared/protocol.js';
import { createMockPlatform } from '../fixtures/mock-platform.js';

const mockPlatform = createMockPlatform();

function makeMessage(content: string): OutboundProtocolMessage {
  return {
    protocol_version: '1.0',
    type: 'context_update',
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    session_id: 'test',
    sequence: 1,
    extension_version: '0.1.0',
    payload: {
      tab_id: 1,
      url: 'https://example.com',
      title: 'Test',
      content,
      site_data: null,
      meta: { ogTitle: null, ogDescription: null, ogImage: null, charset: null, lang: null },
      classification: 'allowed',
      is_active_tab: true,
    },
  } as OutboundProtocolMessage;
}

describe('ContextBuffer', () => {
  let buffer: ContextBuffer;

  beforeEach(() => {
    vi.clearAllMocks();
    buffer = new ContextBuffer(mockPlatform);
  });

  it('starts empty', () => {
    expect(buffer.depth).toBe(0);
    expect(buffer.size).toBe(0);
  });

  it('enqueues and drains messages', async () => {
    const msg = makeMessage('test content');
    await buffer.enqueue(msg);
    expect(buffer.depth).toBe(1);

    const drained = buffer.drain();
    expect(drained).toHaveLength(1);
    expect(buffer.depth).toBe(0);
  });

  it('drains in FIFO order', async () => {
    await buffer.enqueue(makeMessage('first'));
    await buffer.enqueue(makeMessage('second'));
    await buffer.enqueue(makeMessage('third'));

    const drained = buffer.drain();
    expect(drained).toHaveLength(3);
    expect((drained[0] as any).payload.content).toBe('first');
    expect((drained[2] as any).payload.content).toBe('third');
  });

  it('persists to session storage on drain (immediate)', async () => {
    await buffer.enqueue(makeMessage('test'));
    // Enqueue is debounced, but drain triggers immediate persist
    buffer.drain();
    expect(mockPlatform.sessionStorage.set).toHaveBeenCalled();
  });

  it('returns empty array when drained twice', async () => {
    await buffer.enqueue(makeMessage('test'));
    buffer.drain();
    const second = buffer.drain();
    expect(second).toHaveLength(0);
  });
});
