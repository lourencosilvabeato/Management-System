import OpenAI from 'openai'
import { ESTIMATE_SYSTEM_PROMPT } from './prompts/estimateSystem'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateEstimate(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: ESTIMATE_SYSTEM_PROMPT },
      ...messages,
    ],
  })
  return response.choices[0]?.message?.content ?? ''
}
