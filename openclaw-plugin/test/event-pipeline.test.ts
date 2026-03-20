import { describe, it, expect, vi } from 'vitest';
import { EventPipeline } from '../src/event-pipeline.js';
import type { EventProcessor, PipelineEvent, ContextEvent } from '../src/event-pipeline.js';

const makeEvent = (): ContextEvent => ({
  type: 'context_update',
  sessionId: 'test-session',
  payload: {
    tab_id: 1,
    url: 'https://example.com',
    title: 'Test',
    content: 'test content',
    site_data: null,
    meta: {},
    classification: 'allowed',
    is_active_tab: true,
  },
  sequence: 1,
  extensionVersion: '0.1.0',
});

describe('EventPipeline', () => {
  it('calls all registered processors', async () => {
    const pipeline = new EventPipeline();
    const calls: string[] = [];

    pipeline.register({
      name: 'processor-a',
      process() { calls.push('a'); },
    });
    pipeline.register({
      name: 'processor-b',
      process() { calls.push('b'); },
    });

    await pipeline.emit(makeEvent());
    expect(calls).toEqual(['a', 'b']);
  });

  it('isolates processor errors — one failure does not block others', async () => {
    const pipeline = new EventPipeline();
    const calls: string[] = [];

    pipeline.register({
      name: 'failing-processor',
      process() { throw new Error('boom'); },
    });
    pipeline.register({
      name: 'healthy-processor',
      process() { calls.push('healthy'); },
    });

    // Should not throw
    await pipeline.emit(makeEvent());

    // Healthy processor should still have been called
    expect(calls).toEqual(['healthy']);
  });

  it('handles async processors', async () => {
    const pipeline = new EventPipeline();
    const calls: string[] = [];

    pipeline.register({
      name: 'async-processor',
      async process() {
        await new Promise((r) => setTimeout(r, 10));
        calls.push('async-done');
      },
    });

    await pipeline.emit(makeEvent());
    expect(calls).toEqual(['async-done']);
  });

  it('logs errors from failing processors', async () => {
    const pipeline = new EventPipeline();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    pipeline.register({
      name: 'bad-processor',
      process() { throw new Error('test error'); },
    });

    await pipeline.emit(makeEvent());

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('bad-processor'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});
