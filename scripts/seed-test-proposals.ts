/**
 * Creates 6 diverse EmOrcamentacao proposals with detailed briefings,
 * creative memory, and maquete uploads — for testing AI estimate generation.
 *
 * Run: npx tsx scripts/seed-test-proposals.ts [--force]
 */

import 'dotenv/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local', override: true })

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '@payload-config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FORCE = process.argv.includes('--force')
const seedCtx = { skipActivityLog: true, skipGenerateEstimate: true }

const now = new Date()
const ts = (offsetDays = 0) =>
  new Date(now.getTime() + offsetDays * 86400 * 1000).toISOString()

// ── Rich text helper ──────────────────────────────────────────────────────────
function rt(...paragraphs: string[]) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((text) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [{ type: 'text', format: 0, version: 1, detail: 0, mode: 'normal', style: '', text }],
      })),
    },
  }
}

// ── Upload test image as media ────────────────────────────────────────────────
async function uploadMaquete(payload: Awaited<ReturnType<typeof getPayload>>, label: string) {
  const imgPath = join(__dirname, '../test-assets/stand-maquete.png')
  let data: Buffer
  try {
    data = readFileSync(imgPath)
  } catch {
    console.warn(`  ⚠ test-assets/stand-maquete.png not found — skipping maquete for ${label}`)
    return null
  }
  const media = await payload.create({
    collection: 'media',
    data: { alt: `Maquete — ${label}` },
    file: { data, mimetype: 'image/png', name: `maquete-${label.toLowerCase().replace(/\s+/g, '-')}.png`, size: data.length },
    overrideAccess: true,
  })
  return media.id
}

