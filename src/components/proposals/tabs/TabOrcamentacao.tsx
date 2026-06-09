'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { EstimateEditor } from '../EstimateEditor'
import { EstimateChat } from '../EstimateChat'
import type { Proposal } from '@/payload-types'
import type { EstimateOutput } from '@/lib/ai/parseEstimate'

const CONFIANCA_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  Alto: 'default',
  Medio: 'secondary',
  Baixo: 'destructive',
}

interface Props {
  proposal: Proposal
}

interface ConversaMsg {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export function TabOrcamentacao({ proposal }: Props) {
  const router = useRouter()

  const sessoes = proposal.sessaoOrcamentacao ?? []
  const activeSessao = sessoes[sessoes.length - 1]

  const [currentEstimativa, setCurrentEstimativa] = useState<
    EstimateOutput['estimativa'] | null
  >(() => {
    if (!activeSessao?.estimativaAtual) return null
    const est = activeSessao.estimativaAtual as unknown as EstimateOutput['estimativa']
    if (!est?.items) return null
    return est
  })

  const [abordagem, setAbordagem] = useState(activeSessao?.abordagemTecnica ?? '')
  const [nivelConfianca, setNivelConfianca] = useState(activeSessao?.nivelConfianca ?? '')
  const [nivelJustificacao, setNivelJustificacao] = useState(
    activeSessao?.nivelConfiancaJustificacao ?? '',
  )
  const [conversaIA, setConversaIA] = useState<ConversaMsg[]>(() => {
    return (activeSessao?.conversaIA ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content ?? '',
      timestamp: m.timestamp ?? new Date().toISOString(),
    }))
  })

  const estado = proposal.estado

  if (estado !== 'EmOrcamentacao' && estado !== 'Enviada' && estado !== 'Ganha' && estado !== 'Perdida') {
    return (
      <div className="py-6 text-sm text-muted-foreground">
        A proposta precisa de estar em estado <strong>Em Orçamentação</strong> para aceder a esta secção.
      </div>
    )
  }

  if (!activeSessao) {
    return (
      <div className="py-6 text-sm text-muted-foreground">
        Nenhuma sessão de orçamentação encontrada.
      </div>
    )
  }

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

  const isReadOnly = estado === 'Ganha' || estado === 'Perdida'

  return (
    <div className="space-y-6 py-4">
      {abordagem && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Abordagem Técnica</CardTitle>
              {nivelConfianca && (
                <Badge variant={CONFIANCA_VARIANT[nivelConfianca] ?? 'secondary'}>
                  Confiança: {nivelConfianca}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{abordagem}</p>
            {nivelJustificacao && (
              <p className="text-xs text-muted-foreground italic">{nivelJustificacao}</p>
            )}
          </CardContent>
        </Card>
      )}

      {!currentEstimativa && (
        <div className="py-4 text-sm text-muted-foreground animate-pulse">
          A gerar estimativa inicial...
        </div>
      )}

      {currentEstimativa && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Estimativa</p>
            {isReadOnly ? (
              <div className="text-sm text-muted-foreground">
                Estimativa em modo de leitura (proposta {estado?.toLowerCase()}).
              </div>
            ) : (
              <EstimateEditor
                estimativa={currentEstimativa}
                proposalId={String(proposal.id)}
                onAccepted={() => router.refresh()}
              />
            )}
          </div>

          {proposal.estimativaEditada && (
            <>
              <Separator />
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Estimativa aceite registada.
              </div>
            </>
          )}

          {!isReadOnly && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-semibold">Refinamento via IA</p>
                <EstimateChat
                  conversaIA={conversaIA}
                  proposalId={String(proposal.id)}
                  onNewEstimate={handleNewEstimate}
                />
              </div>
            </>
          )}
        </>
      )}

      {typeof proposal.valorVendaFinal === 'number' && (
        <>
          <Separator />
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Valor de Venda: </span>
              <span className="font-semibold">
                {proposal.valorVendaFinal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}€
              </span>
            </div>
            {typeof proposal.margemCalculada === 'number' && (
              <div>
                <span className="text-muted-foreground">Margem: </span>
                <span className="font-semibold">{proposal.margemCalculada.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
