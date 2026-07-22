// 最小类型声明：项目未安装 @types/node，但 vitest 以 node 环境运行，
// 测试里需要读 CSS 文件做断言。只声明用到的 API。
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf-8'): string
}
