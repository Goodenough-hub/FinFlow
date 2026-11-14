import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type * as ToastModule from './toast'

// store 是模块级单例；每个用例 resetModules 后动态重新加载，避免互相串状态（静态 import 做不到）。
let toast: typeof ToastModule

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  toast = await import('./toast')
})

afterEach(() => {
  vi.useRealTimers()
})

const messages = () => toast.getToasts().map(t => t.message)

describe('showToast', () => {
  it('到期后自动消失，并通知订阅者', () => {
    const listener = vi.fn()
    toast.subscribeToasts(listener)
    toast.showToast('已保存')
    expect(messages()).toEqual(['已保存'])
    vi.advanceTimersByTime(toast.TOAST_DURATION)
    expect(messages()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('最多同时显示 3 条，新的挤掉最旧的', () => {
    toast.showToast('一')
    toast.showToast('二')
    toast.showToast('三')
    toast.showToast('四')
    expect(messages()).toEqual(['二', '三', '四'])
  })
})

describe('deferWithUndo', () => {
  it('撤销窗口内不提交，到期才提交并收起提示', async () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    toast.deferWithUndo({ message: '已删除 1 笔交易', commit, onUndo: vi.fn() })
    expect(messages()).toEqual(['已删除 1 笔交易'])
    vi.advanceTimersByTime(toast.UNDO_DURATION - 1)
    expect(commit).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(messages()).toEqual([])
  })

  it('点撤销后调用 onUndo，且到期也不再提交', () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    const onUndo = vi.fn()
    toast.deferWithUndo({ message: '已删除 1 笔交易', commit, onUndo })
    toast.getToasts()[0].action!.onClick()
    vi.advanceTimersByTime(toast.UNDO_DURATION * 2)
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(commit).not.toHaveBeenCalled()
    expect(messages()).toEqual([])
  })

  it('提交失败时回调 onError，由调用方还原界面', async () => {
    const err = new Error('网络错误')
    const onError = vi.fn()
    toast.deferWithUndo({ message: 'x', commit: () => Promise.reject(err), onUndo: vi.fn(), onError })
    await vi.advanceTimersByTimeAsync(toast.UNDO_DURATION)
    expect(onError).toHaveBeenCalledWith(err)
  })

  it('提示被挤出屏幕后，挂在上面的提交照常执行', () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    toast.deferWithUndo({ message: '已删除 1 笔交易', commit, onUndo: vi.fn() })
    toast.showToast('二')
    toast.showToast('三')
    toast.showToast('四')
    expect(messages()).not.toContain('已删除 1 笔交易')
    vi.advanceTimersByTime(toast.UNDO_DURATION)
    expect(commit).toHaveBeenCalledTimes(1)
  })
})

describe('flushPendingCommits', () => {
  it('立即提交窗口期内的全部操作，到期时不会重复提交', () => {
    const a = vi.fn().mockResolvedValue(undefined)
    const b = vi.fn().mockResolvedValue(undefined)
    toast.deferWithUndo({ message: 'a', commit: a, onUndo: vi.fn() })
    toast.deferWithUndo({ message: 'b', commit: b, onUndo: vi.fn() })
    toast.flushPendingCommits()
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    expect(messages()).toEqual([])
    vi.advanceTimersByTime(toast.UNDO_DURATION)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('已撤销的操作不会被 flush 提交', () => {
    const commit = vi.fn().mockResolvedValue(undefined)
    toast.deferWithUndo({ message: 'a', commit, onUndo: vi.fn() })
    toast.getToasts()[0].action!.onClick()
    toast.flushPendingCommits()
    expect(commit).not.toHaveBeenCalled()
  })
})
