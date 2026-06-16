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
```

There is **no test runner and no linter** configured.

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

### Frontend (single-file)

The entire UI is one ~40KB Options-API component: `src/App.vue`. `src/components/` is empty. Notable behavior:
- `POST /api/chat` with `{ question, history, deepThink }`, read via `response.body.getReader()` (not `EventSource`, since it's a POST).
- Manually parses `data: {type, content, sources}` SSE frames: `type` ∈ `thinking` (collapsible "思考过程" panel), `chunk` (answer text), `done` (sources).
- The model names shown in the UI hint ("GLM-4-Plus 深度分析" / "GLM-4-Flash 快速回答") are **hardcoded strings**, not read from the server — they will drift from the actual `.env`-configured models.
- `src/particles.js` renders a canvas particle background; `src/cursor.js` renders a cursor-glow element. Both are plain DOM, loaded from `index.html` / `main.js`.

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
