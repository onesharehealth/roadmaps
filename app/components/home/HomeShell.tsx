import { type ReactNode, useState } from 'react'
import { MenuIcon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { HomeSidebarNav } from './HomeSidebarNav'

type HomeShellProps = {
  contextKey: string
  teamId: string | null
  teams: Array<{ id: string; name: string; sessionCount: number }>
  draftCount: number
  sharedCount: number
  userEmail: string
  userRole: string
  contextLabel: string
  onSelectDrafts: () => void
  onSelectShared: () => void
  onSelectTeam: (teamId: string) => void
  children: ReactNode
}

export function HomeShell({
  contextKey,
  teamId,
  teams,
  draftCount,
  sharedCount,
  userEmail,
  userRole,
  contextLabel,
  onSelectDrafts,
  onSelectShared,
  onSelectTeam,
  children,
}: HomeShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  function closeMobileNav() {
    setMobileNavOpen(false)
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="sidebar hidden md:block">
        <HomeSidebarNav
          contextKey={contextKey}
          teamId={teamId}
          teams={teams}
          draftCount={draftCount}
          sharedCount={sharedCount}
          userEmail={userEmail}
          userRole={userRole}
          onSelectDrafts={onSelectDrafts}
          onSelectShared={onSelectShared}
          onSelectTeam={onSelectTeam}
        />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="border-border bg-card sticky top-0 z-40 flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <MenuIcon />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="text-primary truncate text-sm font-semibold">Roadmaps</p>
            <p className="text-muted-foreground truncate text-xs">{contextLabel}</p>
          </div>
        </header>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[min(100%,240px)] p-4 sm:max-w-[240px]">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Switch between drafts, shared sessions, and teams.</SheetDescription>
            </SheetHeader>

            <HomeSidebarNav
              contextKey={contextKey}
              teamId={teamId}
              teams={teams}
              draftCount={draftCount}
              sharedCount={sharedCount}
              userEmail={userEmail}
              userRole={userRole}
              onNavigate={closeMobileNav}
              onSelectDrafts={onSelectDrafts}
              onSelectShared={onSelectShared}
              onSelectTeam={onSelectTeam}
            />
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
