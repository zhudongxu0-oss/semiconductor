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
  store.createSession()
  store.saveNow()
  const captured = store.getAdapterSnapshot()
  assert.ok(captured, 'expected persisted JSON')

  store.reset()
  assert.equal(store.getActive(), null)
  store.load()
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
  assert.doesNotThrow(() => store.saveNow())
})

test('load handles corrupt JSON gracefully', () => {
  fresh()
  store.createSession()
  store.saveNow()
  store._rawSet('xinwen.sessions.v1', '{not json')
  store.reset()
  assert.doesNotThrow(() => store.load())
  assert.equal(store.getActive(), null)
})

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
