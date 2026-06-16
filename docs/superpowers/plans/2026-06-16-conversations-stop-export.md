# 会话管理 / 停止·重新生成 / 复制·导出 实现计划（Round 1）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为「芯问」半导体问答助手新增会话持久化管理、流式停止/重新生成、回答复制/导出三个功能。

**Architecture:** 抽出 `src/sessionStore.js` 作为会话状态的唯一拥有者与持久化边界（用 Vue 的 `reactive()` 持有状态，方法做变更，localStorage 做持久化，防抖写入）。`App.vue` 通过 `computed` 读取 store，不再自持 `messages`。发送流程改走 store 并接入 `AbortController` 实现停止。数据模型预留 `ownerId` 字段，为功能 4 的用户系统前向兼容。

**Tech Stack:** Vue 3（Options API）+ Vite；后端不改（`server.mjs` SSE 已支持）；`marked`（已装）。会话纯前端 localStorage。测试用 Node 内置 `node:test`（零新依赖）。

**对应设计文档：** `docs/superpowers/specs/2026-06-16-conversations-stop-export-design.md`

---

## 测试策略说明（执行前必读）

- **`sessionStore.js` 用 TDD**：纯逻辑，用 `node --test` 跑单元测试，注入内存 storage mock + 固定时钟，无浏览器依赖。`reactive()` 是纯 JS Proxy，在 Node 下可用。
- **UI 行为无自动化测试**：项目无测试框架；强行上 jsdom + @vue/test-utils 为三个 UI 功能服务违反简洁原则。UI 任务用**明确的手动验证步骤**（对应设计文档 §9 验收标准）。
- **前置：建特性分支**（仓库当前在 `master`，且有其它未提交改动）：

```bash
cd D:/mimoProjects/semiconductor
git checkout -b feat/conversations-stop-export
```

每个 Task 末尾的 commit 只 `git add` 该任务列出的文件，不牵连既有未提交改动。

---

## 文件结构

| 文件 | 责任 | 动作 |
|---|---|---|
| `src/sessionStore.js` | 会话状态唯一拥有者：`reactive` 状态 + localStorage 持久化（防抖）+ 会话/消息 CRUD + 纯助手函数 + 测试钩子 | 新建 |
| `src/sessionStore.test.js` | sessionStore 单元测试（node:test） | 新建 |
| `src/App.vue` | 接入 store（computed）、重写发送流程、新增停止/重生/复制/导出/抽屉方法与模板与样式 | 修改 |

`sessionStore.js` 导出一个默认对象，包含：状态访问、`load / save / saveNow`、`createSession / getActive / ensureActive / setActive / deleteSession / renameSession`、`appendMessage / updateMessage / removeMessage`、`makeTitle`、测试钩子 `setStorageAdapter / setClock / reset`。

---

## Task 1: sessionStore —— 状态、持久化、load/save

**Files:**
- Create: `src/sessionStore.js`
- Create: `src/sessionStore.test.js`

- [ ] **Step 1: 写失败测试（load/save 往返 + 配额错误被吞）**

Create `src/sessionStore.test.js`:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import store from './sessionStore.js'

function memStorage() {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
  }
}

function fresh() {
  store.setStorageAdapter(memStorage())
  store.setClock(() => 1000)
  store.reset()
}

test('saveNow then load round-trips state', () => {
  fresh()
  store.createSession()                 // creates + activates one session
  store.saveNow()
  const captured = store.getAdapterSnapshot()  // raw localStorage string
  assert.ok(captured, 'expected persisted JSON')

  store.reset()                         // wipe in-memory
  assert.equal(store.getActive(), null)
  store.load()                          // reload from adapter
  const active = store.getActive()
  assert.ok(active, 'active session restored after load')
  assert.equal(active.title, '新对话')
  assert.equal(active.ownerId, null)
})

test('persist swallows QuotaExceededError without throwing', () => {
  fresh()
  const throwing = {
    getItem: () => null,
    setItem: () => { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e },
    removeItem: () => {},
  }
  store.setStorageAdapter(throwing)
  store.createSession()
  assert.doesNotThrow(() => store.saveNow())   // must not throw
})

test('load handles corrupt JSON gracefully', () => {
  fresh()
  store.createSession()
  store.saveNow()
  // corrupt the stored value
  store._rawSet('xinwen.sessions.v1', '{not json')
  store.reset()
  assert.doesNotThrow(() => store.load())
  assert.equal(store.getActive(), null)
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test src/sessionStore.test.js`
Expected: FAIL —— `store.createSession` / `saveNow` / `load` / `getAdapterSnapshot` / `_rawSet` 未定义。

- [ ] **Step 3: 实现 sessionStore（持久化部分 + 后续任务会扩展）**

Create `src/sessionStore.js`:

```js
import { reactive } from 'vue'

const STORAGE_KEY = 'xinwen.sessions.v1'

const state = reactive({ sessions: [], activeId: null })

let storage = (typeof localStorage !== 'undefined') ? localStorage : null
let clock = Date.now
let saveTimer = null

// ---- persistence ----
function persist() {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ sessions: state.sessions, activeId: state.activeId }))
  } catch (e) {
    // QuotaExceededError etc. — never crash the app; data stays in memory.
    console.warn('[sessionStore] persist failed:', e?.message || e)
  }
}

