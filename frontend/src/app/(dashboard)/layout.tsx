import type { ReactNode } from 'react'
import TopNav from '@/components/nav/TopNav'
import Sidebar from '@/components/nav/Sidebar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main id="main-content" className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
