'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ResumeUploadZone } from '@/components/resumes/ResumeUploadZone'
import { ResumeCard } from '@/components/resumes/ResumeCard'
import { CardGridSkeleton } from '@/components/skeletons/CardGridSkeleton'
import { useResumes } from '@/hooks/resumes/useResumes'
import { useDeleteResume } from '@/hooks/resumes/useDeleteResume'

const PAGE_SIZE = 12

export default function ResumesPage() {
  const [offset, setOffset] = useState(0)
  const { data, isLoading, isError } = useResumes({ limit: PAGE_SIZE, offset })
  const deleteMutation = useDeleteResume()

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Resume deleted'),
      onError: () => toast.error('Failed to delete resume'),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a resume to get AI-powered analysis and feedback.
        </p>
      </div>

      <ResumeUploadZone />

      {isLoading && <CardGridSkeleton count={PAGE_SIZE} />}
      {isError && <p className="text-destructive">Failed to load resumes.</p>}

      {data && data.items.length === 0 && (
        <p className="text-muted-foreground">You haven&apos;t uploaded any resumes yet.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((resume) => (
            <ResumeCard key={resume.id} resume={resume} onDelete={handleDelete} />
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
    </div>
  )
}
