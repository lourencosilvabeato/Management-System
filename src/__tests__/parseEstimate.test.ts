import { describe, it, expect } from 'vitest'
import { parseEstimate } from '@/lib/ai/parseEstimate'

const VALID_ESTIMATE = JSON.stringify({
  abordagem_tecnica: 'Stand modular em octanorm com impressão em lona frontlit.',
  nivel_confianca: {
    nivel: 'Medio',
    justificacao: 'Briefing completo com dimensões e materiais especificados.',
  },
  estimativa: {
    items: [
      {
        nome: 'Estrutura',
        rubricas: [
          {
            descricao: 'Perfil octanorm',
            quantidade: 10,
            unidade: 'm linear',
            custo_unitario: 45,
            custo_total: 450,
          },
        ],
        total_item: 450,
      },
    ],
    total_geral: 450,
  },
})

describe('parseEstimate', () => {
  it('returns parsed object for valid well-formed JSON', () => {
    const result = parseEstimate(VALID_ESTIMATE)
    expect(result.abordagem_tecnica).toContain('octanorm')
    expect(result.nivel_confianca.nivel).toBe('Medio')
    expect(result.estimativa.items).toHaveLength(1)
    expect(result.estimativa.total_geral).toBe(450)
  })

  it('strips markdown backtick fences and returns object', () => {
    const wrapped = '```json\n' + VALID_ESTIMATE + '\n```'
    const result = parseEstimate(wrapped)
    expect(result.estimativa.total_geral).toBe(450)
  })

  it('strips leading text before opening brace', () => {
    const withPreamble = 'Here is the estimate:\n' + VALID_ESTIMATE
    const result = parseEstimate(withPreamble)
    expect(result.nivel_confianca.nivel).toBe('Medio')
  })

  it('throws descriptive error when required field is missing', () => {
    const missing = JSON.stringify({
      // abordagem_tecnica is missing
      nivel_confianca: { nivel: 'Alto', justificacao: 'ok' },
      estimativa: { items: [], total_geral: 0 },
    })
    expect(() => parseEstimate(missing)).toThrowError(/schema/)
  })

  it('throws error when nivel_confianca.nivel has invalid value', () => {
    const invalid = JSON.stringify({
      abordagem_tecnica: 'ok',
      nivel_confianca: { nivel: 'Invalid', justificacao: 'ok' },
      estimativa: { items: [], total_geral: 0 },
    })
    expect(() => parseEstimate(invalid)).toThrowError(/schema/)
  })

  it('throws error for completely invalid string', () => {
    expect(() => parseEstimate('not json at all')).toThrowError(/JSON/)
  })

  it('throws error for partial JSON', () => {
    expect(() => parseEstimate('{ "abordagem_tecnica": "ok"')).toThrowError()
  })

  it('passes when items array is empty (zero-item estimate is valid)', () => {
    const emptyItems = JSON.stringify({
      abordagem_tecnica: 'Sem itens por agora.',
      nivel_confianca: { nivel: 'Baixo', justificacao: 'Briefing insuficiente.' },
      estimativa: { items: [], total_geral: 0 },
    })
    const result = parseEstimate(emptyItems)
    expect(result.estimativa.items).toHaveLength(0)
    expect(result.estimativa.total_geral).toBe(0)
  })

  it('passes for all three valid confidence levels', () => {
    for (const nivel of ['Alto', 'Medio', 'Baixo'] as const) {
      const json = JSON.stringify({
        abordagem_tecnica: 'ok',
        nivel_confianca: { nivel, justificacao: 'test' },
        estimativa: { items: [], total_geral: 0 },
      })
      const result = parseEstimate(json)
      expect(result.nivel_confianca.nivel).toBe(nivel)
    }
  })
})
