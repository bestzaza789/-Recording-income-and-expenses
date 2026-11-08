import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Shown top-left on the Dashboard so it's easy to tell which build the
// installed PWA is running: build date (Bangkok time) + short commit hash.
function appVersion(): string {
  let sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  if (!sha) {
    try { sha = execSync('git rev-parse HEAD').toString().trim() } catch { sha = 'dev' }
  }
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' }).replaceAll('-', '.')
  return `v${date} · ${sha.slice(0, 7)}`
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'บันทึกรายรับรายจ่าย',
        short_name: 'รายรับรายจ่าย',
        description: 'แอปบันทึกรายรับรายจ่าย ใช้ออฟไลน์ได้ สแกนสลิปได้',
        lang: 'th',
        theme_color: '#007aff',
        background_color: '#f2f2f7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-assets',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/tessdata\.projectnaptha\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-langdata',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
