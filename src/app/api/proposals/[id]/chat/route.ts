import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'
import { continueConversation } from '../../../../../lib/ai/generateEstimateForProposal'
import type { Proposal } from '../../../../../payload-types'

interface ChatBody {
  mensagem: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params

  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const role = (user as { role?: string }).role ?? ''
  if (!['account', 'producao', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Sem permissão para orçamentação' }, { status: 403 })
  }

  let body: ChatBody
  try {
    body = (await req.json()) as ChatBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { mensagem } = body
  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'mensagem é obrigatória' }, { status: 400 })
  }

  const proposal = await payload.findByID({
    collection: 'proposals',
    id,
    overrideAccess: true,
  })

  if (!proposal) {
    return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
  }

  if (proposal.estado !== 'EmOrcamentacao') {
    return NextResponse.json(
      { error: 'A proposta não está em estado EmOrcamentacao' },
      { status: 400 },
    )
  }

  const sessoes = proposal.sessaoOrcamentacao ?? []
  const activeSessao = sessoes[sessoes.length - 1]
  if (!activeSessao?.sessaoId) {
    return NextResponse.json({ error: 'Nenhuma sessão de orçamentação activa' }, { status: 400 })
  }

  try {
    const result = await continueConversation(proposal, activeSessao.sessaoId, mensagem, payload)

    const updatedSessoes = sessoes.map((s, i) => {
      if (i !== sessoes.length - 1) return s
      return {
        ...s,
        conversaIA: result.conversaIA,
        estimativaAtual: result.estimativaAtual,
        abordagemTecnica: result.abordagemTecnica,
        nivelConfianca: result.nivelConfianca,
        nivelConfiancaJustificacao: result.nivelConfiancaJustificacao,
      }
    })

    await payload.update({
      collection: 'proposals',
      id,
      data: { sessaoOrcamentacao: updatedSessoes as Proposal['sessaoOrcamentacao'] },
      context: { skipActivityLog: true },
      overrideAccess: true,
    })

    return NextResponse.json({
      estimativaAtual: result.estimativaAtual,
      abordagemTecnica: result.abordagemTecnica,
      nivelConfianca: result.nivelConfianca,
      nivelConfiancaJustificacao: result.nivelConfiancaJustificacao,
      conversaIA: result.conversaIA,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar mensagem'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
