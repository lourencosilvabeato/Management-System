import { analyzeImagesVision } from './ai/openaiClient'

export interface FigmaAnalysis {
  imageDescription: string
  textAnnotations: string
}

function extractFileKey(figmaUrl: string): string | null {
  // Handles: https://www.figma.com/file/{key}/... and https://www.figma.com/design/{key}/...
  const match = figmaUrl.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  characters?: string
}

function collectTextNodes(node: FigmaNode, results: string[]): void {
  if (node.type === 'TEXT' && node.characters) {
    results.push(node.characters.trim())
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectTextNodes(child, results)
    }
  }
}

function getTopLevelFrameIds(document: FigmaNode): string[] {
  const ids: string[] = []
  if (!Array.isArray(document.children)) return ids
  for (const page of document.children) {
    if (!Array.isArray(page.children)) continue
    for (const frame of page.children) {
      if (frame.type === 'FRAME' || frame.type === 'COMPONENT' || frame.type === 'GROUP') {
        ids.push(frame.id)
      }
    }
  }
  // Limit to first 6 frames to avoid excessive API calls
  return ids.slice(0, 6)
}

async function fetchFigmaFile(fileKey: string, token: string): Promise<FigmaNode | null> {
  const res = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
    headers: { 'X-Figma-Token': token },
  })
  if (!res.ok) {
    console.warn(`[figma] Failed to fetch file ${fileKey}: ${res.status} ${res.statusText}`)
    return null
  }
  const json = (await res.json()) as { document?: FigmaNode }
  return json.document ?? null
}

async function fetchFrameImages(fileKey: string, frameIds: string[], token: string): Promise<string[]> {
  if (frameIds.length === 0) return []
  const idsParam = frameIds.map(encodeURIComponent).join(',')
  const res = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&format=png&scale=1`,
    { headers: { 'X-Figma-Token': token } },
  )
  if (!res.ok) {
    console.warn(`[figma] Failed to fetch frame images: ${res.status}`)
    return []
  }
  const json = (await res.json()) as { images?: Record<string, string> }
  return Object.values(json.images ?? {}).filter(Boolean)
}

async function downloadBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    return Buffer.from(buffer).toString('base64')
  } catch {
    return null
  }
}

export async function analyzeFigmaLink(figmaUrl: string): Promise<FigmaAnalysis> {
  const token = process.env.FIGMA_API_TOKEN
  if (!token) {
    console.warn('[figma] FIGMA_API_TOKEN not set — skipping Figma analysis')
    return { imageDescription: '', textAnnotations: '' }
  }

  const fileKey = extractFileKey(figmaUrl)
  if (!fileKey) {
    console.warn(`[figma] Could not extract file key from URL: ${figmaUrl}`)
    return { imageDescription: '', textAnnotations: '' }
  }

  try {
    const document = await fetchFigmaFile(fileKey, token)
    if (!document) return { imageDescription: '', textAnnotations: '' }

    // Extract all text annotations
    const texts: string[] = []
    collectTextNodes(document, texts)
    const textAnnotations = texts.filter((t) => t.length > 0).join('\n')

    // Export top-level frames as PNG and describe with GPT-4o Vision
    const frameIds = getTopLevelFrameIds(document)
    const imageUrls = await fetchFrameImages(fileKey, frameIds, token)

    const base64Images: string[] = []
    for (const url of imageUrls) {
      const b64 = await downloadBase64(url)
      if (b64) base64Images.push(b64)
    }

    let imageDescription = ''
    if (base64Images.length > 0) {
      try {
        imageDescription = await analyzeImagesVision(base64Images)
      } catch (err) {
        console.warn('[figma] Vision analysis failed:', err)
      }
    }

    return { imageDescription, textAnnotations }
  } catch (err) {
    console.error('[figma] Error analyzing Figma file:', err)
    return { imageDescription: '', textAnnotations: '' }
  }
}
