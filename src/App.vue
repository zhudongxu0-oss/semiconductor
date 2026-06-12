<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header" :class="{ scrolled: isScrolled }">
      <div class="header-left">
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

    <!-- Main Content -->
    <main class="app-main">
      <div class="chat-panel">
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

          <!-- Back to home button -->
          <div v-if="messages.length > 0" class="back-to-home">
            <button @click="goHome" class="back-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
              </svg>
              返回首页
            </button>
          </div>

          <!-- Chat Messages -->
          <div v-for="(msg, i) in messages" :key="msg.id" class="message-row" :class="msg.role">
            <div v-if="msg.role === 'assistant'" class="msg-avatar">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="6" y="6" width="20" height="20" rx="4" fill="rgba(0,229,195,0.15)" stroke="var(--accent)" stroke-width="1"/>
                <circle cx="16" cy="16" r="4" fill="var(--accent)"/>
              </svg>
            </div>
            <div class="message-bubble" :class="msg.role">
              <div v-if="msg.role === 'assistant'" class="answer-content" v-html="formatAnswer(msg.content)"></div>
              <div v-else class="question-content">{{ msg.content }}</div>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="message-row assistant">
            <div class="msg-avatar loading-avatar">
              <svg viewBox="0 0 32 32" fill="none">
                <rect x="6" y="6" width="20" height="20" rx="4" fill="rgba(0,229,195,0.15)" stroke="var(--accent)" stroke-width="1"/>
                <circle cx="16" cy="16" r="4" fill="var(--accent)"/>
              </svg>
            </div>
            <div class="message-bubble assistant loading-bubble">
              <div class="thinking-content">
                <div class="thinking-dots">
                  <span></span><span></span><span></span>
                </div>
                <div class="thinking-text">
                  <span class="thinking-label">思考中</span>
                  <span class="thinking-detail">正在检索知识库并分析问题...</span>
                </div>
              </div>
              <div class="loading-progress-bar">
                <div class="loading-progress-fill"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div class="input-area">
          <div class="input-wrapper">
            <div class="input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
              </svg>
            </div>
            <input
              v-model="inputMessage"
              type="text"
              placeholder="输入你的工艺问题..."
              :disabled="loading"
              @keydown.enter="sendMessage"
              class="chat-input"
              ref="inputRef"
            />
            <button
              @click="sendMessage"
              :disabled="!inputMessage.trim() || loading"
              class="send-btn"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </div>
          <div class="input-hint">
            <span class="hint-key">Enter</span> 发送
            <span class="hint-dot">·</span>
            <span class="hint-tag">知识库 + AI 增强</span>
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
let msgId = 0

export default {
  data() {
    return {
      messages: [],
      inputMessage: '',
      loading: false,
      isScrolled: false,
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
  mounted() {
    this.shuffleQuestions()
    window.addEventListener('scroll', this.handleScroll)
    window.addEventListener('mousemove', this.handleEyeFollow)
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('mousemove', this.handleEyeFollow)
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
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
    },
    askQuestion(q) {
      this.inputMessage = q
      this.sendMessage()
    },
    goHome() {
      this.messages = []
      this.inputMessage = ''
    },
    async sendMessage() {
      if (!this.inputMessage.trim() || this.loading) return
      const question = this.inputMessage.trim()
      this.messages.push({ id: ++msgId, role: 'user', content: question })
      this.inputMessage = ''
      this.loading = true
      this.$nextTick(() => this.scrollToBottom())

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question })
        })
        const data = await res.json()
        this.messages.push({
          id: ++msgId,
          role: 'assistant',
          content: data.answer || data.error || '回答生成失败',
          sources: data.sources || []
        })
      } catch (e) {
        this.messages.push({
          id: ++msgId,
          role: 'assistant',
          content: '服务暂时不可用，请稍后重试。'
        })
      } finally {
        this.loading = false
        this.$nextTick(() => this.scrollToBottom())
        this.$refs.inputRef?.focus()
      }
    },
    scrollToBottom() {
      const el = this.$refs.messagesRef
      if (el) el.scrollTop = el.scrollHeight
    }
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

/* ===== Back to Home ===== */
.back-to-home {
  display: flex;
  justify-content: center;
  padding: 12px 0 20px;
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

.question-content {
  white-space: pre-wrap;
}

.answer-content :deep(strong) {
  color: var(--accent);
  font-weight: 600;
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

.thinking-text {
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
