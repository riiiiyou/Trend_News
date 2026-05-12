// src/lib/email-template.ts
// Pure string manipulation — no Node.js imports, safe for client components

export function buildNewsletterHtml(params: {
  teamName: string
  title: string
  content: string
  newsletterId: number
  pdfPath: string | null
  siteUrl: string
  unsubscribeUrl?: string
}): string {
  const { teamName, title, content, newsletterId, pdfPath, siteUrl, unsubscribeUrl } = params
  const webUrl = `${siteUrl}/newsletter/${newsletterId}`
  const pdfLink = pdfPath ? (pdfPath.startsWith('http') ? pdfPath : `${siteUrl}${pdfPath}`) : null

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #FAFAF9; margin: 0; padding: 0; }
    .wrapper { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
    .header { background: #5B5BD6; padding: 28px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 14px; font-weight: 600; opacity: 0.85; }
    .header h2 { color: #fff; margin: 8px 0 0; font-size: 22px; font-weight: 700; }
    .body { padding: 32px; color: #1A1A1A; line-height: 1.75; font-size: 15px; }
    .body p { margin: 0 0 16px; }
    .body a { color: #5B5BD6; text-decoration: underline; }
    .footer { background: #F4F4F3; padding: 20px 32px; font-size: 13px; color: #888; }
    .footer a { color: #5B5BD6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${teamName}</h1>
      <h2>${title}</h2>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>
        <a href="${webUrl}">🌐 웹에서 보기</a>
        ${pdfLink ? `&nbsp;·&nbsp;<a href="${pdfLink}">📄 PDF 원본 다운로드</a>` : ''}
      </p>
      <p>이 메일은 팀 뉴스레터 구독자에게 발송되었습니다.</p>
      ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}">수신 거부(구독 취소)</a></p>` : ''}
    </div>
  </div>
</body>
</html>`
}
