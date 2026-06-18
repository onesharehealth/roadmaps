import { describe, expect, it } from 'vitest'

import { getPasswordChecks, passwordsMatch, validatePassword } from './password'

const validPassword = 'Abcd1234!'

describe('getPasswordChecks', () => {
  it('marks all rules unmet for empty password', () => {
    const checks = getPasswordChecks('')
    expect(checks.every((check) => !check.met)).toBe(true)
  })

  it('marks all rules met for a valid password', () => {
    const checks = getPasswordChecks(validPassword)
    expect(checks.every((check) => check.met)).toBe(true)
  })

  it('detects missing uppercase', () => {
    const checks = getPasswordChecks('abcd1234!')
    expect(checks.find((check) => check.id === 'uppercase')?.met).toBe(false)
  })

  it('detects missing special character', () => {
    const checks = getPasswordChecks('Abcd1234')
    expect(checks.find((check) => check.id === 'special')?.met).toBe(false)
  })
})

describe('passwordsMatch', () => {
  it('returns true when values match', () => {
    expect(passwordsMatch(validPassword, validPassword)).toBe(true)
  })

  it('returns false when values differ', () => {
    expect(passwordsMatch(validPassword, 'other')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('accepts a valid password without confirm', () => {
    expect(validatePassword({ password: validPassword })).toEqual({ ok: true })
  })

  it('accepts matching password and confirm', () => {
    expect(validatePassword({ password: validPassword, confirm: validPassword })).toEqual({
      ok: true,
    })
  })

  it('rejects short passwords with the min length message', () => {
    expect(validatePassword({ password: 'Ab1!' })).toEqual({
      ok: false,
      error: 'At least 8 characters',
    })
  })

  it('rejects mismatched confirm values', () => {
    expect(validatePassword({ password: validPassword, confirm: 'Abcd1234?' })).toEqual({
      ok: false,
      error: 'Passwords do not match',
    })
  })
})
