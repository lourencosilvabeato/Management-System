// Run with: node src/scripts/createTestAssets.mjs
// Generates test-assets/briefing.pdf and test-assets/stand-maquete.png

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../../test-assets')
mkdirSync(outDir, { recursive: true })

// ─── PDF: Project Brief ───────────────────────────────────────────────────────
async function createBriefingPDF() {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  const draw = (text, x, y, size = 11, f = font, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x, y, size, font: f, color })
  }

  // Header
  page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0, 0, 0) })
  draw('BRIEFING DE PROJETO', 40, height - 38, 16, bold, rgb(1, 1, 1))

  // Project info
  draw('PROJETO', 40, height - 100, 9, bold, rgb(0.5, 0.5, 0.5))
  draw('Stand Expo Tech Lisboa 2026', 40, height - 116, 13, bold)

  draw('CLIENTE', 40, height - 150, 9, bold, rgb(0.5, 0.5, 0.5))
  draw('Nexus Eventos Lda.', 40, height - 166, 11)

  draw('EVENTO', 40, height - 200, 9, bold, rgb(0.5, 0.5, 0.5))
  draw('Expo Tech Lisboa 2026 — Pavilhão Central', 40, height - 216, 11)

  draw('PRAZO DE RESPOSTA', 300, height - 200, 9, bold, rgb(0.5, 0.5, 0.5))
  draw('30 de Junho de 2026', 300, height - 216, 11)

  // Divider
  page.drawLine({ start: { x: 40, y: height - 240 }, end: { x: width - 40, y: height - 240 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })

  // Briefing
  draw('BRIEFING', 40, height - 270, 9, bold, rgb(0.5, 0.5, 0.5))
  const briefingLines = [
    'A Nexus Eventos pretende marcar presença no Expo Tech Lisboa 2026 com um stand premium de 6m x 4m.',
    'O stand deve refletir os valores da marca: inovação, tecnologia e design sofisticado.',
    '',
    'O conceito criativo baseia-se numa estética minimalista em preto e branco, com elementos',
    'de destaque em dourado. A estrutura deve incluir:',
    '',
    '  • Parede de fundo com impressão UV de alta resolução do logótipo e claims da marca',
    '  • Balcão de receção em MDF lacado preto com tampo em acrílico translúcido retroiluminado',
    '  • 2 totens laterais com ecrãs de 55" para apresentação de case studies',
    '  • Zona de reunião com mesa e 4 cadeiras (material: alumínio e couro sintético preto)',
    '  • Iluminação ambiente LED com temperatura de cor 3000K (luz quente)',
    '  • Carpete preta de alta resistência em toda a área do stand',
    '  • Armazenamento integrado no balcão (mínimo 2 portas)',
  ]
  briefingLines.forEach((line, i) => draw(line, 40, height - 290 - i * 18, 10))

  // Dimensions
  page.drawLine({ start: { x: 40, y: height - 560 }, end: { x: width - 40, y: height - 560 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  draw('DIMENSÕES E ESPECIFICAÇÕES TÉCNICAS', 40, height - 590, 9, bold, rgb(0.5, 0.5, 0.5))

  const specs = [
    ['Área total do stand', '6m × 4m = 24m²'],
    ['Altura máxima estrutura', '2,5m (limite do pavilhão)'],
    ['Parede de fundo (impressão UV)', '6m × 2,5m'],
    ['Balcão de receção', '2m × 0,6m × 1,1m (C×L×A)'],
    ['Totens laterais', '0,6m × 0,6m × 2m (cada)'],
    ['Ecrãs', '2× Samsung 55" comercial'],
    ['Capacidade elétrica disponível', '16A trifásico'],
  ]
  specs.forEach(([label, value], i) => {
    draw(label, 40, height - 616 - i * 22, 10, bold)
    draw(value, 280, height - 616 - i * 22, 10)
  })

  // Notes
  page.drawLine({ start: { x: 40, y: height - 790 }, end: { x: width - 40, y: height - 790 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  draw('NOTAS ADICIONAIS', 40, height - 810, 9, bold, rgb(0.5, 0.5, 0.5))

  const bytes = await doc.save()
  const outPath = join(outDir, 'briefing.pdf')
  writeFileSync(outPath, bytes)
  console.log('✓ Created:', outPath)
}

// ─── PNG: Stand Maquete ───────────────────────────────────────────────────────
async function createStandPNG() {
  const W = 1200
  const H = 900

  // Build SVG of a simple stand elevation/perspective sketch
  const svg = `
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif">
  <!-- Background -->
  <rect width="${W}" height="${H}" fill="#f5f5f5"/>

  <!-- Title -->
  <text x="40" y="48" font-size="22" font-weight="bold" fill="#111">Stand Nexus Eventos — Expo Tech Lisboa 2026</text>
  <text x="40" y="72" font-size="13" fill="#666">Maquete de referência — Área: 6m × 4m | Altura máx.: 2.5m</text>
  <line x1="40" y1="84" x2="1160" y2="84" stroke="#ddd" stroke-width="1"/>

  <!-- Floor plan (top view) -->
  <text x="40" y="115" font-size="13" font-weight="bold" fill="#444">PLANTA (Vista Superior)</text>

  <!-- Stand floor outline -->
  <rect x="80" y="130" width="480" height="320" fill="white" stroke="#222" stroke-width="2"/>

  <!-- Back wall -->
  <rect x="80" y="130" width="480" height="28" fill="#222"/>
  <text x="320" y="150" font-size="11" fill="white" text-anchor="middle">PAREDE DE FUNDO — Impressão UV 6m × 2.5m</text>

  <!-- Left totem -->
  <rect x="92" y="170" width="52" height="52" fill="#444"/>
  <text x="118" y="201" font-size="9" fill="white" text-anchor="middle">TOTEM</text>
  <text x="118" y="212" font-size="9" fill="white" text-anchor="middle">55"</text>

  <!-- Right totem -->
  <rect x="516" y="170" width="32" height="52" fill="#444"/>
  <text x="532" y="201" font-size="9" fill="white" text-anchor="middle">TOTEM</text>
  <text x="532" y="212" font-size="9" fill="white" text-anchor="middle">55"</text>

  <!-- Reception counter -->
  <rect x="180" y="360" width="200" height="48" fill="#333" rx="2"/>
  <text x="280" y="389" font-size="11" fill="white" text-anchor="middle">BALCÃO RECEÇÃO (2m × 0.6m)</text>

  <!-- Meeting area -->
  <rect x="430" y="260" width="110" height="110" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="5,3"/>
  <text x="485" y="310" font-size="10" fill="#666" text-anchor="middle">ZONA</text>
  <text x="485" y="324" font-size="10" fill="#666" text-anchor="middle">REUNIÃO</text>
  <!-- Table -->
  <rect x="450" y="275" width="70" height="50" fill="#bbb" rx="2"/>
  <!-- Chairs -->
  <rect x="442" y="280" width="10" height="14" fill="#999" rx="1"/>
  <rect x="442" y="300" width="10" height="14" fill="#999" rx="1"/>
  <rect x="518" y="280" width="10" height="14" fill="#999" rx="1"/>
  <rect x="518" y="300" width="10" height="14" fill="#999" rx="1"/>

  <!-- Carpet area indicator -->
  <rect x="82" y="132" width="476" height="316" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"/>

  <!-- Dimensions -->
  <line x1="80" y1="465" x2="560" y2="465" stroke="#e74c3c" stroke-width="1"/>
  <line x1="80" y1="459" x2="80" y2="471" stroke="#e74c3c" stroke-width="1"/>
  <line x1="560" y1="459" x2="560" y2="471" stroke="#e74c3c" stroke-width="1"/>
  <text x="320" y="480" font-size="11" fill="#e74c3c" text-anchor="middle">6.00m</text>

  <line x1="578" y1="130" x2="578" y2="450" stroke="#e74c3c" stroke-width="1"/>
  <line x1="572" y1="130" x2="584" y2="130" stroke="#e74c3c" stroke-width="1"/>
  <line x1="572" y1="450" x2="584" y2="450" stroke="#e74c3c" stroke-width="1"/>
  <text x="600" y="296" font-size="11" fill="#e74c3c" transform="rotate(90,600,296)">4.00m</text>

  <!-- Elevation (front view) -->
  <text x="680" y="115" font-size="13" font-weight="bold" fill="#444">ALÇADO FRONTAL</text>

  <!-- Stand frame -->
  <rect x="680" y="130" width="460" height="300" fill="white" stroke="#222" stroke-width="2"/>

  <!-- Back wall with branding -->
  <rect x="680" y="130" width="460" height="300" fill="#111"/>

  <!-- Brand area -->
  <rect x="720" y="155" width="380" height="160" fill="#1a1a1a" rx="2"/>
  <text x="910" y="225" font-size="32" font-weight="bold" fill="white" text-anchor="middle">NEXUS</text>
  <text x="910" y="258" font-size="13" fill="#aaa" text-anchor="middle">We create brands that move people</text>

  <!-- Left LED totem -->
  <rect x="692" y="145" width="55" height="270" fill="#222" rx="2"/>
  <rect x="697" y="155" width="45" height="80" fill="#1e3a5f" rx="1"/>
  <text x="719" y="202" font-size="8" fill="#88aacc" text-anchor="middle">CASE</text>
  <text x="719" y="213" font-size="8" fill="#88aacc" text-anchor="middle">STUDY</text>

  <!-- Right LED totem -->
  <rect x="1093" y="145" width="40" height="270" fill="#222" rx="2"/>
  <rect x="1098" y="155" width="30" height="80" fill="#1e3a5f" rx="1"/>

  <!-- Reception counter -->
  <rect x="800" y="355" width="220" height="65" fill="#1a1a1a" rx="2"/>
  <rect x="800" y="348" width="220" height="12" fill="#333" rx="1"/>
  <!-- Backlit top effect -->
  <rect x="804" y="349" width="212" height="8" fill="rgba(255,255,200,0.15)" rx="1" opacity="0.5"/>
  <text x="910" y="393" font-size="11" fill="#888" text-anchor="middle">BALCÃO RECEÇÃO</text>

  <!-- Floor -->
  <rect x="680" y="430" width="460" height="10" fill="#333"/>

  <!-- LED light strips -->
  <line x1="680" y1="138" x2="1140" y2="138" stroke="#ffee88" stroke-width="3" opacity="0.6"/>

  <!-- Height dimension -->
  <line x1="1152" y1="130" x2="1152" y2="430" stroke="#e74c3c" stroke-width="1"/>
  <line x1="1146" y1="130" x2="1158" y2="130" stroke="#e74c3c" stroke-width="1"/>
  <line x1="1146" y1="430" x2="1158" y2="430" stroke="#e74c3c" stroke-width="1"/>
  <text x="1170" y="287" font-size="11" fill="#e74c3c" transform="rotate(90,1170,287)">2.50m</text>

  <!-- Legend -->
  <rect x="40" y="520" width="1120" height="320" fill="white" stroke="#eee" stroke-width="1" rx="2"/>
  <text x="60" y="548" font-size="13" font-weight="bold" fill="#222">ESPECIFICAÇÕES DE MATERIAIS E ACABAMENTOS</text>
  <line x1="60" y1="558" x2="1140" y2="558" stroke="#eee" stroke-width="1"/>

  ${[
    ['Estrutura principal', 'Perfil octanorm 44mm em alumínio anodizado preto', '60', '580'],
    ['Parede de fundo', 'Lona frontlit 510g/m² com impressão UV 1440dpi — 15m²', '60', '608'],
    ['Balcão de receção', 'MDF lacado preto mate + tampo acrílico 10mm retroiluminado LED', '60', '636'],
    ['Totens laterais', 'Estrutura alumínio com facing em vinilo preto + ecrã Samsung 55" Full HD', '60', '664'],
    ['Iluminação', 'Fitas LED 24V 3000K (quente) + 4× spots orientáveis — consumo: ~400W', '60', '692'],
    ['Pavimento', 'Carpete loop 550g/m² cor preta — 24m²', '60', '720'],
    ['Mobiliário reunião', 'Mesa alumínio 120×60cm + 4× cadeiras couro sint. preto empilháveis', '60', '748'],
    ['Armazenamento', 'Armário integrado no balcão: 2 portas com fecho e prateleira', '60', '776'],
  ].map(([item, desc, x, y]) => `
    <text x="${x}" y="${y}" font-size="10" font-weight="bold" fill="#333">${item}</text>
    <text x="${Number(x) + 180}" y="${y}" font-size="10" fill="#555">${desc}</text>
  `).join('')}

  <!-- Footer -->
  <text x="40" y="870" font-size="10" fill="#aaa">Documento para efeitos de orçamentação. Sujeito a alterações após aprovação criativa. © 2026</text>
</svg>`

  const outPath = join(outDir, 'stand-maquete.png')
  await sharp(Buffer.from(svg)).png().toFile(outPath)
  console.log('✓ Created:', outPath)
}

// Run both
await createBriefingPDF()
await createStandPNG()
console.log('\nDone! Files in: test-assets/')
