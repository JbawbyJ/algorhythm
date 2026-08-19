import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'

import feedRouter   from './routes/feed.js'
import profileRouter from './routes/profile.js'
import ebayRouter   from './routes/ebay.js'

const app  = express()
const PORT = process.env.PORT || 3001

// ── Middleware ──
app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())
app.use(morgan('dev'))

// ── Rate limiting — polite to external APIs ──
const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,              // 60 requests/min per IP
  message: { error: 'Too many requests, slow down.' }
})
app.use('/api/', limiter)

// ── Routes ──
app.use('/api/feed',    feedRouter)
app.use('/api/profile', profileRouter)
app.use('/api/ebay',    ebayRouter)

// ── Health check ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV,
    ebay: process.env.EBAY_CLIENT_ID !== 'your_ebay_client_id_here' ? 'configured' : 'not configured',
    timestamp: new Date().toISOString()
  })
})

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.path} not found` })
})

// ── Error handler ──
app.use((err, req, res, next) => {
  console.error('❌', err.message)
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n🎛  Algorhythm server running on http://localhost:${PORT}`)
  console.log(`📡  eBay: ${process.env.EBAY_CLIENT_ID !== 'your_ebay_client_id_here' ? '✅ configured' : '⚠️  not configured — add credentials to .env'}`)
  console.log(`🌿  ENV: ${process.env.NODE_ENV}\n`)
})
