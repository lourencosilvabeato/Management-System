import type { CollectionAfterChangeHook } from 'payload'
import type { Proposal } from '../../payload-types'

export const logActivity: CollectionAfterChangeHook<Proposal> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (req.context?.skipActivityLog) return doc

  const userId = req.user?.id
  const timestamp = new Date().toISOString()
  const events: string[] = []

  if (operation === 'create') {
    events.push('Proposal created')
  } else {
    // State change
    if (doc.estado !== previousDoc?.estado) {
      events.push(`State changed from ${previousDoc?.estado ?? 'unknown'} to ${doc.estado}`)
    }

    // Creative status change
    if (doc.estadoCriativo !== previousDoc?.estadoCriativo) {
      events.push(`Creative status changed to ${doc.estadoCriativo}`)
    }

    // Mockup upload — compare maquetes array length
    const prevMaquetes = Array.isArray(previousDoc?.maquetes) ? previousDoc.maquetes : []
    const currMaquetes = Array.isArray(doc.maquetes) ? doc.maquetes : []
    if (currMaquetes.length > prevMaquetes.length) {
      events.push(`Mockup added`)
    }

    // Attachment upload — compare ficheirosAnexos array length
    const prevAnexos = Array.isArray(previousDoc?.ficheirosAnexos)
      ? previousDoc.ficheirosAnexos
      : []
    const currAnexos = Array.isArray(doc.ficheirosAnexos) ? doc.ficheirosAnexos : []
    if (currAnexos.length > prevAnexos.length) {
      events.push(`File attached`)
    }

    // Comment added
    const prevComments = Array.isArray(previousDoc?.comentarios) ? previousDoc.comentarios : []
    const currComments = Array.isArray(doc.comentarios) ? doc.comentarios : []
    if (currComments.length > prevComments.length) {
      events.push(`Comment added by ${req.user?.email ?? 'unknown'}`)
    }
  }

  if (events.length === 0) return doc

  const newEntries = events.map((evento) => ({ evento, user: userId, timestamp }))
  const existing = Array.isArray(doc.activityLog) ? doc.activityLog : []

  await req.payload.update({
    collection: 'proposals',
    id: doc.id,
    data: {
      activityLog: [...existing, ...newEntries],
    },
    req,
    context: { skipActivityLog: true },
    overrideAccess: true,
  })

  return doc
}
