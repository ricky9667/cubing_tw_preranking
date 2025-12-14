import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProxyMiddleware } from 'http-proxy-middleware'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = process.env.PORT || 4173

const upstream = 'https://cubing-tw.net'

app.options('/api/{0,}', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Max-Age', '86400')
  res.status(204).end()
})

// ⭐ API Proxy - MUST come before static files and catch-all
app.use(
  '/api',
  createProxyMiddleware({
    target: upstream,
    changeOrigin: true,
    secure: true,
    
    pathRewrite: (pathStr) => {
      // Map /api/competitors -> /event/2025TaiwanChampionship/competitors
      if (pathStr.startsWith('/competitors')) {
        return pathStr.replace(
          /^\/competitors/,
          '/event/2025TaiwanChampionship/competitors'
        )
      }
      // Map /api/events -> /event/2025TaiwanChampionship/event
      if (pathStr.startsWith('/events')) {
        return pathStr.replace(
          /^\/events/,
          '/event/2025TaiwanChampionship/event'
        )
      }
      return pathStr
    },
    
    onProxyReq: (proxyReq, req, res) => {
      // Make the upstream server think the request came from its own domain
      proxyReq.setHeader('Origin', upstream)
      proxyReq.setHeader('Referer', upstream)
      proxyReq.removeHeader('Host')
      
      console.log('🔵 Proxying:', req.method, req.path, '→', proxyReq.path)
    },
    
    // ⭐ CRITICAL: Add CORS headers to response
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['access-control-allow-origin'] = '*'
      proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
      proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization, X-Requested-With'
      proxyRes.headers['access-control-allow-credentials'] = 'true'
      
      // Remove potentially problematic headers
      delete proxyRes.headers['x-frame-options']
      delete proxyRes.headers['content-security-policy']
      
      console.log('✅ Proxied response:', req.path, '→ Status:', proxyRes.statusCode)
    },
    
    onError: (err, req, res) => {
      console.error('❌ Proxy error:', err. message)
      console.error('   Path:', req.path)
      console.error('   Method:', req.method)
      
      res.status(502).json({
        error: 'Bad Gateway',
        message: 'Failed to proxy request to upstream server',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
        path: req.path
      })
    },
    
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  })
)

const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))
app.get('{0,}', (req, res) => {
  // Safeguard: Never serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' })
  }
  
  console.log('📄 Serving SPA for:', req.path)
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
