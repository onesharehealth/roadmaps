import { createContext } from 'react-router'

import type { SessionUser } from '../auth/session.server'

export const userContext = createContext<SessionUser>()
