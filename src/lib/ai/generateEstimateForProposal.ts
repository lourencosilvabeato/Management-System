import type { BasePayload } from 'payload'
import type { Proposal, Material, Machine, InternalRate, ProjectLibrary } from '../../payload-types'
import { analyzeImages } from './analyzeImages'
import { buildInitialPrompt } from './buildPrompt'
import { generateEstimate } from './claudeClient'
import { parseEstimate, type EstimateOutput } from './parseEstimate'
import { describeAttachments } from './readAttachments'
import { analyzeFigmaLink } from '../figma'
import { buildSystemPrompt, ESTIMATE_DEFAULT_RULES } from './prompts/estimateSystem'

export interface EstimateVariante {
  tipo: 'Otimista' | 'Equilibrada' | 'Conservadora'
  estimativa: Record<string, unknown>
  abordagemTecnica: string
  nivelConfianca: 'Alto' | 'Medio' | 'Baixo'
  nivelConfiancaJustificacao: string
}

export interface EstimateResult {
  conversaIA: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
  estimativaAtual: Record<string, unknown>
  abordagemTecnica: string
  nivelConfianca: 'Alto' | 'Medio' | 'Baixo'
  nivelConfiancaJustificacao: string
  inputsUsados: Record<string, unknown>
  variantesGeradas: EstimateVariante[]
  varianteSelecionada: 'Otimista' | 'Equilibrada' | 'Conservadora'
  variantesOrdemViolada: boolean
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

async function fetchAiSettings(payload: BasePayload): Promise<string> {
  try {
    const settings = await payload.findGlobal({ slug: 'ai-settings', overrideAccess: true })
    return (settings as { regrasOrcamentacao?: string | null }).regrasOrcamentacao || ESTIMATE_DEFAULT_RULES
  } catch {
    return ESTIMATE_DEFAULT_RULES
  }
}

function getMockupUrls(proposal: Proposal): string[] {
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  if (!Array.isArray(proposal.maquetes)) return []
  return proposal.maquetes
    .map((m) => {
      if (typeof m === 'object' && m !== null && 'url' in m) {
        const url = (m as { url?: string }).url ?? null
        if (!url) return null
        return url.startsWith('http') ? url : `${base}${url}`
      }
      return null
    })
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
}

function normalizeConfianca(nivel: string): 'Alto' | 'Medio' | 'Baixo' {
  if (nivel === 'Alto') return 'Alto'
  if (nivel === 'Baixo') return 'Baixo'
  return 'Medio'
}

const EQUILIBRADA_INSTRUCTION =
  '\n\n## Instrução de variante\nEsta é a variante **EQUILIBRADA**. Usa estimativas standard sem optimismo nem pessimismo — a tua estimativa base normal.'

function buildOtimistaConstraint(
  equilibradaTotal: number,
  equilibradaEstimativa: EstimateOutput['estimativa'],
): string {
  const fmt = equilibradaTotal.toFixed(2)
  return `\n\n## Instrução de variante — OTIMISTA
A variante Equilibrada para este projecto totalizou **€${fmt}**.

Esta é a variante **OTIMISTA**. O teu \`total_geral\` DEVE ser **estritamente inferior a €${fmt}**.
Estratégia:
- Usa as alternativas de materiais mais económicas que existam na base de conhecimento
- Aplica as quantidades mínimas realistas por item
- Tempos de trabalho na estimativa mais baixa
- Sem margens de contingência adicionais

Se o teu \`total_geral\` for igual ou superior a €${fmt}, revê os valores e reduz até ao constraint ser satisfeito.

Estimativa Equilibrada de referência:
${JSON.stringify(equilibradaEstimativa, null, 2)}`
}

function buildConservadoraConstraint(
  equilibradaTotal: number,
  equilibradaEstimativa: EstimateOutput['estimativa'],
): string {
  const fmt = equilibradaTotal.toFixed(2)
  return `\n\n## Instrução de variante — CONSERVADORA
A variante Equilibrada para este projecto totalizou **€${fmt}**.

Esta é a variante **CONSERVADORA**. O teu \`total_geral\` DEVE ser **estritamente superior a €${fmt}**.
Estratégia:
- Usa as alternativas de materiais premium onde existam na base de conhecimento
- Aplica uma margem de contingência de 15-20% por item nas quantidades e tempos de trabalho
- Assume condições de execução mais exigentes do que o habitual

Se o teu \`total_geral\` for igual ou inferior a €${fmt}, revê os valores e aumenta até ao constraint ser satisfeito.

Estimativa Equilibrada de referência:
${JSON.stringify(equilibradaEstimativa, null, 2)}`
}

async function callAI(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
): Promise<string> {
  return generateEstimate(messages, systemPrompt)
}

async function callAIWithRetry(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
): Promise<ReturnType<typeof parseEstimate>> {
  const raw = await callAI(messages, systemPrompt)
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
    const retryRaw = await callAI(retryMessages, systemPrompt)
    return parseEstimate(retryRaw)
  }
}

