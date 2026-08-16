import { useCallback, useState, type ReactNode } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'

interface ConfirmState {
  message: string
  resolve: (ok: boolean) => void
}

// useConfirm：await 风格的应用内确认框。
// 替代 window.confirm——iOS PWA 独立模式下原生 confirm() 不弹出且返回 falsy，
// 一切「先确认再删除」的流程会静默中止（表现为按钮没反应）。
// 用法：const { confirm, confirmElement } = useConfirm()；
//   if (!(await confirm('确定删除？'))) return；
//   在组件 JSX 根部渲染 {confirmElement}。
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null)

  const confirm = useCallback(
    (message: string) => new Promise<boolean>((resolve) => setState({ message, resolve })),
    []
  )

  const settle = useCallback((ok: boolean) => {
    setState((cur) => {
      cur?.resolve(ok)
      return null
    })
  }, [])

  const confirmElement: ReactNode = state ? (
    <ConfirmDialog
      message={state.message}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null

  return { confirm, confirmElement }
}
