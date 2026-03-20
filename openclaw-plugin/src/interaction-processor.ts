import type { EventProcessor, PipelineEvent, UserActionEvent } from './event-pipeline.js';
import type { ContextDatabase } from './database.js';
import { utcTimestamp } from './utc-timestamp.js';

export class InteractionProcessor implements EventProcessor {
  name = 'interaction-recording';
  private database: ContextDatabase;

  constructor(database: ContextDatabase) {
    this.database = database;
  }

  process(event: PipelineEvent): void {
    if (event.type !== 'user_action') return;
    const action = event as UserActionEvent;

    console.log(`[${utcTimestamp()}] [ACTION] ${action.action.type} "${action.action.target.text?.slice(0, 40) ?? ''}" on ${action.action.url}`);

    try {
      this.database.insertInteraction({
        sessionId: action.sessionId,
        visitId: action.visitId,
        tabId: action.tabId,
        type: action.action.type,
        url: action.action.url,
        targetSelector: action.action.target.selector,
        targetTag: action.action.target.tagName,
        targetText: action.action.target.text ?? undefined,
        value: action.action.value ?? undefined,
      });
    } catch (e) {
      console.warn(`[${utcTimestamp()}] [ACTION] DB interaction write failed:`, e);
    }
  }
}
