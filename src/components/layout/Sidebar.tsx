'use client'

import Link from 'next/link'

interface Props {
  currentUser: {
    nome?: string | null
    email: string
    role: string
  }
}

const ROLE_LABELS: Record<string, string> = {
  account: 'Account',
  criativo: 'Criativo',
  producao: 'Produção',
  admin: 'Admin',
}

export function Sidebar({ currentUser }: Props) {
  const displayName = currentUser.nome ?? currentUser.email.split('@')[0]

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: '#000000',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 40,
        borderRight: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          aria-label="NIU"
          style={{
            width: 80,
            height: 80,
            borderRadius: 4,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.18)',
            background: '#ffffff',
            color: '#000000',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '1.125rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
          }}
        >
          NIU
        </div>
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.6875rem',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
          }}
        >
          Gestão
        </span>
      </div>

      {/* Nav section label */}
      <div style={{ padding: '20px 24px 8px' }}>
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.625rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.30)',
          }}
        >
          Comercial
        </span>
      </div>

      {/* Nav item — Propostas (active) */}
      <nav style={{ flex: 1 }}>
        <Link
          href="/propostas"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '11px 24px',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#ffffff',
            textDecoration: 'none',
            borderLeft: '3px solid #ffffff',
            background: 'rgba(255,255,255,0.08)',
          }}
        >
          Propostas
        </Link>
      </nav>

      {/* User info */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: '#ffffff',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </p>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            color: 'rgba(255,255,255,0.40)',
            margin: '3px 0 0',
          }}
        >
          {ROLE_LABELS[currentUser.role] ?? currentUser.role}
        </p>
      </div>
    </aside>
  )
}
