import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { ResumeStatusBadge } from '@/components/resumes/ResumeStatusBadge'
import { ResumeDeleteDialog } from '@/components/resumes/ResumeDeleteDialog'
import type { Resume } from '@/types/resume'

interface ResumeCardProps {
  resume: Resume
  onDelete: (id: string) => void
}

export function ResumeCard({ resume, onDelete }: ResumeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{resume.filename}</CardTitle>
        <CardDescription>{new Date(resume.created_at).toLocaleDateString()}</CardDescription>
        <CardAction>
          <ResumeDeleteDialog
            filename={resume.filename}
            onConfirm={() => onDelete(resume.id)}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Delete resume">
                <Trash2 />
              </Button>
            }
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <ResumeStatusBadge isAnalyzed={resume.is_analyzed} createdAt={resume.created_at} />
        <Link href={`/resumes/${resume.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          View
        </Link>
      </CardContent>
    </Card>
  )
}
