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

export async function parsePptx(buffer: Buffer): Promise<PptxParseResult> {
  const zip = await JSZip.loadAsync(buffer)

  // Find slide files and sort numerically
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] ?? '0')
      const numB = parseInt(b.match(/\d+/)?.[0] ?? '0')
      return numA - numB
    })

  const slideTexts: string[] = []
  const linkSet = new Set<string>()

  for (const slideName of slideFiles) {
    const xml = await zip.files[slideName].async('string')

    // Extract all text nodes
    const textParts: string[] = []
    const textRe = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g
    let m: RegExpExecArray | null
    while ((m = textRe.exec(xml)) !== null) {
      const text = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      if (text.trim()) textParts.push(text)
    }

    // Extract hyperlinks
    const linkRe = /r:id="([^"]+)"/g
    const relPath = slideName.replace('ppt/slides/slide', 'ppt/slides/_rels/slide') + '.rels'
    const relFile = zip.files[relPath]
    if (relFile) {
      const relXml = await relFile.async('string')
      const relRe = /Id="([^"]+)"\s+Type="[^"]*hyperlink[^"]*"\s+Target="([^"]+)"/g
      let rm: RegExpExecArray | null
      while ((rm = relRe.exec(relXml)) !== null) {
        const url = rm[2]
        if (url.startsWith('http')) linkSet.add(url)
      }
    }
    void linkRe

    if (textParts.length > 0) {
      slideTexts.push(textParts.join(' '))
    }
  }

  // First slide text becomes the title, rest becomes content
  const title = slideTexts[0] ?? '제목 없음'
  const contentHtml = slideTexts
    .slice(1)
    .map((t) => `<p>${t}</p>`)
    .join('\n')

  // Find first image in ppt/media/
  const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  let thumbnailBuffer: Buffer | null = null
  let thumbnailExt: string | null = null

  const mediaFiles = Object.keys(zip.files).filter((name) => {
    if (!name.startsWith('ppt/media/')) return false
    const ext = path.extname(name).toLowerCase()
    return imageExts.includes(ext)
  })

  if (mediaFiles.length > 0) {
    const imgData = await zip.files[mediaFiles[0]].async('nodebuffer')
    thumbnailBuffer = Buffer.from(imgData)
    thumbnailExt = path.extname(mediaFiles[0]).toLowerCase()
  }

  return {
    title,
    content: contentHtml,
    links: Array.from(linkSet),
    thumbnailBuffer,
    thumbnailExt,
  }
}
