import { analyzeImagesVision } from './openaiClient'

export async function analyzeImages(imageUrls: string[]): Promise<string> {
  if (imageUrls.length === 0) return ''

  try {
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

    return await analyzeImagesVision(base64Images)
  } catch (err) {
    console.error('[analyzeImages] GPT-4o Vision failed:', err)
    return ''
  }
}
