import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import './i18n' // 确保 i18n 初始化

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock clipboard API
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

describe('App', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    mockWriteText.mockClear()
  })

  it('renders app title and subtitle', () => {
    render(<App />)
    
    expect(screen.getByText(/AI.*书评生成器/i)).toBeInTheDocument()
    expect(screen.getByText(/用.*AI.*生成.*书评/i)).toBeInTheDocument()
  })

  it('renders all form elements', () => {
    render(<App />)
    
    expect(screen.getByLabelText(/书名/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/书评风格/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/语言/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /生成书评/i })).toBeInTheDocument()
  })

  it('has all style options', () => {
    render(<App />)
    
    const styleSelect = screen.getByLabelText(/书评风格/i) as HTMLSelectElement
    const options = Array.from(styleSelect.options).map(opt => opt.value)
    
    expect(options).toEqual(['toxic', 'literary', 'chuunibyou', 'zhenhuan', 'luxun', 'shakespeare'])
  })

  it('has all language options', () => {
    render(<App />)
    
    const langSelect = screen.getByLabelText(/语言/i) as HTMLSelectElement  
    const options = Array.from(langSelect.options).map(opt => opt.value)
    
    expect(options).toEqual(['en', 'zh', 'ja', 'de', 'fr', 'ko', 'es'])
  })

  it('disables generate button when book name is empty', () => {
    render(<App />)
    
    const generateBtn = screen.getByRole('button', { name: /生成书评/i })
    expect(generateBtn).toBeDisabled()
  })

  it('enables generate button when book name is provided', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const bookInput = screen.getByLabelText(/书名/i)
    const generateBtn = screen.getByRole('button', { name: /生成书评/i })
    
    await user.type(bookInput, '测试书籍')
    
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
        language: 'zh'
      }),
    })
    
    render(<App />)
    
    const bookInput = screen.getByLabelText(/书名/i)
    const generateBtn = screen.getByRole('button', { name: /生成书评/i })
    
    await user.type(bookInput, '测试书籍')
    await user.click(generateBtn)
    
    await waitFor(() => {
      expect(screen.getByText('这是一个测试书评')).toBeInTheDocument()
    })
    
    expect(mockFetch).toHaveBeenCalledWith('/api/generate-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        book_name: '测试书籍',
        style: 'toxic',
        language: 'zh'
      }),
    })
  })

  it('shows error message on API failure', async () => {
    const user = userEvent.setup()
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
    })
    
    render(<App />)
    
    const bookInput = screen.getByLabelText(/书名/i)
    const generateBtn = screen.getByRole('button', { name: /生成书评/i })
    
    await user.type(bookInput, '测试书籍')
    await user.click(generateBtn)
    
    await waitFor(() => {
      expect(screen.getByText(/发生错误/i)).toBeInTheDocument()
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
        language: 'zh'
      }),
    })
    
    render(<App />)
    
    const bookInput = screen.getByLabelText(/书名/i)
    const generateBtn = screen.getByRole('button', { name: /生成书评/i })
    
    await user.type(bookInput, '测试书籍')
    await user.click(generateBtn)
    
    await waitFor(() => {
      expect(screen.getByText('这是一个测试书评')).toBeInTheDocument()
    })
    
    const copyBtn = screen.getByRole('button', { name: /📋 复制/i })
    await user.click(copyBtn)
    
    expect(mockWriteText).toHaveBeenCalledWith('这是一个测试书评')
  })

  it('changes language when language selector is used', async () => {
    const user = userEvent.setup()
    render(<App />)
    
    const langSelect = screen.getByLabelText(/语言/i)
    
    await user.selectOptions(langSelect, 'en')
    
    await waitFor(() => {
      expect(screen.getByText(/AI.*Book.*Roast.*Generator/i)).toBeInTheDocument()
    })
  })
})