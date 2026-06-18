export type DataResult<T> = { ok: true; body: T } | { ok: false; errors: string[] }

export function dataSuccess<T>(body?: T): DataResult<T> {
  return { ok: true, body: body ?? (undefined as T) }
}

export function dataError(errors: string | string[] | object | object[]): DataResult<never> {
  const processedErrors = Array.isArray(errors)
    ? errors.map((e) => (typeof e === 'string' ? e : JSON.stringify(e)))
    : [typeof errors === 'string' ? errors : JSON.stringify(errors)]

  return { ok: false, errors: processedErrors }
}

export function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  if (typeof target !== 'object' || target === null) return source as T
  if (typeof source !== 'object' || source === null) return target

  const result = Array.isArray(target) ? [...(target as unknown[])] : { ...target }

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue
    const sourceValue = source[key]
    const targetValue = (target as Record<string, unknown>)[key]
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      ;(result as Record<string, unknown>)[key] = deepMerge(targetValue, sourceValue as Record<string, unknown>)
    } else {
      ;(result as Record<string, unknown>)[key] = sourceValue
    }
  }
  return result as T
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] ? DeepPartial<U>[] : T[P] extends object ? DeepPartial<T[P]> : T[P]
}
