import type { Material, Machine, InternalRate, ProjectLibrary, Proposal } from '../../payload-types'

interface KnowledgeBase {
  materials: Material[]
  machines: Machine[]
  internalRates: InternalRate[]
  projectLibrary: ProjectLibrary[]
}

function serializeMaterials(materials: Material[]): string {
  if (materials.length === 0) return '(no materials registered)'
  return materials
    .map((m) => `- ${m.nome} | ref: ${m.referencia ?? 'n/a'} | unit: ${m.unidade} | cost: ${m.custoMedio}€/${m.unidade}${m.notas ? ` | notes: ${m.notas}` : ''}`)
    .join('\n')
}

function serializeMachines(machines: Machine[]): string {
  if (machines.length === 0) return '(no machines registered)'
  return machines
    .map((m) => `- ${m.nome}${m.tipo ? ` [${m.tipo}]` : ''}${m.descricao ? `: ${m.descricao}` : ''}`)
    .join('\n')
}

function serializeRates(rates: InternalRate[]): string {
  if (rates.length === 0) return '(no rates registered)'
  return rates
    .map((r) => `- ${r.perfil} (${r.departamento}): ${r.custoHora}€/h`)
    .join('\n')
}

function serializeProjectLibrary(projects: ProjectLibrary[]): string {
  if (projects.length === 0) return '(no historical projects)'
  return projects
    .map((p) => {
      const costs = p.estruturaCustos ? JSON.stringify(p.estruturaCustos, null, 2) : 'n/a'
      return `- ${p.nome} (${p.tipo ?? 'unknown'}, ${p.ano ?? 'n/a'}): ${p.descricao ?? ''}\n  Costs: ${costs}`
    })
    .join('\n\n')
}

function lexicalToText(richText: unknown): string {
  if (!richText || typeof richText !== 'object') return ''
  const root = (richText as Record<string, unknown>).root
  if (!root || typeof root !== 'object') return ''

  function extractText(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as Record<string, unknown>
    if (n.type === 'text') return String(n.text ?? '')
    if (Array.isArray(n.children)) {
      return (n.children as unknown[]).map(extractText).join(' ')
    }
    return ''
  }

  return extractText(root).trim()
}

export interface PromptExtras {
  imageDescription?: string
  attachmentText?: string
  attachmentImageDescription?: string
  figmaImageDescription?: string
  figmaTextAnnotations?: string
}

export function buildInitialPrompt(
  proposal: Proposal,
  knowledgeBase: KnowledgeBase,
  imageDescription: string,
  extras: PromptExtras = {},
): string {
  const briefing = lexicalToText(proposal.briefing) || '(no briefing provided)'
  const memoria = lexicalToText(proposal.memoriacriativa) || 'No creative memory provided.'

  const imageSection = imageDescription
    ? `## Mockup Analysis (GPT-4o Vision)\n${imageDescription}`
    : '## Mockups\nNo mockups available.'

  const attachmentSection =
    extras.attachmentText || extras.attachmentImageDescription
      ? [
          '## Attached Files',
          extras.attachmentText ? extras.attachmentText : '',
          extras.attachmentImageDescription
            ? `### Attachment Images (GPT-4o Vision)\n${extras.attachmentImageDescription}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : ''

  const figmaSection =
    extras.figmaImageDescription || extras.figmaTextAnnotations
      ? [
          '## Figma Design Analysis',
          extras.figmaTextAnnotations
            ? `### Text Annotations\n${extras.figmaTextAnnotations}`
            : '',
          extras.figmaImageDescription
            ? `### Visual Analysis (GPT-4o Vision)\n${extras.figmaImageDescription}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      : proposal.figmaLink
        ? `## Figma Link\n${proposal.figmaLink} (visual analysis not available — add FIGMA_API_TOKEN to enable)`
        : ''

  const sourcesList = [
    '- Briefing do projecto',
    '- Memória criativa',
    imageDescription ? '- Análise de maquetes (GPT-4o Vision)' : null,
    extras.attachmentText || extras.attachmentImageDescription ? '- Ficheiros anexados (PDFs e imagens)' : null,
    extras.figmaImageDescription || extras.figmaTextAnnotations ? '- Análise do ficheiro Figma' : null,
    '- Base de conhecimento (materiais, máquinas, taxas, projectos históricos)',
  ]
    .filter(Boolean)
    .join('\n')

  const preamble = `INSTRUÇÃO: Lê atentamente TODAS as secções abaixo antes de gerar a estimativa. As fontes disponíveis para este projecto são:\n${sourcesList}\n\nExtrai TODOS os elementos físicos mencionados em qualquer das fontes e garante que cada um tem uma rubrica no orçamento. Não omitas nenhum elemento.`

  const sections = [
    preamble,
    `## Briefing do Projecto\n${briefing}`,
    `## Memória Criativa\n${memoria}`,
    imageSection,
    attachmentSection,
    figmaSection,
    `## Materiais Disponíveis\n${serializeMaterials(knowledgeBase.materials)}`,
    `## Máquinas Disponíveis\n${serializeMachines(knowledgeBase.machines)}`,
    `## Taxas Internas\n${serializeRates(knowledgeBase.internalRates)}`,
    `## Projectos Históricos (Benchmarking)\n${serializeProjectLibrary(knowledgeBase.projectLibrary)}`,
  ]

  return sections.filter(Boolean).join('\n\n')
}
