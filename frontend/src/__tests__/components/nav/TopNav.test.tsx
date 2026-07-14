import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { navItems } from '@/components/nav/nav-items'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/resumes',
}))

const mockUseAuthStore = vi.fn()
vi.mock('@/store/auth', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) => selector(mockUseAuthStore()),
}))

const { default: TopNav } = await import('@/components/nav/TopNav')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TopNav mobile menu', () => {
  it('does not show the menu button when logged out', () => {
    mockUseAuthStore.mockReturnValue({ user: null, logout: vi.fn() })
    render(<TopNav />)
    expect(screen.queryByRole('button', { name: /open navigation menu/i })).not.toBeInTheDocument()
  })

  it('opens a drawer containing every nav link when the menu button is clicked', async () => {
    const user = userEvent.setup()
    mockUseAuthStore.mockReturnValue({ user: { username: 'jane' }, logout: vi.fn() })

    render(<TopNav />)
    await user.click(screen.getByRole('button', { name: /open navigation menu/i }))

    for (const item of navItems) {
      expect(await screen.findByRole('link', { name: item.label })).toHaveAttribute('href', item.href)
    }
  })
})
