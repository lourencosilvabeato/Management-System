'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { lexicalToText, textToLexical } from '@/lib/lexical'
import type { Proposal } from '@/payload-types'
import type { CurrentUser, AccountUser } from '../ProposalDrawer'

interface Props {
  proposal: Proposal
  currentUser: CurrentUser
  accountUsers: AccountUser[]
  onSave: () => void
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  )
}

export function TabDadosBase({ proposal, currentUser, accountUsers, onSave }: Props) {
  const isReadOnly = currentUser.role === 'criativo'

  const getAccountId = () => {
    if (typeof proposal.account === 'object' && proposal.account !== null && 'id' in proposal.account) {
      return String((proposal.account as { id: string | number }).id)
    }
    return typeof proposal.account === 'string' || typeof proposal.account === 'number'
      ? String(proposal.account)
      : ''
  }

  const [form, setForm] = useState({
    nomeProjeto: proposal.nomeProjeto ?? '',
    cliente: proposal.cliente ?? '',
    contactoNome: proposal.contactoNome ?? '',
    contactoEmail: proposal.contactoEmail ?? '',
    contactoTelefone: proposal.contactoTelefone ?? '',
    accountId: getAccountId(),
    prazoResposta: proposal.prazoResposta ? proposal.prazoResposta.slice(0, 10) : '',
    briefing: lexicalToText(proposal.briefing),
    condicoesPagamento: proposal.condicoesPagamento ?? '',
    validadeProposta: proposal.validadeProposta ? proposal.validadeProposta.slice(0, 10) : '',
    valorVendaFinal: typeof proposal.valorVendaFinal === 'number' ? String(proposal.valorVendaFinal) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [attachUploading, setAttachUploading] = useState(false)

  const attachments = Array.isArray(proposal.ficheirosAnexos) ? proposal.ficheirosAnexos : []

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    setSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const body: Record<string, unknown> = {
        nomeProjeto: form.nomeProjeto.trim(),
        cliente: form.cliente.trim(),
        contactoNome: form.contactoNome.trim() || null,
        contactoEmail: form.contactoEmail.trim() || null,
        contactoTelefone: form.contactoTelefone.trim() || null,
        account: form.accountId || undefined,
        prazoResposta: form.prazoResposta || null,
        briefing: form.briefing.trim() ? textToLexical(form.briefing) : null,
        condicoesPagamento: form.condicoesPagamento.trim() || null,
        validadeProposta: form.validadeProposta || null,
      }
      if (form.valorVendaFinal !== '') {
        body.valorVendaFinal = parseFloat(form.valorVendaFinal)
      }

      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = (await res.json()) as { errors?: Array<{ message: string }> }
        setError(err.errors?.[0]?.message ?? 'Erro ao guardar')
        return
      }
      setSuccess(true)
      onSave()
    } catch {
      setError('Erro de rede')
    } finally {
      setSaving(false)
    }
  }

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/media', { method: 'POST', body: formData })
      if (!uploadRes.ok) { setError('Erro ao carregar ficheiro'); return }
      const uploaded = (await uploadRes.json()) as { doc?: { id: string | number } }
      const mediaId = uploaded.doc?.id
      if (!mediaId) { setError('Erro ao carregar ficheiro'); return }

      const currentIds = attachments.map((a) =>
        typeof a === 'object' && a !== null && 'id' in a ? (a as { id: string | number }).id : a,
      )
      const patchRes = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ficheirosAnexos: [...currentIds, mediaId] }),
      })
      if (!patchRes.ok) { setError('Erro ao associar ficheiro'); return }
      onSave()
    } catch {
      setError('Erro de rede')
    } finally {
      setAttachUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveAttachment = async (attachId: string) => {
    const newIds = attachments
      .map((a) => (typeof a === 'object' && a !== null && 'id' in a ? (a as { id: string | number }).id : a))
      .filter((id) => String(id) !== attachId)
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ficheirosAnexos: newIds }),
    })
    if (!res.ok) { setError('Erro ao remover ficheiro'); return }
    onSave()
  }

  const formatDate = (d?: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-6 py-4">
      {/* Read-only fields */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Número" value={proposal.numero} />
        <Field label="Criado em" value={formatDate(proposal.createdAt)} />
        {proposal.estado === 'Perdida' && (
          <>
            <Field label="Motivo de perda" value={proposal.motivoPerda ?? '—'} />
            {proposal.detalhePerda && <Field label="Detalhe" value={proposal.detalhePerda} />}
          </>
        )}
        {typeof proposal.margemCalculada === 'number' && (
          <Field label="Margem calculada" value={`${proposal.margemCalculada.toFixed(1)}%`} />
        )}
      </div>

      {isReadOnly ? (
        <div className="space-y-4">
          <Field label="Nome do projecto" value={proposal.nomeProjeto} />
          <Field label="Cliente" value={proposal.cliente} />
          <Field label="Briefing" value={lexicalToText(proposal.briefing) || '—'} />
        </div>
      ) : (
        <>
          <Separator />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do projecto *</Label>
              <Input value={form.nomeProjeto} onChange={(e) => set('nomeProjeto', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input value={form.cliente} onChange={(e) => set('cliente', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={form.accountId} onValueChange={(v) => set('accountId', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar account..." />
                </SelectTrigger>
                <SelectContent>
                  {accountUsers.map((u) => (
                    <SelectItem key={String(u.id)} value={String(u.id)}>
                      {u.nome ?? u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prazo de resposta</Label>
              <Input type="date" value={form.prazoResposta} onChange={(e) => set('prazoResposta', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nome do contacto</Label>
              <Input value={form.contactoNome} onChange={(e) => set('contactoNome', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email do contacto</Label>
              <Input type="email" value={form.contactoEmail} onChange={(e) => set('contactoEmail', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone do contacto</Label>
              <Input value={form.contactoTelefone} onChange={(e) => set('contactoTelefone', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Valor de venda (€)</Label>
              <Input type="number" min={0} step={0.01} value={form.valorVendaFinal} onChange={(e) => set('valorVendaFinal', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Condições de pagamento</Label>
              <Input value={form.condicoesPagamento} onChange={(e) => set('condicoesPagamento', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Validade da proposta</Label>
              <Input type="date" value={form.validadeProposta} onChange={(e) => set('validadeProposta', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Briefing</Label>
            <Textarea
              value={form.briefing}
              onChange={(e) => set('briefing', e.target.value)}
              rows={5}
              placeholder="Descrição do projecto..."
            />
          </div>

          {/* Attachments */}
          <Separator />
          <div className="space-y-3">
            <p className="text-sm font-semibold">Ficheiros anexados ({attachments.length})</p>
            {attachments.length > 0 && (
              <ul className="space-y-1">
                {attachments.map((a, i) => {
                  const id = typeof a === 'object' && a !== null && 'id' in a ? (a as { id: string | number }).id : a
                  const filename = typeof a === 'object' && a !== null && 'filename' in a ? (a as { filename?: string | null }).filename : null
                  return (
                    <li key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="truncate">{filename ?? `Ficheiro ${i + 1}`}</span>
                      <Button variant="ghost" size="sm" className="text-destructive ml-2 shrink-0" onClick={() => void handleRemoveAttachment(String(id))}>
                        Remover
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
            <div>
              <input
                id="attach-input"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={(e) => void handleAddAttachment(e)}
                disabled={attachUploading}
              />
              <Button variant="outline" size="sm" onClick={() => document.getElementById('attach-input')?.click()} disabled={attachUploading}>
                {attachUploading ? 'A carregar...' : '+ Adicionar ficheiro'}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Guardado com sucesso.</p>}

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'A guardar...' : 'Guardar alterações'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
