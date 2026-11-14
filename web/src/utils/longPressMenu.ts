// 屏蔽长按系统菜单，让 PWA 的长按行为像原生 App。
// 曾经的问题：长按底部 Tab（<a> 链接）等位置，系统弹出链接预览 /「在新标签页打开」，
// 主屏幕 PWA 里点了会再开出一个页面。
// iOS 的链接预览、拷贝/查询菜单由 global.css 的 -webkit-touch-callout: none 关闭；
// Android Chrome 的长按菜单走 contextmenu 事件，这里统一 preventDefault。
// 输入框/文本域/可编辑区域放行，保留粘贴、选词等编辑菜单。

export function allowsContextMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return target.closest('input, textarea, [contenteditable=""], [contenteditable="true"]') !== null
}

export function installLongPressMenuGuard(root: Document = document): () => void {
  const onContextMenu = (e: Event) => {
    if (!allowsContextMenu(e.target)) e.preventDefault()
  }
  root.addEventListener('contextmenu', onContextMenu)
  return () => root.removeEventListener('contextmenu', onContextMenu)
}
