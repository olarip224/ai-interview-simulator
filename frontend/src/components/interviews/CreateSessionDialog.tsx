'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateSession } from '@/hooks/interviews/useCreateSession'
import { useResumes } from '@/hooks/resumes/useResumes'
import { INTERVIEW_TYPE_LABELS, DIFFICULTY_LABELS } from '@/components/interviews/labels'
import type { Difficulty, InterviewType } from '@/types/interview'

const NO_RESUME_VALUE = 'none'
const INTERVIEW_TYPES = Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]
const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[]

export function CreateSessionDialog() {
  const [open, setOpen] = useState(false)
  const [interviewType, setInterviewType] = useState<InterviewType>('swe')
  const [difficulty, setDifficulty] = useState<Difficulty>('mid')
  const [resumeId, setResumeId] = useState<string>(NO_RESUME_VALUE)

  const router = useRouter()
  const createMutation = useCreateSession()
  const { data: resumesPage } = useResumes({ limit: 100 })

  const handleSubmit = () => {
    createMutation.mutate(
      {
        interview_type: interviewType,
        difficulty,
        resume_id: resumeId === NO_RESUME_VALUE ? null : resumeId,
      },
      {
        onSuccess: (session) => {
          setOpen(false)
          router.push(`/interviews/${session.id}`)
        },
        onError: () => toast.error('Failed to create session'),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New Session</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create interview session</DialogTitle>
          <DialogDescription>Choose a type and difficulty to start practicing.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={interviewType} onValueChange={(value) => setInterviewType(value as InterviewType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {INTERVIEW_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((level) => (
                  <SelectItem key={level} value={level}>
                    {DIFFICULTY_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Resume (optional)</Label>
            <Select value={resumeId} onValueChange={(value) => setResumeId(value ?? NO_RESUME_VALUE)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_RESUME_VALUE}>None</SelectItem>
                {resumesPage?.items.map((resume) => (
                  <SelectItem key={resume.id} value={resume.id}>
                    {resume.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
