'use client'

import { useEffect, useState } from 'react'
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
  onSearchChange: (v: string) => void
  estado: EstadoFilter
  onEstadoChange: (v: EstadoFilter) => void
  resultCount: number
}

const ESTADO_LABELS: Record<EstadoFilter, string> = {
  all: 'Todos os estados',
  Recebida: 'Recebida',
  EmElaboracao: 'Em Elaboração',
  EmOrcamentacao: 'Em Orçamentação',
  Enviada: 'Enviada',
  Ganha: 'Ganha',
  Perdida: 'Perdida',
}

export function ProposalFilters({ onSearchChange, estado, onEstadoChange, resultCount }: Props) {
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => onSearchChange(inputValue), 300)
    return () => clearTimeout(timer)
  }, [inputValue, onSearchChange])

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Pesquisar por nome ou cliente..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="sm:w-72"
        />
        <Select value={estado} onValueChange={(v) => onEstadoChange(v as EstadoFilter)}>
          <SelectTrigger className="sm:w-48">
            <span className="text-sm">{ESTADO_LABELS[estado]}</span>
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
      <p style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.625rem', fontWeight: 500, letterSpacing: '0.08em', color: '#999999' }}>{resultCount} propostas</p>
    </div>
  )
}
