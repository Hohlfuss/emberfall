type GoogleTokenPayload = {
  sub?: string
  email?: string
  email_verified?: boolean
  name?: string
}

type GoogleLoginTicket = {
  getPayload(): GoogleTokenPayload | undefined
}

export type GoogleTokenVerifier = {
  verifyIdToken(options: { idToken: string; audience: string }): Promise<GoogleLoginTicket>
}

export type GoogleIdentity = {
  subject: string
  email: string
  name: string
}

export async function verifyGoogleCredential(
  credential: string,
  clientId: string,
  verifier: GoogleTokenVerifier,
): Promise<GoogleIdentity> {
  if (!credential || !clientId) throw new Error('Google login is not configured.')

  const ticket = await verifier.verifyIdToken({ idToken: credential, audience: clientId })
  const payload = ticket.getPayload()
  const subject = payload?.sub?.trim()
  const email = payload?.email?.trim().toLowerCase()

  if (!subject || !email || payload?.email_verified !== true) {
    throw new Error('Google account must have a verified email address.')
  }

  const fallbackName = email.split('@')[0] || 'Adventurer'
  const name = (payload?.name?.trim() || fallbackName).slice(0, 18)
  return { subject, email, name }
}

export function googleUsernameCandidates(email: string, subject: string): string[] {
  const localPart = email.split('@')[0]?.split('+')[0]?.toLowerCase() || ''
  const base = localPart
    .replace(/[^a-z0-9_.-]+/g, '')
    .replace(/^[_.-]+|[_.-]+$/g, '')
    .slice(0, 18)
  const suffixes = [subject.slice(-6), subject.slice(-12, -6)].filter(Boolean)
  if (base.length < 3) {
    const subjectChunks = [subject.slice(-6), subject.slice(0, 6)].filter(Boolean)
    return [...new Set(subjectChunks.map(chunk => `player-${chunk}`.slice(0, 18)))]
  }

  const root = base
  const candidates = [root]

  for (const suffix of suffixes) {
    const prefix = root.slice(0, Math.max(3, 17 - suffix.length)).replace(/-+$/g, '')
    candidates.push(`${prefix}-${suffix}`.slice(0, 18))
  }

  return [...new Set(candidates)]
}
