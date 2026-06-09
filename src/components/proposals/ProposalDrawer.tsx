'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { StateSelector } from './StateSelector'
import { TabDadosBase } from './tabs/TabDadosBase'
import { TabCriativa } from './tabs/TabCriativa'
import { TabOrcamentacao } from './tabs/TabOrcamentacao'
import { TabColaboracao } from './tabs/TabColaboracao'
import type { Proposal } from '@/payload-types'

const ESTADO_LABELS: Record<string, string> = {
  Recebida: 'Recebida',
  EmElaboracao: 'Em Elaboração',
  EmOrcamentacao: 'Em Orçamentação',
  Enviada: 'Enviada',
  Ganha: 'Ganha',
  Perdida: 'Perdida',
}

interface Props {
  proposal: Proposal
  onTabChange?: (tab: string) => void
  defaultTab?: string
}

export function ProposalDrawer({ proposal, onTabChange, defaultTab = 'dados' }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{proposal.numero}</span>
            <Badge variant="outline">{ESTADO_LABELS[proposal.estado ?? ''] ?? proposal.estado}</Badge>
          </div>
          <h2 className="text-xl font-bold mt-1">{proposal.nomeProjeto}</h2>
          <p className="text-sm text-muted-foreground">{proposal.cliente}</p>
        </div>
        <StateSelector proposal={proposal} />
      </div>

      <Tabs defaultValue={defaultTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="dados">Dados Base</TabsTrigger>
          <TabsTrigger value="criativa">Criativa</TabsTrigger>
          <TabsTrigger value="orcamentacao">Orçamentação</TabsTrigger>
          <TabsTrigger value="colaboracao">Colaboração</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <TabDadosBase proposal={proposal} />
        </TabsContent>

        <TabsContent value="criativa">
          <TabCriativa proposal={proposal} />
        </TabsContent>

        <TabsContent value="orcamentacao">
          <TabOrcamentacao proposal={proposal} />
        </TabsContent>

        <TabsContent value="colaboracao">
          <TabColaboracao proposal={proposal} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