function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(persist, 500)   // debounce: avoid writing per token
}

function saveNow() {
  clearTimeout(saveTimer)
  persist()
}

function load() {
  if (!storage) return
  let raw
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch (e) {
    console.warn('[sessionStore] load read failed:', e?.message || e)
    return
  }
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    state.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : []
    state.activeId = parsed.activeId ?? null
  } catch (e) {
    console.warn('[sessionStore] load parse failed:', e?.message || e)
    state.sessions = []
    state.activeId = null
  }
}

// ---- test hooks ----
function setStorageAdapter(adapter) { storage = adapter }
function setClock(fn) { clock = fn }
function reset() {
  clearTimeout(saveTimer)
  state.sessions = []
  state.activeId = null
}
function getAdapterSnapshot() { return storage ? storage.getItem(STORAGE_KEY) : null }
function _rawSet(key, val) { if (storage) storage.setItem(key, val) }

export default {
  state,
  load, save, saveNow,
  setStorageAdapter, setClock, reset, getAdapterSnapshot, _rawSet,
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test src/sessionStore.test.js`
Expected: 3 tests FAIL with `TypeError: store.createSession is not a function`（持久化测试依赖 createSession，将在 Task 2 补齐）。

> 说明：Step 4 此刻仍失败是预期的——`createSession` 在 Task 2 实现。本任务的持久化函数已就绪。把 Task 1 与 Task 2 视为同一存储模块的两半，合并验证。继续 Task 2。

- [ ] **Step 5: 暂不提交（与 Task 2 合并提交）**

---

## Task 2: sessionStore —— 会话 CRUD

**Files:**
- Modify: `src/sessionStore.js`
- Modify: `src/sessionStore.test.js`

- [ ] **Step 1: 追加失败测试（会话 CRUD）**

Append to `src/sessionStore.test.js`:

```js
test('createSession activates and prepends', () => {
  fresh()
  const s = store.createSession()
  assert.equal(store.getActive()?.id, s.id)
  assert.equal(store.state.sessions[0].id, s.id)
  assert.equal(s.ownerId, null)
  assert.equal(typeof s.createdAt, 'number')
})

test('deleteSession switches active to most recent', () => {
  fresh()
  const a = store.createSession()
  store.setClock(() => 2000)
  const b = store.createSession()
  assert.equal(store.getActive().id, b.id)
  store.deleteSession(b.id)
  assert.equal(store.getActive().id, a.id, 'should fall back to most recent')
})

test('deleteSession with no sessions left clears activeId', () => {
  fresh()
  const a = store.createSession()
  store.deleteSession(a.id)
  assert.equal(store.getActive(), null)
  assert.equal(store.state.activeId, null)
})

test('setActive switches activeId', () => {
  fresh()
  const a = store.createSession(); store.setClock(() => 2000); const b = store.createSession()
  store.setActive(a.id)
  assert.equal(store.getActive().id, a.id)
})

test('renameSession updates title', () => {
  fresh()
  const a = store.createSession()
  store.renameSession(a.id, 'RTP 参数')
  assert.equal(store.getActive().title, 'RTP 参数')
})

test('ensureActive returns existing active without duplicating', () => {
  fresh()
  const a = store.createSession()
  const got = store.ensureActive()
  assert.equal(got.id, a.id)
  assert.equal(store.state.sessions.length, 1)
})

test('ensureActive creates one when none active', () => {
  fresh()
  const got = store.ensureActive()
  assert.ok(got.id)
  assert.equal(store.state.sessions.length, 1)
})

test('makeTitle truncates to 15 chars and falls back', () => {
  assert.equal(store.makeTitle('RTP的升温速率怎么设定？详细说明'), 'RTP的升温速率怎么设定？详细'.slice(0, 15))
  assert.equal(store.makeTitle('短问题'), '短问题')
  assert.equal(store.makeTitle('   '), '新对话')
  assert.equal(store.makeTitle(''), '新对话')
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test src/sessionStore.test.js`
Expected: FAIL —— `createSession` 等未定义。

- [ ] **Step 3: 实现会话 CRUD + makeTitle**

In `src/sessionStore.js`, add these functions (above `export default`) and register them in the export object:

```js
function genId(prefix = 's') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10)
}

function makeTitle(q) {
  const t = (q || '').trim()
  return t ? t.slice(0, 15) : '新对话'
}

function createSession(title = '新对话') {
  const s = {
    id: genId(),
    title,
    ownerId: null,          // reserved for feature-4 user system; always null this round
    createdAt: clock(),
    updatedAt: clock(),
    messages: [],
  }
  state.sessions.unshift(s)
  state.activeId = s.id
  saveNow()
  return s
}

function getActive() {
  return state.sessions.find((s) => s.id === state.activeId) || null
}

function setActive(id) {
  if (state.sessions.some((s) => s.id === id)) {
    state.activeId = id
    saveNow()
  }
}

function ensureActive() {
  const s = getActive()
  if (s) return s
  return createSession()
}

function deleteSession(id) {
  const idx = state.sessions.findIndex((s) => s.id === id)
  if (idx === -1) return
  state.sessions.splice(idx, 1)
  if (state.activeId === id) {
    state.activeId = state.sessions[0]?.id || null
  }
  saveNow()
}

function renameSession(id, title) {
  const s = state.sessions.find((x) => x.id === id)
  if (s) {
    s.title = title
    saveNow()
  }
}
```

Update the `export default` object to also include:

```js
  genId, makeTitle,
  createSession, getActive, setActive, ensureActive, deleteSession, renameSession,
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test src/sessionStore.test.js`
Expected: PASS（Task 1 的 3 个 + Task 2 的 8 个，共 11 个）。

- [ ] **Step 5: 提交（Task 1+2 合并）**

```bash
git add src/sessionStore.js src/sessionStore.test.js
git commit -m "feat: add sessionStore with persistence + session CRUD (tests)"
```

---

## Task 3: sessionStore —— 消息操作

**Files:**
- Modify: `src/sessionStore.js`
- Modify: `src/sessionStore.test.js`

- [ ] **Step 1: 追加失败测试（消息操作）**

Append to `src/sessionStore.test.js`:

```js
test('appendMessage ensures a session and pushes', () => {
  fresh()
  const m = { id: 1, role: 'user', content: '问' }
  store.appendMessage(m)
  const active = store.getActive()
  assert.ok(active)
  assert.equal(active.messages.length, 1)
  assert.equal(active.messages[0].content, '问')
})

test('appendMessage refreshes updatedAt', () => {
  fresh()
  store.setClock(() => 1000)
  store.createSession()
  store.setClock(() => 5000)
  store.appendMessage({ id: 1, role: 'user', content: 'x' })
  assert.equal(store.getActive().updatedAt, 5000)
})

test('updateMessage patches the target message in active session', () => {
  fresh()
  store.createSession()
  store.appendMessage({ id: 7, role: 'assistant', content: '' })
  store.updateMessage(7, { content: 'hello', streaming: false })
  assert.equal(store.getActive().messages[0].content, 'hello')
  assert.equal(store.getActive().messages[0].streaming, false)
})

test('updateMessage ignores unknown id', () => {
  fresh()
  store.createSession()
  assert.doesNotThrow(() => store.updateMessage(999, { content: 'x' }))
})

test('removeMessage drops the target message', () => {
  fresh()
  store.createSession()
  store.appendMessage({ id: 1, role: 'user', content: 'q' })
  store.appendMessage({ id: 2, role: 'assistant', content: 'a' })
  store.removeMessage(2)
  assert.equal(store.getActive().messages.length, 1)
  assert.equal(store.getActive().messages[0].id, 1)
})
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `node --test src/sessionStore.test.js`
Expected: FAIL —— `appendMessage` 等未定义。

- [ ] **Step 3: 实现消息操作**

In `src/sessionStore.js`, add (above `export default`):

```js
function appendMessage(msg) {
  const s = ensureActive()
  s.messages.push(msg)
  s.updatedAt = clock()
  save()                       // debounced — streaming updates batch into one write
  return s
}

function updateMessage(msgId, patch) {
  const s = getActive()
  if (!s) return
  const m = s.messages.find((x) => x.id === msgId)
  if (m) {
    Object.assign(m, patch)
    save()
  }
}

function removeMessage(msgId) {
  const s = getActive()
  if (!s) return
  const idx = s.messages.findIndex((x) => x.id === msgId)
  if (idx !== -1) {
    s.messages.splice(idx, 1)
    save()
  }
}
```

Add to `export default`:

```js
  appendMessage, updateMessage, removeMessage,
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `node --test src/sessionStore.test.js`
Expected: PASS（共 16 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/sessionStore.js src/sessionStore.test.js
git commit -m "feat: sessionStore message ops (append/update/remove)"
```

---

## Task 4: App.vue 接入 store（data / computed / mounted）

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 引入 store 并替换 data/computed**

In `src/App.vue`, at the top of `<script>` (after the `marked` import block, before `let msgId = 0`), add:

```js
import sessionStore from './sessionStore.js'
```

In `data()` (currently returns `messages: []`, `inputMessage`, `loading`, `deepThink`, `isScrolled`, ...), **remove** `messages: []` and **add** UI-state fields. The `data()` return should now begin:

```js
    return {
      inputMessage: '',
      loading: false,
      deepThink: false,
      isScrolled: false,
      // session-management UI state
      drawerOpen: false,
      editingId: null,
      editingTitle: '',
      copiedMsgId: null,
      confirmDeleteId: null,
      allQuestions: [
        // ... (unchanged list)
```

Delete the old `messages: [],` line. Keep the rest of `data()` (`allQuestions`, `suggestions`, `stats`) unchanged.

- [ ] **Step 2: 添加 computed（派生当前会话与消息）**

Add a `computed` block to the component (alongside `data()`/`methods`):

```js
  computed: {
    activeSession() {
      return sessionStore.getActive()
    },
    messages() {
      return this.activeSession ? this.activeSession.messages : []
    },
    sessions() {
      return sessionStore.state.sessions
    },
    canRegenerate() {
      const m = this.messages
      return m.length > 0 && m[m.length - 1].role === 'assistant'
    },
  },
```

- [ ] **Step 3: mounted 中 load**

In `mounted()` (currently calls `shuffleQuestions()`, adds listeners), add as the first line inside the method body:

```js
      sessionStore.load()
      if (!sessionStore.getActive()) sessionStore.createSession()
```

- [ ] **Step 4: 验证（手动）**

Run: `npm run dev`
打开 http://localhost:5173 ，确认：
- 欢迎页正常显示（空会话 → `messages.length === 0`）。
- 控制台无报错。
- DevTools → Application → Local Storage：暂无 `xinwen.sessions.v1`（尚未发送）。
- 点击快捷提问仍可触发 `sendMessage`（下一任务重构它；若报错属预期，因 `sendMessage` 仍引用旧 `this.messages.push`，Task 5 修复）。

> 若 `sendMessage` 在此步抛错，可暂时不发送，仅验证渲染。Task 5 会重写发送流程。

- [ ] **Step 5: 暂不提交（与 Task 5 合并）**

---

## Task 5: 重写 sendMessage —— 持久化 + AbortController + 停止标记

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 替换 sendMessage 并新增 _runCompletion**

Replace the entire existing `sendMessage` method (the `async sendMessage() { ... }` block, roughly lines 333–426) with:

```js
    async sendMessage() {
      if (!this.inputMessage.trim() || this.loading) return
      const question = this.inputMessage.trim()
      this.inputMessage = ''

      const s = sessionStore.ensureActive()
      if (s.messages.length === 0) {
        sessionStore.renameSession(s.id, sessionStore.makeTitle(question))
      }
      sessionStore.appendMessage({ id: ++msgId, role: 'user', content: question })

      await this._runCompletion(question, this.deepThink)
    },

    // Shared by sendMessage (new question) and regenerate (re-run last question).
    async _runCompletion(question, useDeepThink) {
      const aid = ++msgId
      sessionStore.appendMessage({
        id: aid,
        role: 'assistant',
        content: '',
        thinking: '',
        sources: [],
        streaming: true,
        isDeepThink: useDeepThink,
        showThinking: true,
      })
      this.loading = true
      this.currentAbort = new AbortController()
      this.$nextTick(() => this.scrollToBottom())

      try {
        const s = sessionStore.getActive()
        const history = s.messages
          .filter((m) => m.id !== aid && m.role !== 'system')
          .map((m) => ({ role: m.role, content: m.content }))

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, history, deepThink: useDeepThink }),
          signal: this.currentAbort.signal,
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value)
          const lines = text.split('\n').filter((l) => l.startsWith('data: '))

          for (const line of lines) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'thinking') {
                sessionStore.updateMessage(aid, { thinking: (sessionStore.getActive().messages.find((m) => m.id === aid).thinking || '') + data.content })
                const msg = sessionStore.getActive().messages.find((m) => m.id === aid)
                this.$nextTick(() => {
                  if (msg.isDeepThink && !msg.showThinking) {
                    sessionStore.updateMessage(aid, { showThinking: true })
                  }
                  const tb = document.querySelector('.thinking-block.active .thinking-body')
                  if (tb) tb.scrollTop = tb.scrollHeight
                })
              } else if (data.type === 'chunk') {
                const msg = sessionStore.getActive().messages.find((m) => m.id === aid)
                sessionStore.updateMessage(aid, { content: (msg.content || '') + data.content })
                if (this.loading) this.loading = false
                const cur = sessionStore.getActive().messages.find((m) => m.id === aid)
                if (cur.isDeepThink && cur.thinking && cur.showThinking) {
                  sessionStore.updateMessage(aid, { showThinking: false })
                }
                this.$nextTick(() => this.scrollToBottom())
              } else if (data.type === 'done') {
                sessionStore.updateMessage(aid, { streaming: false, sources: data.sources || [] })
                sessionStore.saveNow()
              }
            } catch (e) {
              // partial SSE line across chunks — ignore, will retry next read
            }
          }
        }
      } catch (err) {
        const aborted = err && err.name === 'AbortError'
        const msg = sessionStore.getActive()?.messages.find((m) => m.id === aid)
        if (aborted) {
          sessionStore.updateMessage(aid, { streaming: false, stopped: true })
        } else {
          console.error('chat error:', err)
          const note = '\n\n（AI服务暂时不可用，请稍后重试或重新生成。）'
          sessionStore.updateMessage(aid, { streaming: false, content: (msg?.content || '') + note })
        }
        sessionStore.saveNow()
      } finally {
        this.loading = false
        this.currentAbort = null
        this.$nextTick(() => this.scrollToBottom())
      }
    },
```

- [ ] **Step 2: 更新 goHome 为「新对话」语义**

Replace the existing `goHome()` method body with:

```js
    goHome() {
      this.startNewChat()
    },
```

(`startNewChat` 在 Task 8 实现；本任务先占位，临时也可直接内联。) 为避免引用未定义方法，本任务临时实现为：

```js
    goHome() {
      sessionStore.createSession()
      this.drawerOpen = false
    },
```

- [ ] **Step 3: 声明 currentAbort 实例字段**

In `data()` return object, add:

```js
      currentAbort: null,
```

(放在 UI 字段附近即可。它不需要响应式，但放 data 里无害。)

- [ ] **Step 4: 验证（手动）**

Run: `npm run dev`
- 发送一条提问 → 流式回答正常显示。
- 刷新页面 → 对话与消息仍在（localStorage 已持久化）。
- DevTools → Application → Local Storage → `xinwen.sessions.v1` 存在，含该会话。
- 深度思考模式仍正常（思考块折叠/展开）。
- 来源标签仍显示。

- [ ] **Step 5: 提交**

```bash
git add src/App.vue
git commit -m "feat: persist conversations via sessionStore + AbortController wiring"
```

---

## Task 6: 停止生成 UI（发送 → 停止 就地变形）

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 新增 stopGeneration 方法**

In `methods`, add:

```js
    stopGeneration() {
      if (this.currentAbort) this.currentAbort.abort()
    },
```

- [ ] **Step 2: 发送按钮变形为停止按钮**

In the template, find the send button (the `<button @click="sendMessage" ... class="send-btn">` with the paper-plane SVG). Replace the whole button element with:

```html
            <button
              @click="loading ? stopGeneration() : sendMessage()"
              :disabled="!loading && (!inputMessage.trim())"
              :class="['send-btn', { stopping: loading }]"
              :title="loading ? '停止生成' : '发送'"
            >
              <svg v-if="!loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
              <svg v-else class="stop-glyph" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
```

- [ ] **Step 3: 停止状态样式**

In `<style scoped>`, add:

```css
.send-btn.stopping {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(239, 68, 68, 0.85));
  animation: stopPulse 1.1s ease-in-out infinite;
}
.send-btn .stop-glyph {
  width: 14px;
  height: 14px;
  color: #0a0e1a;
}
@keyframes stopPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
  50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
}
```

- [ ] **Step 4: 「已中断」标记样式（模板接入在 Task 10 统一）**

In `<style scoped>`, add（模板接入在 Task 10 完成；此处先备好样式）：

```css
.stopped-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 4px;
}
```

- [ ] **Step 5: 验证（手动）**

Run: `npm run dev`
- 发送提问，流式过程中发送按钮变为琥珀色 `■` 并脉冲。
- 点击它 → 流停止，按钮变回发送图标；回答气泡底部需显示「⏹ 已中断」（接入在 Task 10；本步先确认 `msg.stopped` 在 Vue devtools 里为 true 且内容保留）。
- 用 Vue Devtools 检查该 assistant 消息：`stopped: true`、`streaming: false`、`content` 为已生成部分。

- [ ] **Step 6: 提交**

```bash
git add src/App.vue
git commit -m "feat: stop generation with send-button morph + AbortController"
```

---

## Task 7: 重新生成

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 新增 regenerate 方法**

In `methods`, add:

```js
    regenerate() {
      if (this.loading) return
      const m = this.messages
      // find last assistant message and the user question preceding it
      let aiIdx = -1
      for (let i = m.length - 1; i >= 0; i--) {
        if (m[i].role === 'assistant') { aiIdx = i; break }
      }
      if (aiIdx === -1) return
      const ai = m[aiIdx]
      const userQ = m[aiIdx - 1] && m[aiIdx - 1].role === 'user' ? m[aiIdx - 1].content : null
      if (!userQ) return
      sessionStore.removeMessage(ai.id)
      this._runCompletion(userQ, ai.isDeepThink ?? this.deepThink)
    },
```

- [ ] **Step 2: 验证（手动）**

Run: `npm run dev`
- 完成一次问答后，调用 `regenerate`（按钮在 Task 10 接入；本步可在 Vue Devtools 的组件方法里直接触发 `regenerate()`，或临时在浏览器控制台 `__VUE__` 实例调用）。
- 确认：旧回答被移除，新的流式回答从空开始重新生成；深度思考标志沿用原回答的 `isDeepThink`。
- 重新生成中途点停止仍有效。

> 模板按钮在 Task 10 的「动作工具栏」中接入。本任务只交付逻辑。

- [ ] **Step 3: 提交**

```bash
git add src/App.vue
git commit -m "feat: regenerate last answer in place"
```

---

## Task 8: 会话抽屉（UI + 方法 + 自动标题）

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 抽屉相关方法**

In `methods`, add:

```js
    toggleDrawer() {
      this.drawerOpen = !this.drawerOpen
    },
    closeDrawer() {
      this.drawerOpen = false
    },
    startNewChat() {
      sessionStore.createSession()
      this.drawerOpen = false
      this.inputMessage = ''
    },
    switchSession(id) {
      sessionStore.setActive(id)
      this.drawerOpen = false
      this.$nextTick(() => this.scrollToBottom())
    },
    startRename(s) {
      this.editingId = s.id
      this.editingTitle = s.title
    },
    commitRename() {
      if (this.editingId != null) {
        const t = (this.editingTitle || '').trim() || '新对话'
        sessionStore.renameSession(this.editingId, t)
      }
      this.editingId = null
      this.editingTitle = ''
    },
    cancelRename() {
      this.editingId = null
      this.editingTitle = ''
    },
    requestDelete(id) {
      this.confirmDeleteId = id
    },
    confirmDelete() {
      if (this.confirmDeleteId != null) {
        sessionStore.deleteSession(this.confirmDeleteId)
      }
      this.confirmDeleteId = null
    },
    cancelDelete() {
      this.confirmDeleteId = null
    },
    formatRelativeTime(ts) {
      if (!ts) return ''
      const diff = Date.now() - ts
      const min = Math.floor(diff / 60000)
      if (min < 1) return 'JUST NOW'
      if (min < 60) return min + 'M AGO'
      const hr = Math.floor(min / 60)
      if (hr < 24) return hr + 'H AGO'
      const day = Math.floor(hr / 24)
      if (day === 1) return 'YESTERDAY'
      if (day < 7) return day + 'D AGO'
      return new Date(ts).toLocaleDateString()
    },
```

- [ ] **Step 2: Header 加 ☰ 按钮**

In the template `<header class="app-header">`, inside `<div class="header-left">`, **before** `<div class="logo-group">`, add:

```html
        <button class="drawer-toggle" @click="toggleDrawer" title="会话记录">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>
          </svg>
        </button>
```

- [ ] **Step 3: 抽屉模板**

In the template, immediately after the closing `</header>` (before `<!-- Main Content -->`), add:

```html
    <!-- Session drawer -->
    <transition name="drawer">
      <div v-if="drawerOpen" class="drawer-scrim" @click="closeDrawer">
        <aside class="session-drawer" @click.stop>
          <div class="drawer-head">
            <span class="drawer-title">会话记录</span>
            <button class="drawer-new" @click="startNewChat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4.5v15m7.5-7.5h-15"/></svg>
              新对话
            </button>
          </div>

          <div class="drawer-list">
            <div
              v-for="s in sessions"
              :key="s.id"
              :class="['session-row', { active: s.id === activeSession?.id }]"
              @click="editingId === s.id ? null : switchSession(s.id)"
            >
              <span class="session-node"></span>
              <div class="session-main">
                <input
                  v-if="editingId === s.id"
                  v-model="editingTitle"
                  class="session-rename-input"
                  @keyup.enter="commitRename"
                  @keyup.esc="cancelRename"
                  @blur="commitRename"
                  ref="renameInput"
                />
                <span v-else class="session-name">{{ s.title }}</span>
                <span class="session-time">{{ formatRelativeTime(s.updatedAt) }}</span>
              </div>
              <div class="session-actions" v-if="editingId !== s.id">
                <button class="icon-btn" title="重命名" @click.stop="startRename(s)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16.86 4.49l2.65 2.65M3 21l.7-3.5 11.7-11.7 2.8 2.8L6.5 20.3 3 21z"/></svg>
                </button>
                <button class="icon-btn danger" title="删除" @click.stop="requestDelete(s.id)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 7h12M9 7V4h6v3m-7 0l1 13h6l1-13"/></svg>
                </button>
              </div>
            </div>
            <div v-if="sessions.length === 0" class="drawer-empty">暂无会话</div>
          </div>

          <div class="drawer-foot">
            <button class="drawer-export" @click="exportSession" :disabled="!messages.length">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/></svg>
              导出当前会话
            </button>
          </div>
        </aside>
      </div>
    </transition>

    <!-- Delete confirm -->
    <transition name="fade">
      <div v-if="confirmDeleteId != null" class="modal-scrim" @click="cancelDelete">
        <div class="modal-box" @click.stop>
          <p class="modal-text">确定删除该会话？此操作不可撤销。</p>
          <div class="modal-actions">
            <button class="modal-btn ghost" @click="cancelDelete">取消</button>
            <button class="modal-btn danger" @click="confirmDelete">删除</button>
          </div>
        </div>
      </div>
    </transition>
```

- [ ] **Step 4: 抽屉样式**

In `<style scoped>`, add:

```css
/* ===== Session Drawer ===== */
.drawer-toggle {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  background: transparent; border: 1px solid var(--border);
  border-radius: 10px; color: var(--text-secondary);
  cursor: none; transition: all 0.25s ease; margin-right: 12px;
}
.drawer-toggle:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
.drawer-toggle svg { width: 18px; height: 18px; }

.drawer-scrim {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(2px);
}
.session-drawer {
  position: absolute; top: 0; left: 0; bottom: 0;
  width: 300px; max-width: 85vw;
  background: rgba(3, 7, 16, 0.85); backdrop-filter: blur(20px);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  background-image: repeating-linear-gradient(0deg, rgba(0,229,195,0.03) 0px, rgba(0,229,195,0.03) 1px, transparent 1px, transparent 24px);
}
.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 18px 12px;
  border-bottom: 1px solid rgba(0, 229, 195, 0.15);
}
.drawer-title {
  font-family: var(--font-display); font-size: 13px; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-primary);
}
.drawer-new {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border: 1px solid var(--accent); border-radius: 16px;
  background: transparent; color: var(--accent); font-size: 12px;
  cursor: none; transition: all 0.25s ease;
}
.drawer-new:hover { background: var(--accent-dim); }
.drawer-new svg { width: 13px; height: 13px; }

.drawer-list { flex: 1; overflow-y: auto; padding: 8px; }
.session-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 10px; border-radius: 8px; cursor: none;
  transition: all 0.2s ease; position: relative;
}
.session-row:hover { background: var(--accent-dim); transform: translateX(2px); }
.session-row.active { background: var(--accent-dim); }
.session-row.active::before {
  content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 2px;
  background: var(--accent); border-radius: 2px; box-shadow: 0 0 8px var(--accent-glow);
}
.session-node {
  width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
  background: var(--text-muted);
}
.session-row.active .session-node { background: var(--accent); box-shadow: 0 0 8px var(--accent-glow); }
.session-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.session-name {
  font-size: 13px; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.session-row.active .session-name { color: var(--accent); }
.session-time {
  font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em;
  color: var(--text-muted); text-transform: uppercase;
}
.session-rename-input {
  background: rgba(0, 0, 0, 0.4); border: 1px solid var(--accent);
  border-radius: 4px; padding: 2px 6px; color: var(--accent);
  font-family: var(--font-mono); font-size: 13px; outline: none; width: 100%;
}
.session-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.2s ease; }
.session-row:hover .session-actions { opacity: 1; }
.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; background: transparent; border: none;
  color: var(--text-muted); cursor: none; border-radius: 5px; transition: all 0.2s ease;
}
.icon-btn:hover { color: var(--accent); background: rgba(0, 229, 195, 0.1); }
.icon-btn.danger:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
.icon-btn svg { width: 14px; height: 14px; }
.drawer-empty { padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px; }
.drawer-foot { padding: 12px 18px; border-top: 1px solid var(--border); }
.drawer-export {
  display: inline-flex; align-items: center; gap: 6px; width: 100%; justify-content: center;
  padding: 9px; border: 1px solid var(--border); border-radius: 8px;
  background: transparent; color: var(--text-secondary); font-size: 12px;
  cursor: none; transition: all 0.25s ease;
}
.drawer-export:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.drawer-export:disabled { opacity: 0.4; cursor: not-allowed; }
.drawer-export svg { width: 14px; height: 14px; }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s ease; }
.drawer-enter-active .session-drawer, .drawer-leave-active .session-drawer { transition: transform 0.25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .session-drawer, .drawer-leave-to .session-drawer { transform: translateX(-100%); }

/* ===== Modal ===== */
.modal-scrim {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: rgba(10, 14, 26, 0.95); border: 1px solid var(--border);
  border-radius: 12px; padding: 24px; max-width: 360px; width: 90%;
}
.modal-text { color: var(--text-primary); font-size: 14px; margin: 0 0 18px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.modal-btn {
  padding: 8px 16px; border-radius: 8px; font-size: 13px; cursor: none;
  border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
  transition: all 0.2s ease;
}
.modal-btn.ghost:hover { color: var(--text-primary); }
.modal-btn.danger { background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.4); color: #ef4444; }
.modal-btn.danger:hover { background: rgba(239, 68, 68, 0.25); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
```

- [ ] **Step 5: 自动重命名输入聚焦**

In `methods`, add a watcher-friendly focus helper and a `watch` block on the component (alongside `computed`):

```js
  watch: {
    editingId(id) {
      if (id != null) {
        this.$nextTick(() => {
          const inputs = this.$refs.renameInput
          const el = Array.isArray(inputs) ? inputs[0] : inputs
          if (el && el.focus) el.focus()
        })
      }
    },
  },
```

- [ ] **Step 6: 验证（手动）**

Run: `npm run dev`
- 点 ☰ → 抽屉从左滑出，带磨砂玻璃 + 扫描线纹理。
- 「新对话」→ 切到空会话（欢迎页）；首条提问后会话标题变为提问前 15 字。
- 列表显示会话名 + 相对时间（`JUST NOW`/`5M AGO`/`YESTERDAY`）；活跃项有青色左条 + 辉光。
- hover 出现重命名/删除图标：重命名内联可改（Enter 提交、Esc 取消）；删除弹确认框。
- 删除当前会话 → 自动切到最近一个。
- 导出按钮在无消息时禁用。

- [ ] **Step 7: 提交**

```bash
git add src/App.vue
git commit -m "feat: session drawer (new/switch/rename/delete) + auto-title"
```

---

## Task 9: 复制 / 导出

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 复制 + 导出方法**

In `methods`, add:

```js
    async copyAnswer(msg) {
      const text = msg.content || ''
      try {
        await navigator.clipboard.writeText(text)
      } catch {
        // fallback for non-HTTPS / no permission
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch {}
        document.body.removeChild(ta)
      }
      this.copiedMsgId = msg.id
      clearTimeout(this._copyTimer)
      this._copyTimer = setTimeout(() => { this.copiedMsgId = null }, 1200)
    },

    exportSession() {
      const s = sessionStore.getActive()
      if (!s || s.messages.length === 0) return
      let md = `# ${s.title}\n\n`
      for (const m of s.messages) {
        if (m.role === 'user') {
          md += `## 提问\n\n${m.content}\n\n`
        } else {
          md += `### 回答\n\n${m.content}\n\n`
        }
      }
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${s.title || '会话'}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
```

- [ ] **Step 2: 验证（手动）**

Run: `npm run dev`
- 完成一次问答，触发 `copyAnswer`（按钮在 Task 10 接入；本步可在 Vue Devtools 组件方法里直接调用 `copyAnswer({content:'# 测试\n正文'})`）。
- 粘贴 → 得到干净 markdown 原文（含 `#`、换行）。
- 触发 `exportSession` → 浏览器下载 `会话标题.md`，内容含 `# 标题` + `## 提问` / `### 回答` 分节。

> 模板按钮（复制/导出）在 Task 10 统一接入。本任务只交付逻辑。

- [ ] **Step 3: 提交**

```bash
git add src/App.vue
git commit -m "feat: copy answer + export session to markdown"
```

---

## Task 10: 动作工具栏 + 停止标记接入（视觉统一）

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 给 assistant 回答加动作工具栏 + 停止标记**

In the template, find the answer bubble block:

```html
                <div v-if="msg.role === 'assistant'" class="answer-content"><span v-html="formatAnswer(msg.content)"></span><span v-if="msg.streaming" class="typing-cursor"></span></div>
```

Replace it with:

```html
                <div v-if="msg.role === 'assistant'" class="answer-content">
                  <span v-html="formatAnswer(msg.content)"></span>
                  <span v-if="msg.streaming" class="typing-cursor"></span>
                  <div v-if="msg.stopped" class="stopped-chip">⏹ 已中断</div>
                  <div v-if="!msg.streaming && msg.content" class="answer-actions">
                    <button class="action-link" @click="copyAnswer(msg)">
                      <span v-if="copiedMsgId === msg.id" class="copy-ok">✓ 已复制</span>
                      <template v-else>复制</template>
                    </button>
                    <span class="action-sep">·</span>
                    <button class="action-link" @click="regenerate">重新生成</button>
                  </div>
                </div>
```

- [ ] **Step 2: 动作工具栏样式**

In `<style scoped>`, add:

```css
.answer-actions {
  display: flex; align-items: center; gap: 6px;
  margin-top: 10px; opacity: 0.55; transition: opacity 0.2s ease;
}
.message-bubble:hover .answer-actions { opacity: 1; }
.action-link {
  background: none; border: none; padding: 0;
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.05em;
  color: var(--text-muted); cursor: none; transition: color 0.2s ease;
}
.action-link:hover { color: var(--accent); }
.copy-ok { color: var(--accent); }
.action-sep { color: var(--text-muted); font-size: 11px; }
```

（`.stopped-chip` 已在 Task 6 Step 4 添加。）

- [ ] **Step 3: 验证（手动）**

Run: `npm run dev`
- 回答完成后，气泡底部出现低透明 `复制 · 重新生成`；hover 气泡时提亮至青色。
- 点「复制」→ 变为「✓ 已复制」（青色）约 1.2s 后还原；粘贴得 markdown 原文。
- 点「重新生成」→ 旧回答被替换为新流式回答。
- 中断的回答底部显示 `⏹ 已中断` 琥珀色胶囊。

- [ ] **Step 4: 提交**

```bash
git add src/App.vue
git commit -m "feat: per-answer action toolbar (copy/regenerate) + stopped chip"
```

---

## Task 11: 验收与构建

**Files:** 无（验证 + 构建）

- [ ] **Step 1: 单元测试全绿**

Run: `node --test src/sessionStore.test.js`
Expected: 16 tests PASS。

- [ ] **Step 2: 生产构建**

Run: `npm run build`
Expected: 构建成功，无报错（`dist/` 产出 `index.html` + assets）。

- [ ] **Step 3: 验收清单（对照设计文档 §9）**

依次手动确认（`npm run dev`）：
- [ ] 刷新后会话与消息仍在；新建/切换/重命名/删除均即时持久化。
- [ ] 流式中点停止 → 保留部分 + 「已中断」标记；`loading` 复位；可重新生成；重生途中可停。
- [ ] 复制粘出干净 markdown；导出得到合法 `.md`（标题 + 提问/回答分节）。
- [ ] localStorage 写入有防抖（DevTools Application 观察 `xinwen.sessions.v1` 不每 token 刷新）。
- [ ] 欢迎页、深度思考、来源标签、Markdown 渲染不回归。
- [ ] 新组件视觉与现有仪器面板风格一致（磨砂玻璃、青色强调、等宽标签）。

- [ ] **Step 4: 提交（如有收尾改动）**

```bash
git add -A
git commit -m "chore: round-1 acceptance pass"
```

---

## 自检结果（写计划后核对）

- **Spec 覆盖：** §1 架构(Task1-5) / §2 数据模型(Task1-3 store) / §3 会话管理(Task8 + Task5 自动标题) / §4 停止重生(Task5,6,7) / §5 复制导出(Task9) / §6 视觉(Task6,8,10) / §7 数据流(Task5) / §8 错误处理(Task1 配额、Task5 AbortError、Task9 剪贴板回退) / §9 验收(Task11) / §10 前向兼容(Task2/3 `ownerId` 恒 null + store 为唯一边界) —— 全覆盖。
- **占位符扫描：** 无 TBD/TODO；每个代码步骤含完整代码。
- **类型/命名一致性：** `sessionStore` 方法名（`createSession/getActive/ensureActive/setActive/deleteSession/renameSession/appendMessage/updateMessage/removeMessage/makeTitle/saveNow/load`）在所有任务中一致；`msgId`、`currentAbort`、`copiedMsgId`、`editingId`、`confirmDeleteId`、`drawerOpen` 贯穿一致。
- **执行注意：** App.vue 行号会随编辑漂移，故各任务以「结构性锚点 + 完整 old→new 代码块」描述，执行者按上下文定位即可。
