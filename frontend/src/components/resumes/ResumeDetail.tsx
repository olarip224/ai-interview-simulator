import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isResumeStalled } from '@/components/resumes/stall'
import type { ResumeDetail as ResumeDetailType } from '@/types/resume'

interface ResumeDetailProps {
  detail: ResumeDetailType
  onRetry: () => void
  isRetrying?: boolean
  now?: Date
}

export function ResumeDetail({ detail, onRetry, isRetrying = false, now = new Date() }: ResumeDetailProps) {
  if (!detail.parsed_data) {
    const isStalled = isResumeStalled(detail.created_at, now)

    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
          <Loader2 className="animate-spin" />
          {isStalled ? (
            <>
              <p>Taking longer than expected to analyze this resume.</p>
              <Button onClick={onRetry} disabled={isRetrying}>
                Retry analysis
              </Button>
            </>
          ) : (
            <p>Still analyzing this resume — this can take a moment.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const { skills, experience, education, summary } = detail.parsed_data

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{summary}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary">
              {skill}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {experience.map((job, i) => (
            <div key={i}>
              <p className="font-medium">{job.title}</p>
              <p className="text-sm text-muted-foreground">
                {job.company} · {job.duration}
              </p>
              <p className="mt-1 text-sm">{job.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {education.map((entry, i) => (
            <div key={i}>
              <p className="font-medium">{entry.degree}</p>
              <p className="text-sm text-muted-foreground">
                {entry.institution} · {entry.year}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
