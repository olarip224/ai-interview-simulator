'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AttemptCard } from '@/components/challenges/AttemptCard'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { useAttempts } from '@/hooks/challenges/useAttempts'

const PAGE_SIZE = 12

function MyAttemptsList() {
  const searchParams = useSearchParams()
  const challengeId = searchParams.get('challenge_id') ?? undefined
  const [offset, setOffset] = useState(0)

  const { data, isLoading, isError } = useAttempts({ limit: PAGE_SIZE, offset, challenge_id: challengeId })

  return (
    <>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Attempts</h1>
        <p className="mt-2 text-muted-foreground">
          {challengeId ? 'Attempts for this challenge.' : 'All your coding challenge attempts.'}
        </p>
      </div>

      {isLoading && <CardGridSkeleton count={PAGE_SIZE} />}
      {isError && <p className="text-destructive">Failed to load attempts.</p>}

      {data && data.items.length === 0 && (
        <p className="text-muted-foreground">You haven&apos;t submitted any attempts yet.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((attempt) => (
            <AttemptCard key={attempt.id} attempt={attempt} />
          ))}
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {offset + 1}-{Math.min(offset + PAGE_SIZE, data.total)} of {data.total}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={offset + PAGE_SIZE >= data.total}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
    </>
  )
}

export default function MyAttemptsPage() {
  return (
    <div className="space-y-6">
      <Suspense>
        <MyAttemptsList />
      </Suspense>
    </div>
  )
}
