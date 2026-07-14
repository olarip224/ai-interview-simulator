import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvaluationResultCard } from '@/components/challenges/EvaluationResultCard'

describe('EvaluationResultCard', () => {
  it('renders scores, correctness badge, feedback text, and strengths/weaknesses/suggestions', () => {
    render(
      <EvaluationResultCard
        overall_score={8.456}
        correctness_score={9}
        efficiency_score={7}
        style_score={8}
        is_correct
        feedback_text="Solid solution overall."
        strengths={['Clear variable names']}
        weaknesses={['Could handle edge cases better']}
        suggestions={['Add a null check']}
      />
    )

    expect(screen.getByText('8.5')).toBeInTheDocument()
    expect(screen.getByText('Correct')).toBeInTheDocument()
    expect(screen.getByText('Correctness: 9.0')).toBeInTheDocument()
    expect(screen.getByText('Efficiency: 7.0')).toBeInTheDocument()
    expect(screen.getByText('Style: 8.0')).toBeInTheDocument()
    expect(screen.getByText('Solid solution overall.')).toBeInTheDocument()
    expect(screen.getByText('Clear variable names')).toBeInTheDocument()
    expect(screen.getByText('Could handle edge cases better')).toBeInTheDocument()
    expect(screen.getByText('Add a null check')).toBeInTheDocument()
  })

  it('shows "Incorrect" and omits null sub-scores', () => {
    render(
      <EvaluationResultCard
        overall_score={5}
        correctness_score={null}
        efficiency_score={null}
        style_score={null}
        is_correct={false}
        feedback_text={null}
        strengths={[]}
        weaknesses={[]}
        suggestions={[]}
      />
    )

    expect(screen.getByText('Incorrect')).toBeInTheDocument()
    expect(screen.queryByText(/correctness:/i)).not.toBeInTheDocument()
  })
})
