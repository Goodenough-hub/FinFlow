// 应用内 Toast 与「延迟提交 + 撤销」。
// 替代 window.alert——iOS PWA 独立模式下原生对话框不可靠（同 useConfirm 的原因），
// 且阻塞式弹窗打断操作。模块级 store，任意页面直接调用，由根部 AppToasts 渲染。

export type ToastTone = 'info' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: number
  message: string
  tone: ToastTone
  action?: ToastAction
}

export interface ShowToastOptions {
  tone?: ToastTone
  action?: ToastAction
  /** 自动消失的毫秒数；0 表示不自动消失 */
  duration?: number
}

export interface DeferWithUndoOptions {
  message: string
  /** 撤销窗口结束（或页面转入后台）时执行的真正提交 */
  commit: () => Promise<unknown>
  /** 用户在窗口期内点了「撤销」 */
  onUndo: () => void
  /** commit 失败；调用方负责还原界面 */
  onError?: (err: unknown) => void
  duration?: number
}

export const TOAST_DURATION = 3000
export const UNDO_DURATION = 5000
const MAX_VISIBLE = 3

type Listener = () => void

let nextId = 1
let toasts: readonly Toast[] = []
const listeners = new Set<Listener>()
const dismissTimers = new Map<number, ReturnType<typeof setTimeout>>()
const pendingCommits = new Map<number, () => void>()

function emit() {
  for (const l of listeners) l()
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getToasts(): readonly Toast[] {
  return toasts
}

export function dismissToast(id: number) {
  const timer = dismissTimers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
  if (!toasts.some(t => t.id === id)) return
  toasts = toasts.filter(t => t.id !== id)
  emit()
}

export function showToast(message: string, options: ShowToastOptions = {}): number {
  const { tone = 'info', action, duration = TOAST_DURATION } = options
  const id = nextId++
  // 超出上限时只移除最旧的「显示」；挂在它上面的延迟提交照常执行。
  const kept = toasts.length >= MAX_VISIBLE ? toasts.slice(toasts.length - MAX_VISIBLE + 1) : toasts
  for (const t of toasts) {
    if (kept.includes(t)) continue
    clearTimeout(dismissTimers.get(t.id))
    dismissTimers.delete(t.id)
  }
  toasts = [...kept, { id, message, tone, action }]
  if (duration > 0) {
    dismissTimers.set(id, setTimeout(() => dismissToast(id), duration))
  }
  emit()
  return id
}

// 先在界面上「假装已完成」，duration 内可撤销，到期才调用 commit。
export function deferWithUndo(options: DeferWithUndoOptions) {
  const { message, commit, onUndo, onError, duration = UNDO_DURATION } = options
  let settled = false
  let toastId = 0

  const run = () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    pendingCommits.delete(toastId)
    dismissToast(toastId)
    commit().catch(err => onError?.(err))
  }

  toastId = showToast(message, {
    duration: 0,
    action: {
      label: '撤销',
      onClick: () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        pendingCommits.delete(toastId)
        dismissToast(toastId)
        onUndo()
      }
    }
  })
  const timer = setTimeout(run, duration)
  pendingCommits.set(toastId, run)
}

// 立即执行所有还在撤销窗口内的提交。页面转入后台时调用：
// 用户已离开，继续等可能让进程被系统挂起/杀掉，提交就永远发不出去。
export function flushPendingCommits() {
  for (const run of Array.from(pendingCommits.values())) run()
}
