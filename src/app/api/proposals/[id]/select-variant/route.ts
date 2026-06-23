import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'
import type { Proposal } from '../../../../../payload-types'

type VarianteTipo = 'Otimista' | 'Equilibrada' | 'Conservadora'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { tipo } = (await req.json()) as { tipo: VarianteTipo }
  if (!tipo) return NextResponse.json({ error: 'tipo é obrigatório' }, { status: 400 })

  const proposal = await payload.findByID({ collection: 'proposals', id, overrideAccess: false, user })
  const sessoes = proposal.sessaoOrcamentacao ?? []
  if (sessoes.length === 0) return NextResponse.json({ error: 'Sem sessão activa' }, { status: 400 })

  const activeSessao = sessoes[sessoes.length - 1]
  const variantes = (activeSessao.variantesGeradas ?? []) as Array<{
    tipo: VarianteTipo
    estimativa: Record<string, unknown>
    abordagemTecnica: string
    nivelConfianca: 'Alto' | 'Medio' | 'Baixo'
    nivelConfiancaJustificacao: string
  }>

  const variante = variantes.find((v) => v.tipo === tipo)
  if (!variante) return NextResponse.json({ error: `Variante ${tipo} não encontrada` }, { status: 404 })

  const updatedSessoes = sessoes.map((s, i) => {
    if (i !== sessoes.length - 1) return s
    return {
      ...s,
      estimativaAtual: variante.estimativa,
      abordagemTecnica: variante.abordagemTecnica,
      nivelConfianca: variante.nivelConfianca,
      nivelConfiancaJustificacao: variante.nivelConfiancaJustificacao,
      varianteSelecionada: tipo,
    }
  })

  await payload.update({
    collection: 'proposals',
    id,
    data: { sessaoOrcamentacao: updatedSessoes as Proposal['sessaoOrcamentacao'] },
    overrideAccess: true,
    context: { skipActivityLog: true },
  })

  return NextResponse.json({
    estimativaAtual: variante.estimativa,
    abordagemTecnica: variante.abordagemTecnica,
    nivelConfianca: variante.nivelConfianca,
    nivelConfiancaJustificacao: variante.nivelConfiancaJustificacao,
    varianteSelecionada: tipo,
  })
}
