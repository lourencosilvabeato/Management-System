import { getPayload } from 'payload'
import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { ProposalTable } from '@/components/proposals/ProposalTable'
import { AnimatedBackground } from '@/components/AnimatedBackground'

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

  const roleLabel: Record<string, string> = {
    account: 'Account',
    criativo: 'Criativo',
    producao: 'Produção',
    admin: 'Admin',
  }

  const displayName = currentUser.nome ?? currentUser.email.split('@')[0]

  return (
    <div className="min-h-screen">
      <AnimatedBackground />

      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* ── Top bar ──────────────────────────────────── */}
        <header className="flex items-center justify-between py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span
              className="text-xl font-black tracking-[0.25em] uppercase select-none"
              style={{ color: 'oklch(0.60 0.230 38)' }}
            >
              NIU
            </span>
            <span className="text-foreground/20 font-thin text-lg">/</span>
            <span className="text-sm text-muted-foreground">Pipeline Comercial</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{displayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {roleLabel[currentUser.role] ?? currentUser.role}
              </p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, oklch(0.70 0.21 40), oklch(0.64 0.22 28))',
                boxShadow: '0 0 12px oklch(0.70 0.21 40 / 40%)',
              }}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ── Page heading ─────────────────────────────── */}
        <div className="pt-8 pb-6">
          <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão do pipeline comercial · Niu / Innovagency
          </p>
        </div>

        {/* ── Content ──────────────────────────────────── */}
        <ProposalTable currentUser={currentUser} accountUsers={accountUsers} />

        <div className="h-12" />
      </div>
    </div>
  )
}
