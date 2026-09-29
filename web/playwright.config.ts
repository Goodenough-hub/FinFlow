import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5176',
    // 这里验证浏览器模态层和坐标命中，API 用固定数据，避免依赖线上账号。
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'] } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], hasTouch: true } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176/finflow/',
    reuseExistingServer: false,
  },
})
