'use client'

import { useState, type ReactElement } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface EndInterviewDialogProps {
  onConfirm: () => void
  trigger: ReactElement
  hasUnansweredQuestion?: boolean
}

export function EndInterviewDialog({ onConfirm, trigger, hasUnansweredQuestion = false }: EndInterviewDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>End interview?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasUnansweredQuestion
              ? "The current question is still unanswered and will be left without an answer. Your overall score only reflects questions you've already answered."
              : 'This marks the session as completed. You can still view the feedback summary afterward.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              setOpen(false)
              onConfirm()
            }}
          >
            End interview
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
