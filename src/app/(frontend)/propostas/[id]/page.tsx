import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ProposalDrawer } from '@/components/proposals/ProposalDrawer'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PropostaDetailPage({ params }: Props) {
  const { id } = await params
  const payload = await getPayload({ config })

  let proposal
  try {
    proposal = await payload.findByID({
      collection: 'proposals',
      id,
      depth: 2,
      overrideAccess: true,
    })
  } catch {
    notFound()
  }

  if (!proposal) notFound()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/propostas">
          <Button variant="ghost" size="sm">← Voltar às Propostas</Button>
        </Link>
      </div>

      <ProposalDrawer proposal={proposal} />
    </div>
  )
}
