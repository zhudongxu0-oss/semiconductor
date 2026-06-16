<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header" :class="{ scrolled: isScrolled }">
      <div class="header-left">
        <button class="drawer-toggle" @click="toggleDrawer" title="会话记录">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>
          </svg>
        </button>
        <div class="logo-group">
          <div class="logo-chip">
            <svg class="chip-svg" viewBox="0 0 48 48" fill="none">
              <!-- Chip body -->
              <rect x="12" y="12" width="24" height="24" rx="3" fill="rgba(0,229,195,0.1)" stroke="var(--accent)" stroke-width="1"/>
              <!-- Die -->
              <rect x="17" y="17" width="14" height="14" rx="1" fill="rgba(0,229,195,0.15)"/>
              <!-- Circuit pattern -->
              <path d="M21 21h6v6h-6z" fill="none" stroke="var(--accent)" stroke-width="0.8"/>
              <circle cx="24" cy="24" r="2" fill="var(--accent)"/>
              <!-- Pins -->
              <line x1="8" y1="18" x2="12" y2="18" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="8" y1="24" x2="12" y2="24" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="8" y1="30" x2="12" y2="30" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="36" y1="18" x2="40" y2="18" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="36" y1="24" x2="40" y2="24" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="36" y1="30" x2="40" y2="30" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="18" y1="8" x2="18" y2="12" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="24" y1="8" x2="24" y2="12" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="30" y1="8" x2="30" y2="12" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="18" y1="36" x2="18" y2="40" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="24" y1="36" x2="24" y2="40" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
              <line x1="30" y1="36" x2="30" y2="40" stroke="var(--accent)" stroke-width="1" stroke-linecap="round"/>
            </svg>
            <div class="chip-pulse"></div>
          </div>
          <div class="logo-text">
            <span class="logo-name">芯问</span>
            <span class="logo-en">SEMI·ASK</span>
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="status-indicator">
          <span class="status-ring"></span>
          <span class="status-dot"></span>
        </div>
        <span class="status-text">ONLINE</span>
      </div>
    </header>

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

    <!-- Main Content -->
    <main class="app-main">
      <div class="chat-panel">
        <!-- Back to home (chat mode only) -->
        <div v-if="messages.length > 0" class="chat-back-home">
          <button @click="goHome" class="back-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
            </svg>
            返回首页
          </button>
        </div>
        <!-- Messages -->
        <div class="messages-area" ref="messagesRef">
          <!-- Welcome -->
          <div v-if="messages.length === 0" class="welcome-screen">
            <!-- Mascot -->
            <div class="mascot-container">
              <div class="mascot">
                <div class="mascot-body" ref="mascotBody">
                  <div class="mascot-face">
                    <div class="mascot-eye left" ref="eyeLeft">
                      <div class="eye-white">
                        <div class="eye-pupil" ref="pupilLeft"></div>
                      </div>
                    </div>
                    <div class="mascot-eye right" ref="eyeRight">
                      <div class="eye-white">
                        <div class="eye-pupil" ref="pupilRight"></div>
                      </div>
                    </div>
                    <div class="mascot-mouth"></div>
                  </div>
                  <div class="mascot-antenna">
                    <div class="antenna-tip"></div>
                  </div>
                </div>
                <div class="mascot-shadow"></div>
              </div>
              <div class="mascot-glow"></div>
            </div>

            <!-- Title -->
            <h1 class="welcome-title">
              <span class="title-char" v-for="(char, i) in '芯问'" :key="i" :style="{ animationDelay: `${i * 0.1 + 0.3}s` }">{{ char }}</span>
            </h1>
            <p class="welcome-sub">
              <span class="sub-line"></span>
              <span class="sub-text">RTP 工艺问题 · 即时解答</span>
              <span class="sub-line"></span>
            </p>
            <p class="welcome-desc">
              基于半导体行业知识库，为工程师提供快速、精准的技术问答
            </p>

            <!-- Quick Actions -->
            <div class="quick-actions">
              <button
                v-for="(s, i) in suggestions"
                :key="s"
                @click="askQuestion(s)"
                class="action-card"
                :style="{ animationDelay: `${i * 0.08 + 0.5}s` }"
              >
                <div class="action-icon">
                  <svg v-if="i === 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                  </svg>
                  <svg v-else-if="i === 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"/>
                    <path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z"/>
                  </svg>
                  <svg v-else-if="i === 2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                  </svg>
                </div>
                <div class="action-content">
                  <span class="action-text">{{ s }}</span>
                  <span class="action-hint">点击提问 →</span>
                </div>
              </button>
              <!-- Refresh icon -->
              <button @click="shuffleQuestions" class="refresh-icon-btn" title="换一批">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"/>
                </svg>
              </button>
            </div>

            <!-- Stats -->
            <div class="stats-row">
              <div class="stat-item" v-for="stat in stats" :key="stat.label">
                <span class="stat-value">{{ stat.value }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
            </div>
          </div>

          <!-- Chat Messages -->
          <div v-for="(msg, i) in messages" :key="msg.id" class="message-row" :class="msg.role">
            <div v-if="msg.role === 'assistant'" class="msg-avatar">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="6" y="6" width="20" height="20" rx="4" fill="rgba(0,229,195,0.15)" stroke="var(--accent)" stroke-width="1"/>
                <circle cx="16" cy="16" r="4" fill="var(--accent)"/>
              </svg>
            </div>
            <div class="message-content-col">
              <!-- Thinking process - unified block -->
              <div v-if="msg.isDeepThink && (msg.thinking || (msg.streaming && !msg.content))" class="thinking-block" :class="{ active: msg.streaming && !msg.content }">
                <div class="thinking-header" @click="msg.thinking && (msg.showThinking = !msg.showThinking)">
                  <span class="thinking-spinner" v-if="msg.streaming && !msg.content"></span>
                  <span class="thinking-icon" v-else>🧠</span>
                  <span class="thinking-text">{{ msg.streaming && !msg.content ? '正在深度分析...' : '思考过程' }}</span>
                  <span class="thinking-toggle" v-if="msg.thinking && !msg.streaming">{{ msg.showThinking ? '收起' : '展开' }}</span>
                </div>
                <div v-if="msg.showThinking && msg.thinking" class="thinking-body" v-html="formatAnswer(msg.thinking)"></div>
              </div>
              <!-- Answer - only show when there's content -->
              <div v-if="msg.content || (!msg.isDeepThink && msg.streaming)" class="message-bubble" :class="[msg.role, { 'deep-think': msg.isDeepThink }]">
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
                <div v-else class="question-content">{{ msg.content }}</div>
              </div>
              <!-- Sources -->
              <div v-if="msg.sources && msg.sources.length > 0" class="msg-sources">
                <span class="sources-label">📚 参考：</span>
                <span v-for="src in msg.sources" :key="src.question" class="source-tag">{{ src.question }}</span>
              </div>
            </div>
          </div>

          <!-- Chat Messages -->
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-tools">
            <button
              @click="deepThink = !deepThink"
              :class="['think-btn', { active: deepThink }]"
              :disabled="loading"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="think-icon">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
              </svg>
              <span>深度思考</span>
            </button>
          </div>
          <div class="input-wrapper">
            <input
              v-model="inputMessage"
              type="text"
              :placeholder="deepThink ? '深度思考模式，适合复杂问题...' : '输入你的工艺问题...'"
              :disabled="loading"
              @keydown.enter="sendMessage"
              class="chat-input"
              ref="inputRef"
            />
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
          </div>
          <div class="input-hint">
            <span class="hint-key">Enter</span> 发送
            <span class="hint-dot">·</span>
            <span class="hint-tag">{{ deepThink ? 'GLM-4-Plus 深度分析' : 'GLM-4-Flash 快速回答' }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Corner decorations -->
    <div class="corner-deco top-left"></div>
    <div class="corner-deco top-right"></div>
    <div class="corner-deco bottom-left"></div>
    <div class="corner-deco bottom-right"></div>
  </div>
</template>

<script>
import { marked } from 'marked'

// gfm: **bold**, lists, tables; breaks: single \n → <br> (matches prior behavior)
marked.setOptions({ gfm: true, breaks: true })
import sessionStore from './sessionStore.js'

let msgId = 0

export default {
  data() {
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
      currentAbort: null,
      allQuestions: [
        // RTP异常处理
        'RTP设备报警怎么处理？',
        'RTP温度不均匀怎么调整？',
        'RTP良率下降怎么排查？',
        'RTP出现颗粒污染怎么办？',
        // RTP工艺参数
        'RTP的关键工艺参数有哪些？',
        'RTP的升温速率怎么设定？',
        '什么是spike anneal？',
        '什么是millisecond anneal？',
        // RTP概念
        '什么是RTP？',
        'RTP和炉管退火有什么区别？',
        '什么是pyrometer？',
        // 半导体术语
        '什么是TD？',
        '什么是PE和PIE？',
        '什么是良率(Yield)？',
        // 工艺问题
        '什么是光刻工艺？',
        '良率下降怎么系统排查？'
      ],
      suggestions: [],
      stats: [
        { value: '200+', label: '知识条目' },
        { value: 'RTP', label: '专注领域' },
        { value: 'AI', label: '智能回答' }
      ]
    }
  },
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
  mounted() {
    sessionStore.load()
    if (!sessionStore.getActive()) sessionStore.createSession()
    this.shuffleQuestions()
    window.addEventListener('scroll', this.handleScroll)
    window.addEventListener('mousemove', this.handleEyeFollow)
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('mousemove', this.handleEyeFollow)
  },
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
  methods: {
    handleScroll() {
      this.isScrolled = window.scrollY > 10
    },
    shuffleQuestions() {
      const shuffled = [...this.allQuestions].sort(() => Math.random() - 0.5)
      this.suggestions = shuffled.slice(0, 4)
    },
    handleEyeFollow(e) {
      const mascot = this.$refs.mascotBody
      const pupilLeft = this.$refs.pupilLeft
      const pupilRight = this.$refs.pupilRight
      if (!mascot || !pupilLeft || !pupilRight) return

      const rect = mascot.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const dist = Math.sqrt(dx * dx + dy * dy)

      const maxOffset = 6
      const offset = Math.min(dist * 0.02, maxOffset)
      const angle = Math.atan2(dy, dx)
      const tx = Math.cos(angle) * offset
      const ty = Math.sin(angle) * offset

      pupilLeft.style.transform = `translate(${tx}px, ${ty}px)`
      pupilRight.style.transform = `translate(${tx}px, ${ty}px)`
    },
    formatAnswer(text) {
      if (!text) return ''
      return marked.parse(text)
    },
    askQuestion(q) {
      this.inputMessage = q
      this.sendMessage()
    },
    goHome() {
      sessionStore.createSession()
      this.drawerOpen = false
    },
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
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // Carry the incomplete tail across read boundaries so a `data:` line
          // split by TCP framing isn't lost. {stream:true} also handles multi-byte chars.
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop()       // keep the last (possibly partial) line

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'thinking') {
                const cur = sessionStore.getActive().messages.find((m) => m.id === aid)
                sessionStore.updateMessage(aid, { thinking: (cur.thinking || '') + data.content })
                this.$nextTick(() => {
                  const m = sessionStore.getActive().messages.find((x) => x.id === aid)
                  if (m.isDeepThink && !m.showThinking) {
                    sessionStore.updateMessage(aid, { showThinking: true })
                  }
                  const tb = document.querySelector('.thinking-block.active .thinking-body')
                  if (tb) tb.scrollTop = tb.scrollHeight
                })
              } else if (data.type === 'chunk') {
                const cur = sessionStore.getActive().messages.find((m) => m.id === aid)
                sessionStore.updateMessage(aid, { content: (cur.content || '') + data.content })
                if (this.loading) this.loading = false
                const m = sessionStore.getActive().messages.find((x) => x.id === aid)
                if (m.isDeepThink && m.thinking && m.showThinking) {
                  sessionStore.updateMessage(aid, { showThinking: false })
                }
                this.$nextTick(() => this.scrollToBottom())
              } else if (data.type === 'done') {
                sessionStore.updateMessage(aid, { streaming: false, sources: data.sources || [] })
                sessionStore.saveNow()
              }
            } catch (e) {
              // ignore a malformed line
            }
          }
        }
      } catch (err) {
        const aborted = err && err.name === 'AbortError'
        const m = sessionStore.getActive()?.messages.find((x) => x.id === aid)
        if (aborted) {
          sessionStore.updateMessage(aid, { streaming: false, stopped: true })
        } else {
          console.error('chat error:', err)
          const note = '\n\n（AI服务暂时不可用，请稍后重试或重新生成。）'
          sessionStore.updateMessage(aid, { streaming: false, content: (m?.content || '') + note })
        }
        sessionStore.saveNow()
      } finally {
        this.loading = false
        this.currentAbort = null
        this.$nextTick(() => this.scrollToBottom())
        this.$refs.inputRef?.focus()
      }
    },
    scrollToBottom() {
      const el = this.$refs.messagesRef
      if (el) el.scrollTop = el.scrollHeight
    },
    stopGeneration() {
      if (this.currentAbort) this.currentAbort.abort()
    },
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
  }
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ===== Header ===== */
.app-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: rgba(3, 7, 16, 0.6);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  transition: all 0.3s ease;
}

