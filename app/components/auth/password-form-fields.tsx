import { useState } from 'react'
import { Form } from 'react-router'
import { validatePassword } from 'utils/password'

import { PasswordRequirementsList } from './password-requirements-list'

type PasswordFormFieldsProps = {
  actionError?: string | null
  submitLabel: string
  requireConfirm?: boolean
  hiddenFields?: Record<string, string>
}

export function PasswordFormFields({
  actionError,
  submitLabel,
  requireConfirm = true,
  hiddenFields,
}: PasswordFormFieldsProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const isValid = validatePassword({
    password,
    confirm: requireConfirm ? confirm : undefined,
  }).ok

  return (
    <Form method="post" className="grid gap-4">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

      <div className="grid gap-2">
        <input
          name="password"
          type="password"
          placeholder="New password"
          required
          autoComplete="new-password"
          className="field"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        <PasswordRequirementsList password={password} confirm={requireConfirm ? confirm : undefined} />
      </div>

      {requireConfirm && (
        <input
          name="confirm"
          type="password"
          placeholder="Confirm password"
          required
          autoComplete="new-password"
          className="field"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      )}

      {actionError && <p className="text-destructive text-sm">{actionError}</p>}

      <button type="submit" className="btn btn-primary" disabled={!isValid}>
        {submitLabel}
      </button>
    </Form>
  )
}
