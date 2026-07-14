import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { navItems } from '@/components/nav/nav-items'

vi.mock('next/navigation', () => ({
  usePathname: () => '/resumes',
}))

const { default: Sidebar } = await import('@/components/nav/Sidebar')

describe('Sidebar', () => {
  it('renders every shared nav item as a link', () => {
    render(<Sidebar />)
    for (const item of navItems) {
      expect(screen.getByRole('link', { name: item.label })).toHaveAttribute('href', item.href)
    }
  })

  it('marks the link matching the current path as active', () => {
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: 'Resumes' })).toHaveClass('bg-muted')
  })
})
