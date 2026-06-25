'use client'

export default function Sidebar() {
  return (
    <aside className="w-56 border-r bg-background min-h-full flex-shrink-0">
      <nav className="flex flex-col gap-1 p-4">
        {/* Nav items added per milestone (F2–F5) */}
        <div className="h-8 rounded-md bg-muted animate-pulse" />
        <div className="h-8 rounded-md bg-muted animate-pulse" />
        <div className="h-8 rounded-md bg-muted animate-pulse" />
        <div className="h-8 rounded-md bg-muted animate-pulse" />
      </nav>
    </aside>
  )
}
