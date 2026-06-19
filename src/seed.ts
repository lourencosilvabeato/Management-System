import 'dotenv/config'
import dotenv from 'dotenv'
import { getPayload } from 'payload'
import config from '@payload-config'

dotenv.config({ path: '.env.local', override: true })

const FORCE = process.argv.includes('--force')

const SEED_EMAILS = [
  'admin@niu.pt',
  'account@niu.pt',
  'criativo@niu.pt',
  'producao@niu.pt',
]

const now = new Date()
const ts = (offsetDays = 0) =>
  new Date(now.getTime() + offsetDays * 86400 * 1000).toISOString()

// ─────────────────────────────────────────────────────────────────────────────
// Dummy estimate JSON for EmOrcamentacao proposal
// ─────────────────────────────────────────────────────────────────────────────
const DUMMY_ESTIMATE = {
  items: [
    {
      nome: 'Estrutura e Revestimento',
      rubricas: [
        { descricao: 'Perfil alumínio octanorm', quantidade: 12, unidade: 'm linear', custo_unitario: 45, custo_total: 540 },
        { descricao: 'Impressão lona frontlit 3x2m', quantidade: 6, unidade: 'm²', custo_unitario: 8.5, custo_total: 51 },
        { descricao: 'Painel dibond 3mm', quantidade: 2, unidade: 'm²', custo_unitario: 38, custo_total: 76 },
      ],
      total_item: 667,
    },
    {
      nome: 'Iluminação',
      rubricas: [
        { descricao: 'Fita LED branco quente 5m', quantidade: 2, unidade: 'un', custo_unitario: 25, custo_total: 50 },
        { descricao: 'Transformador 12V 50W', quantidade: 1, unidade: 'un', custo_unitario: 18, custo_total: 18 },
      ],
      total_item: 68,
    },
    {
      nome: 'Mão de Obra',
      rubricas: [
        { descricao: 'Montador (8h × 2 pessoas)', quantidade: 16, unidade: 'h', custo_unitario: 38, custo_total: 608 },
      ],
      total_item: 608,
    },
  ],
  total_geral: 1343,
}

