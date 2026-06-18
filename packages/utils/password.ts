const ITERATIONS = 100_000

export type PasswordRequirementId = 'minLength' | 'uppercase' | 'lowercase' | 'number' | 'special'

export type PasswordRequirement = {
  id: PasswordRequirementId
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'minLength',
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'At least one uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'At least one lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'At least one number',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'At least one special character',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
]

export type PasswordCheck = PasswordRequirement & {
  met: boolean
}

export function getPasswordChecks(password: string): PasswordCheck[] {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }))
}

export function passwordsMatch(password: string, confirm: string) {
  return password === confirm
}

export function validatePassword({ password, confirm }: { password: string; confirm?: string }) {
  for (const requirement of PASSWORD_REQUIREMENTS) {
    if (!requirement.test(password)) {
      return { ok: false as const, error: requirement.label }
    }
  }

  if (confirm !== undefined && !passwordsMatch(password, confirm)) {
    return { ok: false as const, error: 'Passwords do not match' }
  }

  return { ok: true as const }
}

function toBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return `${toBase64(salt)}:${toBase64(new Uint8Array(bits))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':')
  if (!saltB64 || !hashB64) return false

  const salt = fromBase64(saltB64)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return toBase64(new Uint8Array(bits)) === hashB64
}
