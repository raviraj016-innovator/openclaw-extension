import { describe, it, expect } from 'vitest';
import { createEnvelope, createContextUpdate, createPing } from '../../src/shared/protocol.js';
import { PROTOCOL_VERSION, EXTENSION_VERSION } from '../../src/shared/constants.js';

describe('Protocol helpers', () => {
  it('createEnvelope sets protocol version', () => {
    const envelope = createEnvelope('test');
    expect(envelope.protocol_version).toBe(PROTOCOL_VERSION);
    expect(envelope.type).toBe('test');
    expect(envelope.id).toBeTruthy();
    expect(envelope.timestamp).toBeTruthy();
  });

  it('createContextUpdate has correct shape', () => {
    const msg = createContextUpdate('session-1', 42, {
      tab_id: 1,
      url: 'https://github.com',
      title: 'GitHub',
      content: 'page content',
      site_data: null,
      meta: { ogTitle: null, ogDescription: null, ogImage: null, charset: 'UTF-8', lang: 'en' },
      classification: 'allowed',
      is_active_tab: true,
    });

    expect(msg.type).toBe('context_update');
    expect(msg.protocol_version).toBe(PROTOCOL_VERSION);
    expect(msg.extension_version).toBe(EXTENSION_VERSION);
    expect(msg.session_id).toBe('session-1');
    expect(msg.sequence).toBe(42);
    expect(msg.payload.tab_id).toBe(1);
    expect(msg.payload.url).toBe('https://github.com');
  });

  it('createPing has correct type', () => {
    const msg = createPing();
    expect(msg.type).toBe('ping');
    expect(msg.protocol_version).toBe(PROTOCOL_VERSION);
  });

  it('each message gets unique ID', () => {
    const a = createEnvelope('test');
    const b = createEnvelope('test');
    expect(a.id).not.toBe(b.id);
  });
});
