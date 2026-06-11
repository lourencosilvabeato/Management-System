'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Proposal } from '@/payload-types'

interface Props {
  proposals: Proposal[]
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

  const kpis = [
    { label: 'Propostas activas', value: activeProposals.length },
    {
      label: 'Pipeline total',
      value:
        totalPipeline > 0
          ? `${totalPipeline.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€`
          : '—',
    },
    { label: 'Ganhas este mês', value: wonThisMonth },
    { label: 'Em Enviada', value: inEnviada },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">{kpi.label}</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <span className="text-2xl font-bold">{kpi.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