.app-header.scrolled {
  background: rgba(3, 7, 16, 0.9);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
}

.logo-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo-chip {
  position: relative;
  width: 40px;
  height: 40px;
}

.chip-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 8px var(--accent-glow));
}

.chip-pulse {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  opacity: 0;
  animation: chipPulse 2s ease-in-out infinite;
}

@keyframes chipPulse {
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(1.4); opacity: 0; }
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, var(--accent), var(--blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-en {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  color: var(--text-muted);
  text-transform: uppercase;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  position: relative;
  width: 10px;
  height: 10px;
}

.status-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1px solid var(--accent);
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.2); }
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent-glow);
}

.status-text {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--accent);
}

/* ===== Main ===== */
.app-main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 88px 24px 24px;
  min-height: 100vh;
}

.chat-panel {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
}

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

/* ===== Messages ===== */
.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 24px;
  scroll-behavior: smooth;
}

/* ===== Welcome ===== */
.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
  padding: 24px;
}

/* Mascot */
.mascot-container {
  position: relative;
  margin-bottom: 32px;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.mascot {
  position: relative;
  width: 80px;
  height: 80px;
}

.mascot-body {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--accent-dim), rgba(0, 131, 255, 0.1));
  border: 2px solid var(--accent);
  border-radius: 16px;
  position: relative;
  margin: 12px auto 0;
  box-shadow: 0 0 30px var(--accent-dim), inset 0 0 20px var(--accent-dim);
}

