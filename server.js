import express from 'express'
import cors from 'cors'
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env manually (dotenv as ESM)
const __dirname = dirname(fileURLToPath(import.meta.url))
try {
  const { default: dotenv } = await import('dotenv')
  dotenv.config({ path: join(__dirname, '.env') })
} catch {
  // dotenv not critical if env vars are set externally
}

const app = express()
const PORT = 3001
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1'

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

// ── Proxy: POST /api/messages → Anthropic /v1/messages ──────────────────────
app.post('/api/messages', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY not set in server environment (.env file)',
    })
  }

  try {
    const response = await fetch(`${ANTHROPIC_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (err) {
    console.error('[proxy] Error calling Anthropic API:', err.message)
    res.status(502).json({ error: `Proxy error: ${err.message}` })
  }
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', keyConfigured: !!process.env.ANTHROPIC_API_KEY })
})

app.listen(PORT, () => {
  console.log(`[proxy] Anthropic proxy running at http://localhost:${PORT}`)
  console.log(`[proxy] API key: ${process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing — set ANTHROPIC_API_KEY in .env'}`)
})
