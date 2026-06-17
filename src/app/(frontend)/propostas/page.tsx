import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProposalTable } from '@/components/proposals/ProposalTable'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Propostas — Niu' }

export default async function PropostasPage() {
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}>
      <Sidebar currentUser={currentUser} />

      <div style={{ marginLeft: 220, flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar
          title="Propostas"
          subtitle="Pipeline comercial · Niu / Innovagency"
        />

        <main style={{ flex: 1, padding: '32px', background: '#ffffff' }}>
          <ProposalTable currentUser={currentUser} accountUsers={accountUsers} />
        </main>
      </div>
    </div>
  )
}
