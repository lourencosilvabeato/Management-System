import { getPayload } from 'payload'
import config from '@payload-config'
import { ProposalKPIs } from '@/components/proposals/ProposalKPIs'
import { ProposalListClient } from '@/components/proposals/ProposalListClient'

export const dynamic = 'force-dynamic'

export default async function PropostasPage() {
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'proposals',
    limit: 500,
    sort: '-createdAt',
    depth: 1,
    overrideAccess: true,
  })

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Propostas</h1>
      </div>

      <ProposalKPIs proposals={docs} />

      <ProposalListClient proposals={docs} />
    </div>
  )
}
