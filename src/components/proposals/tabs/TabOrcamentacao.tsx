'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ChevronDownIcon } from 'lucide-react'
import { EstimateEditor } from '../EstimateEditor'
import { EstimateChat } from '../EstimateChat'
import type { Proposal } from '@/payload-types'
import type { EstimateOutput } from '@/lib/ai/parseEstimate'

const LOADING_MESSAGES = [
  'A analisar o briefing...',
  'A consultar a base de conhecimento...',
  'A calcular materiais e recursos...',
  'A gerar estimativa inicial...',
  'A finalizar orçamento...',
]

const MAX_POLL_COUNT = 30

interface ConversaMsg {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Props {
  proposal: Proposal
  onRefresh: () => void
}

type SessaoOrcamentacao = NonNullable<Proposal['sessaoOrcamentacao']>[number]

function getEstimativa(sessao: SessaoOrcamentacao): EstimateOutput['estimativa'] | null {
  if (!sessao.estimativaAtual) return null
  const est = sessao.estimativaAtual as unknown as EstimateOutput['estimativa']
  if (!est?.items) return null
  return est
}

function getMsgs(sessao: SessaoOrcamentacao): ConversaMsg[] {
  const raw = sessao.conversaIA ?? []
  // Strip old-format entries where the initial AI context prompt was stored as conversaIA[0]
  const isOldFormat =
    raw.length >= 2 &&
    raw[0]?.role === 'user' &&
    (raw[0]?.content ?? '').startsWith('## Project')
  return raw.slice(isOldFormat ? 2 : 0).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content ?? '',
    timestamp: m.timestamp ?? new Date().toISOString(),
  }))
}

