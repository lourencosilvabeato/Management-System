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

export function buildInitialPrompt(
  proposal: Proposal,
  knowledgeBase: KnowledgeBase,
  imageDescription: string,
): string {
  const briefing = lexicalToText(proposal.briefing) || '(no briefing provided)'
  const memoria = lexicalToText(proposal.memoriacriativa) || 'No creative memory provided.'
  const figmaLink = proposal.figmaLink ? `Visual reference link: ${proposal.figmaLink}` : ''
  const imageSection = imageDescription
    ? `## Mockup Analysis (GPT-4o Vision)\n${imageDescription}`
    : '## Mockups\nNo mockups available.'

  return `## Project Briefing
${briefing}

## Creative Memory
${memoria}

${figmaLink ? `## Figma Link\n${figmaLink}\n` : ''}
${imageSection}

## Available Materials
${serializeMaterials(knowledgeBase.materials)}

## Available Machines
${serializeMachines(knowledgeBase.machines)}

## Internal Rates
${serializeRates(knowledgeBase.internalRates)}

## Historical Projects (Benchmarking)
${serializeProjectLibrary(knowledgeBase.projectLibrary)}`
}
