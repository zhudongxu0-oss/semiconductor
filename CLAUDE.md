# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**芯问 (XinWen)** — a semiconductor industry Q&A assistant focused on RTP (Rapid Thermal Processing) wafer fabrication questions. Chinese-language UI. Combines keyword search over a local knowledge base with LLM-generated answers.

**Actual stack:** Vue 3 SPA (Vite) on the frontend, Express on the backend for local dev, and a Vercel serverless function for production. Despite `README.md` claiming Nuxt 3 + Tailwind, **the README is stale** — this project was migrated off Nuxt. The `tailwind.config.js` is vestigial (empty `content: []`, no `@tailwind` directives in `style.css`); do not assume Tailwind is active. All styling is hand-written in `src/style.css` and inside `App.vue`.

## Commands

```bash
npm install          # install deps
npm run dev          # runs Vite (5173) + Express (3001) concurrently via `concurrently`
npm run build        # vite build → dist/
npm run server       # run only the Express server (serves built dist/ on 3001)
npm run preview      # vite preview
node --test          # run the node:test suite (src/sessionStore.test.js). No `npm test` script is wired.
```

There is **no `npm test` script and no linter**, but `src/sessionStore.test.js` is a real `node:test` unit suite (run with `node --test`, zero added deps — `node:test` is built in). UI in `App.vue` has no automated tests; verify it manually.

## Development topology

- Vite dev server runs on `:5173` and proxies `/api` → `http://localhost:3001` (see `vite.config.js`). The Express server in `server.mjs` listens on `:3001`.
- `server.mjs` also serves `dist/` statically with an SPA fallback, so after `npm run build`, `npm run server` alone is a working full-stack instance.

## Architecture

### Two backends that are NOT in sync

This is the most important architectural gotcha. The chat endpoint exists in **two divergent implementations**:

| | `server.mjs` (local dev, Express) | `api/chat.mjs` (Vercel serverless, production) |
|---|---|---|
| Transport | **SSE streaming** (`text/event-stream`) | Plain JSON response |
| Multi-turn history | Yes (sends last 10 turns as messages) | No |
| Deep-think mode | Yes (`deepThink` flag → `AI_MODEL_DEEP`, emits reasoning content) | No |
| Reasoning content | Parses `delta.reasoning_content`, strips `<think>` tags | No |
| Default deep model | `glm-4-plus` | n/a (defaults to `gpt-3.5-turbo`) |

Both share the same keyword-search logic over `server/knowledge.json` (duplicated, not shared). **When adding backend features, update both files** — the frontend (`App.vue`) assumes the streaming behavior from `server.mjs`, which `api/chat.mjs` does not replicate.

### Frontend (single-file component + session store)

