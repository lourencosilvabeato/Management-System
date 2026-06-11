export function lexicalToText(richText: unknown): string {
  if (!richText || typeof richText !== 'object') return ''
  const root = (richText as Record<string, unknown>).root
  if (!root || typeof root !== 'object') return ''

  function extractText(node: unknown): string {
    if (!node || typeof node !== 'object') return ''
    const n = node as Record<string, unknown>
    if (n.type === 'text') return String(n.text ?? '')
    if (Array.isArray(n.children)) {
      const childTexts = (n.children as unknown[]).map(extractText).filter(Boolean)
      const sep = n.type === 'paragraph' ? '\n' : ' '
      return childTexts.join(sep)
    }
    return ''
  }

  return extractText(root).trim()
}

export function textToLexical(text: string): object {
  const lines = text ? text.split('\n') : ['']
  const paragraphs = lines.map((line) => ({
    children: line
      ? [{ detail: 0, format: 0, mode: 'normal', style: '', text: line, type: 'text', version: 1 }]
      : [],
    direction: line ? ('ltr' as const) : (null as null),
    format: '' as const,
    indent: 0,
    type: 'paragraph',
    version: 1,
  }))

  return {
    root: {
      children: paragraphs,
      direction: paragraphs.some((p) => p.direction === 'ltr') ? 'ltr' : null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

export const EMPTY_LEXICAL = textToLexical('')
