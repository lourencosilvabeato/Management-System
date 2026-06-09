'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ProposalFilters, type EstadoFilter } from './ProposalFilters'
import type { Proposal } from '@/payload-types'

const ESTADO_LABELS: Record<string, string> = {
  Recebida: 'Recebida',
  EmElaboracao: 'Em Elaboração',
  EmOrcamentacao: 'Em Orçamentação',
  Enviada: 'Enviada',
  Ganha: 'Ganha',
  Perdida: 'Perdida',
}

const ESTADO_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  Recebida: 'outline',
  EmElaboracao: 'secondary',
  EmOrcamentacao: 'secondary',
  Enviada: 'default',
  Ganha: 'default',
  Perdida: 'destructive',
}

interface Props {
  proposals: Proposal[]
  onSelect: (id: string) => void
}

export function ProposalTable({ proposals, onSelect }: Props) {
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<EstadoFilter>('all')

  const filtered = proposals.filter((p) => {
    const matchesSearch =
      !search ||
      p.nomeProjeto.toLowerCase().includes(search.toLowerCase()) ||
      p.cliente.toLowerCase().includes(search.toLowerCase())
    const matchesEstado = estado === 'all' || p.estado === estado
    return matchesSearch && matchesEstado
  })

  const formatDate = (date?: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const getAccount = (p: Proposal) => {
    if (typeof p.account === 'object' && p.account !== null && 'nome' in p.account) {
      return (p.account as { nome: string }).nome
    }
    return '—'
  }

  return (
    <div className="space-y-4">
      <ProposalFilters
        search={search}
        onSearchChange={setSearch}
        estado={estado}
        onEstadoChange={setEstado}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px]">Número</TableHead>
              <TableHead>Projecto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhuma proposta encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onSelect(String(p.id))}
                >
                  <TableCell className="font-mono text-xs">{p.numero ?? '—'}</TableCell>
                  <TableCell className="font-medium">{p.nomeProjeto}</TableCell>
                  <TableCell>{p.cliente}</TableCell>
                  <TableCell>{getAccount(p)}</TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[p.estado ?? ''] ?? 'outline'}>
                      {ESTADO_LABELS[p.estado ?? ''] ?? p.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(p.prazoResposta)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {typeof p.valorVendaFinal === 'number'
                      ? `${p.valorVendaFinal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€`
                      : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} de {proposals.length} propostas
      </p>
    </div>
  )
}
