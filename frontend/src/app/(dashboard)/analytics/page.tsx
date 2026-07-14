'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { SummaryStatsCards } from '@/components/analytics/SummaryStatsCards'
import { TypeBreakdownTable } from '@/components/analytics/TypeBreakdownTable'
import { ProgressChart } from '@/components/analytics/ProgressChart'
import { WeakTopicsList } from '@/components/analytics/WeakTopicsList'
import { StatCardsSkeleton } from '@/components/skeletons/StatCardsSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { useSummary } from '@/hooks/analytics/useSummary'
import { useProgress } from '@/hooks/analytics/useProgress'
import { useWeakTopics } from '@/hooks/analytics/useWeakTopics'

export default function AnalyticsPage() {
  const { data: summary, isLoading: isSummaryLoading, isError: isSummaryError } = useSummary()
  const { data: progress, isLoading: isProgressLoading, isError: isProgressError } = useProgress()
  const { data: weakTopics, isLoading: isWeakTopicsLoading, isError: isWeakTopicsError } = useWeakTopics()

  const isLoading = isSummaryLoading || isProgressLoading || isWeakTopicsLoading
  const isError = isSummaryError || isProgressError || isWeakTopicsError
  const isEmpty = summary?.total_sessions === 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-2 text-muted-foreground">Your interview progress over time.</p>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <StatCardsSkeleton />
          <Skeleton className="h-72 w-full" />
        </div>
      )}
      {isError && <p className="text-destructive">Failed to load analytics.</p>}

      {!isLoading && !isError && isEmpty && (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Complete an interview session to start seeing your progress here.
          </p>
          <Link href="/interviews" className={buttonVariants()}>
            Start an interview
          </Link>
        </div>
      )}

      {!isLoading && !isError && summary && !isEmpty && (
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
    </div>
  )
}
