'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ProposalKPIs } from './ProposalKPIs'
import { ProposalFilters, type EstadoFilter } from './ProposalFilters'
import { ProposalDrawer } from './ProposalDrawer'
import { textToLexical } from '@/lib/lexical'
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
  Recebida:       'bg-stone-100     text-stone-700  border-stone-300',
  EmElaboracao:   'bg-sky-100       text-sky-700    border-sky-300',
  EmOrcamentacao: 'bg-orange-100    text-orange-700 border-orange-300',
  Enviada:        'bg-amber-100     text-amber-700  border-amber-300',
  Ganha:          'bg-emerald-100   text-emerald-700 border-emerald-300',
  Perdida:        'bg-rose-100      text-rose-700   border-rose-300',
}

type SortCol = 'numero' | 'nomeProjeto' | 'cliente' | 'account' | 'createdAt' | 'valorVendaFinal' | 'estado'

interface CurrentUser {
  id: string | number
  email: string
  role: string
  nome?: string | null
}

interface AccountUser {
  id: string | number
  nome?: string | null
  email: string
}

interface Props {
  currentUser: CurrentUser
  accountUsers: AccountUser[]
}

interface PayloadListResponse {
  docs: Proposal[]
}

function getAccountName(p: Proposal): string {
  if (typeof p.account === 'object' && p.account !== null && 'nome' in p.account) {
    return (p.account as { nome?: string | null }).nome ?? '—'
  }
  return '—'
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function SortIcon({ col, sort }: { col: SortCol; sort: { col: SortCol; dir: 'asc' | 'desc' } }) {
  if (sort.col !== col) return <span className="text-muted-foreground ml-1 opacity-30">↕</span>
  return <span className="ml-1">{sort.dir === 'asc' ? '↑' : '↓'}</span>
}

export function ProposalTable({ currentUser, accountUsers }: Props) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({
    col: 'createdAt',
    dir: 'desc',
  })
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<EstadoFilter>('all')
  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    nomeProjeto: '',
    cliente: '',
    briefing: '',
    prazoResposta: '',
    accountId: currentUser.role === 'account' ? String(currentUser.id) : '',
  })
  const [createError, setCreateError] = useState('')

  const { data: proposals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['proposals'],
    queryFn: async (): Promise<Proposal[]> => {
      const res = await fetch('/api/proposals?limit=500&depth=1&sort=-createdAt')
      if (!res.ok) throw new Error('Falha ao carregar propostas')
      const json = (await res.json()) as PayloadListResponse
      return json.docs
    },
  })

  const handleSort = (col: SortCol) => {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' },
    )
  }

  const filtered = proposals
    .filter((p) => {
      const matchesSearch =
        !search ||
        p.nomeProjeto.toLowerCase().includes(search.toLowerCase()) ||
        p.cliente.toLowerCase().includes(search.toLowerCase())
      const matchesEstado = estado === 'all' || p.estado === estado
      return matchesSearch && matchesEstado
    })
    .sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const col = sort.col
      if (col === 'account') {
        return dir * getAccountName(a).localeCompare(getAccountName(b))
      }
      if (col === 'valorVendaFinal') {
        return dir * ((a.valorVendaFinal ?? 0) - (b.valorVendaFinal ?? 0))
      }
      const av = String((a as unknown as Record<string, unknown>)[col] ?? '')
      const bv = String((b as unknown as Record<string, unknown>)[col] ?? '')
      return dir * av.localeCompare(bv)
    })

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const canCreate = ['account', 'admin'].includes(currentUser.role)

  const handleRefreshList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['proposals'] })
  }, [queryClient])

  const handleCreate = async () => {
    if (!createForm.nomeProjeto.trim() || !createForm.cliente.trim()) {
      setCreateError('Nome do projecto e cliente são obrigatórios.')
      return
    }
    if (!createForm.accountId) {
      setCreateError('Seleccione um account.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const body: Record<string, unknown> = {
        nomeProjeto: createForm.nomeProjeto.trim(),
        cliente: createForm.cliente.trim(),
        account: createForm.accountId,
      }
      if (createForm.briefing.trim()) {
        body.briefing = textToLexical(createForm.briefing.trim())
      }
      if (createForm.prazoResposta) {
        body.prazoResposta = createForm.prazoResposta
      }

      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = (await res.json()) as { errors?: Array<{ message: string }> }
        setCreateError(err.errors?.[0]?.message ?? 'Erro ao criar proposta')
        return
      }
      await queryClient.invalidateQueries({ queryKey: ['proposals'] })
      setNewDialogOpen(false)
      setCreateForm({
        nomeProjeto: '',
        cliente: '',
        briefing: '',
        prazoResposta: '',
        accountId: currentUser.role === 'account' ? String(currentUser.id) : '',
      })
    } catch {
      setCreateError('Erro de rede')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <ProposalKPIs proposals={proposals} />
        {canCreate && (
          <Button
            onClick={() => setNewDialogOpen(true)}
            className="btn-orange shrink-0 h-10 px-4 font-semibold text-sm text-white border-0"
          >
            + Nova Proposta
          </Button>
        )}
      </div>

      <ProposalFilters
        onSearchChange={setSearch}
        estado={estado}
        onEstadoChange={setEstado}
        resultCount={filtered.length}
      />

      <div className="glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60">
              {(
                [
                  { col: 'numero' as SortCol, label: 'Nº Proposta' },
                  { col: 'nomeProjeto' as SortCol, label: 'Projecto' },
                  { col: 'cliente' as SortCol, label: 'Cliente' },
                  { col: 'account' as SortCol, label: 'Account' },
                  { col: 'createdAt' as SortCol, label: 'Criado em' },
                  { col: 'valorVendaFinal' as SortCol, label: 'Valor Est.' },
                  { col: 'estado' as SortCol, label: 'Estado' },
                ] as { col: SortCol; label: string }[]
              ).map(({ col, label }) => (
                <TableHead
                  key={col}
                  className="cursor-pointer select-none whitespace-nowrap font-semibold text-foreground/70"
                  onClick={() => handleSort(col)}
                >
                  {label}
                  <SortIcon col={col} sort={sort} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <SkeletonRows />}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm text-destructive">Erro ao carregar propostas.</p>
                    <Button variant="outline" size="sm" onClick={() => void refetch()}>
                      Tentar novamente
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                  Nenhuma proposta corresponde aos critérios seleccionados.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              !isError &&
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer transition-colors hover:bg-foreground/[0.04] border-border/50"
                  onClick={() => setSelectedId(String(p.id))}
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.numero ?? '—'}
                  </TableCell>
                  <TableCell className="font-semibold">{p.nomeProjeto}</TableCell>
                  <TableCell>{p.cliente}</TableCell>
                  <TableCell>{getAccountName(p)}</TableCell>
                  <TableCell className="text-sm">{formatDate(p.createdAt)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {typeof p.valorVendaFinal === 'number'
                      ? `${p.valorVendaFinal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={ESTADO_CLASSES[p.estado ?? ''] ?? ''}
                    >
                      {ESTADO_LABELS[p.estado ?? ''] ?? p.estado}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {/* Proposal detail modal */}
      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="!max-w-[90vw] !w-[90vw] !h-[88vh] p-0 overflow-hidden flex flex-col glass">
          {selectedId && (
            <ProposalDrawer
              id={selectedId}
              currentUser={currentUser}
              accountUsers={accountUsers}
              onRefreshList={handleRefreshList}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* New Proposal Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={(open) => { if (!open) { setNewDialogOpen(false); setCreateError('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Proposta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do projecto *</Label>
              <Input
                value={createForm.nomeProjeto}
                onChange={(e) => setCreateForm((f) => ({ ...f, nomeProjeto: e.target.value }))}
                placeholder="Ex: Stand Evento X"
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input
                value={createForm.cliente}
                onChange={(e) => setCreateForm((f) => ({ ...f, cliente: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            {currentUser.role === 'admin' && (
              <div className="space-y-2">
                <Label>Account *</Label>
                <select
                  className="w-full border border-border bg-input rounded-md px-3 py-2 text-sm text-foreground"
                  value={createForm.accountId}
                  onChange={(e) => setCreateForm((f) => ({ ...f, accountId: e.target.value }))}
                >
                  <option value="">Seleccionar account...</option>
                  {accountUsers.map((u) => (
                    <option key={String(u.id)} value={String(u.id)}>
                      {u.nome ?? u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Briefing</Label>
              <Textarea
                value={createForm.briefing}
                onChange={(e) => setCreateForm((f) => ({ ...f, briefing: e.target.value }))}
                placeholder="Descrição do projecto..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Prazo de resposta</Label>
              <Input
                type="date"
                value={createForm.prazoResposta}
                onChange={(e) => setCreateForm((f) => ({ ...f, prazoResposta: e.target.value }))}
              />
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewDialogOpen(false); setCreateError('') }} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'A criar...' : 'Criar Proposta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
