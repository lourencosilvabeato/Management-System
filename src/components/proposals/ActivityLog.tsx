'use client'

import type { Proposal } from '@/payload-types'

interface Props {
  activityLog: Proposal['activityLog']
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

export function ActivityLog({ activityLog }: Props) {
  const entries = Array.isArray(activityLog) ? [...activityLog].reverse() : []

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem actividade registada.</p>
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, i) => {
        const userNome =
          typeof entry.user === 'object' && entry.user !== null && 'nome' in entry.user
            ? (entry.user as { nome: string }).nome
            : null
        return (
          <div key={i} className="flex items-start gap-2 text-sm py-1 border-b last:border-0">
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
  )
}
