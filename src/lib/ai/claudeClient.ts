import OpenAI from 'openai'
import { ESTIMATE_SYSTEM_PROMPT } from './prompts/estimateSystem'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateEstimate(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const response = await openai.chat.completions.create(
    {
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        { role: 'system', content: ESTIMATE_SYSTEM_PROMPT },
        ...messages,
      ],
    },
    { signal: AbortSignal.timeout(60000) },
  )
  return response.choices[0]?.message?.content ?? ''
}
