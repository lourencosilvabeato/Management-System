'use client'

import type { Proposal } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const CRIATIVO_LABELS: Record<string, string> = {
  Rascunho: 'Rascunho',
  EmRevisao: 'Em Revisão',
  Aprovado: 'Aprovado',
}

interface Props {
  proposal: Proposal
}

export function TabCriativa({ proposal }: Props) {
  const maquetes = Array.isArray(proposal.maquetes) ? proposal.maquetes : []

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Estado Criativo:</span>
        <Badge variant="secondary">
          {CRIATIVO_LABELS[proposal.estadoCriativo ?? ''] ?? proposal.estadoCriativo ?? '—'}
        </Badge>
      </div>

      {proposal.memoriacriativa && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-semibold">Memória Criativa</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {JSON.stringify(proposal.memoriacriativa)}
            </p>
          </div>
        </>
      )}

      {maquetes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-semibold">Maquetes ({maquetes.length})</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {maquetes.map((m, i) => {
                const url =
                  typeof m === 'object' && m !== null && 'url' in m
                    ? (m as { url?: string | null }).url
                    : null
                const filename =
                  typeof m === 'object' && m !== null && 'filename' in m
                    ? (m as { filename?: string | null }).filename
                    : `Maquete ${i + 1}`
                return (
                  <div key={i} className="rounded-md border overflow-hidden">
                    {url ? (
                      <img
                        src={url}
                        alt={filename ?? `Maquete ${i + 1}`}
                        className="w-full aspect-video object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-video bg-muted flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">{filename}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {maquetes.length === 0 && !proposal.memoriacriativa && (
        <p className="text-sm text-muted-foreground">Nenhuma informação criativa registada.</p>
      )}
    </div>
  )
}
