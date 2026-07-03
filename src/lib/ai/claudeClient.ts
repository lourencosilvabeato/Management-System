import OpenAI from 'openai'

let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (openai) return openai

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required to generate estimates')
  }

  openai = new OpenAI({ apiKey })
  return openai
}

export async function generateEstimate(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
): Promise<string> {
  const response = await getOpenAI().chat.completions.create(
    {
      model: 'gpt-4o-mini',
      max_tokens: 8192,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    },
    { signal: AbortSignal.timeout(60000) },
  )
  return response.choices[0]?.message?.content ?? ''
}
