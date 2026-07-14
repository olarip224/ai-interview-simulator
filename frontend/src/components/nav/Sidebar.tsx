'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/resumes', label: 'Resumes', icon: FileText },
  { href: '/interviews', label: 'Interview Sessions', icon: MessageSquare },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r bg-background min-h-full flex-shrink-0">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
              pathname?.startsWith(href) ? 'bg-muted text-foreground' : 'text-muted-foreground'
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
        {/* Remaining nav items added per milestone (F4–F5) */}
        <div className="h-8 rounded-md bg-muted animate-pulse" />
        <div className="h-8 rounded-md bg-muted animate-pulse" />
      </nav>
    </aside>
  )
}
