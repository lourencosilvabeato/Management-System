'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { lexicalToText, textToLexical } from '@/lib/lexical'
import type { Proposal } from '@/payload-types'
import type { CurrentUser, AccountUser } from '../ProposalDrawer'

interface Props {
  proposal: Proposal
  currentUser: CurrentUser
  accountUsers: AccountUser[]
  onSave: () => void
}

const ORANGE = 'oklch(0.60 0.230 38)'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
      <div
        className="px-5 py-3 flex items-center bg-muted/60 border-b border-border"
        style={{ borderLeft: `3px solid ${ORANGE}` }}
      >
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: ORANGE }}>
          {title}
        </p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function ReadField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg px-4 py-3 space-y-1 bg-muted/50 border border-border">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-base font-semibold text-foreground">{value ?? '—'}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground/80">{label}</p>
      {children}
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
        account: form.accountId ? parseInt(form.accountId, 10) : undefined,
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

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  if (isReadOnly) {
    return (
      <div className="space-y-5 py-2">
        <Section title="Identificação">
          <div className="grid grid-cols-2 gap-4">
            <ReadField label="Número" value={proposal.numero} />
            <ReadField label="Criado em" value={formatDate(proposal.createdAt)} />
          </div>
        </Section>
        <Section title="Projecto">
          <div className="space-y-4">
            <ReadField label="Nome do projecto" value={proposal.nomeProjeto} />
            <ReadField label="Cliente" value={proposal.cliente} />
            <ReadField label="Briefing" value={lexicalToText(proposal.briefing) || '—'} />
          </div>
        </Section>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-2">

      <Section title="Identificação">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ReadField label="Número" value={proposal.numero} />
          <ReadField label="Criado em" value={formatDate(proposal.createdAt)} />
          {typeof proposal.margemCalculada === 'number' && (
            <ReadField label="Margem" value={`${proposal.margemCalculada.toFixed(1)}%`} />
          )}
          {proposal.estado === 'Perdida' && proposal.motivoPerda && (
            <ReadField label="Motivo de perda" value={proposal.motivoPerda} />
          )}
        </div>
      </Section>

      <Section title="Projecto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nome do projecto *">
            <Input value={form.nomeProjeto} onChange={(e) => set('nomeProjeto', e.target.value)} className="text-base h-11" />
          </Field>
          <Field label="Cliente *">
            <Input value={form.cliente} onChange={(e) => set('cliente', e.target.value)} className="text-base h-11" />
          </Field>
          <Field label="Account">
            <Select value={form.accountId} onValueChange={(v) => set('accountId', v ?? '')}>
              <SelectTrigger className="text-base h-11">
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
          </Field>
          <Field label="Prazo de resposta">
            <Input type="date" value={form.prazoResposta} onChange={(e) => set('prazoResposta', e.target.value)} className="text-base h-11" />
          </Field>
        </div>
      </Section>

      <Section title="Contacto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Nome">
            <Input value={form.contactoNome} onChange={(e) => set('contactoNome', e.target.value)} placeholder="Nome do contacto" className="text-base h-11" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.contactoEmail} onChange={(e) => set('contactoEmail', e.target.value)} placeholder="email@empresa.pt" className="text-base h-11" />
          </Field>
          <Field label="Telefone">
            <Input value={form.contactoTelefone} onChange={(e) => set('contactoTelefone', e.target.value)} placeholder="+351 9xx xxx xxx" className="text-base h-11" />
          </Field>
        </div>
      </Section>

      <Section title="Comercial">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Valor de venda (€)">
            <Input type="number" min={0} step={0.01} value={form.valorVendaFinal} onChange={(e) => set('valorVendaFinal', e.target.value)} placeholder="0.00" className="text-base h-11" />
          </Field>
          <Field label="Condições de pagamento">
            <Input value={form.condicoesPagamento} onChange={(e) => set('condicoesPagamento', e.target.value)} placeholder="Ex: 50% + 50%" className="text-base h-11" />
          </Field>
          <Field label="Validade da proposta">
            <Input type="date" value={form.validadeProposta} onChange={(e) => set('validadeProposta', e.target.value)} className="text-base h-11" />
          </Field>
        </div>
      </Section>

      <Section title="Briefing">
        <Textarea
          value={form.briefing}
          onChange={(e) => set('briefing', e.target.value)}
          rows={5}
          placeholder="Descrição do projecto, objectivos, dimensões, materiais preferidos..."
          className="resize-none text-base"
        />
      </Section>

      <Section title={`Ficheiros anexados (${attachments.length})`}>
        {attachments.length > 0 && (
          <ul className="space-y-2 mb-4">
            {attachments.map((a, i) => {
              const id = typeof a === 'object' && a !== null && 'id' in a ? (a as { id: string | number }).id : a
              const filename = typeof a === 'object' && a !== null && 'filename' in a ? (a as { filename?: string | null }).filename : null
              return (
                <li key={i} className="flex items-center justify-between rounded-lg px-4 py-3 bg-muted/50 border border-border">
                  <span className="truncate text-base text-foreground/80">{filename ?? `Ficheiro ${i + 1}`}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive ml-3 shrink-0 h-7 text-xs"
                    onClick={() => void handleRemoveAttachment(String(id))}
                  >
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('attach-input')?.click()}
            disabled={attachUploading}
          >
            {attachUploading ? 'A carregar...' : '+ Adicionar ficheiro'}
          </Button>
        </div>
      </Section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm font-medium text-emerald-600">Guardado com sucesso.</p>}

      <div className="flex justify-end pt-1 pb-2">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="btn-orange text-white border-0 px-6 h-11 text-base font-semibold"
        >
          {saving ? 'A guardar...' : 'Guardar alterações'}
        </Button>
      </div>
    </div>
  )
}
