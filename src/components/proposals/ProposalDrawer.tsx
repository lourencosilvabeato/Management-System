'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  Recebida:       'bg-stone-800/60    text-stone-300   border-stone-600/50',
  EmElaboracao:   'bg-sky-900/50      text-sky-300     border-sky-700/50',
  EmOrcamentacao: 'bg-orange-950/60   text-orange-300  border-orange-700/50',
  Enviada:        'bg-amber-900/50    text-amber-300   border-amber-700/50',
  Ganha:          'bg-emerald-900/50  text-emerald-300 border-emerald-700/50',
  Perdida:        'bg-rose-900/50     text-rose-300    border-rose-700/50',
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
    d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  const accountName =
    typeof proposal?.account === 'object' && proposal.account !== null && 'nome' in proposal.account
      ? (proposal.account as { nome?: string | null }).nome ?? '—'
      : '—'

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full mt-6" />
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Proposta não encontrada.</div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-8 pt-7 pb-5 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0 flex-1 space-y-2">
            {/* Number + badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{
                  background: 'oklch(0.18 0.010 48)',
                  color: 'oklch(0.70 0.21 40)',
                  border: '1px solid oklch(0.70 0.21 40 / 25%)',
                }}
              >
                {proposal.numero}
              </span>
              <Badge variant="outline" className={ESTADO_CLASSES[proposal.estado ?? ''] ?? ''}>
                {ESTADO_LABELS[proposal.estado ?? ''] ?? proposal.estado}
              </Badge>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold leading-tight truncate pr-8">
              {proposal.nomeProjeto}
            </h2>

            {/* Meta */}
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground/70">{proposal.cliente}</span>
              <span className="mx-2 opacity-30">·</span>
              {accountName}
              <span className="mx-2 opacity-30">·</span>
              {formatDate(proposal.createdAt)}
            </p>
          </div>
        </div>

        {/* State transitions */}
        <div className="mt-4">
          <StateSelector proposal={proposal} onSuccess={handleRefresh} />
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <Tabs defaultValue="dados" className="mt-5">
          <TabsList className="w-full justify-start gap-1 bg-transparent p-0 border-b border-white/[0.06] rounded-none h-auto pb-0">
            {[
              { value: 'dados', label: 'Dados Base' },
              { value: 'criativa', label: 'Criativa' },
              ...(canSeeBudgeting ? [{ value: 'orcamentacao', label: 'Orçamentação' }] : []),
              { value: 'colaboracao', label: 'Colaboração' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent pb-3 px-1 mr-4 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:border-orange-500 data-[state=active]:text-foreground data-[state=active]:bg-transparent hover:text-foreground"
                style={{ background: 'transparent' }}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dados" className="mt-6">
            <TabDadosBase
              proposal={proposal}
              currentUser={currentUser}
              accountUsers={accountUsers}
              onSave={handleRefresh}
            />
          </TabsContent>

          <TabsContent value="criativa" className="mt-6">
            <TabCriativa
              proposal={proposal}
              currentUser={currentUser}
              onSave={handleRefresh}
            />
          </TabsContent>

          {canSeeBudgeting && (
            <TabsContent value="orcamentacao" className="mt-6">
              <TabOrcamentacao proposal={proposal} onRefresh={handleRefresh} />
            </TabsContent>
          )}

          <TabsContent value="colaboracao" className="mt-6">
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