.mascot-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 4px;
}

.mascot-eye.left,
.mascot-eye.right {
  width: 18px;
  height: 18px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(255,255,255,0.5);
  position: relative;
  overflow: hidden;
}

.eye-white {
  width: 100%;
  height: 100%;
  position: relative;
}

.eye-pupil {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #0a0e17;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  margin-top: -5px;
  margin-left: -5px;
  transition: transform 0.1s ease-out;
}

.eye-pupil::after {
  content: '';
  position: absolute;
  width: 3px;
  height: 3px;
  background: #fff;
  border-radius: 50%;
  top: 2px;
  right: 2px;
}

/* Left eye: blinks at 0-33% and 50-58% */
.mascot-eye.left {
  animation: blinkLeft 6s ease-in-out infinite;
}

/* Right eye: blinks at 33-41% and 50-58% */
.mascot-eye.right {
  animation: blinkRight 6s ease-in-out infinite;
}

@keyframes blinkLeft {
  /* 0-33%: 单独眨左眼 */
  0%, 3%, 7% { transform: scaleY(1); }
  4%, 6% { transform: scaleY(0.05); }
  /* 50-58%: 双眼一起眨 */
  50%, 52%, 56% { transform: scaleY(1); }
  53%, 55% { transform: scaleY(0.05); }
  /* 其余时间正常 */
  100% { transform: scaleY(1); }
}

