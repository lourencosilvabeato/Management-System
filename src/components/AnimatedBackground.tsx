'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
}

const PARTICLE_COUNT = 72
const MAX_DIST = 140
const BASE_SPEED = 0.30
const MOUSE_RADIUS = 180
const MOUSE_FORCE = 0.005

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999 })
  const particles = useRef<Particle[]>([])
  const raf = useRef<number>(0)
  const paused = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particles.current.forEach((p) => {
        p.x = Math.min(p.x, canvas.width)
        p.y = Math.min(p.y, canvas.height)
      })
    }

    const initParticles = () => {
      particles.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * BASE_SPEED * 2,
        vy: (Math.random() - 0.5) * BASE_SPEED * 2,
        radius: Math.random() * 1.4 + 0.7,
        opacity: Math.random() * 0.30 + 0.20,
      }))
    }

    resize()
    initParticles()
    window.addEventListener('resize', resize, { passive: true })

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    const onVisibility = () => { paused.current = document.hidden }
    document.addEventListener('visibilitychange', onVisibility)

    const draw = () => {
      raf.current = requestAnimationFrame(draw)
      if (paused.current) return

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      const pts = particles.current
      const mx = mouse.current.x
      const my = mouse.current.y

      // Update positions
      for (const p of pts) {
        const dx = mx - p.x
        const dy = my - p.y
        const d = Math.hypot(dx, dy)

        if (d < MOUSE_RADIUS && d > 0) {
          p.vx += (dx / d) * MOUSE_FORCE
          p.vy += (dy / d) * MOUSE_FORCE
        }

        const spd = Math.hypot(p.vx, p.vy)
        const maxSpd = BASE_SPEED * 2.2
        if (spd > maxSpd) {
          p.vx = (p.vx / spd) * maxSpd
          p.vy = (p.vy / spd) * maxSpd
        }

        p.x += p.vx
        p.y += p.vy

        if (p.x < 0) { p.x = 0; p.vx *= -1 }
        if (p.x > w) { p.x = w; p.vx *= -1 }
        if (p.y < 0) { p.y = 0; p.vy *= -1 }
        if (p.y > h) { p.y = h; p.vy *= -1 }
      }

      // Connections — dark orange lines, subtle on white
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i]
          const b = pts[j]
          const dist = Math.hypot(a.x - b.x, a.y - b.y)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.12
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(180, 70, 15, ${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Nodes
      for (const p of pts) {
        const nearMouse = Math.hypot(mx - p.x, my - p.y)
        const highlight = nearMouse < 100 ? (1 - nearMouse / 100) * 0.9 : 0

        // Outer glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 5)
        grd.addColorStop(0, `rgba(200, 80, 20, ${(p.opacity + highlight * 0.3) * 0.25})`)
        grd.addColorStop(1, 'rgba(200, 80, 20, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 5, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // Core dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius + highlight * 0.8, 0, Math.PI * 2)
        ctx.fillStyle = highlight > 0.2
          ? `rgba(210, 90, 20, ${p.opacity + highlight * 0.6})`
          : `rgba(185, 72, 18, ${p.opacity})`
        ctx.fill()
      }
    }

    raf.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Very subtle warm gradient tint */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            'radial-gradient(ellipse 70% 55% at 10% 10%, rgba(220,100,30,0.06) 0%, transparent 60%)',
            'radial-gradient(ellipse 60% 45% at 90% 90%, rgba(200,80,20,0.04) 0%, transparent 55%)',
          ].join(', '),
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
