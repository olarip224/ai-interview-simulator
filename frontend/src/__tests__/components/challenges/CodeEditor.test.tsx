import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

interface MockEditorProps {
  value?: string
  language?: string
  onChange?: (value: string) => void
  options?: { readOnly?: boolean }
}

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, language, onChange, options }: MockEditorProps) => (
    <textarea
      data-testid="monaco-editor-mock"
      data-language={language}
      readOnly={options?.readOnly}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

const { CodeEditor } = await import('@/components/challenges/CodeEditor')

describe('CodeEditor', () => {
  it('passes language and value through to the underlying editor', async () => {
    render(<CodeEditor language="python" value="print(1)" />)

    const editor = await screen.findByTestId('monaco-editor-mock')
    expect(editor).toHaveAttribute('data-language', 'python')
    expect(editor).toHaveValue('print(1)')
  })

  it('marks the editor read-only when readOnly is set', async () => {
    render(<CodeEditor language="python" value="print(1)" readOnly />)

    const editor = await screen.findByTestId('monaco-editor-mock')
    expect(editor).toHaveAttribute('readonly')
  })

  it('calls onChange when the editor content changes', async () => {
    const onChange = vi.fn()
    render(<CodeEditor language="python" value="" onChange={onChange} />)

    const editor = await screen.findByTestId('monaco-editor-mock')
    fireEvent.change(editor, { target: { value: 'x = 1' } })

    expect(onChange).toHaveBeenCalledWith('x = 1')
  })
})
