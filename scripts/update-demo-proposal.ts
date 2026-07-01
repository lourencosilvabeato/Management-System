import 'dotenv/config'
import dotenv from 'dotenv'
import { getPayload } from 'payload'
import config from '@payload-config'

dotenv.config({ path: '.env.local', override: true })

const p = (text: string) => ({
  children: [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }],
  direction: 'ltr', format: '', indent: 0, type: 'paragraph', version: 1, textFormat: 0, textStyle: '',
})

const h2 = (text: string) => ({
  children: [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }],
  direction: 'ltr', format: '', indent: 0, tag: 'h2', type: 'heading', version: 1,
})

const li = (text: string) => ({
  children: [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }],
  direction: 'ltr', format: '', indent: 0, type: 'listitem', value: 1, version: 1,
})

const ul = (items: string[]) => ({
  children: items.map(li),
  direction: 'ltr', format: '', indent: 0, listType: 'bullet', start: 1, tag: 'ul', type: 'list', version: 1,
})

const lexical = (...nodes: object[]) => ({
  root: { children: nodes, direction: 'ltr', format: '', indent: 0, type: 'root', version: 1 },
})

const BRIEFING = lexical(
  h2('Contexto do Projecto'),
  p('Stand para a Tech Fair Lisboa 2026 (Pavilhão Atlântico, 12–14 de Março). Posição de esquina com 6×4m de área total (24m²). Empresa B2B de software de gestão — segunda participação na feira, pretendem melhorar a presença face ao ano anterior.'),

  h2('Estrutura e Materiais'),
  ul([
    'Painel de fundo contínuo 6×2,5m — impressão lona frontlit, estrutura octanorm',
    'Balcão de atendimento central com prateleira interior e tampo em dibond branco',
    'Dois totens laterais (0,6×2m) com monitor 55" embutido para demo do software',
    'Arco de entrada em alumínio lacado com logótipo em letras de volume',
    'Carpete azul escuro delimitando a área do stand',
  ]),

  h2('Requisitos Técnicos'),
  ul([
    'Iluminação LED branco quente integrada no topo da estrutura (régua de spots)',
    'Ponto de alimentação eléctrica para 2 monitores + iluminação (fornecido pelo pavilhão)',
    'Montagem prevista para o dia 11 de Março; desmontagem a 15',
    'Transporte desde Lisboa (sede da agência) — aprox. 8km',
  ]),

  h2('Referências e Condicionantes'),
  p('Cliente forneceu manual de identidade visual (logótipo, paleta #003087 / branco / cinzento #F5F5F5). Esperam proposta enviada até 28 de Fevereiro. Orçamento interno indicativo: até 8 000 € + IVA.'),
)

const MEMORIA = lexical(
  h2('Conceito Criativo'),
  p('Stand de presença premium assente na linha "Technology meets clarity" — espaço limpo, profissional e tecnologicamente coerente com o produto que o cliente vende. Estrutura sóbria que deixa o software ser o protagonista.'),

  h2('Paleta e Acabamentos'),
  ul([
    'Fundo: branco puro com apontamentos em azul navy (#003087) — cor principal da marca',
    'Arco de entrada: alumínio lacado azul navy com letras de volume em branco',
    'Tampo do balcão: dibond branco com serigrafia do logótipo a azul',
    'Carpete: cinzento antracite (referência 7016) para contrastar com o painel branco',
  ]),

  h2('Tipografia e Gráficos'),
  p('Painel de fundo com fotografia de lifestyle tech (lifestyle_studio_03.jpg fornecida pelo cliente), logótipo centrado a 2,0m de altura, claim "Gere mais. Cresce mais." em Gilroy SemiBold 96pt branco.'),

  h2('Funcionamento do Espaço'),
  ul([
    'Balcão frontal para 2 colaboradores + espaço de arrumação interior fechado',
    'Totens laterais: demo activa do software com ecrã táctil — requer suporte de parede encastrado no totem',
    'Zona aberta no centro para recepção de visitantes sem barreira física',
    'Iluminação direccionada sobre o balcão (3 spots) e régua LED no topo do painel traseiro',
  ]),

  h2('Estado e Notas de Aprovação'),
  p('Arte final do painel traseiro aprovada a 15 de Janeiro. Logótipo e claim confirmados. Pendente: imagem lifestyle em alta resolução (mín. 300dpi para 6m de largura — cliente a aguardar aprovação interna do departamento de marketing).'),
)

async function main() {
  const payload = await getPayload({ config })

  const found = await payload.find({
    collection: 'proposals',
    where: { nomeProjeto: { equals: 'Stand Expo Tech 2026' } },
    limit: 1,
    overrideAccess: true,
  })

  if (found.totalDocs === 0) {
    console.error('Proposal "Stand Expo Tech 2026" not found — run seed first')
    process.exit(1)
  }

  await payload.update({
    collection: 'proposals',
    id: found.docs[0].id,
    data: { briefing: BRIEFING, memoriacriativa: MEMORIA } as object,
    overrideAccess: true,
  })

  console.log('✓ Updated "Stand Expo Tech 2026" with rich briefing and memoriacriativa')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
