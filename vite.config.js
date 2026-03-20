import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqKey   = env.VITE_GROQ_API_KEY
  const geminiKey = env.VITE_GEMINI_API_KEY

  if (groqKey)   console.log('\n✅  Groq key loaded — AI chat active\n')
  else           console.warn('\n⚠️  No AI key in .env\n')

  return {
    plugins: [
      react(),
      {
        name: 'hia-nexus-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url !== '/api/chat' || req.method !== 'POST') {
              return next()
            }

            res.setHeader('Content-Type', 'application/json')

            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const body = Buffer.concat(chunks).toString()

            let parsed
            try { parsed = JSON.parse(body) }
            catch (e) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'Bad JSON' })) }

            const { messages, systemPrompt, maxTokens = 800 } = parsed

            // ── Try Groq ──────────────────────────────────────────────────
            if (groqKey) {
              try {
                console.log('[AI] → Groq request...')
                const gr = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${groqKey}`,
                  },
                  body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                      { role: 'system', content: systemPrompt },
                      ...messages,
                    ],
                    max_tokens: maxTokens,
                    temperature: 0.7,
                    stream: false,
                  }),
                })
                if (gr.ok) {
                  const data = await gr.json()
                  const text = data.choices?.[0]?.message?.content
                  if (text) {
                    console.log('[AI] ✅ Groq replied:', text.slice(0, 80) + '...')
                    return res.end(JSON.stringify({ text, provider: 'groq' }))
                  }
                } else {
                  const errText = await gr.text()
                  console.error('[AI] ❌ Groq error:', gr.status, errText.slice(0, 200))
                }
              } catch (e) {
                console.error('[AI] ❌ Groq fetch error:', e.message)
              }
            }

            // ── Try Gemini fallback ───────────────────────────────────────
            if (geminiKey) {
              try {
                console.log('[AI] → Gemini fallback...')
                const lastMsg = messages[messages.length - 1]?.content || ''
                const gm = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ role: 'user', parts: [{ text: lastMsg }] }],
                      systemInstruction: { parts: [{ text: systemPrompt }] },
                      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
                    }),
                  }
                )
                if (gm.ok) {
                  const data = await gm.json()
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
                  if (text) {
                    console.log('[AI] ✅ Gemini replied')
                    return res.end(JSON.stringify({ text, provider: 'gemini' }))
                  }
                } else {
                  const errText = await gm.text()
                  console.error('[AI] ❌ Gemini error:', gm.status, errText.slice(0, 200))
                }
              } catch (e) {
                console.error('[AI] ❌ Gemini fetch error:', e.message)
              }
            }

            // Both failed
            console.warn('[AI] Both providers failed — frontend will use fallback')
            return res.end(JSON.stringify({ text: null, error: 'AI unavailable' }))
          })
        },
      },
    ],
    server: { port: 5173 },
  }
})