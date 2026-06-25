'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'

export default function TopNav() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  async function handleLogout() {
    await logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex h-14 items-center px-6 gap-4">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          AI Interview Simulator
        </Link>
        <div className="flex-1" />
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user.username}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
