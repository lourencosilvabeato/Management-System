'use client'

import type { Proposal } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const ESTADO_LABELS: Record<string, string> = {
  Recebida: 'Recebida',
  EmElaboracao: 'Em Elaboração',
  EmOrcamentacao: 'Em Orçamentação',
  Enviada: 'Enviada',
  Ganha: 'Ganha',
  Perdida: 'Perdida',
}

interface Props {
  proposal: Proposal
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm">{value ?? '—'}</p>
    </div>
  )
}

export function TabDadosBase({ proposal }: Props) {
  const account =
    typeof proposal.account === 'object' && proposal.account !== null && 'nome' in proposal.account
      ? (proposal.account as { nome: string }).nome
      : '—'

  const formatDate = (d?: string | null) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const attachCount = Array.isArray(proposal.ficheirosAnexos) ? proposal.ficheirosAnexos.length : 0

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Número" value={proposal.numero} />
        <Field label="Projecto" value={proposal.nomeProjeto} />
        <Field label="Cliente" value={proposal.cliente} />
        <Field label="Account" value={account} />
        <Field label="Prazo de Resposta" value={formatDate(proposal.prazoResposta)} />
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</p>
          <Badge variant="outline">{ESTADO_LABELS[proposal.estado ?? ''] ?? proposal.estado}</Badge>
        </div>
      </div>

      {(proposal.contactoNome || proposal.contactoEmail || proposal.contactoTelefone) && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-semibold">Contacto</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Nome" value={proposal.contactoNome} />
              <Field label="Email" value={proposal.contactoEmail} />
              <Field label="Telefone" value={proposal.contactoTelefone} />
            </div>
          </div>
        </>
      )}

      {proposal.briefing && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-semibold">Briefing</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {JSON.stringify(proposal.briefing)}
            </p>
          </div>
        </>
      )}

      {proposal.figmaLink && (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Link Figma</p>
            <a
              href={proposal.figmaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 underline break-all"
            >
              {proposal.figmaLink}
            </a>
          </div>
        </>
      )}

      {attachCount > 0 && (
        <>
          <Separator />
          <p className="text-sm text-muted-foreground">{attachCount} ficheiro(s) anexado(s)</p>
        </>
      )}

      {proposal.estado === 'Perdida' && (
        <>
          <Separator />
          <div className="rounded-md bg-destructive/10 p-4 space-y-2">
            <p className="text-sm font-semibold text-destructive">Motivo de Perda</p>
            <Field label="Motivo" value={proposal.motivoPerda ?? '—'} />
            {proposal.detalhePerda && <Field label="Detalhe" value={proposal.detalhePerda} />}
          </div>
        </>
      )}
    </div>
  )
}
