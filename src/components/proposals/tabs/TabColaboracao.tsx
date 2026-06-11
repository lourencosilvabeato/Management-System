'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ActivityLog } from '../ActivityLog'
import type { Proposal } from '@/payload-types'
import type { CurrentUser } from '../ProposalDrawer'

interface Props {
  proposal: Proposal
  currentUser: CurrentUser
  onSave: () => void
}

interface Comment {
  autor?: { id: string | number; nome?: string | null; email?: string } | string | number | null
  texto?: string | null
  timestamp?: string | null
}

function getAuthorName(autor: Comment['autor']): string {
  if (typeof autor === 'object' && autor !== null && 'nome' in autor) {
    return (autor as { nome?: string | null }).nome ?? (autor as { email?: string }).email ?? '?'
  }
  return '?'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatTS(ts?: string | null) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TabColaboracao({ proposal, currentUser, onSave }: Props) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([])
  const feedRef = useRef<HTMLDivElement>(null)

  const serverComments: Comment[] = Array.isArray(proposal.comentarios)
    ? (proposal.comentarios as Comment[])
    : []
  const allComments = [...serverComments, ...optimisticComments]

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [allComments.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    const optimistic: Comment = {
      autor: { id: currentUser.id, nome: currentUser.nome, email: currentUser.email },
      texto: text,
      timestamp: new Date().toISOString(),
    }
    setOptimisticComments((prev) => [...prev, optimistic])
    setInput('')
    setSending(true)
    setError('')

    try {
      const newComments = [
        ...serverComments.map((c) => ({
          autor:
            typeof c.autor === 'object' && c.autor !== null && 'id' in c.autor
              ? (c.autor as { id: string | number }).id
              : c.autor,
          texto: c.texto,
          timestamp: c.timestamp,
        })),
        {
          autor: currentUser.id,
          texto: text,
          timestamp: new Date().toISOString(),
        },
      ]

      const res = await fetch(`/api/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentarios: newComments }),
      })

      if (!res.ok) {
        setOptimisticComments((prev) => prev.filter((c) => c !== optimistic))
        setError('Erro ao enviar comentário')
        setInput(text)
        return
      }

      setOptimisticComments([])
      onSave()
    } catch {
      setOptimisticComments((prev) => prev.filter((c) => c !== optimistic))
      setError('Erro de rede')
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="space-y-6 py-4">
      {/* Comments feed */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Comentários</p>

        <div ref={feedRef} className="max-h-72 overflow-y-auto space-y-3 pr-1">
          {allComments.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>
          )}
          {allComments.map((c, i) => {
            const name = getAuthorName(c.autor)
            return (
              <div key={i} className="flex items-start gap-3">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">{formatTS(c.timestamp)}</span>
                  </div>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{c.texto}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreve um comentário... (Enter para enviar)"
            rows={2}
            className="resize-none"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="self-end"
          >
            Enviar
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <Separator />

      {/* Activity log */}
      <div className="space-y-3">
        <p className="text-sm font-semibold">Histórico de actividade</p>
        <ActivityLog activityLog={proposal.activityLog} />
      </div>
    </div>
  )
}
