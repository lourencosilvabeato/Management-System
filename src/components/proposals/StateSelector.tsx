'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LossModal } from './LossModal'
import type { Proposal } from '@/payload-types'

type Estado = NonNullable<Proposal['estado']>
type MotivoPerda = NonNullable<Proposal['motivoPerda']>

const NEXT_STATES: Record<Estado, { estado: Estado; label: string; variant?: 'destructive'; confirmMsg?: string }[]> = {
  Recebida: [
    { estado: 'EmElaboracao', label: 'Iniciar Elaboração', confirmMsg: 'Avançar para Em Elaboração?' },
  ],
  EmElaboracao: [
    { estado: 'EmOrcamentacao', label: 'Avançar para Orçamentação', confirmMsg: 'Avançar para Em Orçamentação? Será gerada uma estimativa automática.' },
    { estado: 'Recebida', label: 'Recuar para Recebida', confirmMsg: 'Recuar a proposta para Recebida?' },
  ],
  EmOrcamentacao: [
    { estado: 'Enviada', label: 'Marcar como Enviada', confirmMsg: 'Confirmar que a proposta foi enviada ao cliente?' },
    { estado: 'EmElaboracao', label: 'Recuar para Elaboração', confirmMsg: 'Recuar a proposta para Em Elaboração?' },
  ],
  Enviada: [
    { estado: 'Ganha', label: 'Marcar como Ganha', confirmMsg: 'Confirmar que a proposta foi ganha?' },
    { estado: 'Perdida', label: 'Marcar como Perdida', variant: 'destructive' },
    { estado: 'EmOrcamentacao', label: 'Recuar para Orçamentação', confirmMsg: 'Recuar a proposta para Em Orçamentação?' },
  ],
  Ganha: [],
  Perdida: [],
}

interface Props {
  proposal: Proposal
  onSuccess: () => void
}

export function StateSelector({ proposal, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [lossModalOpen, setLossModalOpen] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{ estado: Estado; msg: string } | null>(null)

  const nextStates = NEXT_STATES[proposal.estado as Estado] ?? []
  if (nextStates.length === 0) return null

  const doTransition = async (novoEstado: Estado, motivoPerda?: MotivoPerda, detalhePerda?: string) => {
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
      onSuccess()
    } catch {
      alert('Erro de rede')
    } finally {
      setLoading(false)
    }
  }

  const handleClick = (ns: (typeof nextStates)[0]) => {
    if (ns.estado === 'Perdida') {
      setLossModalOpen(true)
    } else if (ns.confirmMsg) {
      setConfirmDialog({ estado: ns.estado, msg: ns.confirmMsg })
    } else {
      void doTransition(ns.estado)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {nextStates.map((ns) => (
          <Button
            key={ns.estado}
            size="sm"
            variant={ns.variant ?? 'outline'}
            onClick={() => handleClick(ns)}
            disabled={loading}
          >
            {ns.label}
          </Button>
        ))}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar transição</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{confirmDialog?.msg}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const estado = confirmDialog!.estado
                setConfirmDialog(null)
                void doTransition(estado)
              }}
              disabled={loading}
            >
              {loading ? 'A guardar...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LossModal
        open={lossModalOpen}
        onClose={() => setLossModalOpen(false)}
        onConfirm={async (motivo, detalhe) => {
          await doTransition('Perdida', motivo, detalhe)
          setLossModalOpen(false)
        }}
        loading={loading}
      />
    </>
  )
}
