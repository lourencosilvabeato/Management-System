import type { CollectionAfterChangeHook } from 'payload'
import type { Proposal } from '../../payload-types'
import { v4 as uuidv4 } from 'uuid'

export const generateEstimate: CollectionAfterChangeHook<Proposal> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context?.skipGenerateEstimate) return doc

  const justEnteredOrcamentacao =
    doc.estado === 'EmOrcamentacao' && previousDoc?.estado !== 'EmOrcamentacao'

  if (!justEnteredOrcamentacao) return doc

  // Fire-and-forget — does not block the response
  void (async () => {
    const sessaoId = uuidv4()
    const timestamp = new Date().toISOString()

    try {
      // TODO: replace with real generateEstimateForProposal when implemented in Prompt 05
      const { generateInitialEstimate } = await import(
        '../../lib/ai/generateEstimateForProposal'
      )

      // Re-fetch with depth so maquetes and ficheirosAnexos have populated Media objects with URLs
      const fullProposal = await req.payload.findByID({
        collection: 'proposals',
        id: doc.id,
        depth: 2,
        overrideAccess: true,
      })

      const result = await generateInitialEstimate(fullProposal, req.payload)

      const existingSessoes = Array.isArray(doc.sessaoOrcamentacao)
        ? doc.sessaoOrcamentacao
        : []

      await req.payload.update({
        collection: 'proposals',
        id: doc.id,
        data: {
          sessaoOrcamentacao: [
            ...existingSessoes,
            {
              sessaoId,
              conversaIA: result.conversaIA,
              estimativaAtual: result.estimativaAtual,
              abordagemTecnica: result.abordagemTecnica,
              nivelConfianca: result.nivelConfianca,
              nivelConfiancaJustificacao: result.nivelConfiancaJustificacao,
              inputsUsados: result.inputsUsados,
              variantesGeradas: result.variantesGeradas,
              varianteSelecionada: result.varianteSelecionada,
            },
          ],
          activityLog: [
            ...(Array.isArray(doc.activityLog) ? doc.activityLog : []),
            {
              evento: `AI estimate generated — confidence: ${result.nivelConfianca}`,
              user: req.user?.id,
              timestamp,
            },
          ],
        },
        overrideAccess: true,
        context: { skipActivityLog: true },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await req.payload.update({
        collection: 'proposals',
        id: doc.id,
        data: {
          activityLog: [
            ...(Array.isArray(doc.activityLog) ? doc.activityLog : []),
            {
              evento: `Estimate generation failed: ${message}`,
              user: req.user?.id,
              timestamp,
            },
          ],
        },
        overrideAccess: true,
        context: { skipActivityLog: true },
      })
    }
  })()

  return doc
}
