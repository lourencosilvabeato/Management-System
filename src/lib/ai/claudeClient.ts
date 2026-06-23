import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateEstimate(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemPrompt: string,
): Promise<string> {
  const response = await openai.chat.completions.create(
    {
      model: 'gpt-4o-mini',
      max_tokens: 8192,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
    },
    { signal: AbortSignal.timeout(90000) },
  )
  return response.choices[0]?.message?.content ?? ''
}
