'use client'

import { useRouter } from 'next/navigation'
import { ProposalTable } from './ProposalTable'
import type { Proposal } from '@/payload-types'

interface Props {
  proposals: Proposal[]
}

export function ProposalListClient({ proposals }: Props) {
  const router = useRouter()
  return <ProposalTable proposals={proposals} onSelect={(id) => router.push(`/propostas/${id}`)} />
}
