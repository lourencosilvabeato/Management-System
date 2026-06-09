// TODO: replace with real Anthropic SDK when ANTHROPIC_API_KEY is available
// import Anthropic from '@anthropic-ai/sdk'
// import { ESTIMATE_SYSTEM_PROMPT } from './prompts/estimateSystem'
// const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
// export async function generateEstimate(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
//   const response = await anthropic.messages.create({
//     model: 'claude-sonnet-4-20250514',
//     max_tokens: 4096,
//     system: ESTIMATE_SYSTEM_PROMPT,
//     messages,
//   })
//   const block = response.content[0]
//   return block.type === 'text' ? block.text : ''
// }

const MOCK_ESTIMATE_RESPONSE = JSON.stringify({
  abordagem_tecnica:
    'Stand modular em estrutura de alumínio octanorm com impressão em lona frontlit. ' +
    'Estrutura de 3x2m com painel traseiro impresso, balcão de atendimento com tampo em dibond e ' +
    'iluminação LED integrada no topo. Montagem prevista para 1 dia com equipa de 2 montadores.',
  nivel_confianca: {
    nivel: 'Médio',
    justificacao:
      'Briefing com informação suficiente sobre dimensões e materiais, mas sem maquetes ' +
      'detalhadas. Estimativa baseada em projectos similares da biblioteca.',
  },
  estimativa: {
    items: [
      {
        nome: 'Estrutura e Revestimento',
        rubricas: [
          {
            descricao: 'Perfil alumínio octanorm',
            quantidade: 12,
            unidade: 'm linear',
            custo_unitario: 45.0,
            custo_total: 540.0,
          },
          {
            descricao: 'Impressão lona frontlit 3x2m',
            quantidade: 6,
            unidade: 'm²',
            custo_unitario: 8.5,
            custo_total: 51.0,
          },
          {
            descricao: 'Painel dibond 3mm',
            quantidade: 2,
            unidade: 'm²',
            custo_unitario: 38.0,
            custo_total: 76.0,
          },
        ],
        total_item: 667.0,
      },
      {
        nome: 'Iluminação',
        rubricas: [
          {
            descricao: 'Fita LED branco quente',
            quantidade: 5,
            unidade: 'm',
            custo_unitario: 12.0,
            custo_total: 60.0,
          },
          {
            descricao: 'Transformador 12V',
            quantidade: 1,
            unidade: 'un',
            custo_unitario: 25.0,
            custo_total: 25.0,
          },
        ],
        total_item: 85.0,
      },
      {
        nome: 'Mão de Obra',
        rubricas: [
          {
            descricao: 'Montador (8h)',
            quantidade: 16,
            unidade: 'h',
            custo_unitario: 35.0,
            custo_total: 560.0,
          },
        ],
        total_item: 560.0,
      },
    ],
    total_geral: 1312.0,
  },
})

export async function generateEstimateMock(_prompt: string): Promise<string> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 800))
  return MOCK_ESTIMATE_RESPONSE
}
