// src/lib/pptx-parser.ts
import JSZip from 'jszip'
import path from 'path'

export interface PptxParseResult {
  title: string
  content: string
  links: string[]
  thumbnailBuffer: Buffer | null
  thumbnailExt: string | null
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

function extractTextRuns(xml: string): string {
  const parts: string[] = []
  const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    parts.push(decodeXml(m[1]))
  }
  return parts.join('')
}

interface Paragraph {
  text: string
  level: number
  hasBullet: boolean
}

function parseParagraphs(txBodyXml: string): Paragraph[] {
  const result: Paragraph[] = []
  const paraRe = /<a:p(?:\s[^>]*)?>[\s\S]*?<\/a:p>/g
  let pm: RegExpExecArray | null

  while ((pm = paraRe.exec(txBodyXml)) !== null) {
    const paraXml = pm[0]
    const text = extractTextRuns(paraXml)
    if (!text.trim()) continue

    const lvlMatch = paraXml.match(/<a:pPr[^>]*\blvl="(\d+)"/)
    const level = lvlMatch ? parseInt(lvlMatch[1]) : 0

    // buNone = explicitly no bullet; buChar/buAutoNum/buFont = explicit bullet
    const noBullet = /<a:buNone\s*\/?>/.test(paraXml)
    const explicitBullet = /<a:buChar[\s/]|<a:buAutoNum[\s/]|<a:buFont[\s/]/.test(paraXml)
    const hasBullet = !noBullet && (explicitBullet || level > 0)

    result.push({ text, level, hasBullet })
  }

  return result
}

function isTitleShape(shapeXml: string): boolean {
  return /<p:ph[^>]*type="(?:title|ctrTitle)"/.test(shapeXml)
}

function shapeToHtml(shapeXml: string): string {
  // Extract txBody portion
  const txBodyMatch = shapeXml.match(/<p:txBody(?:\s[^>]*)?>[\s\S]*?<\/p:txBody>/)
  if (!txBodyMatch) return ''

  const paras = parseParagraphs(txBodyMatch[0])
  if (paras.length === 0) return ''

  if (isTitleShape(shapeXml)) {
    const text = paras.map((p) => p.text).join(' ')
    return `<h2>${text}</h2>`
  }

  return paras
    .map((p) => {
      if (p.hasBullet) {
        const indent = p.level > 0 ? ` style="margin-left:${p.level * 1.5}em"` : ''
        return `<li${indent}>${p.text}</li>`
      }
      return `<p>${p.text}</p>`
    })
    .join('\n')
}

function slideToHtml(slideXml: string): string {
  const parts: string[] = []
  const spRe = /<p:sp\b[\s\S]*?<\/p:sp>/g
  let sm: RegExpExecArray | null

  while ((sm = spRe.exec(slideXml)) !== null) {
    const html = shapeToHtml(sm[0])
    if (html) parts.push(html)
  }

  return parts.join('\n')
}

function extractSlideTitle(slideXml: string): string {
  const spRe = /<p:sp\b[\s\S]*?<\/p:sp>/g
  let sm: RegExpExecArray | null

  while ((sm = spRe.exec(slideXml)) !== null) {
    if (isTitleShape(sm[0])) {
      const txBodyMatch = sm[0].match(/<p:txBody(?:\s[^>]*)?>[\s\S]*?<\/p:txBody>/)
      if (txBodyMatch) {
        const paras = parseParagraphs(txBodyMatch[0])
        const text = paras.map((p) => p.text).join(' ').trim()
        if (text) return text
      }
    }
  }
  return ''
}

async function extractLinks(zip: JSZip, slideName: string): Promise<string[]> {
  const relPath =
    slideName.replace('ppt/slides/slide', 'ppt/slides/_rels/slide') + '.rels'
  const relFile = zip.files[relPath]
  if (!relFile) return []

  const relXml = await relFile.async('string')
  const links: string[] = []
  const re = /Type="[^"]*hyperlink[^"]*"\s+Target="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(relXml)) !== null) {
    if (m[1].startsWith('http')) links.push(m[1])
  }
  return links
}

export async function parsePptx(buffer: Buffer): Promise<PptxParseResult> {
  const zip = await JSZip.loadAsync(buffer)

  // Sort slides numerically
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] ?? '0')
      const nb = parseInt(b.match(/(\d+)/)?.[1] ?? '0')
      return na - nb
    })

  let newsletterTitle = ''
  const slideHtmlParts: string[] = []
  const linkSet = new Set<string>()

  for (let i = 0; i < slideFiles.length; i++) {
    const slideName = slideFiles[i]
    const slideXml = await zip.files[slideName].async('string')

    // First slide: extract title for the newsletter title field
    if (i === 0) {
      newsletterTitle = extractSlideTitle(slideXml) || '제목 없음'
    }

    const html = slideToHtml(slideXml)
    if (html) {
      // Separate slides with a divider (except first)
      if (i > 0 && slideHtmlParts.length > 0) {
        slideHtmlParts.push('<hr>')
      }
      slideHtmlParts.push(html)
    }

    const slideLinks = await extractLinks(zip, slideName)
    slideLinks.forEach((l) => linkSet.add(l))
  }

  // First image in ppt/media/ as thumbnail
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  let thumbnailBuffer: Buffer | null = null
  let thumbnailExt: string | null = null

  const mediaFiles = Object.keys(zip.files).filter((name) => {
    if (!name.startsWith('ppt/media/')) return false
    return imageExts.includes(path.extname(name).toLowerCase())
  })

  if (mediaFiles.length > 0) {
    const imgData = await zip.files[mediaFiles[0]].async('nodebuffer')
    thumbnailBuffer = Buffer.from(imgData)
    thumbnailExt = path.extname(mediaFiles[0]).toLowerCase()
  }

  return {
    title: newsletterTitle,
    content: slideHtmlParts.join('\n'),
    links: Array.from(linkSet),
    thumbnailBuffer,
    thumbnailExt,
  }
}
