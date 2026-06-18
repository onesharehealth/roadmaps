export class EnvVarError extends Error {
  constructor(varName: string) {
    super(`Missing required environment variable: ${varName}`)
    this.name = 'EnvVarError'
  }
}

export const requireEnvVar = (name: string, env: Record<string, string>) => {
  if (!(name in env)) throw new EnvVarError(name)
  return env[name]
}

export function requireEnvVars<T extends readonly string[]>(
  arr: T,
  env: Record<string, string>,
): { [P in T[number]]: string } {
  return arr.reduce(
    (acc, name) => {
      acc[name as T[number]] = String(requireEnvVar(name, env))
      return acc
    },
    {} as { [P in T[number]]: string },
  )
}

export function getCloudflareEnv(context: { env: Record<string, string> }) {
  return context.env
}

export function checkForCloudflareEnvVars(
  requiredObject: Record<string, string>,
  context: { env: Record<string, string> },
) {
  requireEnvVars(Object.keys(requiredObject) as (keyof typeof requiredObject)[], context.env)
}
