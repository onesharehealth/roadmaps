import { redirect } from 'react-router'

import type { Route } from './+types/teams'

export const loader = async () => {
  throw redirect('/')
}

export default function TeamsPage() {
  return null
}
