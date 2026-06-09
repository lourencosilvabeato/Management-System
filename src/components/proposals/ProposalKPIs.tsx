'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Proposal } from '@/payload-types'

interface Props {
  proposals: Proposal[]
}

export function ProposalKPIs({ proposals }: Props) {
  const total = proposals.length
  const abertas = proposals.filter((p) =>
    ['Recebida', 'EmElaboracao', 'EmOrcamentacao', 'Enviada'].includes(p.estado ?? ''),
  ).length
  const ganhas = proposals.filter((p) => p.estado === 'Ganha').length
  const perdidas = proposals.filter((p) => p.estado === 'Perdida').length

  const encerradas = ganhas + perdidas
  const taxaConversao = encerradas > 0 ? Math.round((ganhas / encerradas) * 100) : null

  const kpis = [
    { label: 'Total', value: total },
    { label: 'Em aberto', value: abertas },
    { label: 'Ganhas', value: ganhas },
    { label: 'Perdidas', value: perdidas },
    { label: 'Conversão', value: taxaConversao !== null ? `${taxaConversao}%` : '—' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
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
