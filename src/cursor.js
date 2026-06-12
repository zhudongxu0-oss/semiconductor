// Custom cursor with chip design and click effects
class ChipCursor {
  constructor() {
    this.cursor = null
    this.cursorRing = null
    this.pos = { x: 0, y: 0 }
    this.target = { x: 0, y: 0 }
    this.isHovering = false
    this.isClicking = false
    this.rippleContainer = null
    this.init()
  }

  init() {
    // Create cursor elements
    this.cursor = document.createElement('div')
    this.cursor.className = 'custom-cursor'
    this.cursor.innerHTML = `
      <svg viewBox="0 0 32 32" fill="none" class="cursor-chip">
        <rect x="10" y="10" width="12" height="12" rx="2" fill="#00e5c3" fill-opacity="0.9" stroke="#00ffdb" stroke-width="1"/>
        <rect x="12" y="6" width="2" height="3" fill="#00e5c3"/>
        <rect x="18" y="6" width="2" height="3" fill="#00e5c3"/>
        <rect x="12" y="23" width="2" height="3" fill="#00e5c3"/>
        <rect x="18" y="23" width="2" height="3" fill="#00e5c3"/>
        <rect x="6" y="12" width="3" height="2" fill="#00e5c3"/>
        <rect x="6" y="18" width="3" height="2" fill="#00e5c3"/>
        <rect x="23" y="12" width="3" height="2" fill="#00e5c3"/>
        <rect x="23" y="18" width="3" height="2" fill="#00e5c3"/>
      </svg>
    `

    // Create outer ring
    this.cursorRing = document.createElement('div')
    // Create ripple container
    this.rippleContainer = document.createElement('div')
    this.rippleContainer.className = 'cursor-ripple-container'

    document.body.appendChild(this.rippleContainer)
    document.body.appendChild(this.cursor)

    this.bindEvents()
    this.animate()
  }

  bindEvents() {
    document.addEventListener('mousemove', (e) => {
      this.target.x = e.clientX
      this.target.y = e.clientY
    })

    document.addEventListener('mousedown', (e) => {
      this.isClicking = true
      this.createRipple(e.clientX, e.clientY)
      setTimeout(() => { this.isClicking = false }, 150)
    })

    document.addEventListener('mouseleave', () => {
      this.cursor.style.opacity = '0'
    })

    document.addEventListener('mouseenter', () => {
      this.cursor.style.opacity = '1'
    })

    // Hover detection
    const interactiveElements = 'a, button, input, [role="button"], .action-card, .send-btn'
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(interactiveElements)) {
        this.isHovering = true
        this.cursor.classList.add('hovering')
      }
    })

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(interactiveElements)) {
        this.isHovering = false
        this.cursor.classList.remove('hovering')
      }
    })
  }

  createRipple(x, y) {
    // Center dot
    const dot = document.createElement('div')
    dot.className = 'cursor-click-dot'
    dot.style.left = x + 'px'
    dot.style.top = y + 'px'
    this.rippleContainer.appendChild(dot)

    // Expanding ring
    const ring = document.createElement('div')
    ring.className = 'cursor-click-ring'
    ring.style.left = x + 'px'
    ring.style.top = y + 'px'
    this.rippleContainer.appendChild(ring)

    // Second ring
    const ring2 = document.createElement('div')
    ring2.className = 'cursor-click-ring'
    ring2.style.left = x + 'px'
    ring2.style.top = y + 'px'
    ring2.style.animationDelay = '0.1s'
    this.rippleContainer.appendChild(ring2)

    // Particles
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div')
      particle.className = 'cursor-click-particle'
      const angle = (i / 8) * Math.PI * 2
      const dist = 24 + Math.random() * 20
      particle.style.left = x + 'px'
      particle.style.top = y + 'px'
      particle.style.setProperty('--tx', Math.cos(angle) * dist + 'px')
      particle.style.setProperty('--ty', Math.sin(angle) * dist + 'px')
      this.rippleContainer.appendChild(particle)
    }

    setTimeout(() => {
      dot.remove()
      ring.remove()
      ring2.remove()
      this.rippleContainer.querySelectorAll('.cursor-click-particle').forEach(p => p.remove())
    }, 600)
  }

  animate() {
    // Smooth follow
    this.pos.x += (this.target.x - this.pos.x) * 0.35
    this.pos.y += (this.target.y - this.pos.y) * 0.35

    const scale = this.isClicking ? 0.85 : 1

    this.cursor.style.left = this.pos.x + 'px'
    this.cursor.style.top = this.pos.y + 'px'
    this.cursor.style.transform = `translate(-50%, -50%) scale(${scale})`

    // Eye follows mouse direction + blink
    const eye = this.cursor.querySelector('.cursor-eye')
    if (eye) {
      const dx = this.target.x - this.pos.x
      const dy = this.target.y - this.pos.y
      const angle = Math.atan2(dy, dx)
      const maxMove = 2
      const eyeX = 16 + Math.cos(angle) * maxMove
      const eyeY = 16 + Math.sin(angle) * maxMove
      
      // Blink: periodically flatten the eye
      const now = Date.now()
      const blinkCycle = now % 3000
      let scaleY = 1
      if (blinkCycle > 2800 && blinkCycle < 2850) scaleY = 0.1
      else if (blinkCycle > 2850 && blinkCycle < 2900) scaleY = 0.6
      else if (blinkCycle > 2900 && blinkCycle < 2950) scaleY = 0.2
      else if (blinkCycle > 2950) scaleY = 0.8
      
      eye.setAttribute('cx', eyeX)
      eye.setAttribute('cy', eyeY)
      eye.setAttribute('ry', 2 * scaleY)
    }

    requestAnimationFrame(() => this.animate())
  }
}

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new ChipCursor())
} else {
  new ChipCursor()
}
