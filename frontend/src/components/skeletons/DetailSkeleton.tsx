import { Skeleton } from '@/components/ui/skeleton'

interface DetailSkeletonProps {
  blockHeights?: string[]
}

const DEFAULT_BLOCK_HEIGHTS = ['h-32', 'h-48', 'h-24']

export function DetailSkeleton({ blockHeights = DEFAULT_BLOCK_HEIGHTS }: DetailSkeletonProps) {
  return (
    <div className="space-y-6" data-testid="detail-skeleton">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-20" />
      </div>
      {blockHeights.map((height, i) => (
        <Skeleton key={i} className={`w-full ${height}`} />
      ))}
    </div>
  )
}
