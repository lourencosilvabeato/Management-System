'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'

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

  const send = async () => {
    const trimmed = input.trim()
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
          { role: 'assistant', content: `Erro: ${data.error ?? 'Falha na comunicação com a IA'}`, timestamp: new Date().toISOString() },
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
        { role: 'assistant', content: 'Erro de rede ao contactar a IA.', timestamp: new Date().toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ScrollArea className="h-64 rounded-md border p-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {msg.role === 'assistant' && msg.content.startsWith('{') ? (
                  <span className="italic text-xs">Estimativa actualizada</span>
                ) : (
                  msg.content
                )}
              </div>
              <span className="text-xs text-muted-foreground px-1">
                {new Date(msg.timestamp).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {loading && (
            <div className="flex items-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
                A gerar estimativa...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          placeholder="Pede um ajuste à estimativa... (Enter para enviar)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="resize-none"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} className="self-end">
          Enviar
        </Button>
      </div>
    </div>
  )
}
