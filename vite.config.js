import { defineConfig } from 'vite'

const target = 'https://cubing-tw.net'
const competitorPath = '/event/2025TaiwanChampionship/competitors'

const proxyConfig = {
  '/api/competitors': {
    target,
    changeOrigin: true,
    secure: true,
    rewrite: (path) => path.replace(/^\/api\/competitors/, competitorPath),
  },
}

export default defineConfig({
  server: {
    proxy: proxyConfig,
  },
  preview: {
    proxy: proxyConfig,
  },
})