@keyframes blinkRight {
  /* 25-33%: 单独眨右眼 */
  25%, 28%, 32% { transform: scaleY(1); }
  29%, 31% { transform: scaleY(0.05); }
  /* 50-58%: 双眼一起眨 */
  50%, 52%, 56% { transform: scaleY(1); }
  53%, 55% { transform: scaleY(0.05); }
  /* 其余时间正常 */
  100% { transform: scaleY(1); }
}

.mascot-mouth {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 8px;
  border: 2px solid var(--accent);
  border-top: none;
  border-radius: 0 0 8px 8px;
}

.mascot-antenna {
  position: absolute;
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 2px;
  height: 12px;
  background: var(--accent);
}

.antenna-tip {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
  position: absolute;
  top: -4px;
  left: -2px;
  box-shadow: 0 0 12px var(--accent-glow);
  animation: antennaGlow 1.5s ease-in-out infinite;
}

@keyframes antennaGlow {
  0%, 100% { box-shadow: 0 0 8px var(--accent-glow); }
  50% { box-shadow: 0 0 20px var(--accent-glow), 0 0 40px var(--accent-dim); }
}

.mascot-shadow {
  width: 48px;
  height: 8px;
  background: radial-gradient(ellipse, var(--accent-dim), transparent);
  border-radius: 50%;
  margin: 8px auto 0;
}

