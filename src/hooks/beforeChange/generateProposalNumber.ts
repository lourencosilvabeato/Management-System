import type { CollectionBeforeChangeHook } from 'payload'

export const generateProposalNumber: CollectionBeforeChangeHook = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create') return data

  const year = new Date().getFullYear()

  const { docs } = await req.payload.find({
    collection: 'proposals',
    where: {
      and: [
        { createdAt: { greater_than_equal: `${year}-01-01T00:00:00.000Z` } },
        { createdAt: { less_than: `${year + 1}-01-01T00:00:00.000Z` } },
      ],
    },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })

  let sequence = 1

  if (docs.length > 0) {
    const last = docs[0]
    if (last.numero) {
      const match = last.numero.match(/PROP-\d{4}-(\d{3,})$/)
      if (match) {
        sequence = parseInt(match[1], 10) + 1
      }
    }
  }

  data.numero = `PROP-${year}-${String(sequence).padStart(3, '0')}`
  return data
}
