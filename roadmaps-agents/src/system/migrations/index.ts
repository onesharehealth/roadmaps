import { migration as initial } from './001-initial'

export const systemMigrations = { 1: initial }
export const SYSTEM_SCHEMA_VERSION = 1
