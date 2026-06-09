'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LossModal } from './LossModal'
import type { Proposal } from '@/payload-types'

type Estado = NonNullable<Proposal['estado']>
type MotivoPerda = NonNullable<Proposal['motivoPerda']>

const NEXT_STATES: Record<Estado, { estado: Estado; label: string; variant?: 'destructive' }[]> = {
  Recebida: [{ estado: 'EmElaboracao', label: 'Iniciar Elaboração' }],
  EmElaboracao: [
    { estado: 'EmOrcamentacao', label: 'Avançar para Orçamentação' },
    { estado: 'Recebida', label: 'Recuar para Recebida' },
  ],
  EmOrcamentacao: [
    { estado: 'Enviada', label: 'Marcar como Enviada' },
    { estado: 'EmElaboracao', label: 'Recuar para Elaboração' },
  ],
  Enviada: [
    { estado: 'Ganha', label: 'Marcar como Ganha' },
    { estado: 'Perdida', label: 'Marcar como Perdida', variant: 'destructive' },
    { estado: 'EmOrcamentacao', label: 'Recuar para Orçamentação' },
  ],
  Ganha: [],
  Perdida: [],
}

interface Props {
  proposal: Proposal
}

export function StateSelector({ proposal }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lossModalOpen, setLossModalOpen] = useState(false)

  const nextStates = NEXT_STATES[proposal.estado as Estado] ?? []
  if (nextStates.length === 0) return null

  const transition = async (novoEstado: Estado, motivoPerda?: MotivoPerda, detalhePerda?: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoEstado, motivoPerda, detalhePerda }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        alert(data.error ?? 'Erro ao alterar estado')
        return
      }
      router.refresh()
    } catch {
      alert('Erro de rede')
    } finally {
      setLoading(false)
    }
  }

  const handleClick = (estado: Estado) => {
    if (estado === 'Perdida') {
      setLossModalOpen(true)
    } else {
      void transition(estado)
    }
  }

  const handleLossConfirm = async (motivo: MotivoPerda, detalhe?: string) => {
    await transition('Perdida', motivo, detalhe)
    setLossModalOpen(false)
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {nextStates.map((ns) => (
          <Button
            key={ns.estado}
            size="sm"
            variant={ns.variant ?? 'default'}
            onClick={() => handleClick(ns.estado)}
            disabled={loading}
          >
            {ns.label}
          </Button>
        ))}
      </div>

      <LossModal
        open={lossModalOpen}
        onClose={() => setLossModalOpen(false)}
        onConfirm={handleLossConfirm}
        loading={loading}
      />
    </>
  )
}
