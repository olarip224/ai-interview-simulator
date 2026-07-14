'use client'

import { useState } from 'react'
import TopNav from '@/components/nav/TopNav'
import Sidebar from '@/components/nav/Sidebar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreateSessionDialog } from '@/components/interviews/CreateSessionDialog'
import { SessionCard } from '@/components/interviews/SessionCard'
import { useSessions } from '@/hooks/interviews/useSessions'

const PAGE_SIZE = 12
const ALL_STATUS_VALUE = 'all'

export default function InterviewsPage() {
  const [offset, setOffset] = useState(0)
  const [status, setStatus] = useState<string>(ALL_STATUS_VALUE)
  const { data, isLoading, isError } = useSessions({
    limit: PAGE_SIZE,
    offset,
    status: status === ALL_STATUS_VALUE ? undefined : status,
  })

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 space-y-6 p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Interview Sessions</h1>
              <p className="mt-2 text-muted-foreground">
                Practice with AI-generated behavioral and technical questions.
              </p>
            </div>
            <CreateSessionDialog />
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value ?? ALL_STATUS_VALUE)
              setOffset(0)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
            </SelectContent>
          </Select>

          {isLoading && <p className="text-muted-foreground">Loading sessions…</p>}
          {isError && <p className="text-destructive">Failed to load sessions.</p>}

          {data && data.items.length === 0 && (
            <p className="text-muted-foreground">No interview sessions yet — create one to get started.</p>
          )}

          {data && data.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((session) => (
                <SessionCard key={session.id} session={session} />
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
