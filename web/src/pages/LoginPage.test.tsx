// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

// Isolate LoginPage from the real AuthContext (which touches localStorage and the API).
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    logout: vi.fn(),
    user: null,
    loading: false,
    setAvatar: vi.fn()
  })
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage 密码可见性切换', () => {
  beforeEach(() => cleanup())

  it('密码 input 默认 type=password', () => {
    renderPage()
    const pwd = screen.getByPlaceholderText('密码') as HTMLInputElement
    expect(pwd.type).toBe('password')
  })

  it('点击眼睛后 type=text，再点击回到 password', () => {
    renderPage()
    const pwd = screen.getByPlaceholderText('密码') as HTMLInputElement
    const btn = screen.getByRole('button', { name: '显示密码' })
    expect(pwd.type).toBe('password')

    fireEvent.click(btn)
    expect(pwd.type).toBe('text')
    expect(screen.getByRole('button', { name: '隐藏密码' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '隐藏密码' }))
    expect(pwd.type).toBe('password')
    expect(screen.getByRole('button', { name: '显示密码' })).toBeTruthy()
  })

  it('切换按钮是 type=button，且 tabIndex=-1（不打断 Tab 顺序）', () => {
    renderPage()
    const btn = screen.getByRole('button', { name: '显示密码' }) as HTMLButtonElement
    expect(btn.type).toBe('button')
    expect(btn.tabIndex).toBe(-1)
  })
})
