// Particle canvas animation - circuit board style
const canvas = document.getElementById('particleCanvas')
const ctx = canvas.getContext('2d')

let particles = []
let connections = []
let mouse = { x: -1000, y: -1000 }
let animationId

function resize() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

class Particle {
  constructor() {
    this.reset()
  }

  reset() {
    this.x = Math.random() * canvas.width
    this.y = Math.random() * canvas.height
    this.vx = (Math.random() - 0.5) * 0.3
    this.vy = (Math.random() - 0.5) * 0.3
    this.radius = Math.random() * 1.5 + 0.5
    this.baseAlpha = Math.random() * 0.4 + 0.1
    this.alpha = this.baseAlpha
    this.pulseSpeed = Math.random() * 0.02 + 0.01
    this.pulsePhase = Math.random() * Math.PI * 2
    // Color: teal or blue
    this.hue = Math.random() > 0.6 ? 168 : 210
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.pulsePhase += this.pulseSpeed
    this.alpha = this.baseAlpha + Math.sin(this.pulsePhase) * 0.15

    // Mouse interaction
    const dx = mouse.x - this.x
    const dy = mouse.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 150) {
      const force = (150 - dist) / 150
      this.vx -= (dx / dist) * force * 0.02
      this.vy -= (dy / dist) * force * 0.02
      this.alpha = Math.min(this.alpha + force * 0.3, 0.8)
    }

    // Damping
    this.vx *= 0.99
    this.vy *= 0.99

    // Bounds
    if (this.x < 0 || this.x > canvas.width) this.vx *= -1
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1

    // Keep in bounds
    this.x = Math.max(0, Math.min(canvas.width, this.x))
    this.y = Math.max(0, Math.min(canvas.height, this.y))
  }

  draw() {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${this.alpha})`
    ctx.fill()

    // Glow
    if (this.alpha > 0.3) {
      ctx.beginPath()
      ctx.arc(this.x, this.y, this.radius * 3, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${this.alpha * 0.15})`
      ctx.fill()
    }
  }
}

function initParticles() {
  particles = []
  const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 80)
  for (let i = 0; i < count; i++) {
    particles.push(new Particle())
  }
}

function drawConnections() {
  const maxDist = 120
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < maxDist) {
        const alpha = (1 - dist / maxDist) * 0.15
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = `rgba(0, 229, 195, ${alpha})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
    }
  }
}

function drawMouseConnections() {
  const maxDist = 180
  for (let i = 0; i < particles.length; i++) {
    const dx = mouse.x - particles[i].x
    const dy = mouse.y - particles[i].y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < maxDist) {
      const alpha = (1 - dist / maxDist) * 0.3
      ctx.beginPath()
      ctx.moveTo(mouse.x, mouse.y)
      ctx.lineTo(particles[i].x, particles[i].y)
      ctx.strokeStyle = `rgba(0, 229, 195, ${alpha})`
      ctx.lineWidth = 0.8
      ctx.stroke()
    }
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles.forEach(p => {
    p.update()
    p.draw()
  })

  drawConnections()
  drawMouseConnections()

  animationId = requestAnimationFrame(animate)
}

// Mouse tracking
document.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX
  mouse.y = e.clientY
})

document.addEventListener('mouseleave', () => {
  mouse.x = -1000
  mouse.y = -1000
})

// Touch support
document.addEventListener('touchmove', (e) => {
  mouse.x = e.touches[0].clientX
  mouse.y = e.touches[0].clientY
})

document.addEventListener('touchend', () => {
  mouse.x = -1000
  mouse.y = -1000
})

window.addEventListener('resize', () => {
  resize()
  initParticles()
})

resize()
initParticles()
animate()
