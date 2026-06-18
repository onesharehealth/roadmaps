import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { Toaster } from 'sonner'

import { IdleProvider } from '~/components/session/IdleProvider'
import { TooltipProvider } from '~/components/ui/tooltip'
import type { Route } from './+types/root'

import './app.css'

export const meta: Route.MetaFunction = () => [
  { title: 'Roadmaps' },
  {
    name: 'viewport',
    content: 'width=device-width, initial-scale=1, shrink-to-fit=no',
  },
]

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <Meta />
        <Links />
      </head>
      <body>
        <IdleProvider>
          <TooltipProvider>
            <Outlet />
          </TooltipProvider>
        </IdleProvider>
        <Toaster
          richColors
          position="top-right"
        />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
