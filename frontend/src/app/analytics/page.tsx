'use client'

import Link from 'next/link'
import TopNav from '@/components/nav/TopNav'
import Sidebar from '@/components/nav/Sidebar'
import { buttonVariants } from '@/components/ui/button'
import { SummaryStatsCards } from '@/components/analytics/SummaryStatsCards'
import { TypeBreakdownTable } from '@/components/analytics/TypeBreakdownTable'
import { ProgressChart } from '@/components/analytics/ProgressChart'
import { WeakTopicsList } from '@/components/analytics/WeakTopicsList'
import { useSummary } from '@/hooks/analytics/useSummary'
import { useProgress } from '@/hooks/analytics/useProgress'
import { useWeakTopics } from '@/hooks/analytics/useWeakTopics'

export default function AnalyticsPage() {
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useSummary()
  const { data: progress, isLoading: isProgressLoading } = useProgress()
  const { data: weakTopics, isLoading: isWeakTopicsLoading } = useWeakTopics()

  const isLoading = isSummaryLoading || isProgressLoading || isWeakTopicsLoading
  const isEmpty = summary?.total_sessions === 0

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 space-y-6 p-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="mt-2 text-muted-foreground">Your interview progress over time.</p>
          </div>

          {isLoading && <p className="text-muted-foreground">Loading analytics…</p>}
          {isSummaryError && <p className="text-destructive">Failed to load analytics.</p>}

          {!isLoading && isEmpty && (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Complete an interview session to start seeing your progress here.
              </p>
              <Link href="/interviews" className={buttonVariants()}>
                Start an interview
              </Link>
            </div>
          )}

          {!isLoading && summary && !isEmpty && (
            <>
              <SummaryStatsCards summary={summary} />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                  <div className="rounded-lg border bg-card p-6">
                    <h2 className="mb-4 text-lg font-semibold">Score over time</h2>
                    <ProgressChart items={progress ?? []} />
                  </div>
                  <TypeBreakdownTable items={summary.by_interview_type} />
                </div>
                <WeakTopicsList topics={weakTopics ?? []} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