.mascot-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, var(--accent-dim), transparent 70%);
  border-radius: 50%;
  z-index: -1;
}

/* Title */
.welcome-title {
  font-family: var(--font-display);
  font-size: 64px;
  font-weight: 900;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.title-char {
  display: inline-block;
  background: linear-gradient(180deg, #fff 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: charReveal 0.6s ease both;
  text-shadow: none;
  filter: drop-shadow(0 0 20px var(--accent-glow));
}

@keyframes charReveal {
  from { opacity: 0; transform: translateY(20px) scale(0.8); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.welcome-sub {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  animation: fadeSlideUp 0.6s ease 0.5s both;
}

.sub-line {
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}

.sub-text {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.welcome-desc {
  font-size: 15px;
  color: var(--text-secondary);
  max-width: 420px;
  line-height: 1.6;
  margin-bottom: 48px;
  animation: fadeSlideUp 0.6s ease 0.6s both;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  margin-bottom: 40px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: none;
  transition: all 0.3s ease;
  text-align: left;
  animation: fadeSlideUp 0.5s ease both;
  position: relative;
  overflow: hidden;
}

.action-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, var(--accent-dim), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-card:hover {
  border-color: var(--border-active);
  transform: translateY(-3px);
  box-shadow: 0 8px 32px rgba(0, 229, 195, 0.15);
}

.action-card:hover::before {
  opacity: 1;
}

.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--accent-dim);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.action-icon svg {
  width: 18px;
  height: 18px;
  color: var(--accent);
}

.action-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  z-index: 1;
}

.action-text {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.4;
}

.action-hint {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.3s ease;
}

.action-card:hover .action-hint {
  opacity: 1;
  transform: translateX(0);
}

/* Refresh Icon */
.quick-actions {
  position: relative;
}

.refresh-icon-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--text-muted);
  cursor: none;
  transition: all 0.3s ease;
  z-index: 10;
}

.refresh-icon-btn svg {
  width: 14px;
  height: 14px;
}

.refresh-icon-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: rotate(180deg);
}

/* Stats */
.stats-row {
  display: flex;
  gap: 40px;
  animation: fadeSlideUp 0.6s ease 0.8s both;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.stat-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.05em;
}

/* ===== Back to Home (in chat-panel flow) ===== */
.chat-back-home {
  display: flex;
  justify-content: center;
  margin: 0 0 4px;
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: var(--font-body);
  cursor: none;
  transition: all 0.3s ease;
}

.back-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}

.back-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== Messages ===== */
.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: msgIn 0.4s ease;
}

.message-row.user {
  justify-content: flex-end;
}

.message-row.user .message-bubble {
  order: -1;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.msg-avatar svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 6px var(--accent-glow));
}

.message-bubble {
  max-width: 70%;
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  font-size: 14px;
  line-height: 1.7;
}

.message-bubble.user {
  background: linear-gradient(135deg, rgba(0, 131, 255, 0.25), rgba(0, 131, 255, 0.1));
  border: 1px solid rgba(0, 131, 255, 0.25);
  color: var(--text-primary);
  border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
}

.message-bubble.assistant {
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-primary);
  border-radius: var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px;
  backdrop-filter: blur(12px);
}

.message-bubble.deep-think {
  border-color: rgba(168, 85, 247, 0.3);
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.08), var(--bg-card));
}

