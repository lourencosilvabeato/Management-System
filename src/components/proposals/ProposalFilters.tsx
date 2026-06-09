'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type EstadoFilter =
  | 'all'
  | 'Recebida'
  | 'EmElaboracao'
  | 'EmOrcamentacao'
  | 'Enviada'
  | 'Ganha'
  | 'Perdida'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  estado: EstadoFilter
  onEstadoChange: (v: EstadoFilter) => void
}

export function ProposalFilters({ search, onSearchChange, estado, onEstadoChange }: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        placeholder="Pesquisar por nome ou cliente..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="sm:max-w-xs"
      />
      <Select value={estado} onValueChange={(v) => onEstadoChange(v as EstadoFilter)}>
        <SelectTrigger className="sm:max-w-[180px]">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os estados</SelectItem>
          <SelectItem value="Recebida">Recebida</SelectItem>
          <SelectItem value="EmElaboracao">Em Elaboração</SelectItem>
          <SelectItem value="EmOrcamentacao">Em Orçamentação</SelectItem>
          <SelectItem value="Enviada">Enviada</SelectItem>
          <SelectItem value="Ganha">Ganha</SelectItem>
          <SelectItem value="Perdida">Perdida</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
