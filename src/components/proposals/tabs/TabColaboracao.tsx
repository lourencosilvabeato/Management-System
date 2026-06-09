'use client'

import type { Proposal } from '@/payload-types'
import { Separator } from '@/components/ui/separator'

interface Props {
  proposal: Proposal
}

function formatTS(ts?: string | null) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TabColaboracao({ proposal }: Props) {
  const comments = Array.isArray(proposal.comentarios) ? proposal.comentarios : []
  const activityLog = Array.isArray(proposal.activityLog) ? proposal.activityLog : []

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-3">
        <p className="text-sm font-semibold">Comentários ({comments.length})</p>
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem comentários.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c, i) => {
              const autorNome =
                typeof c.autor === 'object' && c.autor !== null && 'nome' in c.autor
                  ? (c.autor as { nome: string }).nome
                  : '—'
              return (
                <div key={i} className="rounded-md border p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{autorNome}</span>
                    <span className="text-xs text-muted-foreground">{formatTS(c.timestamp)}</span>
                  </div>
                  <p className="text-sm">{c.texto}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-sm font-semibold">Histórico de Actividade</p>
        {activityLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem actividade registada.</p>
        ) : (
          <div className="space-y-1">
            {[...activityLog].reverse().map((entry, i) => {
              const userNome =
                typeof entry.user === 'object' && entry.user !== null && 'nome' in entry.user
                  ? (entry.user as { nome: string }).nome
                  : null
              return (
                <div key={i} className="flex items-start gap-2 text-sm py-1">
                  <span className="text-muted-foreground shrink-0 text-xs mt-0.5 w-32">
                    {formatTS(entry.timestamp)}
                  </span>
                  <span className="flex-1">{entry.evento}</span>
                  {userNome && (
                    <span className="text-muted-foreground text-xs shrink-0">{userNome}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
