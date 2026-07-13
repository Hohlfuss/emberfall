export type ClanVisibility = 'public' | 'invite_only'

export const CLAN_NAME_MIN_LENGTH = 3
export const CLAN_NAME_MAX_LENGTH = 30
export const CLAN_DESCRIPTION_MAX_LENGTH = 160
export const CLAN_MESSAGE_MAX_LENGTH = 240

function oneLine(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function sanitizeClanName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Clan name is required.')
  const name = oneLine(value)
  if (name.length < CLAN_NAME_MIN_LENGTH || name.length > CLAN_NAME_MAX_LENGTH) {
    throw new Error(`Clan name must be ${CLAN_NAME_MIN_LENGTH}-${CLAN_NAME_MAX_LENGTH} characters long.`)
  }
  if (!/^[\p{L}\p{N} _'-]+$/u.test(name)) {
    throw new Error('Clan name may only contain letters, numbers, spaces, apostrophes, underscores, or hyphens.')
  }
  return name
}

export function sanitizeClanDescription(value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') throw new Error('Clan description is invalid.')
  const description = oneLine(value)
  if (description.length > CLAN_DESCRIPTION_MAX_LENGTH) {
    throw new Error(`Clan description cannot exceed ${CLAN_DESCRIPTION_MAX_LENGTH} characters.`)
  }
  return description
}

export function sanitizeClanVisibility(value: unknown): ClanVisibility {
  if (value !== 'public' && value !== 'invite_only') {
    throw new Error('Choose public or invite-only access.')
  }
  return value
}

export function sanitizePlayerIdentifier(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a player username.')
  const identifier = oneLine(value)
  if (identifier.length < 3 || identifier.length > 30) throw new Error('Enter a valid player username.')
  return identifier
}

export function sanitizeClanMessage(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a message.')
  const message = oneLine(value)
  if (!message || message.length > CLAN_MESSAGE_MAX_LENGTH) {
    throw new Error(`Messages must be between 1 and ${CLAN_MESSAGE_MAX_LENGTH} characters.`)
  }
  return message
}
