/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/finflow/',
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}']
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'FinFlow · 个人记账',
        short_name: 'FinFlow',
        description: '本地优先的个人记账应用，数据完全存于设备',
        theme_color: '#0F0F11',
        background_color: '#0F0F11',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/finflow/',
        start_url: '/finflow/',
        lang: 'zh-CN',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          { src: '/finflow/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/finflow/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/finflow/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: '记一笔',
            short_name: '记账',
            description: '快速新增一笔交易',
            url: '/finflow/transactions/new',
            icons: [{ src: '/finflow/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: '账单',
            short_name: '账单',
            description: '查看所有交易',
            url: '/finflow/transactions',
            icons: [{ src: '/finflow/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: '报表',
            short_name: '报表',
            description: '查看收支报表',
            url: '/finflow/reports',
            icons: [{ src: '/finflow/icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/finflow/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/finflow\/sw\.js/, /^\/finflow\/workbox-/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // 只保留静态资源的 runtime cache；catch-all StaleWhileRevalidate 已删——
        // precache 已按内容哈希覆盖所有 built assets，那条 SWR 反而会让 non-precache
        // 请求返回过期副本，加剧 UI 与 DB 版本 skew（见修复：brand: 前缀显示为字面量）。
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'finflow-static',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 90 * 24 * 60 * 60
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    port: 5075,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true
  }
})
