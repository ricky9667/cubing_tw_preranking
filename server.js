import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProxyMiddleware } from 'http-proxy-middleware'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 4173

const upstream = 'https://cubing-tw.net'

app.use(
  ['/api/competitors', '/api/events'],
  createProxyMiddleware({
    target: upstream,
    changeOrigin: true,
    secure: true,
    pathRewrite: (pathStr, _) =>
      pathStr
        .replace(
          /^\/api\/competitors/,
          '/event/2025TaiwanChampionship/competitors'
        )
        .replace(/^\/api\/events/, '/event/2025TaiwanChampionship/event'),
    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('Origin', upstream)
    },
  })
)

const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
  console.log(req)
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
