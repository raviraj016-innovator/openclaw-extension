# OpenClaw Context Bridge Extension

Browser extension that provides ambient context streaming from your browser to OpenClaw AI agents.

## Architecture

- **Chrome MV3 + Firefox MV2** via platform abstraction layer
- **TypeScript strict mode** throughout
- **esbuild** for bundling (multiple entry points: content, background, popup, sidepanel)
- **Vitest** for unit/integration tests, **Playwright** for E2E

## Conventions

### Error Handling
All fallible operations return `Result<T, E>`. No silent try/catch swallowing.
Every error path must be typed and handled explicitly.

### Message Passing
All chrome.runtime messages use discriminated union types from `src/shared/messages.ts`.
No `any` payloads. Content script → service worker → UI are all typed channels.

### State Management
Service worker owns ALL state. Popup and side panel are stateless renderers
that request state on open and subscribe to updates via messages.

### Classification
Classifier runs ONLY in the service worker. Content scripts always extract.
Default for unknown domains: BLOCK. User overrides take highest priority.

### File Naming
- camelCase for files: `diff-engine.ts`, `tab-registry.ts`
- PascalCase for types/interfaces: `Result`, `ContentMessage`
- No barrel exports (no `index.ts` that re-exports)

### Testing
- Classifier: ~20 adversarial test cases minimum
- Every new codepath needs unit test for happy + failure path
- Site extractors tested against HTML fixtures
- E2E tests load real extension in Chromium via Playwright

## Build

```bash
npm run build          # Chrome
npm run build:firefox  # Firefox
npm run dev            # Watch mode (Chrome)
npm run test           # Unit + integration tests
npm run test:e2e       # E2E tests (requires built extension)
```

## Key Files

- `PROTOCOL.md` — WebSocket protocol specification
- `src/platform/` — Platform abstraction (Chrome/Firefox)
- `src/background/service-worker.ts` — Central orchestrator
- `src/content/index.ts` — Content script entry point
- `src/shared/messages.ts` — Typed message protocol
- `src/shared/result.ts` — Result<T,E> type
