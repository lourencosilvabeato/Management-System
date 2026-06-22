import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function analyzeImagesVision(base64Images: string[]): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    temperature: 0.2,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analisa estas imagens de maquetes/mockups de stands ou instalações de eventos. Descreve em português: dimensões aparentes, materiais visíveis, elementos estruturais, acabamentos, iluminação, e qualquer detalhe relevante para orçamentação de produção física.',
          },
          ...base64Images.map((b64) => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:image/jpeg;base64,${b64}`,
              detail: 'high' as const,
            },
          })),
        ],
      },
    ],
  })
  return response.choices[0]?.message?.content ?? ''
}
