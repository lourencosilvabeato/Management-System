export interface EstimateRubrica {
  descricao: string
  quantidade: number
  unidade: string
  custo_unitario: number
  custo_total: number
}

export interface EstimateItem {
  nome: string
  rubricas: EstimateRubrica[]
  total_item: number
}

export interface EstimateOutput {
  abordagem_tecnica: string
  nivel_confianca: {
    nivel: 'Alto' | 'Medio' | 'Baixo'
    justificacao: string
  }
  estimativa: {
    items: EstimateItem[]
    total_geral: number
  }
}

function cleanResponse(raw: string): string {
  let cleaned = raw.trim()
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  // Strip any leading non-JSON text before the opening brace
  const braceIndex = cleaned.indexOf('{')
  if (braceIndex > 0) cleaned = cleaned.slice(braceIndex)
  return cleaned.trim()
}

function isValidEstimateOutput(obj: unknown): obj is EstimateOutput {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>

  if (typeof o.abordagem_tecnica !== 'string') return false

  const nc = o.nivel_confianca as Record<string, unknown> | undefined
  if (!nc || typeof nc !== 'object') return false
  if (!['Alto', 'Medio', 'Baixo'].includes(nc.nivel as string)) return false
  if (typeof nc.justificacao !== 'string') return false

  const est = o.estimativa as Record<string, unknown> | undefined
  if (!est || typeof est !== 'object') return false
  if (!Array.isArray(est.items)) return false
  if (typeof est.total_geral !== 'number') return false

  for (const item of est.items as unknown[]) {
    if (!item || typeof item !== 'object') return false
    const it = item as Record<string, unknown>
    if (typeof it.nome !== 'string') return false
    if (!Array.isArray(it.rubricas)) return false
    if (typeof it.total_item !== 'number') return false
  }

  return true
}

export function parseEstimate(response: string): EstimateOutput {
  const cleaned = cleanResponse(response)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`AI response is not valid JSON: ${cleaned.slice(0, 200)}`)
  }

  if (!isValidEstimateOutput(parsed)) {
    throw new Error(`AI response JSON does not match expected schema: ${cleaned.slice(0, 200)}`)
  }

  return parsed
}
