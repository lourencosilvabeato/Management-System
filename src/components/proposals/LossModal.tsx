'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Proposal } from '@/payload-types'

type MotivoPerda = NonNullable<Proposal['motivoPerda']>

const MOTIVOS: { value: MotivoPerda; label: string }[] = [
  { value: 'Preco', label: 'Preço' },
  { value: 'Concorrencia', label: 'Concorrência' },
  { value: 'Prazo', label: 'Prazo' },
  { value: 'ProjetoCancelado', label: 'Projecto Cancelado' },
  { value: 'ForaAmbito', label: 'Fora de Âmbito' },
  { value: 'SemResposta', label: 'Sem Resposta' },
  { value: 'Outro', label: 'Outro' },
]

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: MotivoPerda, detalhe?: string) => Promise<void>
  loading: boolean
}

export function LossModal({ open, onClose, onConfirm, loading }: Props) {
  const [motivo, setMotivo] = useState<MotivoPerda | ''>('')
  const [detalhe, setDetalhe] = useState('')

  const handleConfirm = async () => {
    if (!motivo) return
    await onConfirm(motivo, detalhe || undefined)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent style={{ borderTop: '4px solid #000000', borderRadius: 2 }}>
        <DialogHeader>
          <DialogTitle>Marcar como Perdida</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Motivo de perda *</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoPerda)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Detalhe (opcional)</Label>
            <Textarea
              placeholder="Informação adicional sobre a perda..."
              value={detalhe}
              onChange={(e) => setDetalhe(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!motivo || loading}
          >
            {loading ? 'A guardar...' : 'Confirmar Perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
