import { z } from 'zod'

import { dataError, type DataResult, dataSuccess } from './data'

export function zParse<T>(schema: z.ZodType<T>, data: unknown): DataResult<T> {
  try {
    return dataSuccess(schema.parse(data))
  } catch (error) {
    if (error instanceof z.ZodError) {
      return dataError(error.issues.map((err) => {
        const path = err.path.join('.')
        return path ? `${path}: ${err.message}` : err.message
      }))
    }
    return dataError([error instanceof Error ? error.message : 'Unknown zod validation error'])
  }
}
