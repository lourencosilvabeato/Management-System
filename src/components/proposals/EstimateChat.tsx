'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

const EXAMPLE_PROMPTS = [
  'Adicionar transporte e montagem',
  'Ajustar para um orçamento mais conservador',
  'Especificar materiais de acabamento premium',
]

const CONFIANCA_COLORS: Record<string, string> = {
  Alto: 'bg-green-100 text-green-800 border-green-300',
  Médio: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Baixo: 'bg-red-100 text-red-800 border-red-300',
}

interface ConversaMsg {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Props {
  conversaIA: ConversaMsg[]
  proposalId: string
  onNewEstimate: (data: {
    estimativaAtual: Record<string, unknown>
    abordagemTecnica: string
    nivelConfianca: string
    nivelConfiancaJustificacao: string
    conversaIA: ConversaMsg[]
  }) => void
}

export function EstimateChat({ conversaIA, proposalId, onNewEstimate }: Props) {
  const [messages, setMessages] = useState<ConversaMsg[]>(conversaIA)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || loading) return

    const userMsg: ConversaMsg = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`/api/proposals/${proposalId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: trimmed }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Erro: ${data.error ?? 'Falha na comunicação com a IA'}`,
            timestamp: new Date().toISOString(),
          },
        ])
        return
      }

      const data = (await res.json()) as {
        estimativaAtual: Record<string, unknown>
        abordagemTecnica: string
        nivelConfianca: string
        nivelConfiancaJustificacao: string
        conversaIA: ConversaMsg[]
      }

      setMessages(data.conversaIA)
      onNewEstimate(data)
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Erro de rede ao contactar a IA.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      void send()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold">Ajustar com IA</p>
        <p className="text-xs text-muted-foreground">Diz o que queres alterar na estimativa</p>
      </div>

      {isEmpty ? (
        <div className="space-y-2 rounded-md border p-4">
          <p className="text-xs text-muted-foreground">Sugestões para começar:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => void send(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ScrollArea className="h-56 rounded-md border p-3">
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
                  A ajustar estimativa...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Ex: 'O stand afinal tem 30m²' ou 'Adiciona 2 dias de montagem'"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none"
          disabled={loading}
        />
        <Button
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          className="self-end"
        >
          {loading ? '...' : 'Enviar'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Ctrl+Enter para enviar</p>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ConversaMsg }) {
  if (msg.role === 'user') {
    return (
      <div className="flex flex-col gap-0.5 items-end">
        <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground">
          {msg.content}
        </div>
        <span className="text-xs text-muted-foreground px-1">
          {new Date(msg.timestamp).toLocaleTimeString('pt-PT', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    )
  }

  const isJson = msg.content.trimStart().startsWith('{')
  let confidence: string | null = null
  let approach: string | null = null

  if (isJson) {
    try {
      const parsed = JSON.parse(msg.content) as {
        nivel_confianca?: { nivel?: string }
        abordagem_tecnica?: string
      }
      confidence = parsed.nivel_confianca?.nivel ?? null
      approach = parsed.abordagem_tecnica ?? null
    } catch {
      /* ignore parse errors */
    }
  }

  return (
    <div className="flex flex-col gap-0.5 items-start">
      <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted space-y-1.5">
        {isJson ? (
          <>
            <p className="italic text-muted-foreground text-xs">
              Estimativa actualizada — ver tabela
            </p>
            {confidence && (
              <Badge
                variant="outline"
                className={`text-xs ${CONFIANCA_COLORS[confidence] ?? ''}`}
              >
                Confiança: {confidence}
              </Badge>
            )}
            {approach && (
              <p className="text-xs text-muted-foreground line-clamp-2">{approach}</p>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{msg.content}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground px-1">
        {new Date(msg.timestamp).toLocaleTimeString('pt-PT', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  )
}
