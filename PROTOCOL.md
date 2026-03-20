# OpenClaw Extension WebSocket Protocol v1.0

## Overview

The OpenClaw Context Bridge extension communicates with OpenClaw agent instances
via WebSocket. The protocol is bidirectional: the extension pushes browser context
to OpenClaw, and OpenClaw pushes proactive suggestions back to the extension.

## Transport

- **Protocol:** `wss://` (TLS required for Cloud; self-hosted may use `ws://`)
- **Endpoint:** OpenClaw Gateway WebSocket URL
  - Cloud: `wss://<instance>.openclawcloud.app/ws/extension`
  - Self-hosted: `ws://<host>:<port>/ws/extension`
- **Auth:** Bearer token in initial HTTP upgrade request header
- **Keepalive:** Client sends `ping` every 25 seconds. Server responds with `pong`.
- **Reconnect:** Jittered exponential backoff (1s → 2s → 4s → ... → 60s max)

## Message Envelope

All messages are JSON. Every message includes:

```json
{
  "protocol_version": "1.0",
  "type": "<message_type>",
  "id": "<uuid>",
  "timestamp": "<ISO8601>"
}
```

## Client → Server Messages

### `context_update`

Sent when the active tab's content changes meaningfully.

```json
{
  "protocol_version": "1.0",
  "type": "context_update",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "session_id": "uuid",
  "sequence": 42,
  "extension_version": "0.1.0",
  "payload": {
    "tab_id": 123,
    "url": "https://github.com/org/repo/pull/234",
    "title": "feat: add context streaming by alice",
    "content": "Full page text content...",
    "site_data": null,
    "meta": {
      "og_title": "...",
      "og_description": "...",
      "og_image": "..."
    },
    "classification": "allowed",
    "is_active_tab": true
  }
}
```

### `context_snapshot`

Full snapshot of a tab (sent on tab activation or server request).
Same shape as `context_update` but always includes complete content.

### `tab_ping`

Lightweight background tab heartbeat (sent every 30s for inactive tabs).

```json
{
  "protocol_version": "1.0",
  "type": "tab_ping",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "tabs": [
      { "tab_id": 123, "url": "https://...", "title": "..." },
      { "tab_id": 456, "url": "https://...", "title": "..." }
    ]
  }
}
```

### `highlight`

User highlighted text and pressed Ctrl+Shift+O.

```json
{
  "protocol_version": "1.0",
  "type": "highlight",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "tab_id": 123,
    "url": "https://...",
    "selected_text": "The highlighted text",
    "surrounding_context": "Paragraph containing the selection...",
    "page_title": "Page Title"
  }
}
```

### `context_menu_action`

User right-clicked and selected "Ask OpenClaw about this".

```json
{
  "protocol_version": "1.0",
  "type": "context_menu_action",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "tab_id": 123,
    "url": "https://...",
    "element_text": "Text of the clicked element",
    "element_type": "link",
    "link_url": "https://...",
    "surrounding_context": "...",
    "page_title": "Page Title"
  }
}
```

### `chat_message`

User sends a message via the side panel chat.

```json
{
  "protocol_version": "1.0",
  "type": "chat_message",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "conversation_id": "uuid",
    "text": "What does this PR do?",
    "current_tab_context": { "url": "...", "title": "..." }
  }
}
```

### `ping`

Keepalive.

```json
{
  "protocol_version": "1.0",
  "type": "ping",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z"
}
```

## Server → Client Messages

### `suggestion`

Proactive suggestion from OpenClaw based on current context.

```json
{
  "protocol_version": "1.0",
  "type": "suggestion",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "title": "I found a related fix",
    "body": "PR #891 addresses the same null pointer...",
    "actions": [
      { "label": "View PR", "url": "https://..." },
      { "label": "Dismiss", "action": "dismiss" }
    ],
    "priority": "normal",
    "related_tab_id": 123
  }
}
```

### `chat_response`

Response to a user's chat message.

```json
{
  "protocol_version": "1.0",
  "type": "chat_response",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "conversation_id": "uuid",
    "text": "This PR adds a new feature...",
    "in_reply_to": "uuid"
  }
}
```

### `snapshot_request`

Server requests a full snapshot of a specific tab.

```json
{
  "protocol_version": "1.0",
  "type": "snapshot_request",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "tab_id": 456
  }
}
```

### `backpressure`

Server signals the client to slow down.

```json
{
  "protocol_version": "1.0",
  "type": "backpressure",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z",
  "payload": {
    "action": "slow_down",
    "max_rate_per_minute": 6,
    "reason": "Agent is processing a long task"
  }
}
```

### `pong`

Keepalive response.

```json
{
  "protocol_version": "1.0",
  "type": "pong",
  "id": "uuid",
  "timestamp": "2026-03-18T15:30:00Z"
}
```

## Session Resumption

After a reconnect, the client sends the last `sequence` number it successfully sent.
The server can use this to detect gaps. The server responds with an `ack` containing
the last sequence it received.

## Error Handling

- Malformed messages: log and skip (never crash the connection)
- Unknown message types: log and skip (forward compatibility)
- Auth failure (401): close connection, trigger re-auth flow
- Rate limit (429): honor `backpressure` message timing
