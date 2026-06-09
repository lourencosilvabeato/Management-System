'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { EstimateOutput, EstimateItem, EstimateRubrica } from '@/lib/ai/parseEstimate'

interface Props {
  estimativa: EstimateOutput['estimativa']
  proposalId: string
  onAccepted: () => void
}

function calcItemTotal(rubricas: EstimateRubrica[]): number {
  return rubricas.reduce((s, r) => s + r.custo_total, 0)
}

function calcGeral(items: EstimateItem[]): number {
  return items.reduce((s, it) => s + it.total_item, 0)
}

export function EstimateEditor({ estimativa, proposalId, onAccepted }: Props) {
  const [items, setItems] = useState<EstimateItem[]>(
    (estimativa.items as EstimateItem[]).map((it) => ({ ...it, rubricas: [...it.rubricas] })),
  )
  const [saving, setSaving] = useState(false)

  const updateRubrica = (
    itemIdx: number,
    rubIdx: number,
    field: keyof EstimateRubrica,
    value: string | number,
  ) => {
    setItems((prev) => {
      const next = prev.map((it, i) => {
        if (i !== itemIdx) return it
        const rubricas = it.rubricas.map((r, j) => {
          if (j !== rubIdx) return r
          const updated = { ...r, [field]: value }
          if (field === 'quantidade' || field === 'custo_unitario') {
            updated.custo_total =
              (field === 'quantidade' ? (value as number) : r.quantidade) *
              (field === 'custo_unitario' ? (value as number) : r.custo_unitario)
          }
          return updated
        })
        return { ...it, rubricas, total_item: calcItemTotal(rubricas) }
      })
      return next
    })
  }

  const handleAccept = async () => {
    setSaving(true)
    try {
      const estimativaEditada = { items, total_geral: calcGeral(items) }
      const res = await fetch(`/api/proposals/${proposalId}/estimate/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimativaEditada }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        alert(data.error ?? 'Erro ao aceitar estimativa')
        return
      }
      onAccepted()
    } catch {
      alert('Erro de rede')
    } finally {
      setSaving(false)
    }
  }

  const totalGeral = calcGeral(items)

  return (
    <div className="space-y-4">
      {items.map((item, itemIdx) => (
        <Card key={itemIdx}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{item.nome}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-1">
              <span className="col-span-4">Descrição</span>
              <span className="col-span-2">Qtd.</span>
              <span className="col-span-2">Unidade</span>
              <span className="col-span-2 text-right">Unit. (€)</span>
              <span className="col-span-2 text-right">Total (€)</span>
            </div>
            {item.rubricas.map((r, rubIdx) => (
              <div key={rubIdx} className="grid grid-cols-12 gap-2 items-center">
                <span className="col-span-4 text-sm">{r.descricao}</span>
                <Input
                  className="col-span-2 h-7 text-xs"
                  type="number"
                  min={0}
                  value={r.quantidade}
                  onChange={(e) =>
                    updateRubrica(itemIdx, rubIdx, 'quantidade', parseFloat(e.target.value) || 0)
                  }
                />
                <span className="col-span-2 text-xs text-muted-foreground">{r.unidade}</span>
                <Input
                  className="col-span-2 h-7 text-xs text-right"
                  type="number"
                  min={0}
                  step={0.01}
                  value={r.custo_unitario}
                  onChange={(e) =>
                    updateRubrica(itemIdx, rubIdx, 'custo_unitario', parseFloat(e.target.value) || 0)
                  }
                />
                <span className="col-span-2 text-right text-sm font-mono">
                  {r.custo_total.toFixed(2)}€
                </span>
              </div>
            ))}
            <div className="flex justify-end pt-1 text-sm font-semibold">
              Subtotal: {item.total_item.toFixed(2)}€
            </div>
          </CardContent>
        </Card>
      ))}

      <Separator />

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">Total Geral: {totalGeral.toFixed(2)}€</span>
        <Button onClick={handleAccept} disabled={saving}>
          {saving ? 'A guardar...' : 'Aceitar Estimativa'}
        </Button>
      </div>
    </div>
  )
}
