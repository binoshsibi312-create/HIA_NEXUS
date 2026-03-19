import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geminiKey = env.VITE_GEMINI_API_KEY
  const anthropicKey = env.VITE_ANTHROPIC_API_KEY

  if (geminiKey) console.log('\n✅  Gemini API key loaded (free tier)\n')
  else if (anthropicKey) console.log('\n✅  Anthropic API key loaded\n')
  else console.warn('\n⚠️  No AI API key found in .env\n')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/gemini/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
              console.log(`[gemini] → ${req.method} ${req.url?.split('?')[0].replace('/gemini','').slice(0,60)}`)
            })
            proxy.on('proxyRes', (proxyRes) => {
              console.log(`[gemini] ← ${proxyRes.statusCode}`)
            })
            proxy.on('error', (err) => {
              console.error('[gemini] error:', err.message)
            })
          },
        },
        '/anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/anthropic/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (anthropicKey) proxyReq.setHeader('x-api-key', anthropicKey)
              proxyReq.setHeader('anthropic-version', '2023-06-01')
              proxyReq.removeHeader('origin')
              proxyReq.removeHeader('referer')
            })
          },
        },
      },
    },
  }
})