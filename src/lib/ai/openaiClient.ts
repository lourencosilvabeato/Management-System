// TODO: replace with real OpenAI SDK when OPENAI_API_KEY is available
// import OpenAI from 'openai'
// export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function analyzeImagesMock(_imageUrls: string[]): Promise<string> {
  // Simulate API latency
  await new Promise((resolve) => setTimeout(resolve, 500))

  return (
    'Stand de exposição com estrutura modular em alumínio. ' +
    'Dimensões aparentes: 3m de largura × 2m de altura × 1m de profundidade. ' +
    'Painel traseiro com impressão gráfica de grande formato em lona. ' +
    'Balcão frontal com tampo branco, aproximadamente 120cm de comprimento × 90cm de altura. ' +
    'Iluminação de topo com régua de LEDs brancos. ' +
    'Elementos visíveis: 2 colunas verticais, travessa superior, base estabilizadora. ' +
    'Acabamentos: perfis em prateado, revestimento branco liso nos painéis laterais.'
  )
}
