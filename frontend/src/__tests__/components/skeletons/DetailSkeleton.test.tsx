import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DetailSkeleton } from '@/components/skeletons/DetailSkeleton'

describe('DetailSkeleton', () => {
  it('renders the default three blocks plus the title bar', () => {
    render(<DetailSkeleton />)
    const skeleton = screen.getByTestId('detail-skeleton')
    expect(skeleton.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(5)
  })

  it('renders one block per given height', () => {
    render(<DetailSkeleton blockHeights={['h-24', 'h-40']} />)
    const skeleton = screen.getByTestId('detail-skeleton')
    // 2 title-bar skeletons (heading + badge) + 2 content blocks
    expect(skeleton.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4)
  })
})
