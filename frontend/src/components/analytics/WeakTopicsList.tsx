import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import type { WeakTopicItem } from '@/types/analytics'

export const MAX_DISPLAYED_TOPICS = 10

interface WeakTopicsListProps {
  topics: WeakTopicItem[]
}

export function WeakTopicsList({ topics }: WeakTopicsListProps) {
  const displayed = topics.slice(0, MAX_DISPLAYED_TOPICS)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weak topics</CardTitle>
        <CardDescription>Mentioned most often in your interview feedback.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring weak topics yet.</p>
        ) : (
          <ul className="space-y-2">
            {displayed.map((item) => (
              <li key={item.topic} className="flex items-center justify-between gap-4">
                <span className="text-sm">{item.topic}</span>
                <Badge variant="secondary">{item.count}</Badge>
              </li>
            ))}
          </ul>
        )}
        <Link href="/interviews" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Practice an interview
        </Link>
      </CardContent>
    </Card>
  )
}
