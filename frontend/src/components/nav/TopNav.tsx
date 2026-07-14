'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { navItems } from '@/components/nav/nav-items'
import { cn } from '@/lib/utils'

export default function TopNav() {
  const router = useRouter()
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  async function handleLogout() {
    await logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex h-14 items-center px-4 gap-4 sm:px-6">
        {user && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation menu"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu />
          </Button>
        )}
        <Link href="/" className="font-semibold text-lg tracking-tight">
          AI Interview Simulator
        </Link>
        <div className="flex-1" />
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user.username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        )}
      </div>

      {user && (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
                    pathname?.startsWith(href) ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      )}
    </header>
  )
}
