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

/**
 * Debounced persist (~500ms). Use for high-frequency updates (e.g. per-token
 * streaming writes). For discrete user actions, use `saveNow()` instead.
 */
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

// ---- sessions ----
function genId(prefix = 's') {
  return prefix + '_' + Math.random().toString(36).slice(2, 10)
}

function makeTitle(q) {
  const t = (q || '').trim()
  if (!t) return '新对话'
  // Array.from iterates by code point so surrogate pairs (emoji etc.) aren't split.
  return Array.from(t).slice(0, 15).join('')
}

function createSession(title = '新对话') {
  const s = {
    id: genId(),
    title,
    ownerId: null,          // reserved for a future user system; always null this round
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
  genId, makeTitle,
  createSession, getActive, setActive, ensureActive, deleteSession, renameSession,
  appendMessage, updateMessage, removeMessage,
  setStorageAdapter, setClock, reset, getAdapterSnapshot, _rawSet,
}
