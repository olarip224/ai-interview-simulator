import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageTabs } from '@/components/challenges/LanguageTabs'

describe('LanguageTabs', () => {
  it('renders all four language options', () => {
    render(<LanguageTabs value="python" onValueChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'Python' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'JavaScript' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'TypeScript' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Go' })).toBeInTheDocument()
  })

  it('calls onValueChange with the selected language', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(<LanguageTabs value="python" onValueChange={onValueChange} />)
    await user.click(screen.getByRole('tab', { name: 'Go' }))

    expect(onValueChange).toHaveBeenCalledWith('go')
  })
})
