// Vercel Serverless Function — handles all AI calls server-side
// No CORS issues, API key never exposed to browser

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  const { messages, systemPrompt, maxTokens = 1000 } = req.body

  if (!messages || !systemPrompt) {
    return res.status(400).json({ error: 'Missing messages or systemPrompt' })
  }

  const GROQ_KEY = process.env.VITE_GROQ_API_KEY
  const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY

  // Try Groq first
  if (GROQ_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: maxTokens,
          temperature: 0.4,
        }),
      })
      if (groqRes.ok) {
        const data = await groqRes.json()
        const text = data.choices?.[0]?.message?.content
        if (text) return res.status(200).json({ text, provider: 'groq' })
      } else {
        const e = await groqRes.json().catch(() => ({}))
        console.error('Groq error:', groqRes.status, e.error?.message)
      }
    } catch (err) {
      console.error('Groq fetch failed:', err.message)
    }
  }

  // Try Gemini as fallback
  if (GEMINI_KEY) {
    try {
      const lastMsg = messages[messages.length - 1]?.content || ''
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: lastMsg }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
          }),
        }
      )
      if (geminiRes.ok) {
        const data = await geminiRes.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return res.status(200).json({ text, provider: 'gemini' })
      }
    } catch (err) {
      console.error('Gemini fetch failed:', err.message)
    }
  }

  // Both failed — return null so frontend uses built-in fallback
  return res.status(503).json({ error: 'AI providers unavailable', text: null })
}