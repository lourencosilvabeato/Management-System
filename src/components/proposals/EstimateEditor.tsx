'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { EstimateOutput, EstimateItem, EstimateRubrica } from '@/lib/ai/parseEstimate'

const CONFIANCA_COLORS: Record<string, string> = {
  Alto: 'bg-green-100 text-green-800 border-green-300',
  Medio: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Baixo: 'bg-red-100 text-red-800 border-red-300',
}

interface Props {
  estimativa: EstimateOutput['estimativa']
  proposalId: string
  valorVendaFinal?: number | null
  nivelConfianca?: string | null
  nivelConfiancaJustificacao?: string | null
  abordagemTecnica?: string | null
  onAccepted: () => void
  onRegenerate?: () => void
  readOnly?: boolean
}

function calcItemTotal(rubricas: EstimateRubrica[]): number {
  return rubricas.reduce((s, r) => s + r.custo_total, 0)
}

function calcGeral(items: EstimateItem[]): number {
  return items.reduce((s, it) => s + it.total_item, 0)
}

const newRubrica = (): EstimateRubrica => ({
  descricao: 'Nova rubrica',
  quantidade: 1,
  unidade: 'un',
  custo_unitario: 0,
  custo_total: 0,
})

export function EstimateEditor({
  estimativa,
  proposalId,
  valorVendaFinal,
  nivelConfianca,
  nivelConfiancaJustificacao,
  abordagemTecnica,
  onAccepted,
  onRegenerate,
  readOnly = false,
}: Props) {
  const initialItems = useMemo(
    () =>
      (estimativa.items as EstimateItem[]).map((it) => ({
        ...it,
        rubricas: it.rubricas.map((r) => ({ ...r })),
      })),
    [estimativa],
  )

  const [items, setItems] = useState<EstimateItem[]>(initialItems)
  const [saving, setSaving] = useState(false)
  const [savingVenda, setSavingVenda] = useState(false)
  const [vendaMsg, setVendaMsg] = useState<'ok' | 'error' | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<{ itemIdx: number; rubIdx: number } | null>(null)
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [marginInput, setMarginInput] = useState('')
  const [vendaInput, setVendaInput] = useState(
    typeof valorVendaFinal === 'number' ? String(valorVendaFinal) : '',
  )
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(initialItems.map((_, i) => i)))
  const [approachExpanded, setApproachExpanded] = useState(false)
  const [showApproachToggle, setShowApproachToggle] = useState(false)
  const approachRef = useRef<HTMLParagraphElement>(null)

  const totalGeral = calcGeral(items)

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(items) !== JSON.stringify(initialItems)
  }, [items, initialItems])

  useEffect(() => {
    if (typeof valorVendaFinal === 'number') {
      setVendaInput(String(valorVendaFinal))
    }
  }, [valorVendaFinal])

  // Sync items immediately when the AI returns a new estimate via chat
  useEffect(() => {
    setItems(initialItems)
    setCollapsed(new Set(initialItems.map((_, i) => i)))
  }, [initialItems])

  // Show "Ver mais" only when text is actually clamped in the DOM
  useEffect(() => {
    if (approachExpanded) return
    const el = approachRef.current
    if (!el) return
    setShowApproachToggle(el.scrollHeight > el.clientHeight)
  }, [abordagemTecnica, approachExpanded])

  const toggleCollapse = (idx: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const updateRubrica = (
    itemIdx: number,
    rubIdx: number,
    field: keyof EstimateRubrica,
    value: string | number,
  ) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== itemIdx) return it
        const rubricas = it.rubricas.map((r, j) => {
          if (j !== rubIdx) return r
          const updated = { ...r, [field]: value }
          if (field === 'quantidade' || field === 'custo_unitario') {
            const qty = field === 'quantidade' ? (value as number) : r.quantidade
            const unit = field === 'custo_unitario' ? (value as number) : r.custo_unitario
            updated.custo_total = qty * unit
          }
          return updated
        })
        return { ...it, rubricas, total_item: calcItemTotal(rubricas) }
      }),
    )
  }

  const addRubrica = (itemIdx: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== itemIdx) return it
        const rubricas = [...it.rubricas, newRubrica()]
        return { ...it, rubricas, total_item: calcItemTotal(rubricas) }
      }),
    )
  }

  const removeRubrica = (itemIdx: number, rubIdx: number) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== itemIdx) return it
        const rubricas = it.rubricas.filter((_, j) => j !== rubIdx)
        return { ...it, rubricas, total_item: calcItemTotal(rubricas) }
      }),
    )
    setConfirmRemove(null)
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { nome: 'Novo item', rubricas: [newRubrica()], total_item: 0 },
    ])
  }

  const updateItemName = (itemIdx: number, nome: string) => {
    setItems((prev) => prev.map((it, i) => (i === itemIdx ? { ...it, nome } : it)))
  }

  const handleAccept = async () => {
    setSaving(true)
    try {
      const estimativaEditada = { items, total_geral: totalGeral }
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

  const handleApplyVenda = async (value: string) => {
    const num = parseFloat(value)
    if (isNaN(num) || num <= 0) return
    setSavingVenda(true)
    setVendaMsg(null)
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorVendaFinal: num }),
      })
      if (!res.ok) {
        setVendaMsg('error')
        return
      }
      setVendaMsg('ok')
      setTimeout(() => setVendaMsg(null), 2500)
      onAccepted()
    } catch {
      setVendaMsg('error')
    } finally {
      setSavingVenda(false)
    }
  }

  const marginFromVenda =
    vendaInput !== '' && parseFloat(vendaInput) > totalGeral
      ? (((parseFloat(vendaInput) - totalGeral) / parseFloat(vendaInput)) * 100).toFixed(1)
      : null

  return (
    <div className="space-y-4">
      {/* Header card: confidence + approach + actions */}
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            {nivelConfianca && (
              <Badge variant="outline" className={CONFIANCA_COLORS[nivelConfianca] ?? 'bg-gray-100'}>
                Confiança: {nivelConfianca}
              </Badge>
            )}
            {nivelConfiancaJustificacao && (
              <p className="text-xs text-muted-foreground">{nivelConfiancaJustificacao}</p>
            )}
          </div>
          {!readOnly && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => void handleAccept()} disabled={saving} className="btn-niu">
                {saving ? 'A guardar...' : 'Aceitar estimativa'}
              </Button>
              {onRegenerate && (
                <Button size="sm" variant="outline" onClick={() => setConfirmRegenerate(true)}>
                  Regenerar
                </Button>
              )}
            </div>
          )}
        </div>

        {abordagemTecnica && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Abordagem Técnica
            </p>
            <p ref={approachRef} className={`text-sm ${!approachExpanded ? 'line-clamp-3' : ''}`}>
              {abordagemTecnica}
            </p>
            {showApproachToggle && (
              <button
                className="text-xs text-[#000000] underline hover:text-[#333333]"
                onClick={() => setApproachExpanded((v) => !v)}
              >
                {approachExpanded ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </div>
        )}

        {hasUnsavedChanges && !readOnly && (
          <Badge variant="outline" className="text-[#666666] border-[#cccccc]">
            Alterações não guardadas
          </Badge>
        )}
      </div>

      {/* Items */}
      {items.map((item, itemIdx) => (
        <Card key={itemIdx}>
          <CardHeader
            className="pb-2 pt-3 cursor-pointer select-none"
            onClick={() => toggleCollapse(itemIdx)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ChevronDownIcon
                  className={`h-4 w-4 shrink-0 transition-transform ${collapsed.has(itemIdx) ? '-rotate-90' : ''}`}
                />
                {readOnly ? (
                  <span className="text-sm font-semibold truncate">{item.nome}</span>
                ) : (
                  <Input
                    value={item.nome}
                    onChange={(e) => {
                      e.stopPropagation()
                      updateItemName(itemIdx, e.target.value)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-sm font-semibold border-0 p-0 focus-visible:ring-0 bg-transparent"
                  />
                )}
              </div>
              <span className="text-sm font-semibold shrink-0 ml-2">
                {item.total_item.toFixed(2)}€
              </span>
            </div>
          </CardHeader>

          {!collapsed.has(itemIdx) && (
            <CardContent className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-1">
                <span className="col-span-4">Descrição</span>
                <span className="col-span-2">Qtd.</span>
                <span className="col-span-2">Unid.</span>
                <span className="col-span-2 text-right">Unit. (€)</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1" />
              </div>
              {item.rubricas.map((r, rubIdx) => (
                <div key={rubIdx} className="space-y-0.5">
                  <div className="grid grid-cols-12 gap-2 items-center">
                    {readOnly ? (
                      <span className="col-span-4 text-xs truncate">{r.descricao}</span>
                    ) : (
                      <Input
                        className="col-span-4 h-7 text-xs"
                        value={r.descricao}
                        onChange={(e) => updateRubrica(itemIdx, rubIdx, 'descricao', e.target.value)}
                      />
                    )}
                    {readOnly ? (
                      <span className="col-span-2 text-xs">{r.quantidade}</span>
                    ) : (
                      <Input
                        className="col-span-2 h-7 text-xs"
                        type="number"
                        min={0}
                        value={r.quantidade}
                        onChange={(e) =>
                          updateRubrica(itemIdx, rubIdx, 'quantidade', parseFloat(e.target.value) || 0)
                        }
                      />
                    )}
                    {readOnly ? (
                      <span className="col-span-2 text-xs">{r.unidade}</span>
                    ) : (
                      <Input
                        className="col-span-2 h-7 text-xs"
                        value={r.unidade}
                        onChange={(e) => updateRubrica(itemIdx, rubIdx, 'unidade', e.target.value)}
                      />
                    )}
                    {readOnly ? (
                      <span className="col-span-2 text-xs text-right">{r.custo_unitario.toFixed(2)}</span>
                    ) : (
                      <Input
                        className="col-span-2 h-7 text-xs text-right"
                        type="number"
                        min={0}
                        step={0.01}
                        value={r.custo_unitario}
                        onChange={(e) =>
                          updateRubrica(
                            itemIdx,
                            rubIdx,
                            'custo_unitario',
                            parseFloat(e.target.value) || 0,
                          )
                        }
                      />
                    )}
                    <span className="col-span-1 text-right text-xs font-mono">
                      {r.custo_total.toFixed(0)}€
                    </span>
                    {readOnly ? (
                      <span className="col-span-1" />
                    ) : (
                      <button
                        className="col-span-1 text-muted-foreground hover:text-destructive text-xs"
                        onClick={() => setConfirmRemove({ itemIdx, rubIdx })}
                        title="Remover rubrica"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  {r.fonte && (
                    <p className="text-[10px] text-muted-foreground/70 italic pl-1 leading-tight">
                      {r.fonte}
                    </p>
                  )}
                </div>
              ))}
              {!readOnly && (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => addRubrica(itemIdx)}
                  >
                    + Rubrica
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}

      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addItem}>
          + Novo item
        </Button>
      )}

      <Separator />

      {/* Global totals bar */}
      <div style={{ border: '1px solid #eeeeee', borderTop: '3px solid #000000', borderRadius: 2, padding: 16 }} className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Total custos:</span>
          <span className="font-bold font-mono">{totalGeral.toFixed(2)}€</span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="font-medium shrink-0">Margem %:</span>
            <Input
              type="number"
              min={0}
              max={99}
              step={0.1}
              placeholder="0.0"
              value={marginInput}
              onChange={(e) => {
                setMarginInput(e.target.value)
                if (e.target.value !== '') {
                  const margin = parseFloat(e.target.value)
                  if (!isNaN(margin) && margin < 100) {
                    setVendaInput((totalGeral / (1 - margin / 100)).toFixed(2))
                  }
                }
              }}
              className="w-24 h-7 text-sm"
            />
            <span className="text-muted-foreground">→</span>
            <span className="font-medium shrink-0">Valor de venda:</span>
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              value={vendaInput}
              onChange={(e) => {
                setVendaInput(e.target.value)
                setMarginInput('')
              }}
              className="w-32 h-7 text-sm font-mono"
            />
            <span className="text-xs text-muted-foreground">€</span>
            {marginFromVenda && (
              <span className="text-xs text-muted-foreground">(margem: {marginFromVenda}%)</span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              disabled={savingVenda || !vendaInput}
              onClick={() => void handleApplyVenda(vendaInput)}
            >
              {savingVenda ? 'A guardar...' : 'Aplicar'}
            </Button>
            {vendaMsg === 'ok' && (
              <span className="text-xs text-emerald-600 font-medium">Guardado</span>
            )}
            {vendaMsg === 'error' && (
              <span className="text-xs text-destructive font-medium">Erro ao guardar</span>
            )}
          </div>
        )}
        {readOnly && typeof valorVendaFinal === 'number' && (
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Valor de venda: </span>
              <span className="font-semibold font-mono">{valorVendaFinal.toFixed(2)}€</span>
            </div>
            {marginFromVenda && (
              <div>
                <span className="text-muted-foreground">Margem: </span>
                <span className="font-semibold">{marginFromVenda}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm remove rubrica dialog */}
      <Dialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover rubrica</DialogTitle>
          </DialogHeader>
          <p className="text-sm">Tem a certeza que quer remover esta rubrica?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmRemove && removeRubrica(confirmRemove.itemIdx, confirmRemove.rubIdx)
              }
            >
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm regenerate dialog */}
      <Dialog open={confirmRegenerate} onOpenChange={(open) => !open && setConfirmRegenerate(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerar estimativa</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Tem a certeza? Será criada uma nova sessão de orçamentação e a estimativa actual será descartada.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRegenerate(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmRegenerate(false)
                onRegenerate?.()
              }}
            >
              Regenerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
