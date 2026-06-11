'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { lexicalToText, textToLexical } from '@/lib/lexical'
import type { Proposal } from '@/payload-types'
import type { CurrentUser } from '../ProposalDrawer'

interface Props {
  proposal: Proposal
  currentUser: CurrentUser
  onSave: () => void
}

const CRIATIVO_LABELS: Record<string, string> = {
  Rascunho: 'Rascunho',
  EmRevisao: 'Em Revisão',
  Aprovado: 'Aprovado',
}

export function TabCriativa({ proposal, currentUser, onSave }: Props) {
  const canEdit = ['criativo', 'admin'].includes(currentUser.role)

  const [form, setForm] = useState({
    memoriacriativa: lexicalToText(proposal.memoriacriativa),
    estadoCriativo: proposal.estadoCriativo ?? 'Rascunho',
    figmaLink: proposal.figmaLink ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)

  const maquetes = Array.isArray(proposal.maquetes) ? proposal.maquetes : []

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
        memoriacriativa: form.memoriacriativa.trim() ? textToLexical(form.memoriacriativa) : null,
        estadoCriativo: form.estadoCriativo,
        figmaLink: form.figmaLink.trim() || null,
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

  const handleAddMaquete = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const uploadRes = await fetch('/api/media', { method: 'POST', body: formData })
      if (!uploadRes.ok) { setError('Erro ao carregar maquete'); return }
      const uploaded = (await uploadRes.json()) as { doc?: { id: string | number } }
      const mediaId = uploaded.doc?.id
      if (!mediaId) { setError('Erro ao carregar maquete'); return }

      const currentIds = maquetes.map((m) =>
        typeof m === 'object' && m !== null && 'id' in m ? (m as { id: string | number }).id : m,
      )
      const patchRes = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maquetes: [...currentIds, mediaId] }),
      })
      if (!patchRes.ok) { setError('Erro ao associar maquete'); return }
      onSave()
    } catch {
      setError('Erro de rede')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemoveMaquete = async (maqueteId: string) => {
    const newIds = maquetes
      .map((m) => (typeof m === 'object' && m !== null && 'id' in m ? (m as { id: string | number }).id : m))
      .filter((id) => String(id) !== maqueteId)
    const res = await fetch(`/api/proposals/${proposal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maquetes: newIds }),
    })
    if (!res.ok) { setError('Erro ao remover maquete'); return }
    onSave()
  }

  if (!canEdit) {
    // Read-only for non-criativo/admin
    return (
      <div className="space-y-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Estado criativo:</span>
          <Badge variant="secondary">
            {CRIATIVO_LABELS[proposal.estadoCriativo ?? ''] ?? proposal.estadoCriativo ?? '—'}
          </Badge>
        </div>
        {proposal.memoriacriativa && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Memória Criativa</p>
            <p className="text-sm whitespace-pre-wrap">{lexicalToText(proposal.memoriacriativa) || '—'}</p>
          </div>
        )}
        {proposal.figmaLink && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Link Figma</p>
            <a href={proposal.figmaLink} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline break-all">
              {proposal.figmaLink}
            </a>
          </div>
        )}
        {maquetes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Maquetes ({maquetes.length})</p>
            <MaqueteGrid maquetes={maquetes} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2">
        <Label>Estado criativo</Label>
        <Select value={form.estadoCriativo} onValueChange={(v) => set('estadoCriativo', v ?? 'Rascunho')}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Rascunho">Rascunho</SelectItem>
            <SelectItem value="EmRevisao">Em Revisão</SelectItem>
            <SelectItem value="Aprovado">Aprovado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Memória criativa</Label>
        <Textarea
          value={form.memoriacriativa}
          onChange={(e) => set('memoriacriativa', e.target.value)}
          rows={6}
          placeholder="Descreve a abordagem criativa..."
        />
      </div>

      <div className="space-y-2">
        <Label>Link Figma</Label>
        <Input
          type="url"
          value={form.figmaLink}
          onChange={(e) => set('figmaLink', e.target.value)}
          placeholder="https://figma.com/..."
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">Guardado com sucesso.</p>}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'A guardar...' : 'Guardar'}
        </Button>
      </div>

      <Separator />

      {/* Mockups */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Maquetes ({maquetes.length})</p>
        {maquetes.length > 0 && <MaqueteGrid maquetes={maquetes} onRemove={(id) => void handleRemoveMaquete(String(id))} />}
        <div>
          <input
            id="maquete-input"
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => void handleAddMaquete(e)}
            disabled={uploading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('maquete-input')?.click()}
            disabled={uploading}
          >
            {uploading ? 'A carregar...' : '+ Adicionar maquete'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MaqueteGrid({
  maquetes,
  onRemove,
}: {
  maquetes: NonNullable<Proposal['maquetes']>
  onRemove?: (id: string | number) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {maquetes.map((m, i) => {
        const id = typeof m === 'object' && m !== null && 'id' in m ? (m as { id: string | number }).id : i
        const url = typeof m === 'object' && m !== null && 'url' in m ? (m as { url?: string | null }).url : null
        const filename = typeof m === 'object' && m !== null && 'filename' in m ? (m as { filename?: string | null }).filename : null
        const updatedAt = typeof m === 'object' && m !== null && 'updatedAt' in m ? (m as { updatedAt?: string | null }).updatedAt : null
        return (
          <div key={String(id)} className="rounded-md border overflow-hidden group relative">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt={filename ?? `Maquete ${i + 1}`} className="w-full aspect-video object-cover" />
              </a>
            ) : (
              <div className="w-full aspect-video bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground px-2 text-center">{filename}</span>
              </div>
            )}
            <div className="px-2 py-1 text-xs text-muted-foreground truncate">{filename}</div>
            {updatedAt && (
              <div className="px-2 pb-1 text-xs text-muted-foreground">
                {new Date(updatedAt).toLocaleDateString('pt-PT')}
              </div>
            )}
            {onRemove && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 text-xs px-2"
                onClick={() => onRemove(id)}
              >
                ✕
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
