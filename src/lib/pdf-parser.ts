// src/lib/pdf-parser.ts
import pdfParse from 'pdf-parse'

export type ParsedPdf = {
  title: string
  content: string
  links: string[]
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  const data = await pdfParse(buffer)
  const rawText = data.text || ''

  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const title = lines[0] || '제목 없음'

  // Convert plain text to basic HTML paragraphs
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${block.replace(/\n/g, '<br />')}</p>`)
    .join('\n')

  const linkRegex = /https?:\/\/[^\s)>\]"']+/g
  const links = Array.from(new Set(rawText.match(linkRegex) || []))

  return { title, content: paragraphs, links }
}
