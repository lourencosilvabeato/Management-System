'use client'

import { useEffect, useRef } from 'react'

export function AnimatedBackground() {
  const wrap1 = useRef<HTMLDivElement>(null)
  const wrap2 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ticking = false
    const onMove = (e: MouseEvent) => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2
        const y = (e.clientY / window.innerHeight - 0.5) * 2
        if (wrap1.current) {
          wrap1.current.style.setProperty('--px', `${x * 45}px`)
          wrap1.current.style.setProperty('--py', `${y * 35}px`)
        }
        if (wrap2.current) {
          wrap2.current.style.setProperty('--px', `${-x * 30}px`)
          wrap2.current.style.setProperty('--py', `${-y * 25}px`)
        }
        ticking = false
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Blob 1 — indigo, mouse-tracked */}
      <div
        ref={wrap1}
        className="absolute"
        style={{
          left: '28%',
          top: '38%',
          translate: 'var(--px, 0) var(--py, 0)',
          transition: 'translate 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div
          className="w-[780px] h-[580px] rounded-full"
          style={{
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(ellipse at center, rgba(99,102,241,0.38) 0%, rgba(99,102,241,0.14) 45%, transparent 70%)',
            filter: 'blur(64px)',
            animation: 'aurora-1 11s ease-in-out infinite',
          }}
        />
      </div>

      {/* Blob 2 — violet, mouse-tracked */}
      <div
        ref={wrap2}
        className="absolute"
        style={{
          left: '72%',
          top: '28%',
          translate: 'var(--px, 0) var(--py, 0)',
          transition: 'translate 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div
          className="w-[600px] h-[500px] rounded-full"
          style={{
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(ellipse at center, rgba(139,92,246,0.32) 0%, rgba(139,92,246,0.10) 45%, transparent 70%)',
            filter: 'blur(80px)',
            animation: 'aurora-2 14s ease-in-out infinite',
          }}
        />
      </div>

      {/* Blob 3 — cyan, CSS-only drift */}
      <div
        className="absolute w-[550px] h-[420px] rounded-full"
        style={{
          left: '52%',
          top: '78%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(ellipse at center, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.07) 45%, transparent 70%)',
          filter: 'blur(90px)',
          animation: 'aurora-3 17s ease-in-out infinite',
        }}
      />

      {/* Subtle vignette to frame the content */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, transparent 50%, oklch(0.082 0.018 265 / 70%) 100%)',
        }}
      />
    </div>
  )
}
