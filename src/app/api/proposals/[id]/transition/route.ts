import { getPayload } from 'payload'
import { NextRequest, NextResponse } from 'next/server'
import config from '@payload-config'
import type { Proposal } from '../../../../../payload-types'

type Estado = NonNullable<Proposal['estado']>
type MotivoPerda = NonNullable<Proposal['motivoPerda']>

interface TransitionBody {
  novoEstado: Estado
  motivoPerda?: MotivoPerda
  detalhePerda?: string
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

  let body: TransitionBody
  try {
    body = (await req.json()) as TransitionBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { novoEstado, motivoPerda, detalhePerda } = body
  if (!novoEstado) {
    return NextResponse.json({ error: 'novoEstado é obrigatório' }, { status: 400 })
  }

  try {
    const updateData: Partial<Proposal> = { estado: novoEstado }
    if (motivoPerda) updateData.motivoPerda = motivoPerda
    if (detalhePerda) updateData.detalhePerda = detalhePerda

    const updated = await payload.update({
      collection: 'proposals',
      id,
      data: updateData,
      user,
      overrideAccess: false,
    })

    return NextResponse.json(updated)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    const status = message.includes('autorizado') || message.includes('permitida') ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