.message-content-col {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thinking-block {
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: var(--radius);
  overflow: hidden;
  max-width: 100%;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
}

.thinking-block.active .thinking-header {
  color: #a855f7;
}

.thinking-icon {
  font-size: 14px;
}

.thinking-text {
  flex: 1;
}

.thinking-toggle {
  opacity: 0.5;
  font-size: 11px;
}

.thinking-toggle:hover {
  opacity: 1;
}

.thinking-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(168, 85, 247, 0.2);
  border-top-color: #a855f7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.thinking-body {
  padding: 0 14px 12px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-height: 150px;
  overflow-y: auto;
  scroll-behavior: smooth;
}

.msg-sources {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 11px;
}

.sources-label {
  color: var(--text-muted);
}

.source-tag {
  background: var(--accent-dim);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 4px;
}

.question-content {
  white-space: pre-wrap;
}

.answer-content :deep(strong) {
  color: var(--accent);
  font-weight: 600;
}

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

/* Rendered markdown inside chat answers / thinking blocks */
.answer-content :deep(p) {
  margin: 6px 0;
}
.answer-content :deep(p:first-child) {
  margin-top: 0;
}
.answer-content :deep(p:last-child) {
  margin-bottom: 0;
}
.answer-content :deep(h1),
.answer-content :deep(h2),
.answer-content :deep(h3),
.answer-content :deep(h4),
.answer-content :deep(h5),
.answer-content :deep(h6) {
  margin: 12px 0 6px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.4;
}
.answer-content :deep(h1) { font-size: 18px; }
.answer-content :deep(h2) { font-size: 16px; }
.answer-content :deep(h3) { font-size: 15px; color: var(--accent); }
.answer-content :deep(h4),
.answer-content :deep(h5),
.answer-content :deep(h6) { font-size: 14px; color: var(--accent); }
.answer-content :deep(ul),
.answer-content :deep(ol) {
  margin: 6px 0;
  padding-left: 20px;
}
.answer-content :deep(li) {
  margin: 3px 0;
}
.answer-content :deep(code) {
  font-family: var(--font-mono);
  font-size: 12px;
  background: rgba(0, 229, 195, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
}
.answer-content :deep(pre) {
  margin: 8px 0;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
}
.answer-content :deep(pre code) {
  background: none;
  padding: 0;
}
.answer-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 13px;
}
.answer-content :deep(th),
.answer-content :deep(td) {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
}
.answer-content :deep(th) {
  color: var(--accent);
}
.answer-content :deep(blockquote) {
  margin: 6px 0;
  padding-left: 12px;
  border-left: 2px solid var(--accent);
  color: var(--text-secondary);
}

/* Thinking block uses smaller type */
.thinking-body :deep(p) { margin: 4px 0; }
.thinking-body :deep(h1),
.thinking-body :deep(h2),
.thinking-body :deep(h3),
.thinking-body :deep(h4) { margin: 8px 0 4px; font-weight: 600; }
.thinking-body :deep(ul),
.thinking-body :deep(ol) { margin: 4px 0; padding-left: 18px; }
.thinking-body :deep(li) { margin: 2px 0; }

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--accent);
  margin-left: 2px;
  animation: blink 0.8s ease-in-out infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Loading */
.loading-bubble {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  min-width: 200px;
}

.loading-avatar {
  animation: avatarPulse 1.5s ease-in-out infinite;
}

@keyframes avatarPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.thinking-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
  animation: dotBounce 1.2s ease-in-out infinite;
}

.thinking-dots span:nth-child(2) { animation-delay: 0.15s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes dotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-8px); opacity: 1; }
}

.thinking-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.thinking-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.thinking-detail {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.loading-progress-bar {
  width: 100%;
  height: 2px;
  background: var(--border);
  border-radius: 1px;
  overflow: hidden;
}

.loading-progress-fill {
  width: 30%;
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--blue));
  border-radius: 1px;
  animation: progressSlide 1.5s ease-in-out infinite;
}

@keyframes progressSlide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}

/* ===== Input ===== */
.input-area {
  padding-top: 16px;
  flex-shrink: 0;
}

.input-tools {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.think-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-muted);
  font-size: 12px;
  font-family: var(--font-body);
  cursor: none;
  transition: all 0.3s ease;
}

