'use client'

import { Activity, TrendingUp, Trophy, Send } from 'lucide-react'
import type { Proposal } from '@/payload-types'

interface Props {
  proposals: Proposal[]
}

interface KPI {
  label: string
  value: string | number
  icon: React.ReactNode
  color: string
  glow: string
  border: string
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

  const kpis: KPI[] = [
    {
      label: 'Propostas activas',
      value: active.length,
      icon: <Activity className="w-4 h-4" />,
      color: 'oklch(0.56 0.230 38)',
      glow: 'rgba(210, 80, 15, 0.15)',
      border: 'rgba(200, 75, 15, 0.22)',
    },
    {
      label: 'Pipeline total',
      value: pipeline > 0
        ? `${pipeline.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}€`
        : '—',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'oklch(0.60 0.175 55)',
      glow: 'rgba(200, 140, 10, 0.14)',
      border: 'rgba(190, 130, 10, 0.20)',
    },
    {
      label: 'Ganhas este mês',
      value: wonMonth,
      icon: <Trophy className="w-4 h-4" />,
      color: 'oklch(0.55 0.165 145)',
      glow: 'rgba(30, 170, 100, 0.12)',
      border: 'rgba(25, 160, 90, 0.18)',
    },
    {
      label: 'Em Enviada',
      value: enviada,
      icon: <Send className="w-4 h-4" />,
      color: 'oklch(0.56 0.230 38)',
      glow: 'rgba(210, 80, 15, 0.12)',
      border: 'rgba(200, 75, 15, 0.18)',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="glass rounded-xl px-4 py-3 flex flex-col gap-2 cursor-default select-none"
          style={{
            border: `1px solid ${kpi.border}`,
            transition: 'box-shadow 0.25s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = `0 0 20px 2px ${kpi.glow}, 0 4px 16px rgba(0,0,0,0.10)`
            el.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLDivElement
            el.style.boxShadow = ''
            el.style.transform = ''
          }}
        >
          <div className="flex items-center gap-1.5" style={{ color: kpi.color }}>
            {kpi.icon}
            <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</span>
        </div>
      ))}
    </div>
  )
}
