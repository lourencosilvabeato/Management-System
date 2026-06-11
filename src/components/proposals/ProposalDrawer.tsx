'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
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

const ESTADO_CLASSES: Record<string, string> = {
  Recebida: 'bg-gray-100 text-gray-700 border-gray-300',
  EmElaboracao: 'bg-blue-100 text-blue-700 border-blue-300',
  EmOrcamentacao: 'bg-purple-100 text-purple-700 border-purple-300',
  Enviada: 'bg-orange-100 text-orange-700 border-orange-300',
  Ganha: 'bg-green-100 text-green-700 border-green-300',
  Perdida: 'bg-red-100 text-red-700 border-red-300',
}

export interface CurrentUser {
  id: string | number
  email: string
  role: string
  nome?: string | null
}

export interface AccountUser {
  id: string | number
  nome?: string | null
  email: string
}

interface Props {
  id: string
  currentUser: CurrentUser
  accountUsers: AccountUser[]
  onRefreshList?: () => void
}

export function ProposalDrawer({ id, currentUser, accountUsers, onRefreshList }: Props) {
  const queryClient = useQueryClient()

  const { data: proposal, isLoading, refetch } = useQuery({
    queryKey: ['proposal', id],
    queryFn: async (): Promise<Proposal> => {
      const res = await fetch(`/api/proposals/${id}?depth=2`)
      if (!res.ok) throw new Error('Failed to load proposal')
      return res.json() as Promise<Proposal>
    },
  })

  const handleRefresh = () => {
    void refetch()
    void queryClient.invalidateQueries({ queryKey: ['proposals'] })
    onRefreshList?.()
  }

  const canSeeBudgeting = ['account', 'producao', 'admin'].includes(currentUser.role)

  const formatDate = (d?: string | null) =>
    d
      ? new Date(d).toLocaleDateString('pt-PT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—'

  const accountName =
    typeof proposal?.account === 'object' &&
    proposal.account !== null &&
    'nome' in proposal.account
      ? (proposal.account as { nome?: string | null }).nome ?? '—'
      : '—'

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-32 w-full mt-4" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Proposta não encontrada.</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-muted-foreground">{proposal.numero}</span>
              <Badge
                variant="outline"
                className={ESTADO_CLASSES[proposal.estado ?? ''] ?? ''}
              >
                {ESTADO_LABELS[proposal.estado ?? ''] ?? proposal.estado}
              </Badge>
            </div>
            <SheetTitle className="text-lg leading-tight">{proposal.nomeProjeto}</SheetTitle>
            <SheetDescription className="text-sm">
              {proposal.cliente} · {accountName} · Criado em {formatDate(proposal.createdAt)}
            </SheetDescription>
          </div>
        </div>
        <div className="pt-2">
          <StateSelector proposal={proposal} onSuccess={handleRefresh} />
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <Tabs defaultValue="dados" className="mt-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="dados">Dados Base</TabsTrigger>
            <TabsTrigger value="criativa">Criativa</TabsTrigger>
            {canSeeBudgeting && (
              <TabsTrigger value="orcamentacao">Orçamentação</TabsTrigger>
            )}
            <TabsTrigger value="colaboracao">Colaboração</TabsTrigger>
          </TabsList>

          <TabsContent value="dados">
            <TabDadosBase
              proposal={proposal}
              currentUser={currentUser}
              accountUsers={accountUsers}
              onSave={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="criativa">
            <TabCriativa
              proposal={proposal}
              currentUser={currentUser}
              onSave={handleRefresh}
            />
          </TabsContent>

          {canSeeBudgeting && (
            <TabsContent value="orcamentacao">
              <TabOrcamentacao proposal={proposal} onRefresh={handleRefresh} />
            </TabsContent>
          )}

          <TabsContent value="colaboracao">
            <TabColaboracao
              proposal={proposal}
              currentUser={currentUser}
              onSave={handleRefresh}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
