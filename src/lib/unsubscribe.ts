import { createHmac, timingSafeEqual } from 'node:crypto'

function getSecret() {
  return process.env.UNSUBSCRIBE_SECRET || process.env.ADMIN_PASSWORD || 'trend-news-unsubscribe'
}

export function createUnsubscribeSignature(email: string) {
  return createHmac('sha256', getSecret()).update(email).digest('hex')
}

export function verifyUnsubscribeSignature(email: string, signature: string) {
  const expected = createUnsubscribeSignature(email)
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)

  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
