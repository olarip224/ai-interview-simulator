'use client'

import Link from 'next/link'
import TopNav from '@/components/nav/TopNav'
import Sidebar from '@/components/nav/Sidebar'
import { useAuthStore } from '@/store/auth'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user?.username ?? 'there'}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your AI-powered interview practice dashboard.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/resumes" className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted">
              <h2 className="font-semibold">Resumes</h2>
              <p className="mt-1 text-sm text-muted-foreground">Upload and analyze your resume with AI feedback.</p>
            </Link>
            <Link href="/interviews" className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted">
              <h2 className="font-semibold">Interview Sessions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Practice with AI-generated behavioral and technical questions.</p>
            </Link>
            <Link href="/challenges" className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted">
              <h2 className="font-semibold">Coding Challenges</h2>
              <p className="mt-1 text-sm text-muted-foreground">Solve problems and receive instant AI evaluation.</p>
            </Link>
            <Link href="/analytics" className="rounded-lg border bg-card p-6 transition-colors hover:bg-muted">
              <h2 className="font-semibold">Analytics</h2>
              <p className="mt-1 text-sm text-muted-foreground">Track your progress and identify weak topics over time.</p>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
