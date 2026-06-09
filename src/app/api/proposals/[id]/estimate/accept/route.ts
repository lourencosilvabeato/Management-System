import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'
import type { Proposal } from '../../../../../../payload-types'

interface AcceptBody {
  estimativaEditada: Record<string, unknown>
}

function calcTotalGeral(estimativa: Record<string, unknown>): number | null {
  const items = estimativa.items
  if (!Array.isArray(items)) return null
  return items.reduce((sum: number, item: unknown) => {
    if (!item || typeof item !== 'object') return sum
    const it = item as Record<string, unknown>
    return sum + (typeof it.total_item === 'number' ? it.total_item : 0)
  }, 0)
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
    return NextResponse.json({ error: 'Sem permissão para aceitar estimativas' }, { status: 403 })
  }

  let body: AcceptBody
  try {
    body = (await req.json()) as AcceptBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { estimativaEditada } = body
  if (!estimativaEditada || typeof estimativaEditada !== 'object') {
    return NextResponse.json({ error: 'estimativaEditada é obrigatória e deve ser um objecto' }, { status: 400 })
  }

  if (!Array.isArray(estimativaEditada.items)) {
    return NextResponse.json({ error: 'estimativaEditada.items deve ser um array' }, { status: 400 })
  }

  const proposal = await payload.findByID({
    collection: 'proposals',
    id,
    overrideAccess: true,
  })

  if (!proposal) {
    return NextResponse.json({ error: 'Proposta não encontrada' }, { status: 404 })
  }

  if (!['EmOrcamentacao', 'Enviada'].includes(proposal.estado ?? '')) {
    return NextResponse.json(
      { error: 'A proposta deve estar em EmOrcamentacao ou Enviada para aceitar a estimativa' },
      { status: 400 },
    )
  }

  const totalCustos = calcTotalGeral(estimativaEditada)
  const valorVenda = typeof proposal.valorVendaFinal === 'number' ? proposal.valorVendaFinal : null

  let margemCalculada: number | null = null
  if (totalCustos !== null && valorVenda !== null && valorVenda > 0) {
    margemCalculada = ((valorVenda - totalCustos) / valorVenda) * 100
  }

  const updateData: Partial<Proposal> = {
    estimativaEditada: estimativaEditada as Proposal['estimativaEditada'],
  }
  if (margemCalculada !== null) {
    updateData.margemCalculada = Math.round(margemCalculada * 100) / 100
  }

  try {
    const updated = await payload.update({
      collection: 'proposals',
      id,
      data: updateData,
      overrideAccess: true,
    })

    await payload.update({
      collection: 'proposals',
      id,
      data: {
        activityLog: [
          ...(Array.isArray(updated.activityLog) ? updated.activityLog : []),
          {
            evento: `Estimativa aceite — total custos: ${totalCustos?.toFixed(2) ?? 'n/a'}€${margemCalculada !== null ? ` | margem: ${margemCalculada.toFixed(1)}%` : ''}`,
            user: typeof user.id === 'string' || typeof user.id === 'number' ? user.id : undefined,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      context: { skipActivityLog: true },
      overrideAccess: true,
    })

    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao aceitar estimativa'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
