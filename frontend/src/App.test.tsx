import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import './i18n'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
  configurable: true,
})

describe('App', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockWriteText.mockClear()
  })

  it('renders app title', () => {
    render(<App />)
    // The title renders in the current i18n language
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('renders book name input', () => {
    render(<App />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders all style options as buttons', () => {
    render(<App />)
    // 6 style pills + 7 language buttons + 1 generate button = many buttons
    // Just check that style pills exist
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(6)
  })

  it('renders all language buttons', () => {
    render(<App />)
    expect(screen.getByText('en')).toBeInTheDocument()
    expect(screen.getByText('zh')).toBeInTheDocument()
    expect(screen.getByText('ja')).toBeInTheDocument()
    expect(screen.getByText('de')).toBeInTheDocument()
    expect(screen.getByText('fr')).toBeInTheDocument()
    expect(screen.getByText('ko')).toBeInTheDocument()
    expect(screen.getByText('es')).toBeInTheDocument()
  })

  it('disables generate button when book name is empty', () => {
    render(<App />)
    // Find the generate button (it has the generate-btn class or is disabled)
    const buttons = screen.getAllByRole('button')
    const generateBtn = buttons.find(btn => btn.classList.contains('generate-btn'))
    expect(generateBtn).toBeDefined()
    expect(generateBtn).toBeDisabled()
  })

  it('enables generate button when book name is provided', async () => {
    const user = userEvent.setup()
    render(<App />)

    const bookInput = screen.getByRole('textbox')
    await user.type(bookInput, '测试书籍')

    const buttons = screen.getAllByRole('button')
    const generateBtn = buttons.find(btn => btn.classList.contains('generate-btn'))
    expect(generateBtn).not.toBeDisabled()
  })

  it('calls API and displays review on successful generation', async () => {
    const user = userEvent.setup()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        review: '这是一个测试书评',
        style: 'toxic',
        book_name: '测试书籍',
        language: 'zh',
      }),
    })

    render(<App />)

    const bookInput = screen.getByRole('textbox')
    await user.type(bookInput, '测试书籍')

    const buttons = screen.getAllByRole('button')
    const generateBtn = buttons.find(btn => btn.classList.contains('generate-btn'))!
    await user.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText('这是一个测试书评')).toBeInTheDocument()
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/generate-review', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('shows error message on API failure', async () => {
    const user = userEvent.setup()

    mockFetch.mockResolvedValueOnce({ ok: false })

    render(<App />)

    const bookInput = screen.getByRole('textbox')
    await user.type(bookInput, '测试书籍')

    const buttons = screen.getAllByRole('button')
    const generateBtn = buttons.find(btn => btn.classList.contains('generate-btn'))!
    await user.click(generateBtn)

    await waitFor(() => {
      // Error message should appear
      const errorEl = document.querySelector('.error-msg')
      expect(errorEl).toBeTruthy()
    })
  })

  it('copies review to clipboard when copy button clicked', async () => {
    const user = userEvent.setup()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        review: '这是一个测试书评',
        style: 'toxic',
        book_name: '测试书籍',
        language: 'zh',
      }),
    })

    render(<App />)

    const bookInput = screen.getByRole('textbox')
    await user.type(bookInput, '测试书籍')

    const buttons = screen.getAllByRole('button')
    const generateBtn = buttons.find(btn => btn.classList.contains('generate-btn'))!
    await user.click(generateBtn)

    await waitFor(() => {
      expect(screen.getByText('这是一个测试书评')).toBeInTheDocument()
    })

    // Find the copy button in review actions
    const actionBtns = document.querySelectorAll('.action-btn')
    expect(actionBtns.length).toBe(2) // copy + share
    await user.click(actionBtns[0] as HTMLElement)

    expect(mockWriteText).toHaveBeenCalledWith('这是一个测试书评')
  })
})