export function TabOrcamentacao({ proposal, onRefresh }: Props) {
  const sessoes = proposal.sessaoOrcamentacao ?? []
  const activeSessao = sessoes[sessoes.length - 1]
  const previousSessoes = sessoes.length > 1 ? sessoes.slice(0, -1) : []

  const [currentEstimativa, setCurrentEstimativa] = useState<
    EstimateOutput['estimativa'] | null
  >(() => (activeSessao ? getEstimativa(activeSessao) : null))
  const [abordagem, setAbordagem] = useState(activeSessao?.abordagemTecnica ?? '')
  const [nivelConfianca, setNivelConfianca] = useState(activeSessao?.nivelConfianca ?? '')
  const [nivelJustificacao, setNivelJustificacao] = useState(
    activeSessao?.nivelConfiancaJustificacao ?? '',
  )
  const [conversaIA, setConversaIA] = useState<ConversaMsg[]>(() =>
    activeSessao ? getMsgs(activeSessao) : [],
  )

  const [pollCount, setPollCount] = useState(0)
  const [generationError, setGenerationError] = useState(false)
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0)
  const [previousOpen, setPreviousOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  const [triggering, setTriggering] = useState(false)

  const estado = proposal.estado
  const isReadOnly = estado === 'Ganha' || estado === 'Perdida'
  // Only poll when we know generation was triggered (session exists but estimate pending)
  const hasSession = sessoes.length > 0
  const isGenerating =
    (estado === 'EmOrcamentacao' && hasSession && !currentEstimativa) || regenerating

  // Sync estimate from proposal when it arrives (polling completed)
  useEffect(() => {
    if (currentEstimativa) return
    if (!activeSessao) return
    const est = getEstimativa(activeSessao)
    if (!est) return
    setCurrentEstimativa(est)
    setAbordagem(activeSessao.abordagemTecnica ?? '')
    setNivelConfianca(activeSessao.nivelConfianca ?? '')
    setNivelJustificacao(activeSessao.nivelConfiancaJustificacao ?? '')
    setConversaIA(getMsgs(activeSessao))
    setRegenerating(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal.sessaoOrcamentacao])

  // Cycle loading messages
  useEffect(() => {
    if (!isGenerating) return
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [isGenerating])

  // Poll for estimate
  useEffect(() => {
    if (!isGenerating || generationError) return
    if (pollCount >= MAX_POLL_COUNT) {
      setGenerationError(true)
      return
    }
    const timeout = setTimeout(() => {
      setPollCount((prev) => prev + 1)
      onRefreshRef.current()
    }, 3000)
    return () => clearTimeout(timeout)
  }, [isGenerating, pollCount, generationError])

  const handleNewEstimate = (data: {
    estimativaAtual: Record<string, unknown>
    abordagemTecnica: string
    nivelConfianca: string
    nivelConfiancaJustificacao: string
    conversaIA: ConversaMsg[]
  }) => {
    const est = data.estimativaAtual as unknown as EstimateOutput['estimativa']
    if (est?.items) setCurrentEstimativa(est)
    setAbordagem(data.abordagemTecnica)
    setNivelConfianca(data.nivelConfianca)
    setNivelJustificacao(data.nivelConfiancaJustificacao)
    setConversaIA(data.conversaIA)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    setCurrentEstimativa(null)
    setGenerationError(false)
    setPollCount(0)
    try {
      await fetch(`/api/proposals/${proposal.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoEstado: 'EmElaboracao' }),
      })
      await fetch(`/api/proposals/${proposal.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novoEstado: 'EmOrcamentacao' }),
      })
      onRefreshRef.current()
    } catch {
      setGenerationError(true)
      setRegenerating(false)
    }
  }

  // State: proposal not in a state where estimates are relevant
  if (
    estado !== 'EmOrcamentacao' &&
    estado !== 'Enviada' &&
    estado !== 'Ganha' &&
    estado !== 'Perdida'
  ) {
    return (
      <div className="py-6 text-sm text-muted-foreground">
        A estimativa será gerada automaticamente quando a proposta avançar para estado{' '}
        <strong>Em Orçamentação</strong>.
      </div>
    )
  }

  // State: no session — generation was never triggered (e.g. seeded proposals)
  if (!activeSessao && !isGenerating) {
    return (
      <div className="py-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          Nenhuma estimativa gerada ainda. Clica em Gerar para iniciar a análise com IA.
        </p>
        <Button
          size="sm"
          className="btn-niu"
          disabled={triggering}
          onClick={async () => {
            setTriggering(true)
            try {
              await fetch(`/api/proposals/${proposal.id}/transition`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novoEstado: 'EmElaboracao' }),
              })
              await fetch(`/api/proposals/${proposal.id}/transition`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ novoEstado: 'EmOrcamentacao' }),
              })
              onRefreshRef.current()
            } catch {
              setTriggering(false)
            }
          }}
        >
          {triggering ? 'A iniciar...' : 'Gerar estimativa'}
        </Button>
      </div>
    )
  }

  // State: generation error (polling timed out)
  if (generationError) {
    return (
      <div className="py-6 space-y-4">
        <p className="text-sm text-destructive">
          A geração demorou demasiado ou ocorreu um erro. Verifica os logs do servidor e tenta novamente.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setGenerationError(false)
            setPollCount(0)
            void handleRegenerate()
          }}
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  // State: generating (polling)
  if (isGenerating) {
    return (
      <div className="py-8 flex flex-col items-center gap-4 text-center">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          {LOADING_MESSAGES[loadingMsgIdx]}
        </p>
        <p className="text-xs text-muted-foreground">
          A estimativa pode demorar até 30 segundos.
        </p>
      </div>
    )
  }

  // State: estimate available
  return (
    <div className="space-y-6 py-4">
      {currentEstimativa && (
        <EstimateEditor
          estimativa={currentEstimativa}
          proposalId={String(proposal.id)}
          valorVendaFinal={proposal.valorVendaFinal}
          nivelConfianca={nivelConfianca || null}
          nivelConfiancaJustificacao={nivelJustificacao || null}
          abordagemTecnica={abordagem || null}
          onAccepted={onRefresh}
          onRegenerate={!isReadOnly ? handleRegenerate : undefined}
          readOnly={isReadOnly}
        />
      )}

      {!isReadOnly && currentEstimativa && (
        <>
          <Separator />
          <EstimateChat
            conversaIA={conversaIA}
            proposalId={String(proposal.id)}
            onNewEstimate={handleNewEstimate}
          />
        </>
      )}

      {previousSessoes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <button
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
              onClick={() => setPreviousOpen((v) => !v)}
            >
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${previousOpen ? '' : '-rotate-90'}`}
              />
              Ver sessões de orçamentação anteriores ({previousSessoes.length})
            </button>

            {previousOpen && (
              <div className="space-y-4 pt-2">
                {previousSessoes
                  .slice()
                  .reverse()
                  .map((sessao, idx) => {
                    const est = getEstimativa(sessao)
                    if (!est) return null
                    return (
                      <PreviousSession
                        key={sessao.id ?? idx}
                        sessao={sessao}
                        estimativa={est}
                        proposalId={String(proposal.id)}
                        index={previousSessoes.length - idx}
                      />
                    )
                  })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function PreviousSession({
  sessao,
  estimativa,
  proposalId,
  index,
}: {
  sessao: NonNullable<Proposal['sessaoOrcamentacao']>[number]
  estimativa: EstimateOutput['estimativa']
  proposalId: string
  index: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-md border">
      <button
        className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-medium">Sessão #{index}</span>
        <div className="flex items-center gap-3">
          {sessao.nivelConfianca && (
            <span className="text-xs text-muted-foreground">
              Confiança: {sessao.nivelConfianca}
            </span>
          )}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`}
          />
        </div>
      </button>
      {open && (
        <div className="p-4 border-t">
          <EstimateEditor
            estimativa={estimativa}
            proposalId={proposalId}
            nivelConfianca={sessao.nivelConfianca ?? null}
            nivelConfiancaJustificacao={sessao.nivelConfiancaJustificacao ?? null}
            abordagemTecnica={sessao.abordagemTecnica ?? null}
            onAccepted={() => {}}
            readOnly
          />
        </div>
      )}
    </div>
  )
}