.think-btn:hover {
  border-color: #a855f7;
  color: #a855f7;
}

.think-btn.active {
  background: rgba(168, 85, 247, 0.15);
  border-color: #a855f7;
  color: #a855f7;
}

.think-icon {
  width: 14px;
  height: 14px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  transition: all 0.3s ease;
}

.input-wrapper:focus-within {
  border-color: var(--border-active);
  box-shadow: 0 0 0 4px var(--accent-dim), 0 8px 32px rgba(0, 0, 0, 0.2);
}

.input-icon {
  width: 20px;
  height: 20px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.input-icon svg {
  width: 100%;
  height: 100%;
}

.chat-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-primary);
  padding: 10px 0;
}

.chat-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--accent), var(--blue));
  color: white;
  cursor: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.send-btn svg {
  width: 18px;
  height: 18px;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.08);
  box-shadow: 0 4px 20px var(--accent-glow);
}

.send-btn:disabled {
  background: var(--border);
  color: var(--text-muted);
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

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

.input-hint {
  text-align: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.hint-key {
  padding: 2px 6px;
  background: var(--border);
  border-radius: 4px;
  font-size: 9px;
}

.hint-dot {
  opacity: 0.3;
}

.hint-tag {
  color: var(--accent);
  opacity: 0.6;
}

/* ===== Corner Decorations ===== */
.corner-deco {
  position: fixed;
  width: 60px;
  height: 60px;
  pointer-events: none;
  z-index: 5;
}

.corner-deco::before,
.corner-deco::after {
  content: '';
  position: absolute;
  background: var(--accent);
  opacity: 0.15;
}

.corner-deco.top-left {
  top: 16px;
  left: 16px;
}
.corner-deco.top-left::before {
  top: 0;
  left: 0;
  width: 24px;
  height: 1px;
}
.corner-deco.top-left::after {
  top: 0;
  left: 0;
  width: 1px;
  height: 24px;
}

.corner-deco.top-right {
  top: 16px;
  right: 16px;
}
.corner-deco.top-right::before {
  top: 0;
  right: 0;
  width: 24px;
  height: 1px;
}
.corner-deco.top-right::after {
  top: 0;
  right: 0;
  width: 1px;
  height: 24px;
}

.corner-deco.bottom-left {
  bottom: 16px;
  left: 16px;
}
.corner-deco.bottom-left::before {
  bottom: 0;
  left: 0;
  width: 24px;
  height: 1px;
}
.corner-deco.bottom-left::after {
  bottom: 0;
  left: 0;
  width: 1px;
  height: 24px;
}

.corner-deco.bottom-right {
  bottom: 16px;
  right: 16px;
}
.corner-deco.bottom-right::before {
  bottom: 0;
  right: 0;
  width: 24px;
  height: 1px;
}
.corner-deco.bottom-right::after {
  bottom: 0;
  right: 0;
  width: 1px;
  height: 24px;
}

/* ===== Animations ===== */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== Mobile Responsive ===== */
@media (max-width: 768px) {
  .app-header {
    padding: 0 16px;
    height: 56px;
  }

  .logo-chip {
    width: 32px;
    height: 32px;
  }

  .logo-name {
    font-size: 15px;
  }

  .logo-en {
    font-size: 8px;
  }

  .app-main {
    padding: 72px 16px 16px;
  }

  .chat-panel {
    height: calc(100vh - 88px);
  }

  .welcome-title {
    font-size: 42px;
  }

  .mascot-container {
    transform: scale(0.85);
  }

  .quick-actions {
    grid-template-columns: 1fr;
    max-width: 100%;
  }

  .stats-row {
    gap: 24px;
  }

  .stat-value {
    font-size: 16px;
  }

  .message-bubble {
    max-width: 85%;
  }

  .corner-deco {
    display: none;
  }

  .input-hint {
    display: none;
  }
}

@media (max-width: 480px) {
  .welcome-title {
    font-size: 36px;
  }

  .welcome-desc {
    font-size: 13px;
  }

  .action-card {
    padding: 12px;
  }

  .action-icon {
    width: 32px;
    height: 32px;
  }

  .action-icon svg {
    width: 16px;
    height: 16px;
  }

  .action-text {
    font-size: 12px;
  }
}
</style>
