import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon.png', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'FinFlow · 个人记账',
        short_name: 'FinFlow',
        description: '本地优先的个人记账应用，数据完全存于设备',
        theme_color: '#0F0F11',
        background_color: '#0F0F11',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'zh-CN',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ],
        shortcuts: [
          {
            name: '记一笔',
            short_name: '记账',
            description: '快速新增一笔交易',
            url: '/transactions/new',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: '账单',
            short_name: '账单',
            description: '查看所有交易',
            url: '/transactions',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          },
          {
            name: '报表',
            short_name: '报表',
            description: '查看收支报表',
            url: '/reports',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/sw\.js/, /^\/workbox-/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'finflow-shell',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          },
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
    open: true
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true
  }
})
