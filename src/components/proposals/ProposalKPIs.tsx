'use client'

import type { Proposal } from '@/payload-types'

interface Props {
  proposals: Proposal[]
}

export function ProposalKPIs({ proposals }: Props) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const active = proposals.filter((p) => !['Ganha', 'Perdida'].includes(p.estado ?? ''))

  const pipeline = active.reduce(
    (s, p) => s + (typeof p.valorVendaFinal === 'number' ? p.valorVendaFinal : 0),
    0,
  )

  const wonMonth = proposals.filter(
    (p) => p.estado === 'Ganha' && p.updatedAt >= startOfMonth,
  ).length

  const enviada = proposals.filter((p) => p.estado === 'Enviada').length

  const kpis = [
    { label: 'Propostas activas', value: active.length },
    {
      label: 'Pipeline total',
      value: pipeline > 0
        ? `${pipeline.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}€`
        : '—',
    },
    { label: 'Ganhas este mês', value: wonMonth },
    { label: 'Em Enviada', value: enviada },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            background: '#ffffff',
            border: '1px solid #eeeeee',
            borderRadius: 2,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '0.5625rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#999999',
            }}
          >
            {kpi.label}
          </span>
          <span
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#000000',
              lineHeight: 1,
            }}
          >
            {kpi.value}
          </span>
        </div>
      ))}
    </div>
  )
}
