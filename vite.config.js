import { defineConfig } from 'vite'

const target = 'https://cubing-tw.net'
const competitorPath = '/event/2025TaiwanChampionship/competitors'
const eventPath = '/event/2025TaiwanChampionship/event'

const proxyConfig = {
  '/api/competitors': {
    target,
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/api\/competitors/, competitorPath),
  },
  '/api/events': {
    target,
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/api\/events/, eventPath),
  },
}

export default defineConfig({
  base: './',
  server: {
    proxy: proxyConfig,
  },
  preview: {
    proxy: proxyConfig,
  },
})
