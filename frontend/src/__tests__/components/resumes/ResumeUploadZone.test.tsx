import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/lib/resumes-api', () => ({
  uploadResume: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const { uploadResume } = await import('@/lib/resumes-api')
const { ResumeUploadZone } = await import('@/components/resumes/ResumeUploadZone')

function renderWithClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <ResumeUploadZone />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ResumeUploadZone', () => {
  it('uploads a valid PDF selected via the file input', async () => {
    const user = userEvent.setup()
    ;(uploadResume as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1', filename: 'resume.pdf', is_active: true, is_analyzed: false, created_at: '2026-01-01T00:00:00Z',
    })

    renderWithClient()
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/upload resume/i)

    await user.upload(input, file)

    // react-dropzone attaches extra own properties (path, relativePath) to the File
    // it hands to onDrop, and TanStack Query calls mutationFn with a second context
    // arg — so compare the fields that matter on the first call arg directly.
    await waitFor(() => expect(uploadResume).toHaveBeenCalled())
    const uploadedFile = (uploadResume as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(uploadedFile).toMatchObject({ name: 'resume.pdf', type: 'application/pdf' })
  })

  // These two use fireEvent instead of userEvent.upload: userEvent enforces the input's
  // `accept` filter like a real OS file picker, so it won't even select a mismatched file.
  // fireEvent bypasses that, simulating drag-and-drop — which is exactly the path
  // react-dropzone's own JS-level validation exists to catch.
  it('shows a size-limit error and does not upload a PDF over 10 MB', async () => {
    renderWithClient()

    const bigContent = new Uint8Array(11 * 1024 * 1024)
    const file = new File([bigContent], 'big.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/upload resume/i)

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('File exceeds the 10 MB size limit')).toBeInTheDocument()
    expect(uploadResume).not.toHaveBeenCalled()
  })

  it('shows a type error and does not upload a non-PDF file', async () => {
    renderWithClient()

    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    const input = screen.getByLabelText(/upload resume/i)

    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Only PDF files are accepted')).toBeInTheDocument()
    expect(uploadResume).not.toHaveBeenCalled()
  })

  it('shows the backend error message when the upload fails', async () => {
    const user = userEvent.setup()
    ;(uploadResume as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { status: 400, data: { detail: 'File must be a PDF (detected: text/plain)' } },
    })

    renderWithClient()
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    const input = screen.getByLabelText(/upload resume/i)

    await user.upload(input, file)

    expect(await screen.findByText('File must be a PDF (detected: text/plain)')).toBeInTheDocument()
  })
})
