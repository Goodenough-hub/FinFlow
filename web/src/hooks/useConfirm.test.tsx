// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { useConfirm } from './useConfirm'

// vitest 未开 globals，RTL 的自动 cleanup 不生效，手动注册
afterEach(cleanup)

// 模拟业务删除流程：点「删除账单」→ await confirm 弹框 → 确认后执行删除动作
function Harness() {
  const { confirm, confirmElement } = useConfirm()
  const [deleted, setDeleted] = useState(false)
  return (
    <div>
      <button
        onClick={async () => {
          if (await confirm('确定删除此交易？')) setDeleted(true)
        }}
      >
        删除账单
      </button>
      <span data-testid="result">{deleted ? '已删除' : '未删除'}</span>
      {confirmElement}
    </div>
  )
}

describe('useConfirm', () => {
  it('点确认后 resolve(true)，删除动作执行', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('删除账单'))
    // 弹框出现
    expect(screen.getByText('确定删除此交易？')).toBeTruthy()
    fireEvent.click(screen.getByText('删除', { selector: '.confirm-btn.danger' }))
    await waitFor(() => expect(screen.getByTestId('result').textContent).toBe('已删除'))
    // 弹框关闭
    expect(screen.queryByText('确定删除此交易？')).toBeNull()
  })

  it('点取消后 resolve(false)，删除动作不执行（回归：原生 confirm 静默失效导致「删不掉」）', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('删除账单'))
    fireEvent.click(screen.getByText('取消'))
    await waitFor(() => expect(screen.queryByText('确定删除此交易？')).toBeNull())
    expect(screen.getByTestId('result').textContent).toBe('未删除')
  })

  it('点遮罩视为取消', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('删除账单'))
    expect(screen.getByText('确定删除此交易？')).toBeTruthy()
    fireEvent.click(document.querySelector('.confirm-overlay')!)
    await waitFor(() => expect(screen.queryByText('确定删除此交易？')).toBeNull())
    expect(screen.getByTestId('result').textContent).toBe('未删除')
  })

  it('Escape 视为取消', async () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('删除账单'))
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByText('确定删除此交易？')).toBeNull())
    expect(screen.getByTestId('result').textContent).toBe('未删除')
  })
})
