import { analyzeImagesMock } from './openaiClient'

export async function analyzeImages(imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 0) return ''

  try {
    // Download images and convert to base64 (logic ready for real GPT-4o Vision)
    const base64Images: string[] = []
    for (const url of imageUrls) {
      try {
        const res = await fetch(url)
        if (!res.ok) {
          console.warn(`[analyzeImages] Failed to fetch image: ${url}`)
          continue
        }
        const buffer = await res.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        base64Images.push(base64)
      } catch (err) {
        console.warn(`[analyzeImages] Error downloading image ${url}:`, err)
      }
    }

    if (base64Images.length === 0) {
      console.warn('[analyzeImages] No images could be downloaded — skipping vision analysis')
      return ''
    }

    // TODO: when OPENAI_API_KEY is available, replace with real GPT-4o Vision call
    // passing base64Images to the OpenAI SDK
    return await analyzeImagesMock(imageUrls)
  } catch (err) {
    console.error('[analyzeImages] GPT-4o Vision failed completely:', err)
    return ''
  }
}
