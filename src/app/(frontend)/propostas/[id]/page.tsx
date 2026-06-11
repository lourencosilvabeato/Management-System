import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProposalDrawer } from '@/components/proposals/ProposalDrawer'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PropostaDetailPage({ params }: Props) {
  const { id } = await params
  const payload = await getPayload({ config })
  const headersList = await getHeaders()

  const { user } = await payload.auth({ headers: headersList })
  if (!user) redirect('/admin')

  const accountUsersRes = await payload.find({
    collection: 'users',
    where: { role: { equals: 'account' } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  let exists = true
  try {
    await payload.findByID({ collection: 'proposals', id, depth: 0, overrideAccess: true })
  } catch {
    exists = false
  }
  if (!exists) notFound()

  const currentUser = {
    id: user.id,
    email: user.email ?? '',
    role: (user as { role?: string }).role ?? 'account',
    nome: (user as { nome?: string | null }).nome ?? null,
  }

  const accountUsers = accountUsersRes.docs.map((u) => ({
    id: u.id,
    nome: (u as { nome?: string | null }).nome ?? null,
    email: u.email ?? '',
  }))

  return (
    <QueryProvider>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Link href="/propostas">
            <Button variant="ghost" size="sm">← Voltar às Propostas</Button>
          </Link>
        </div>
        <div className="max-w-3xl">
          <ProposalDrawer
            id={id}
            currentUser={currentUser}
            accountUsers={accountUsers}
          />
        </div>
      </div>
    </QueryProvider>
  )
}
