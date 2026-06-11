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
  accent: string
  glow: string
}

export function ProposalKPIs({ proposals }: Props) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const activeProposals = proposals.filter(
    (p) => !['Ganha', 'Perdida'].includes(p.estado ?? ''),
  )

  const totalPipeline = activeProposals.reduce(
    (sum, p) => sum + (typeof p.valorVendaFinal === 'number' ? p.valorVendaFinal : 0),
    0,
  )

  const wonThisMonth = proposals.filter(
    (p) => p.estado === 'Ganha' && p.updatedAt >= startOfMonth,
  ).length

  const inEnviada = proposals.filter((p) => p.estado === 'Enviada').length

  const kpis: KPI[] = [
    {
      label: 'Propostas activas',
      value: activeProposals.length,
      icon: <Activity className="w-4 h-4" />,
      accent: 'text-indigo-400',
      glow: 'rgba(99,102,241,0.18)',
    },
    {
      label: 'Pipeline total',
      value:
        totalPipeline > 0
          ? `${totalPipeline.toLocaleString('pt-PT', { minimumFractionDigits: 0 })}€`
          : '—',
      icon: <TrendingUp className="w-4 h-4" />,
      accent: 'text-violet-400',
      glow: 'rgba(139,92,246,0.18)',
    },
    {
      label: 'Ganhas este mês',
      value: wonThisMonth,
      icon: <Trophy className="w-4 h-4" />,
      accent: 'text-emerald-400',
      glow: 'rgba(52,211,153,0.15)',
    },
    {
      label: 'Em Enviada',
      value: inEnviada,
      icon: <Send className="w-4 h-4" />,
      accent: 'text-amber-400',
      glow: 'rgba(251,191,36,0.15)',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-1">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="glass rounded-xl px-4 py-3 flex flex-col gap-2 group transition-all duration-300 hover:scale-[1.02]"
          style={{ boxShadow: `0 0 0 0 ${kpi.glow}`, transition: 'box-shadow 0.3s, transform 0.3s' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 24px 2px ${kpi.glow}, 0 8px 32px rgba(0,0,0,0.4)`
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)`
          }}
        >
          <div className={`flex items-center gap-1.5 ${kpi.accent}`}>
            {kpi.icon}
            <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-foreground">{kpi.value}</span>
        </div>
      ))}
    </div>
  )
}