async function main() {
  console.log('🌱 Seed Script')
  console.log('──────────────────')

  const payload = await getPayload({ config })

  // ─── Check if already seeded ───────────────────────────────────────────────
  const existing = await payload.find({
    collection: 'users',
    where: { email: { in: SEED_EMAILS } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0 && !FORCE) {
    console.log('⚠️  Seed data already exists. Run with --force to overwrite.')
    process.exit(0)
  }

  // ─── Users ─────────────────────────────────────────────────────────────────
  console.log('\n👤 Creating users...')

  const userDefs = [
    { email: 'admin@niu.pt', nome: 'Admin', role: 'admin' },
    { email: 'account@niu.pt', nome: 'Gestor de Conta', role: 'account' },
    { email: 'criativo@niu.pt', nome: 'Designer Criativo', role: 'criativo' },
    { email: 'producao@niu.pt', nome: 'Técnico de Produção', role: 'producao' },
  ] as const

  const createdUsers: Record<string, number | string> = {}

  for (const u of userDefs) {
    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: u.email } },
      limit: 1,
      overrideAccess: true,
    })

    if (found.totalDocs > 0) {
      if (!FORCE) {
        console.log(`  ↩  ${u.email} already exists, skipping`)
        createdUsers[u.role] = found.docs[0].id
        continue
      }
      const updated = await payload.update({
        collection: 'users',
        id: found.docs[0].id,
        data: { nome: u.nome, role: u.role },
        overrideAccess: true,
      })
      createdUsers[u.role] = updated.id
      console.log(`  ✓  ${u.email} (${u.role}) — updated`)
      continue
    }

    const created = await payload.create({
      collection: 'users',
      data: { email: u.email, nome: u.nome, role: u.role, password: 'test1234' },
      overrideAccess: true,
    })
    createdUsers[u.role] = created.id
    console.log(`  ✓  ${u.email} (${u.role})`)
  }

  // ─── Materials ─────────────────────────────────────────────────────────────
  console.log('\n🧱 Creating materials...')

  const materials = [
    { nome: 'Lona frontlit', referencia: 'LF-510G', unidade: 'm²', custoMedio: 8.5, notas: 'Gramagem 510g. Ideal para impressão exterior e stands.' },
    { nome: 'Lona backlit', referencia: 'LB-440G', unidade: 'm²', custoMedio: 12.0, notas: 'Para caixas de luz e displays retroiluminados.' },
    { nome: 'Perfil alumínio octanorm', referencia: 'ALU-OCT-100', unidade: 'm linear', custoMedio: 45.0, notas: 'Sistema modular standard. Perfil 100mm.' },
    { nome: 'Painel dibond 3mm', referencia: 'DIB-3MM', unidade: 'm²', custoMedio: 35.0, notas: 'Composto alumínio/polietileno. Corte e impressão UV.' },
    { nome: 'MDF 18mm', referencia: 'MDF-18', unidade: 'm²', custoMedio: 18.0, notas: 'Densidade média. Fresagem CNC.' },
    { nome: 'Acrílico transparente 5mm', referencia: 'ACR-T5', unidade: 'm²', custoMedio: 55.0, notas: 'Corte laser. Sinalética e displays premium.' },
    { nome: 'Vinil adesivo de corte', referencia: 'VIN-CORTE', unidade: 'm²', custoMedio: 6.5, notas: 'Aplicação em montras e viaturas.' },
    { nome: 'Vinil impresso', referencia: 'VIN-IMP', unidade: 'm²', custoMedio: 9.0, notas: 'Impressão digital. Inclui laminação standard.' },
    { nome: 'Espuma PVC (forex) 5mm', referencia: 'FOREX-5', unidade: 'm²', custoMedio: 12.0, notas: 'Sinalética interior. Leve e fácil de montar.' },
    { nome: 'Fita velcro dupla (25m)', referencia: 'VEL-25M', unidade: 'rolo', custoMedio: 18.0, notas: 'Fixação rápida de painéis e lonas.' },
    { nome: 'Kit fixação (parafusos, buchas, porcas)', referencia: 'FIX-KIT', unidade: 'un', custoMedio: 8.0, notas: 'Pack standard para 1 stand 3x3m.' },
    { nome: 'Fita LED branco quente 5m', referencia: 'LED-BQ5M', unidade: 'un', custoMedio: 25.0, notas: '2700K, 12V DC, 60 LEDs/m.' },
    { nome: 'Transformador LED 12V 50W', referencia: 'TLED-50W', unidade: 'un', custoMedio: 18.0, notas: 'Para fitas LED até 4m @ 60 LED/m.' },
    { nome: 'Placa forex 3mm', referencia: 'FOREX-3', unidade: 'm²', custoMedio: 9.5, notas: 'Mais leve que 5mm. Sinalética leve.' },
    { nome: 'Tinta spray RAL', referencia: 'TINT-RAL', unidade: 'un', custoMedio: 12.0, notas: 'Lata 400ml. Acabamento estruturas metálicas.' },
    { nome: 'Fita cola dupla face acrílica 25m', referencia: 'COLA-25M', unidade: 'rolo', custoMedio: 15.0, notas: 'Fixação permanente de superfícies planas.' },
  ]

  for (const m of materials) {
    const found = await payload.find({
      collection: 'materials',
      where: { nome: { equals: m.nome } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.totalDocs > 0 && !FORCE) {
      process.stdout.write('.')
      continue
    }
    await payload.create({ collection: 'materials', data: { ...m, ativo: true }, overrideAccess: true })
    process.stdout.write('✓')
  }
  console.log(` (${materials.length} items)`)

  // ─── Machines ──────────────────────────────────────────────────────────────
  console.log('\n🔧 Creating machines...')

  const machines = [
    { nome: 'Impressora grande formato UV', tipo: 'Impressão', descricao: 'Roland XF-640. Largura máx 1.6m. Impressão em rígido e flexível.' },
    { nome: 'Plotter de corte vinyl', tipo: 'Corte', descricao: 'Graphtec FC9000. Corte de precision em vinyl e PPF.' },
    { nome: 'Fresa CNC 2500×1250mm', tipo: 'Fresagem', descricao: 'AXYZ 4008. Fresagem em MDF, dibond, acrílico e espumas.' },
    { nome: 'Mesa de corte manual', tipo: 'Corte', descricao: 'Mesa 3×1.5m com régua e cutter. Para cortes retos em lona e papel.' },
    { nome: 'Plastificadora A0', tipo: 'Acabamento', descricao: 'GBC Titan A0. Laminação fria e quente.' },
    { nome: 'Pack ferramentas instalação', tipo: 'Instalação', descricao: 'Parafusadoras, nível laser, kit de ancoragem. Equipa de 2 montadores.' },
    { nome: 'Impressora UV mesa plana', tipo: 'Impressão', descricao: 'Mimaki JFX200-2513. Impressão directa em rígido até 2.5×1.3m.' },
  ]

  for (const m of machines) {
    const found = await payload.find({
      collection: 'machines',
      where: { nome: { equals: m.nome } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.totalDocs > 0 && !FORCE) {
      process.stdout.write('.')
      continue
    }
    await payload.create({ collection: 'machines', data: { ...m, disponivel: true }, overrideAccess: true })
    process.stdout.write('✓')
  }
  console.log(` (${machines.length} items)`)

  // ─── InternalRates ─────────────────────────────────────────────────────────
  console.log('\n💰 Creating internal rates...')

  const rates = [
    { perfil: 'Designer Gráfico', departamento: 'Criativo', custoHora: 55 },
    { perfil: 'Técnico de Impressão', departamento: 'Produção', custoHora: 35 },
    { perfil: 'Técnico de Corte e Acabamento', departamento: 'Produção', custoHora: 32 },
    { perfil: 'Montador / Instalador', departamento: 'Instalação', custoHora: 38 },
    { perfil: 'Account / Gestor de Projecto', departamento: 'Comercial', custoHora: 45 },
  ]

  for (const r of rates) {
    const found = await payload.find({
      collection: 'internal-rates',
      where: { perfil: { equals: r.perfil } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.totalDocs > 0 && !FORCE) {
      process.stdout.write('.')
      continue
    }
    await payload.create({ collection: 'internal-rates', data: r, overrideAccess: true })
    process.stdout.write('✓')
  }
  console.log(` (${rates.length} items)`)

  // ─── ProjectLibrary ────────────────────────────────────────────────────────
  console.log('\n📚 Creating project library...')

  const projects = [
    {
      nome: 'Stand 20m² Feira de Tecnologia',
      tipo: 'Stand',
      ano: 2025,
      descricao: 'Stand modular octanorm de 5x4m para empresa de software. Painel traseiro impresso em lona frontlit, balcão de atendimento com tampo dibond, 2 totens laterais, iluminação LED integrada.',
      estruturaCustos: {
        items: [
          { nome: 'Estrutura', rubricas: [{ descricao: 'Octanorm', quantidade: 40, unidade: 'm linear', custo_unitario: 45, custo_total: 1800 }], total_item: 1800 },
          { nome: 'Impressão Gráfica', rubricas: [{ descricao: 'Lona frontlit', quantidade: 20, unidade: 'm²', custo_unitario: 8.5, custo_total: 170 }], total_item: 170 },
          { nome: 'Mobiliário', rubricas: [{ descricao: 'Balcão dibond', quantidade: 1, unidade: 'un', custo_unitario: 350, custo_total: 350 }], total_item: 350 },
          { nome: 'Mão de Obra', rubricas: [{ descricao: 'Montagem (2 dias, 2 pessoas)', quantidade: 32, unidade: 'h', custo_unitario: 38, custo_total: 1216 }], total_item: 1216 },
        ],
        total_geral: 3536,
      },
      notas: 'Cliente satisfeito com prazo. 3 dias de montagem/desmontagem.',
    },
    {
      nome: 'Sinalética Completa Escritório 3 Pisos',
      tipo: 'Sinalética',
      ano: 2025,
      descricao: 'Sistema de sinalética para empresa de consultoria. 45 placas direccionais em acrílico 5mm, 12 placas de porta com LED, 3 totens de recepção, impressão em vinil para paredes.',
      estruturaCustos: {
        items: [
          { nome: 'Placas Acrílico', rubricas: [{ descricao: 'Acrílico 5mm gravado', quantidade: 45, unidade: 'un', custo_unitario: 45, custo_total: 2025 }], total_item: 2025 },
          { nome: 'Vinil Decorativo', rubricas: [{ descricao: 'Impressão e aplicação', quantidade: 35, unidade: 'm²', custo_unitario: 15, custo_total: 525 }], total_item: 525 },
          { nome: 'Totens', rubricas: [{ descricao: 'Totem 2m dibond', quantidade: 3, unidade: 'un', custo_unitario: 280, custo_total: 840 }], total_item: 840 },
          { nome: 'Mão de Obra', rubricas: [{ descricao: 'Instalação (5 dias)', quantidade: 40, unidade: 'h', custo_unitario: 38, custo_total: 1520 }], total_item: 1520 },
        ],
        total_geral: 4910,
      },
      notas: 'Projecto faseado — sinalética de emergência em fase 2.',
    },
    {
      nome: 'Kit PDV 50 Lojas',
      tipo: 'PDV',
      ano: 2024,
      descricao: 'Kit de ponto de venda para marca de cosmética. Por loja: 1 expositor de balcão (PVC + impressão UV), 1 totem 1.2m (dibond + lona), 1 wobbler A5. Produção em série.',
      estruturaCustos: {
        items: [
          { nome: 'Expositores (×50)', rubricas: [{ descricao: 'PVC espumado + UV', quantidade: 50, unidade: 'un', custo_unitario: 65, custo_total: 3250 }], total_item: 3250 },
          { nome: 'Totens (×50)', rubricas: [{ descricao: 'Dibond + lona', quantidade: 50, unidade: 'un', custo_unitario: 120, custo_total: 6000 }], total_item: 6000 },
          { nome: 'Wobblers (×50)', rubricas: [{ descricao: 'PVC 0.5mm plastificado', quantidade: 50, unidade: 'un', custo_unitario: 8, custo_total: 400 }], total_item: 400 },
          { nome: 'Logística', rubricas: [{ descricao: 'Embalagem e envio', quantidade: 50, unidade: 'un', custo_unitario: 12, custo_total: 600 }], total_item: 600 },
        ],
        total_geral: 10250,
      },
      notas: 'Prazo apertado — 3 semanas de produção. Margin negociada abaixo do habitual.',
    },
  ]

  for (const p of projects) {
    const found = await payload.find({
      collection: 'project-library',
      where: { nome: { equals: p.nome } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.totalDocs > 0 && !FORCE) {
      process.stdout.write('.')
      continue
    }
    await payload.create({ collection: 'project-library', data: p, overrideAccess: true })
    process.stdout.write('✓')
  }
  console.log(` (${projects.length} items)`)

  // ─── Proposals ────────────────────────────────────────────────────────────
  console.log('\n📋 Creating proposals...')

  const accountId = createdUsers['account'] as number
  if (!accountId) {
    console.error('❌ Account user not found — cannot create proposals')
    process.exit(1)
  }

  const seedCtx = { skipActivityLog: true, skipGenerateEstimate: true }

  const upsertProposal = async (label: string, nomeProjeto: string, creator: () => Promise<unknown>) => {
    const found = await payload.find({
      collection: 'proposals',
      where: { nomeProjeto: { equals: nomeProjeto } },
      limit: 1,
      overrideAccess: true,
    })
    if (found.totalDocs > 0 && !FORCE) {
      console.log(`  ↩  "${nomeProjeto}" already exists, skipping`)
      return
    }
    if (found.totalDocs > 0 && FORCE) {
      await payload.delete({ collection: 'proposals', id: found.docs[0].id, overrideAccess: true })
    }
    await creator()
    console.log(`  ✓  ${label}`)
  }

  // 1. Recebida
  await upsertProposal('Tech Fair 2026 (Recebida)', 'Stand Tech Fair 2026', () =>
    payload.create({
      collection: 'proposals',
      data: {
        nomeProjeto: 'Stand Tech Fair 2026',
        cliente: 'TechCorp Portugal Lda',
        account: accountId,
        estado: 'Recebida',
        contactoNome: 'Directora de Comunicação',
        contactoEmail: 'info@techcorp.pt',
        prazoResposta: ts(14),
        activityLog: [
          { evento: 'Proposal created', user: accountId, timestamp: ts(-5) },
        ],
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  // 2. EmElaboracao
  await upsertProposal('Sinalética Escritório (EmElaboracao)', 'Sinalética Global Office Lisboa', () =>
    payload.create({
      collection: 'proposals',
      data: {
        nomeProjeto: 'Sinalética Global Office Lisboa',
        cliente: 'Global Consulting SA',
        account: accountId,
        estado: 'EmElaboracao',
        contactoNome: 'Responsável de Marketing',
        contactoEmail: 'info@globalconsulting.pt',
        prazoResposta: ts(21),
        estadoCriativo: 'EmRevisao',
        activityLog: [
          { evento: 'Proposal created', user: accountId, timestamp: ts(-10) },
          { evento: 'State changed from Recebida to EmElaboracao', user: accountId, timestamp: ts(-8) },
          { evento: 'Creative status changed to EmRevisao', user: accountId, timestamp: ts(-3) },
        ],
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  // 3. EmOrcamentacao — with dummy session
  await upsertProposal('Stand Expo Tech 2026 (EmOrcamentacao)', 'Stand Expo Tech 2026', () =>
    payload.create({
      collection: 'proposals',
      data: {
        nomeProjeto: 'Stand Expo Tech 2026',
        cliente: 'Nexus Eventos Lda.',
        account: accountId,
        estado: 'EmOrcamentacao',
        contactoNome: 'Director de Marketing',
        contactoEmail: 'marketing@nexuseventos.pt',
        prazoResposta: ts(10),
        estadoCriativo: 'Aprovado',
        activityLog: [
          { evento: 'Proposal created', user: accountId, timestamp: ts(-20) },
          { evento: 'State changed from Recebida to EmElaboracao', user: accountId, timestamp: ts(-18) },
          { evento: 'State changed from EmElaboracao to EmOrcamentacao', user: accountId, timestamp: ts(-15) },
          { evento: 'AI estimate generated — confidence: Medio', user: accountId, timestamp: ts(-15) },
        ],
        sessaoOrcamentacao: [
          {
            sessaoId: 'seed-sessao-001',
            conversaIA: [],
            estimativaAtual: DUMMY_ESTIMATE,
            abordagemTecnica:
              'Stand modular em estrutura de alumínio octanorm com impressão em lona frontlit. ' +
              'Estrutura de 3×2m com painel traseiro impresso, balcão de atendimento com tampo em dibond e ' +
              'iluminação LED integrada no topo. Montagem prevista para 1 dia com equipa de 2 montadores.',
            nivelConfianca: 'Medio' as const,
            nivelConfiancaJustificacao:
              'Briefing com informação suficiente sobre dimensões, mas sem maquetes detalhadas. ' +
              'Estimativa apoiada em projectos similares da biblioteca.',
            inputsUsados: { timestamp: ts(-15) },
          },
        ],
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  // 4. Enviada
  await upsertProposal('Evento Lançamento Website (Enviada)', 'Evento de Lançamento Website', () =>
    payload.create({
      collection: 'proposals',
      data: {
        nomeProjeto: 'Evento de Lançamento Website',
        cliente: 'StartupX Lda',
        account: accountId,
        estado: 'Enviada',
        valorVendaFinal: 2800,
        margemCalculada: 28.5,
        condicoesPagamento: '50% antecipado, 50% após aprovação',
        validadeProposta: ts(30),
        activityLog: [
          { evento: 'Proposal created', user: accountId, timestamp: ts(-30) },
          { evento: 'State changed from Recebida to EmElaboracao', user: accountId, timestamp: ts(-28) },
          { evento: 'State changed from EmElaboracao to EmOrcamentacao', user: accountId, timestamp: ts(-25) },
          { evento: 'AI estimate generated — confidence: Alto', user: accountId, timestamp: ts(-25) },
          { evento: 'Estimate accepted', user: accountId, timestamp: ts(-20) },
          { evento: 'State changed from EmOrcamentacao to Enviada', user: accountId, timestamp: ts(-7) },
        ],
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  // 5. Ganha
  await upsertProposal('Kit PDV Verão 2025 (Ganha)', 'Kit PDV Verão 2025', () =>
    payload.create({
      collection: 'proposals',
      data: {
        nomeProjeto: 'Kit PDV Verão 2025',
        cliente: 'Retail Group Portugal',
        account: accountId,
        estado: 'Ganha',
        valorVendaFinal: 12500,
        margemCalculada: 31.2,
        condicoesPagamento: '30% antecipado, 40% produção, 30% entrega',
        validadeProposta: ts(-60),
        activityLog: [
          { evento: 'Proposal created', user: accountId, timestamp: ts(-90) },
          { evento: 'State changed from Recebida to EmElaboracao', user: accountId, timestamp: ts(-88) },
          { evento: 'State changed from EmElaboracao to EmOrcamentacao', user: accountId, timestamp: ts(-80) },
          { evento: 'AI estimate generated — confidence: Alto', user: accountId, timestamp: ts(-80) },
          { evento: 'Estimate accepted', user: accountId, timestamp: ts(-75) },
          { evento: 'State changed from EmOrcamentacao to Enviada', user: accountId, timestamp: ts(-70) },
          { evento: 'State changed from Enviada to Ganha', user: accountId, timestamp: ts(-60) },
        ],
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  // 6. Perdida
  await upsertProposal('Evento Corporativo Q3 2025 (Perdida)', 'Evento Corporativo Q3 2025', () =>
    payload.create({
      collection: 'proposals',
      data: {
        nomeProjeto: 'Evento Corporativo Q3 2025',
        cliente: 'MegaCorp SA',
        account: accountId,
        estado: 'Perdida',
        motivoPerda: 'Preco',
        detalhePerda:
          'Cliente optou por fornecedor com proposta 18% mais barata. ' +
          'Argumentaram que não havia diferenciação suficiente na qualidade percepcionada.',
        activityLog: [
          { evento: 'Proposal created', user: accountId, timestamp: ts(-60) },
          { evento: 'State changed from Recebida to EmElaboracao', user: accountId, timestamp: ts(-58) },
          { evento: 'State changed from EmElaboracao to EmOrcamentacao', user: accountId, timestamp: ts(-50) },
          { evento: 'AI estimate generated — confidence: Medio', user: accountId, timestamp: ts(-50) },
          { evento: 'Estimate accepted', user: accountId, timestamp: ts(-45) },
          { evento: 'State changed from EmOrcamentacao to Enviada', user: accountId, timestamp: ts(-40) },
          { evento: 'State changed from Enviada to Perdida (motivo: Preco)', user: accountId, timestamp: ts(-30) },
        ],
      },
      overrideAccess: true,
      context: seedCtx,
    }),
  )

  console.log('\n✅ Seed complete!')
  process.exit(0)
}

main().catch((err: unknown) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
