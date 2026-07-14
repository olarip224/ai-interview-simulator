'use client'

import { useState } from 'react'
import Link from 'next/link'
import TopNav from '@/components/nav/TopNav'
import Sidebar from '@/components/nav/Sidebar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChallengeCard } from '@/components/challenges/ChallengeCard'
import { CHALLENGE_DIFFICULTY_LABELS } from '@/components/challenges/labels'
import { useChallenges } from '@/hooks/challenges/useChallenges'
import type { ChallengeDifficulty } from '@/types/challenge'

const PAGE_SIZE = 12
const ALL_DIFFICULTY_VALUE = 'all'
const DIFFICULTIES = Object.keys(CHALLENGE_DIFFICULTY_LABELS) as ChallengeDifficulty[]

export default function ChallengesPage() {
  const [offset, setOffset] = useState(0)
  const [difficulty, setDifficulty] = useState<string>(ALL_DIFFICULTY_VALUE)
  const [tag, setTag] = useState('')

  const { data, isLoading, isError } = useChallenges({
    limit: PAGE_SIZE,
    offset,
    difficulty: difficulty === ALL_DIFFICULTY_VALUE ? undefined : difficulty,
    tag: tag.trim() || undefined,
  })

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 space-y-6 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Coding Challenges</h1>
              <p className="mt-2 text-muted-foreground">Solve problems and receive instant AI evaluation.</p>
            </div>
            <Link href="/challenges/me/attempts" className={buttonVariants({ variant: 'outline' })}>
              My attempts
            </Link>
          </div>

          <div className="flex gap-3">
            <Select
              value={difficulty}
              onValueChange={(value) => {
                setDifficulty(value ?? ALL_DIFFICULTY_VALUE)
                setOffset(0)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DIFFICULTY_VALUE}>All difficulties</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>
                    {CHALLENGE_DIFFICULTY_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by tag…"
              value={tag}
              onChange={(e) => {
                setTag(e.target.value)
                setOffset(0)
              }}
              className="w-48"
            />
          </div>

          {isLoading && <p className="text-muted-foreground">Loading challenges…</p>}
          {isError && <p className="text-destructive">Failed to load challenges.</p>}

          {data && data.items.length === 0 && <p className="text-muted-foreground">No challenges match this filter.</p>}

          {data && data.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
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
        </main>
      </div>
    </div>
  )
}