export async function generateInitialEstimate(
  proposal: Proposal,
  payload: BasePayload,
): Promise<EstimateResult> {
  const [knowledgeBase, customRules] = await Promise.all([
    fetchKnowledgeBase(payload),
    fetchAiSettings(payload),
  ])

  const systemPrompt = buildSystemPrompt(customRules)

  const mockupUrls = getMockupUrls(proposal)
  const [imageDescription, attachmentContent, figmaAnalysis] = await Promise.all([
    mockupUrls.length > 0 ? analyzeImages(mockupUrls) : Promise.resolve(''),
    describeAttachments(proposal.ficheirosAnexos),
    proposal.figmaLink ? analyzeFigmaLink(proposal.figmaLink) : Promise.resolve({ imageDescription: '', textAnnotations: '' }),
  ])

  const baseUserMessage = buildInitialPrompt(proposal, knowledgeBase, imageDescription, {
    attachmentText: attachmentContent.textContent,
    attachmentImageDescription: attachmentContent.imageDescription,
    figmaImageDescription: figmaAnalysis.imageDescription,
    figmaTextAnnotations: figmaAnalysis.textAnnotations,
  })

  // Step 1: Equilibrada first — it is the base from which the other two are derived
  const equilibradaParsed = await callAIWithRetry(
    [{ role: 'user', content: baseUserMessage + EQUILIBRADA_INSTRUCTION }],
    systemPrompt,
  )
  const equilibradaTotal = equilibradaParsed.estimativa.total_geral
  const equilibradaVariante: EstimateVariante = {
    tipo: 'Equilibrada',
    estimativa: equilibradaParsed.estimativa as unknown as Record<string, unknown>,
    abordagemTecnica: equilibradaParsed.abordagem_tecnica,
    nivelConfianca: normalizeConfianca(equilibradaParsed.nivel_confianca.nivel),
    nivelConfiancaJustificacao: equilibradaParsed.nivel_confianca.justificacao,
  }

  // Steps 2 & 3: Otimista and Conservadora run in parallel, each given the Equilibrada total as a hard constraint
  const [otimistaResult, conservadoraResult] = await Promise.allSettled([
    callAIWithRetry(
      [{ role: 'user', content: baseUserMessage + buildOtimistaConstraint(equilibradaTotal, equilibradaParsed.estimativa) }],
      systemPrompt,
    ),
    callAIWithRetry(
      [{ role: 'user', content: baseUserMessage + buildConservadoraConstraint(equilibradaTotal, equilibradaParsed.estimativa) }],
      systemPrompt,
    ),
  ])

  const otimistaVariante: EstimateVariante | null =
    otimistaResult.status === 'fulfilled'
      ? {
          tipo: 'Otimista',
          estimativa: otimistaResult.value.estimativa as unknown as Record<string, unknown>,
          abordagemTecnica: otimistaResult.value.abordagem_tecnica,
          nivelConfianca: normalizeConfianca(otimistaResult.value.nivel_confianca.nivel),
          nivelConfiancaJustificacao: otimistaResult.value.nivel_confianca.justificacao,
        }
      : null

  const conservadoraVariante: EstimateVariante | null =
    conservadoraResult.status === 'fulfilled'
      ? {
          tipo: 'Conservadora',
          estimativa: conservadoraResult.value.estimativa as unknown as Record<string, unknown>,
          abordagemTecnica: conservadoraResult.value.abordagem_tecnica,
          nivelConfianca: normalizeConfianca(conservadoraResult.value.nivel_confianca.nivel),
          nivelConfiancaJustificacao: conservadoraResult.value.nivel_confianca.justificacao,
        }
      : null

  const variantesGeradas: EstimateVariante[] = [
    ...(otimistaVariante ? [otimistaVariante] : []),
    equilibradaVariante,
    ...(conservadoraVariante ? [conservadoraVariante] : []),
  ]

  // Safety check — do not relabel, just flag if the AI ignored the constraint
  const otimistaTotal =
    otimistaVariante !== null
      ? ((otimistaVariante.estimativa as { total_geral?: number }).total_geral ?? null)
      : null
  const conservadoraTotal =
    conservadoraVariante !== null
      ? ((conservadoraVariante.estimativa as { total_geral?: number }).total_geral ?? null)
      : null

  const variantesOrdemViolada =
    (otimistaTotal !== null && otimistaTotal >= equilibradaTotal) ||
    (conservadoraTotal !== null && conservadoraTotal <= equilibradaTotal)

  if (variantesOrdemViolada) {
    console.warn(
      `[generateEstimate] Ordering constraint violated — ` +
        `Otimista: €${otimistaTotal ?? 'N/A'}, Equilibrada: €${equilibradaTotal}, Conservadora: €${conservadoraTotal ?? 'N/A'}`,
    )
  }

  const now = new Date().toISOString()

  return {
    conversaIA: [],
    estimativaAtual: equilibradaVariante.estimativa,
    abordagemTecnica: equilibradaVariante.abordagemTecnica,
    nivelConfianca: equilibradaVariante.nivelConfianca,
    nivelConfiancaJustificacao: equilibradaVariante.nivelConfiancaJustificacao,
    inputsUsados: {
      briefingSnapshot: proposal.briefing,
      memoriacriativaSnapshot: proposal.memoriacriativa,
      maquetesIds: mockupUrls,
      timestamp: now,
    },
    variantesGeradas,
    varianteSelecionada: 'Equilibrada',
    variantesOrdemViolada,
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

  const [knowledgeBase, customRules] = await Promise.all([
    fetchKnowledgeBase(payload),
    fetchAiSettings(payload),
  ])

  const systemPrompt = buildSystemPrompt(customRules)

  // Rebuild initial prompt so the AI has full context on follow-up calls
  const mockupUrls = getMockupUrls(proposal)
  const [imageDescription, attachmentContent, figmaAnalysis] = await Promise.all([
    mockupUrls.length > 0 ? analyzeImages(mockupUrls) : Promise.resolve(''),
    describeAttachments(proposal.ficheirosAnexos),
    proposal.figmaLink ? analyzeFigmaLink(proposal.figmaLink) : Promise.resolve({ imageDescription: '', textAnnotations: '' }),
  ])
  const initialPrompt = buildInitialPrompt(proposal, knowledgeBase, imageDescription, {
    attachmentText: attachmentContent.textContent,
    attachmentImageDescription: attachmentContent.imageDescription,
    figmaImageDescription: figmaAnalysis.imageDescription,
    figmaTextAnnotations: figmaAnalysis.textAnnotations,
  })

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

  const parsed = await callAIWithRetry(messages, systemPrompt)

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

  // Preserve existing variants from the session (chat does not regenerate variants)
  const existingVariantes = ((sessao as Record<string, unknown>).variantesGeradas ?? []) as EstimateVariante[]
  const existingVarianteSelecionada =
    ((sessao as Record<string, unknown>).varianteSelecionada as 'Otimista' | 'Equilibrada' | 'Conservadora' | undefined) ??
    'Equilibrada'

  const existingOrdemViolada =
    ((sessao as Record<string, unknown>).variantesOrdemViolada as boolean | undefined) ?? false

  return {
    conversaIA: updatedConversaIA,
    estimativaAtual: parsed.estimativa as unknown as Record<string, unknown>,
    abordagemTecnica: parsed.abordagem_tecnica,
    nivelConfianca: normalizeConfianca(parsed.nivel_confianca.nivel),
    nivelConfiancaJustificacao: parsed.nivel_confianca.justificacao,
    inputsUsados: (sessao.inputsUsados as Record<string, unknown>) ?? {},
    variantesGeradas: existingVariantes,
    varianteSelecionada: existingVarianteSelecionada,
    variantesOrdemViolada: existingOrdemViolada,
  }
}