// ── Upsert helper ─────────────────────────────────────────────────────────────
async function upsert(
  payload: Awaited<ReturnType<typeof getPayload>>,
  nomeProjeto: string,
  creator: () => Promise<unknown>,
) {
  const found = await payload.find({
    collection: 'proposals',
    where: { nomeProjeto: { equals: nomeProjeto } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.totalDocs > 0) {
    if (!FORCE) {
      console.log(`  ↩  "${nomeProjeto}" already exists, skipping`)
      return
    }
    await payload.delete({ collection: 'proposals', id: found.docs[0].id, overrideAccess: true })
  }
  await creator()
  console.log(`  ✓  ${nomeProjeto}`)
}

// ─────────────────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })

const accountUser = await payload.find({
  collection: 'users',
  where: { email: { equals: 'account@niu.pt' } },
  limit: 1,
  overrideAccess: true,
})
if (accountUser.totalDocs === 0) {
  console.error('❌ account@niu.pt not found — run npm run seed first')
  process.exit(1)
}
const accountId = accountUser.docs[0].id

console.log('\n📋 Creating test proposals for AI estimation...\n')

// ── 1. Stand Pharma — large, complex, AV-heavy ───────────────────────────────
await upsert(payload, 'Stand InnovaLab — Congresso Nacional de Farmácia 2026', async () => {
  const maqueteId = await uploadMaquete(payload, 'InnovaLab')
  await payload.create({
    collection: 'proposals',
    data: {
      nomeProjeto: 'Stand InnovaLab — Congresso Nacional de Farmácia 2026',
      cliente: 'InnovaLab Portugal SA',
      account: accountId,
      estado: 'EmOrcamentacao',
      estadoCriativo: 'Aprovado',
      contactoNome: 'Directora de Marketing',
      contactoEmail: 'marketing@innovalab.pt',
      prazoResposta: ts(18),
      briefing: rt(
        'A InnovaLab Portugal pretende marcar presença no Congresso Nacional de Farmácia 2026 com um stand de impacto elevado no Pavilhão FIL, Lisboa. O espaço atribuído é de 10m × 6m = 60m², em esquina (dois lados abertos).',
        'O stand deve transmitir rigor científico, inovação e confiança. Paleta cromática: branco clínico, azul petróleo (#0A3D62) e apontamentos a dourado. Materiais premium: MDF lacado, acrílico retroiluminado, tecido tensionado backlit.',
        'Elementos obrigatórios:\n— Parede de fundo com impressão backlit 10m × 3m (logo + claim "Ciência que Cuida")\n— Balcão de receção curvo em MDF lacado branco (3m de comprimento, tampo em acrílico 10mm com retroiluminação LED)\n— Sala de reuniões fechada (3m × 3m) com porta de correr em vidro fosco, mesa e 6 cadeiras\n— 4 totens de produto em dibond + impressão UV, iluminados individualmente (LED spot orientável)\n— 2 ecrãs 75" Samsung comercial para apresentações e vídeos de produto\n— Zona de demonstração com bancada de trabalho (1.5m × 0.8m) em tampo epóxi branco\n— Armazenamento integrado no balcão (mínimo 4 portas com fecho)\n— Iluminação geral LED 4000K + spots de destaque sobre os totens\n— Carpete de loop cor azul petróleo em toda a área do stand',
        'Montagem: 2 dias antes do evento (22-23 Setembro 2026). Desmontagem: 1 dia após encerramento (27 Setembro). Local: FIL — Feira Internacional de Lisboa, Parque das Nações.',
        'Capacidade eléctrica disponível: 32A trifásico. O cliente fornece identificação e credenciais de acesso ao recinto.',
      ),
      memoriacriativa: rt(
        'Conceito criativo: "O Laboratório do Futuro". O stand é concebido como uma extensão do espaço de I&D da InnovaLab — clean, controlado, científico, mas acessível e convidativo.',
        'A parede de fundo em backlit cria um efeito luminoso difuso que evoca o brilho de um laboratório moderno. O balcão curvo elimina barreiras físicas e convida à conversa. A sala de reuniões com vidro fosco dá privacidade sem isolar visualmente.',
        'Os 4 totens de produto são tratados como "vitrines de museu" — cada um com spot direccionado, como se os produtos fossem obras de arte. O espaço de demonstração permite interacção directa com os produtos.',
        'Paleta: branco dominante (90%), azul petróleo nos apontamentos estruturais e carpete, dourado apenas nos detalhes metálicos (pés do balcão, molduras dos totens). A tipografia principal é a Helvetica Neue Light — já aprovada pela equipa de brand.',
        'Iluminação: temperatura 4000K para a zona principal (luz clínica, neutra); spots de destaque nos totens com temperatura 2700K (mais quente, evoca exposição de produto). Consumo estimado: 800W.',
      ),
      maquetes: maqueteId ? [maqueteId] : [],
      activityLog: [
        { evento: 'Proposal created', user: accountId, timestamp: ts(-12) },
        { evento: 'State changed to EmElaboracao', user: accountId, timestamp: ts(-10) },
        { evento: 'State changed to EmOrcamentacao', user: accountId, timestamp: ts(-1) },
      ],
    },
    overrideAccess: true,
    context: seedCtx,
  })
})

// ── 2. PDV series production — 35 locations ───────────────────────────────────
await upsert(payload, 'Kit PDV FreshDerm — 35 Farmácias', async () => {
  const maqueteId = await uploadMaquete(payload, 'FreshDerm')
  await payload.create({
    collection: 'proposals',
    data: {
      nomeProjeto: 'Kit PDV FreshDerm — 35 Farmácias',
      cliente: 'FreshDerm Cosmética Lda',
      account: accountId,
      estado: 'EmOrcamentacao',
      estadoCriativo: 'Aprovado',
      contactoNome: 'Gestor de Trade Marketing',
      contactoEmail: 'trade@freshderm.pt',
      prazoResposta: ts(12),
      briefing: rt(
        'A FreshDerm pretende lançar a nova linha "AquaLift" em 35 farmácias parceiras em Lisboa, Porto e Braga, com entrega e instalação até 15 de Setembro de 2026.',
        'Kit por farmácia (produção em série × 35 unidades):\n— 1 expositor de balcão em PVC espumado 5mm + impressão UV, dimensões 30cm × 50cm × 20cm (L×A×P). Suporte para 12 SKUs em prateleiras ajustáveis. Adesivo de fundo em vinil impresso.\n— 1 painel de parede A1 (594mm × 841mm) em dibond 3mm + impressão UV, com sistema de fixação por velcro dupla face para não danificar paredes\n— 1 wobbler A5 em PVC 0.5mm, plastificação brilhante, com fio e ventosa\n— 1 talker de prateleira (shelf talker) 10cm × 7cm em cartão 350g plastificado',
        'Embalagem individual por farmácia: caixa de cartão canelado com divisórias interiores, etiquetada com nome e morada da farmácia. Expedição por transportadora (CTT Expresso) — a agência trata do envio.',
        'Arte gráfica: fornecida pelo cliente em PDF/X-4 a 300dpi. Prazo de entrega dos ficheiros: 1 Agosto 2026.',
        'Nota: 5 farmácias têm bancadas de farmacêutico em "L" — o expositor de balcão precisa de versão mirrored (espelhada). Cliente confirmará quais.',
      ),
      memoriacriativa: rt(
        'Conceito: "Frescura em Destaque". O kit deve destacar a leveza e hidratação da linha AquaLift num ambiente farmacêutico tipicamente austero.',
        'Expositor de balcão: estrutura branca com apontamentos a azul-água (#4FC3F7). Prateleiras transparentes em acrílico 3mm para dar efeito "flutuante" aos produtos. Logo FreshDerm em relevo (recorte em vinil branco sobre fundo branco — efeito tridimensional subtil).',
        'Painel de parede: fotografia de produto em grande plano (gota de água), gradiente azul-branco. Headline "Hidratação que se vê." em Gotham Medium. QR code no canto inferior direito para landing page da linha.',
        'Wobbler: fundo azul-água, produto em perspectiva, claim curto "Nova Fórmula AquaLift". Brilhante para atrair atenção sob luz LED de farmácia.',
        'Todos os materiais aprovados pela equipa de brand FreshDerm em 14 de Junho. Ficheiros finais pendentes de entrega pelo cliente.',
      ),
      maquetes: maqueteId ? [maqueteId] : [],
      activityLog: [
        { evento: 'Proposal created', user: accountId, timestamp: ts(-8) },
        { evento: 'State changed to EmElaboracao', user: accountId, timestamp: ts(-6) },
        { evento: 'State changed to EmOrcamentacao', user: accountId, timestamp: ts(-2) },
      ],
    },
    overrideAccess: true,
    context: seedCtx,
  })
})

// ── 3. Hospital wayfinding — large scale signage ──────────────────────────────
await upsert(payload, 'Sinalética Hospitalar — CentroMédico NorteClinic Porto', async () => {
  const maqueteId = await uploadMaquete(payload, 'NorteClinic')
  await payload.create({
    collection: 'proposals',
    data: {
      nomeProjeto: 'Sinalética Hospitalar — CentroMédico NorteClinic Porto',
      cliente: 'NorteClinic — Grupo Hospitalar do Norte SA',
      account: accountId,
      estado: 'EmOrcamentacao',
      estadoCriativo: 'Aprovado',
      contactoNome: 'Director de Operações',
      contactoEmail: 'operacoes@norteclinic.pt',
      prazoResposta: ts(30),
      briefing: rt(
        'O CentroMédico NorteClinic em expansão necessita de um sistema completo de sinalética para o novo edifício de 6 pisos (incluindo cave e rés-do-chão). A obra está prevista para conclusão em Novembro 2026, com instalação de sinalética a partir de 1 de Outubro.',
        'Listagem de elementos necessários:\n\n[EXTERIOR]\n— 1 totem de identificação exterior, dupla face, 0.6m × 2.5m, alumínio + acrílico retroiluminado, com logótipo NorteClinic e nome do centro\n— 4 placas de fachada (frente e 3 entradas laterais), acrílico 10mm cor branca com letras recortadas em dourado\n\n[RECEPÇÃO / ÁREAS COMUNS]\n— 2 painéis de directório (índice de serviços), 1.2m × 1.8m, alumínio com inserções intercambiáveis em acrílico fosco\n— 6 totens de orientação em T, altura 2m, dupla face, com setas direccionais\n— 18 placas de identificação de serviço (Consultas, Urgência, Imagiologia, etc.), 40cm × 15cm, acrílico branco com impressão directa\n\n[PISOS 1–6]\n— 180 placas de porta para salas de consulta (20cm × 8cm), acrílico fosco com letras em relevo + sistema Braille (norma ISO 7001)\n— 12 placas de WC (acessibilidade incluída), 15cm × 20cm, pictogramas internacionais\n— 36 sinais de emergência (saída de emergência, extintor, AED), homologados pela ANPC\n— Numeração de piso em todos os elevadores e escadas (6 pisos × 4 núcleos = 24 placas)',
        'Requisitos técnicos:\n— Todos os elementos em espaços clínicos em acrílico resistente a desinfectantes hospitalares (álcool isopropílico)\n— Cor dominante: branco RAL 9016 + azul NorteClinic (Pantone 286 C)\n— Fonte obrigatória: Frutiger 45 Light e 65 Bold (licença fornecida pelo cliente)\n— Braille obrigatório em todas as placas de porta',
        'Instalação faseada: Piso 0 e 1 primeiro (até 15 Out), restantes pisos até 30 Nov. A agência é responsável pelo transporte e instalação de todos os elementos.',
      ),
      memoriacriativa: rt(
        'Sistema de sinalética hospitalar concebido para máxima legibilidade, acessibilidade universal e manutenção fácil.',
        'Filosofia de design: hierarquia visual clara — cor, tamanho e ícone trabalham em conjunto para que qualquer pessoa, incluindo com baixa literacia ou dificuldades visuais, encontre o seu destino sem necessidade de perguntar.',
        'Materiais seleccionados: acrílico Perspex Frost 3mm para placas de parede (resistência a desinf. hospitalar certificada); alumínio anodizado para estruturas de totens e directórios; LED SMD 3528 para retroiluminação de todos os elementos com luz (cor 4000K, Ra>90).',
        'O sistema de placas de porta usa sub-estrutura com encaixe de lâmina deslizante — permitem substituição do insert em 30 segundos sem ferramentas, fundamental num hospital em crescimento.',
        'Braille posicionado sempre no canto inferior direito, em relevo de 0.8mm, com espaçamento conforme ISO 7001:2007. Todos os pictogramas são da biblioteca ISO 7001 — sem ícones personalizados.',
      ),
      maquetes: maqueteId ? [maqueteId] : [],
      activityLog: [
        { evento: 'Proposal created', user: accountId, timestamp: ts(-15) },
        { evento: 'State changed to EmElaboracao', user: accountId, timestamp: ts(-12) },
        { evento: 'State changed to EmOrcamentacao', user: accountId, timestamp: ts(-3) },
      ],
    },
    overrideAccess: true,
    context: seedCtx,
  })
})

// ── 4. Road show pop-up — mobile, 6 cities ────────────────────────────────────
await upsert(payload, 'Road Show DataVox — 6 Cidades Portugal', async () => {
  const maqueteId = await uploadMaquete(payload, 'DataVox')
  await payload.create({
    collection: 'proposals',
    data: {
      nomeProjeto: 'Road Show DataVox — 6 Cidades Portugal',
      cliente: 'DataVox Tecnologias SA',
      account: accountId,
      estado: 'EmOrcamentacao',
      estadoCriativo: 'Aprovado',
      contactoNome: 'Responsável de Eventos',
      contactoEmail: 'eventos@datavox.pt',
      prazoResposta: ts(9),
      briefing: rt(
        'A DataVox vai realizar um road show de demonstração do novo produto DataVox Pro em 6 cidades portuguesas (Lisboa, Porto, Coimbra, Braga, Aveiro, Faro) entre 1 e 20 de Outubro de 2026. Cada cidade tem 2-3 dias de activação.',
        'Requisito crítico: o stand completo deve caber numa carrinha de carga 3.5t (caixa 4.2m × 2.1m × 2.2m) e ser montado/desmontado por 2 pessoas em máximo 90 minutos.',
        'Estrutura do stand (configuração 4m × 3m):\n— Sistema modular lightweight em alumínio folding frame (octanorm ou similar)\n— Parede de fundo curva 4m × 2.3m em tecido impresso tensionado (dye sublimation) — facilmente lavável e dobrável\n— Balcão de atendimento dobrável em alumínio, 1.2m × 0.6m × 1m, com tampo em vinyl impresso\n— 2 totens laterais lightweight 0.5m × 1.8m, lona tensionada dupla face, base enrolável\n— 1 ecrã Samsung 55" comercial com suporte telescópico de chão (ajustável 1.2m–1.8m)\n— 1 tablet iPad Pro 12.9" em suporte de balcão anti-roubo (para demonstração interactiva)\n— Carpete modular tipo puzzle, cor cinza antracite, 12m²\n— Kit de iluminação portátil: 4 spots LED com garra, temperatura 3000K, consumo total 200W\n— Extensão eléctrica com rampas de proteção (2x 5m)',
        'A equipa DataVox tem 2 promotores por cidade. A agência é responsável pela entrega do stand na primeira cidade (Lisboa) e recolha após a última (Faro). Entre cidades, o transporte é feito pela equipa DataVox.',
        'Datas críticas: entrega em Lisboa até 30 Setembro. Briefing de design aprovado. Ficheiros gráficos prontos.',
      ),
      memoriacriativa: rt(
        'Conceito: "DataVox em Movimento". O stand deve ser imediatamente reconhecível como DataVox — bold, tecnológico, dinâmico — mesmo numa feira concorrida ou num shopping.',
        'Identidade visual do stand: fundo preto grafite (#1A1A2E) com elementos em azul electric (#0066FF, cor principal DataVox). Tipografia: Roboto Bold para headlines, Roboto Regular para texto de suporte.',
        'Parede de fundo curva: fotografia de ambientes tecnológicos em grande plano (data center, dashboard em ecrã) com overlay de gradiente azul. Logo DataVox em posição central, escala grande. Claim: "O Futuro dos Dados. Aqui. Agora."',
        'Os totens laterais funcionam como "publicidade" — um com feature highlights do DataVox Pro, outro com QR code para demo online e contacto da equipa de vendas.',
        'O balcão tem espaço para literatura de produto (brochuras A4 e folhetos A5) e zona reservada para laptop do promotor. Visualmente limpo — nada em cima do balcão além do tablet em suporte.',
        'Ponto diferenciador: o stand é instagrammável — existe um "selfie corner" implícito na posição frontal com o ecrã e o backdrop. O QR code leva a uma landing page com formulário de contacto pré-preenchido com a cidade da activação.',
      ),
      maquetes: maqueteId ? [maqueteId] : [],
      activityLog: [
        { evento: 'Proposal created', user: accountId, timestamp: ts(-5) },
        { evento: 'State changed to EmElaboracao', user: accountId, timestamp: ts(-4) },
        { evento: 'State changed to EmOrcamentacao', user: accountId, timestamp: ts(-1) },
      ],
    },
    overrideAccess: true,
    context: seedCtx,
  })
})

// ── 5. Outdoor food & wine stand ─────────────────────────────────────────────
await upsert(payload, 'Stand AlmaVerde — Festa Nacional do Vinho Alentejo 2026', async () => {
  const maqueteId = await uploadMaquete(payload, 'AlmaVerde')
  await payload.create({
    collection: 'proposals',
    data: {
      nomeProjeto: 'Stand AlmaVerde — Festa Nacional do Vinho Alentejo 2026',
      cliente: 'AlmaVerde — Produtores de Vinho Lda',
      account: accountId,
      estado: 'EmOrcamentacao',
      estadoCriativo: 'Aprovado',
      contactoNome: 'Responsável Comercial',
      contactoEmail: 'comercial@almaverde.pt',
      prazoResposta: ts(21),
      briefing: rt(
        'A AlmaVerde pretende participar na Festa Nacional do Vinho do Alentejo 2026 em Évora (recinto ao ar livre, Julho 2026) com um stand outdoor de 8m × 5m.',
        'O stand deve evocar as raízes alentejanas da quinta: materiais naturais, tons terrosos, luz quente de fim de tarde. Deve funcionar das 11h às 24h, inclusive com condições de vento típicas do Alentejo (rajadas até 60 km/h).',
        'Elementos obrigatórios:\n— Estrutura de cobertura em vela náutica de sombra 8m × 5m, lona PVC 900g ignifugada, cor creme/natural, com estrutura em alumínio anodizado + fixação ao solo por sistemas de chumbamento (recinto sobre pavimento betão)\n— Parede traseira em palete de madeira recuperada (aspecto rústico), 8m de comprimento × 2.2m de altura, com aplicação de logos e sinalética em letras recortadas de inox escovado\n— Bar/balcão de degustação em madeira de pinho maciço 6m de comprimento × 1.1m de altura, com bica de inox embutida, cuba de gelo embutida (3 cubas, 40L cada)\n— 3 prateleiras suspensas nas paredes laterais para exposição de garrafas (cada 2m × 0.3m, ripado de madeira)\n— Mesa de apoio ao sommelier (1.5m × 0.6m) com estrutura em ferro lacado preto\n— 8 bancos altos de madeira para o balcão\n— Iluminação: guirlandas de lâmpadas Edison 4W ao longo do perímetro (20m), 4 spots PAR38 de destaque sobre o balcão, 1 projector gobo com logo AlmaVerde no chão (exterior)\n— Chão: não há piso (sobre o pavimento do recinto) — tapetes de juta delimitam a zona de degustação\n— Sinalética: placa de identificação suspensa dupla face 1.5m × 0.4m + 3 porta-preços estilo vintage em latão',
        'Montagem: 2 dias (10-11 Julho). Desmontagem: 1 dia (14 Julho). Transporte de Lisboa para Évora e regresso incluídos.',
        'O cliente tem electricidade disponível no recinto (monofásico 16A). Não há necessidade de gerador.',
      ),
      memoriacriativa: rt(
        'Conceito: "Herdade ao Vivo". O stand é a herdade AlmaVerde condensada num espaço de 40m² — o visitante deve sentir que está a provar o vinho no próprio local onde foi produzido.',
        'Materiais naturais são a linguagem visual: madeira, ferro, pedra (simulada em acabamentos), juta. Nada de plástico visível, nada de alumínio brilhante. O metal é sempre ferro preto ou inox escovado.',
        'A parede de paletes é o elemento âncora visual. É reconhecível de longe e serve de backdrop perfeito para fotografias (objectivo secundário: conteúdo para redes sociais dos visitantes). As letras "ALMAVERDE" em inox escovado brilham à luz do pôr-do-sol.',
        'A iluminação é o grande diferenciador para o período nocturno: as guirlandas Edison criam atmosfera de festa rural alentejana; os spots PAR38 valorizam as garrafas em exposição; o gobo com o logo cria um elemento surpresa no chão que atrai atenção à distância.',
        'Cor e materiais aprovados em painel criativo: madeira de pinho natural (sem envernizamento excessivo — aparência "honesta"), ferro lacado preto mate, tecido de juta natural, lona PVC cor areia.',
      ),
      maquetes: maqueteId ? [maqueteId] : [],
      activityLog: [
        { evento: 'Proposal created', user: accountId, timestamp: ts(-7) },
        { evento: 'State changed to EmElaboracao', user: accountId, timestamp: ts(-5) },
        { evento: 'State changed to EmOrcamentacao', user: accountId, timestamp: ts(-2) },
      ],
    },
    overrideAccess: true,
    context: seedCtx,
  })
})

// ── 6. Flagship store interior rebranding ─────────────────────────────────────
await upsert(payload, 'Rebranding Interior Flagship — OticaMax Colombo', async () => {
  const maqueteId = await uploadMaquete(payload, 'OticaMax')
  await payload.create({
    collection: 'proposals',
    data: {
      nomeProjeto: 'Rebranding Interior Flagship — OticaMax Colombo',
      cliente: 'OticaMax — Ópticas de Portugal SA',
      account: accountId,
      estado: 'EmOrcamentacao',
      estadoCriativo: 'Aprovado',
      contactoNome: 'Director de Expansão',
      contactoEmail: 'expansao@oticamax.pt',
      prazoResposta: ts(25),
      briefing: rt(
        'A OticaMax quer fazer o rebranding completo do interior da loja flagship no Centro Comercial Colombo (Lisboa), aproveitando a renovação de layout planeada para Agosto 2026. A loja tem 95m² de área total (frente 6m, profundidade ~16m). O CC exige que a obra seja feita entre as 22h e as 8h (período noturno). Prazo total: 10 noites de obra.',
        'Intervenção prevista:\n\n[FACHADA / MONTRA]\n— Remoção de sinalética existente\n— Lettering 3D "OTICAMAX" em acrílico branco com iluminação LED perimetral (perfil de luz rasante), letras 40cm de altura\n— 2 painéis de montra em vinil perfurado, 1.2m × 2.5m cada, com campanha de imagem SS2026\n— Tecto falso de entrada em ripas de MDF lacado branco, espaçamento 5cm, com LED embutido\n\n[INTERIOR — ZONA DE EXPOSIÇÃO]\n— Remoção de todos os móveis expositores existentes\n— 8 expositores de parede modulares em MDF lacado branco com iluminação LED integrada no cimo (para armações), 1.2m × 2.4m cada\n— 4 ilhas centrais para exposição de óculos de sol, em MDF lacado branco + tampo em vidro temperado 8mm (1m × 0.5m × 1.1m)\n— 1 parede de espelhos full-height (2.5m × 3m) com caixilho em latão escovado\n— Alcatifa nova: cor cinza perola, 80m²\n\n[ZONA DE GRADUAÇÃO / CONSULTA]\n— 2 gabinetes de consulta: porta de vidro com película fosca, sinalética interior, iluminação específica (5000K, Ra>97 para correcta avaliação de cor das armações)\n— Balcão de atendimento: MDF lacado branco com tampo em Corian® branco polar (5m × 0.9m)\n\n[SINALÉTICA INTERIOR]\n— Lettering directo na parede "A Tua Visão. O Nosso Propósito." em vinil de corte branco mate\n— Placas de identificação de zonas (Consulta, Sol, Criança, Desporto) em acrílico fosco com lettering em vinil\n— 4 lightboxes de produto (A1) em caixas de luz slim LED, suspensas',
        'Restrições do CC Colombo: perfurações no tecto do CC necessitam de aprovação prévia (prazo 2 semanas); ruído acima de 70dB proibido após as 23h30; gestão de resíduos de obra pelo empreiteiro.',
        'O cliente fornece toda a arte gráfica aprovada. A agência é responsável pela gestão da obra, sub-contratação de electricista certificado e limpeza pós-obra.',
      ),
      memoriacriativa: rt(
        'Conceito: "Clareza Premium". A nova loja OticaMax Colombo deve comunicar imediatamente que se trata de uma óptica de gama alta — não uma óptica de preço, mas uma óptica de experiência.',
        'Linguagem visual: branco dominante, luz generosa e directa, apontamentos em latão escovado (warm metallic). O branco não é frio — é quente, limpo, como uma galeria de arte moderna.',
        'A iluminação é o elemento mais crítico do projecto. Na zona de exposição, luz uniforme 4000K a Ra>90 valoriza as armações. Nos gabinetes de consulta, 5000K Ra>97 é obrigatório para avaliação de cor correcta. A iluminação de acento sobre as ilhas centrais usa spots narrow beam (15°) para criar "cones de luz" sobre cada ilha.',
        'Os 8 expositores de parede modulares são o backbone do layout. Sistema de prateleiras ajustáveis (standard europeu 32mm) permite re-configuração do merchandising sem obra. Iluminação LED embutida no perfil superior ilumina as armações por cima, eliminando sombras indesejadas.',
        'A parede de espelhos na zona fundos cria ilusão de profundidade e duplica visualmente o espaço — fundamental numa loja de 16m de profundidade onde a zona fundos pode parecer "pesada". O caixilho em latão é o único elemento decorativo explícito de todo o projecto.',
        'A alcatifa cinza pérola une toda a loja visualmente e reduz o ruído ambiente (importante nos gabinetes de consulta). Especificação: tipo comercial, ponto de laço, resistência mínima 500.000 Lissajous.',
      ),
      maquetes: maqueteId ? [maqueteId] : [],
      activityLog: [
        { evento: 'Proposal created', user: accountId, timestamp: ts(-9) },
        { evento: 'State changed to EmElaboracao', user: accountId, timestamp: ts(-7) },
        { evento: 'State changed to EmOrcamentacao', user: accountId, timestamp: ts(-2) },
      ],
    },
    overrideAccess: true,
    context: seedCtx,
  })
})

console.log('\n✅ Done. All 6 test proposals created in EmOrcamentacao state.')
console.log('   → Trigger AI estimation via: POST /api/proposals/[id]/transition')
console.log('     body: { "novoEstado": "EmOrcamentacao" }')
process.exit(0)
