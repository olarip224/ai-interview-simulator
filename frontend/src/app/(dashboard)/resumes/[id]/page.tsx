'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ResumeDetail } from '@/components/resumes/ResumeDetail'
import { ResumeStatusBadge } from '@/components/resumes/ResumeStatusBadge'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'
import { useResume } from '@/hooks/resumes/useResume'
import { useReanalyzeResume } from '@/hooks/resumes/useReanalyzeResume'

export default function ResumeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: detail, isLoading, isError } = useResume(id)
  const reanalyzeMutation = useReanalyzeResume()

  const handleRetry = () => {
    reanalyzeMutation.mutate(id, {
      onError: () => toast.error('Analysis failed again — please try later'),
    })
  }

  return (
    <div className="space-y-6">
      <Link href="/resumes" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to resumes
      </Link>

      {isLoading && <DetailSkeleton blockHeights={['h-24', 'h-32', 'h-40', 'h-24']} />}
      {isError && <p className="text-destructive">Failed to load this resume.</p>}

      {detail && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">{detail.filename}</h1>
            <ResumeStatusBadge isAnalyzed={Boolean(detail.parsed_data)} createdAt={detail.created_at} />
          </div>

          <ResumeDetail
            detail={detail}
            onRetry={handleRetry}
            isRetrying={reanalyzeMutation.isPending}
          />
        </>
      )}
    </div>
  )
}
