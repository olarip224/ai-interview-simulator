import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeakTopicsList, MAX_DISPLAYED_TOPICS } from '@/components/analytics/WeakTopicsList'
import type { WeakTopicItem } from '@/types/analytics'

describe('WeakTopicsList', () => {
  it('renders each topic with its count and a link to practice', () => {
    const topics: WeakTopicItem[] = [
      { topic: 'recursion', count: 5 },
      { topic: 'time complexity', count: 3 },
    ]

    render(<WeakTopicsList topics={topics} />)

    expect(screen.getByText('recursion')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('time complexity')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /practice an interview/i })).toHaveAttribute('href', '/interviews')
  })

  it('shows an empty message when there are no weak topics', () => {
    render(<WeakTopicsList topics={[]} />)
    expect(screen.getByText(/no recurring weak topics yet/i)).toBeInTheDocument()
  })

  it('caps the displayed list even though more topics are passed in', () => {
    const topics: WeakTopicItem[] = Array.from({ length: MAX_DISPLAYED_TOPICS + 5 }, (_, i) => ({
      topic: `topic-${i}`,
      count: 1,
    }))

    render(<WeakTopicsList topics={topics} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(MAX_DISPLAYED_TOPICS)
  })
})
