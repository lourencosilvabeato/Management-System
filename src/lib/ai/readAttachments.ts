import type { Media } from '../../payload-types'
import { analyzeImagesVision } from './openaiClient'

export interface AttachmentContent {
  texts: string[]
  base64Images: string[]
}

function isImageMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('image/')
}

function isPdfMime(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false
  return mimeType === 'application/pdf'
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: Buffer.from(buffer) })
    const result = await parser.getText()
    return result.text?.trim() ?? ''
  } catch (err) {
    console.warn('[readAttachments] Failed to extract PDF text:', err)
    return ''
  }
}

export async function readAttachments(
  ficheirosAnexos: (number | Media)[] | null | undefined,
): Promise<AttachmentContent> {
  const result: AttachmentContent = { texts: [], base64Images: [] }

  if (!Array.isArray(ficheirosAnexos) || ficheirosAnexos.length === 0) return result

  for (const file of ficheirosAnexos) {
    if (typeof file === 'number') continue
    const media = file as Media
    if (!media.url) continue

    try {
      const res = await fetch(media.url)
      if (!res.ok) {
        console.warn(`[readAttachments] Failed to fetch: ${media.url}`)
        continue
      }
      const buffer = await res.arrayBuffer()

      if (isPdfMime(media.mimeType)) {
        const text = await extractPdfText(buffer)
        if (text.length > 0) result.texts.push(`[PDF: ${media.filename ?? 'document'}]\n${text}`)
      } else if (isImageMime(media.mimeType)) {
        const base64 = Buffer.from(buffer).toString('base64')
        result.base64Images.push(base64)
      }
    } catch (err) {
      console.warn(`[readAttachments] Error processing ${media.url}:`, err)
    }
  }

  return result
}

export async function describeAttachments(
  ficheirosAnexos: (number | Media)[] | null | undefined,
): Promise<{ textContent: string; imageDescription: string }> {
  const content = await readAttachments(ficheirosAnexos)

  const textContent = content.texts.join('\n\n')

  let imageDescription = ''
  if (content.base64Images.length > 0) {
    try {
      imageDescription = await analyzeImagesVision(content.base64Images)
    } catch (err) {
      console.warn('[readAttachments] Vision analysis of attachments failed:', err)
    }
  }

  return { textContent, imageDescription }
}