The entire UI is one ~58KB Options-API component: `src/App.vue`. `src/components/` is empty. Notable behavior:
- `POST /api/chat` with `{ question, history, deepThink }`, read via `response.body.getReader()` (not `EventSource`, since it's a POST). The SSE reader carries a buffer across reads — partial `data:` lines are not dropped.
- Manually parses `data: {type, content, sources}` SSE frames: `type` ∈ `thinking` (collapsible "思考过程" panel), `chunk` (answer text), `done` (sources).
- Assistant answer text is rendered as Markdown via the `marked` library (installed dep) — raw `###`/`**` no longer leak as plain text.
- The model names shown in the UI hint ("GLM-4-Plus 深度分析" / "GLM-4-Flash 快速回答") are **hardcoded strings**, not read from the server — they will drift from the actual `.env`-configured models.
- `src/particles.js` renders a canvas particle background; `src/cursor.js` renders a cursor-glow element. Both are plain DOM, loaded from `index.html` / `main.js`.

### Session store & conversation persistence (`src/sessionStore.js`)

Conversations are multi-session and persist to `localStorage` under key `xinwen.sessions.v1` → `{ sessions: Session[], activeId }`. The store is the **single storage boundary**: `App.vue` holds no `messages` array — it derives the active session via `computed` and mutates state only through store methods. Built on Vue's `reactive()` so the UI updates automatically; writes are debounced (~500ms) so per-token streaming updates batch into one `localStorage` write.

Key points:
- API: `load / save (debounced) / saveNow`; `createSession / getActive / setActive / ensureActive / deleteSession / renameSession`; `appendMessage / updateMessage / removeMessage`; `genId(prefix)`, `makeTitle(q)` (code-point-safe truncation to 15 chars via `Array.from`). Use `saveNow()` for discrete user actions (switch/delete/rename), `save()` for streaming.
- `Session.ownerId` is reserved as `null` this round. When a user system arrives (planned Round 2, knowledge-base upload — product model: shared library + per-user private library), sessions get tagged and the store's internals swap from localStorage to a backend API **without changing the call surface in `App.vue`**. Do not refactor that boundary casually.
- Persistence failures (`QuotaExceededError`, corrupt JSON) are caught and warned — data stays in memory, the app never crashes.
- Message ids use `genId('m')`, not an in-memory counter — a counter collides with persisted ids after a page reload and corrupts streaming/regenerate targeting.
- The store is headlessly testable: `setStorageAdapter` / `setClock` / `reset` / `getAdapterSnapshot` / `_rawSet` are test hooks (no real `localStorage` or `Date.now()` in tests). 16 `node:test` cases in `src/sessionStore.test.js`.
- Streaming stop uses an `AbortController` (`this.currentAbort` in `App.vue`) whose signal is passed to `fetch`; abort keeps the partial answer and flags the message `stopped`. Regenerate removes the last assistant message and re-runs completion from the preceding user message. Copy uses `navigator.clipboard` (+ textarea fallback); export builds a Markdown `Blob` and triggers a download.

### Knowledge base (`server/knowledge.json`)

Static JSON, two top-level categories (`rtp`, `general`), each with Chinese sub-categories (`概念`, `工艺参数`, `异常处理`, `常见术语`, `术语`, `工艺`, `问题解决`). Each item uses **Chinese keys**: `问题` (question), `答案` (answer), `关键词` (keywords array). 

Retrieval is naive substring matching (case-insensitive): keyword hit = score 3, question-substring = 2, answer-substring = 1. Top 3 are injected into the LLM system prompt as context. If no API key is configured, the top knowledge-base answer is returned directly as the response (graceful offline mode).

## AI provider configuration

Uses the **OpenAI SDK** but pointed at **智谱 GLM (Zhipu BigModel)** via `AI_BASE_URL` in `.env`:

```
OPENAI_API_KEY=...        # required for LLM answers; if absent/unset, falls back to knowledge-base-only
AI_BASE_URL=...           # OpenAI-compatible endpoint (defaults to openai.com if unset)
AI_MODEL=glm-4-flash      # fast mode
AI_MODEL_DEEP=glm-5.1     # deep-think mode (server.mjs only)
PORT=3001                 # Express port (defaults to 3001)
```

`.env` is gitignored (contains a real key — never commit it, never paste the value elsewhere). Deep-think / reasoning-content handling in `server.mjs` assumes GLM-style `reasoning_content` deltas; other providers may not emit these.

## Vercel deployment

`vercel.json` sets `framework: vite`, output `dist`, and routes `/api/(.*)` → `/api/chat.mjs` (single catch-all function). Configure `OPENAI_API_KEY` (and optionally `AI_*` vars) in the Vercel dashboard. Note: Vercel's serverless function uses the **non-streaming** `api/chat.mjs`, so the streaming UI experience is local-dev-only unless `api/chat.mjs` is brought to parity.

## Design docs & roadmap

`docs/superpowers/` holds design specs (`specs/`) and implementation plans (`plans/`). The live one, `2026-06-16-conversations-stop-export-design.md`, records why the feature work was split into two rounds:

- **Round 1 (implemented, branch `feat/conversations-stop-export`):** conversation history/session management, stop/regenerate, copy/export. Frontend + `sessionStore.js` only; no backend changes.
- **Round 2 (not started):** upload documents to maintain the knowledge base, with storage/vectorization decisions and a user system. Product model decided: **shared official KB + per-user private KB (hybrid)**. This is what the `Session.ownerId` reservation and the "store as single storage boundary" design are forward-compatible for. It needs its own spec before any work begins.
