import type { BasePayload } from 'payload'
import type { Proposal, Material, Machine, InternalRate, ProjectLibrary } from '../../payload-types'
import { analyzeImages } from './analyzeImages'
import { buildInitialPrompt } from './buildPrompt'
import { generateEstimateMock } from './claudeClient'
import { parseEstimate } from './parseEstimate'

export interface EstimateResult {
  conversaIA: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  estimativaAtual: Record<string, unknown>
  abordagemTecnica: string
  nivelConfianca: 'Alto' | 'Medio' | 'Baixo'
  nivelConfiancaJustificacao: string
  inputsUsados: Record<string, unknown>
}

interface KnowledgeBase {
  materials: Material[]
  machines: Machine[]
  internalRates: InternalRate[]
  projectLibrary: ProjectLibrary[]
}

async function fetchKnowledgeBase(payload: BasePayload): Promise<KnowledgeBase> {
  const [materialsRes, machinesRes, ratesRes, libraryRes] = await Promise.all([
    payload.find({ collection: 'materials', where: { ativo: { equals: true } }, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'machines', where: { disponivel: { equals: true } }, limit: 200, overrideAccess: true }),
    payload.find({ collection: 'internal-rates', limit: 200, overrideAccess: true }),
    payload.find({ collection: 'project-library', limit: 50, overrideAccess: true }),
  ])

  return {
    materials: materialsRes.docs,
    machines: machinesRes.docs,
    internalRates: ratesRes.docs,
    projectLibrary: libraryRes.docs,
  }
}

function getMockupUrls(proposal: Proposal): string[] {
  if (!Array.isArray(proposal.maquetes)) return []
  return proposal.maquetes
    .map((m) => {
      if (typeof m === 'object' && m !== null && 'url' in m) return (m as { url?: string }).url ?? null
      return null
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
}

function normalizeConfianca(nivel: string): 'Alto' | 'Medio' | 'Baixo' {
  if (nivel === 'Alto') return 'Alto'
  if (nivel === 'Baixo') return 'Baixo'
  return 'Medio'
}

async function callAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  return generateEstimateMock(lastUserMessage)
}

async function callAIWithRetry(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ReturnType<typeof parseEstimate>> {
  const raw = await callAI(messages)
  try {
    return parseEstimate(raw)
  } catch {
    // Retry once with a re-prompt appended
    const retryMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content:
          'Your previous response could not be parsed as valid JSON. ' +
          'Reply with ONLY valid JSON matching the exact schema — no text, no markdown, no backticks.',
      },
    ]
    const retryRaw = await callAI(retryMessages)
    return parseEstimate(retryRaw)
  }
}

export async function generateInitialEstimate(
  proposal: Proposal,
  payload: BasePayload,
): Promise<EstimateResult> {
  const knowledgeBase = await fetchKnowledgeBase(payload)

  const mockupUrls = getMockupUrls(proposal)
  let imageDescription = ''
  if (mockupUrls.length > 0) {
    imageDescription = await analyzeImages(mockupUrls)
  }

  const userMessage = buildInitialPrompt(proposal, knowledgeBase, imageDescription)
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: userMessage },
  ]

  const parsed = await callAIWithRetry(messages)

  const now = new Date().toISOString()

  return {
    conversaIA: [],
    estimativaAtual: parsed.estimativa as unknown as Record<string, unknown>,
    abordagemTecnica: parsed.abordagem_tecnica,
    nivelConfianca: normalizeConfianca(parsed.nivel_confianca.nivel),
    nivelConfiancaJustificacao: parsed.nivel_confianca.justificacao,
    inputsUsados: {
      briefingSnapshot: proposal.briefing,
      memoriacriativaSnapshot: proposal.memoriacriativa,
      maquetesIds: mockupUrls,
      timestamp: now,
    },
  }
}

export async function continueConversation(
  proposal: Proposal,
  sessaoId: string,
  newMessage: string,
  payload: BasePayload,
): Promise<EstimateResult> {
  const sessoes = proposal.sessaoOrcamentacao ?? []
  const sessao = sessoes.find((s) => s.sessaoId === sessaoId)
  if (!sessao) throw new Error(`Session not found: ${sessaoId}`)

  // Rebuild initial prompt so the AI has full context on follow-up calls
  const knowledgeBase = await fetchKnowledgeBase(payload)
  const mockupUrls = getMockupUrls(proposal)
  let imageDescription = ''
  if (mockupUrls.length > 0) {
    imageDescription = await analyzeImages(mockupUrls)
  }
  const initialPrompt = buildInitialPrompt(proposal, knowledgeBase, imageDescription)

  // Reconstruct the initial AI response from stored session data
  const initialAssistantContent = JSON.stringify({
    abordagem_tecnica: sessao.abordagemTecnica ?? '',
    nivel_confianca: {
      nivel: sessao.nivelConfianca ?? 'Medio',
      justificacao: sessao.nivelConfiancaJustificacao ?? '',
    },
    estimativa: sessao.estimativaAtual,
  })

  // Filter out old-format messages where the initial context prompt was stored in conversaIA
  const rawConversaIA = sessao.conversaIA ?? []
  const isOldFormat =
    rawConversaIA.length >= 2 &&
    rawConversaIA[0]?.role === 'user' &&
    (rawConversaIA[0]?.content ?? '').startsWith('## Project')
  const chatExchanges = isOldFormat ? rawConversaIA.slice(2) : rawConversaIA

  // Full AI history: initial context + chat exchanges + new message
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    { role: 'user', content: initialPrompt },
    { role: 'assistant', content: initialAssistantContent },
    ...chatExchanges.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content ?? '',
    })),
    { role: 'user', content: newMessage },
  ]

  const parsed = await callAIWithRetry(messages)

  const now = new Date().toISOString()

  // Only store actual chat exchanges — never the initial context prompt
  const updatedConversaIA: EstimateResult['conversaIA'] = [
    ...chatExchanges.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content ?? '',
      timestamp: msg.timestamp ?? now,
    })),
    { role: 'user', content: newMessage, timestamp: now },
    { role: 'assistant', content: JSON.stringify(parsed), timestamp: now },
  ]

  return {
    conversaIA: updatedConversaIA,
    estimativaAtual: parsed.estimativa as unknown as Record<string, unknown>,
    abordagemTecnica: parsed.abordagem_tecnica,
    nivelConfianca: normalizeConfianca(parsed.nivel_confianca.nivel),
    nivelConfiancaJustificacao: parsed.nivel_confianca.justificacao,
    inputsUsados: (sessao.inputsUsados as Record<string, unknown>) ?? {},
  }
}
