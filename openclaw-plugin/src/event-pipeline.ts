import type { ContextPayload } from './types.js';

export interface ContextEvent {
  type: 'context_update';
  sessionId: string;
  payload: ContextPayload;
  sequence: number;
  extensionVersion: string;
  visitId?: number;
}

export interface UserActionEvent {
  type: 'user_action';
  sessionId: string;
  tabId: number;
  action: {
    type: string;
    timestamp: string;
    url: string;
    target: { selector: string; tagName: string; text: string | null; href: string | null };
    value: string | null;
  };
  visitId?: number;
}

export type PipelineEvent = ContextEvent | UserActionEvent;

export interface EventProcessor {
  name: string;
  /** Process an event. Errors are caught by the pipeline and logged. */
  process(event: PipelineEvent): void | Promise<void>;
}

export class EventPipeline {
  private processors: EventProcessor[] = [];

  register(processor: EventProcessor): void {
    this.processors.push(processor);
  }

  /** Emit an event to all registered processors. Errors in one processor don't block others. */
  async emit(event: PipelineEvent): Promise<void> {
    const results = this.processors.map(async (processor) => {
      try {
        await processor.process(event);
      } catch (err) {
        console.warn(`[EventPipeline] Processor "${processor.name}" failed:`, err);
      }
    });
    await Promise.all(results);
  }
}
