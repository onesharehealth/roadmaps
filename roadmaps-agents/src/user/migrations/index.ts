import { migration as initial } from './001-initial'

export const userMigrations = { 1: initial }
export const USER_SCHEMA_VERSION = 1
