/**
 * HIA NEXUS — AI Service
 * Gemini is called directly (no proxy needed — Google allows browser calls)
 * Anthropic goes through Vite proxy (requires server-side key injection)
 */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const USE_GEMINI = !!GEMINI_KEY

// Gemini base URL — called DIRECTLY from browser (Google allows CORS)
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// Model fallback chain
const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-1.5-flash-8b']

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const isRateLimit = (msg = '') =>
  msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') ||
  msg.includes('429') || msg.includes('rate')

// ── Core Gemini call (direct, no proxy) ──────────────────────────────────────
const callGemini = async (userPrompt, systemPrompt, maxTokens = 1000) => {
  let lastError = null

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
          }),
        })

        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          const msg = e.error?.message || `HTTP ${res.status}`
          if (isRateLimit(msg)) {
            lastError = msg
            if (attempt === 0) { await sleep(4000); continue }
            break // try next model
          }
          throw new Error(msg)
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('Empty response from Gemini')
        return text

      } catch (err) {
        if (isRateLimit(err.message)) {
          lastError = err.message
          if (attempt === 0) { await sleep(4000); continue }
          break
        }
        throw err
      }
    }
  }

  throw new Error(`Rate limit hit on all models. Please wait 1 minute and try again. (${lastError})`)
}

// ── Gemini multi-turn chat (direct) ──────────────────────────────────────────
const callGeminiChat = async (messages, systemPrompt, maxTokens = 1000) => {
  // Map messages — Gemini uses 'model' not 'assistant'
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // Gemini requires alternating user/model turns — ensure it starts with user
  const validContents = []
  for (let i = 0; i < contents.length; i++) {
    if (i === 0 && contents[i].role === 'model') continue // skip leading model msg
    if (i > 0 && contents[i].role === contents[i - 1]?.role) {
      // Merge consecutive same-role messages
      validContents[validContents.length - 1].parts[0].text += '\n' + contents[i].parts[0].text
    } else {
      validContents.push(contents[i])
    }
  }

  let lastError = null

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const url = `${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: validContents,
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
          }),
        })

        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          const msg = e.error?.message || `HTTP ${res.status}`
          if (isRateLimit(msg)) {
            lastError = msg
            if (attempt === 0) { await sleep(4000); continue }
            break
          }
          throw new Error(msg)
        }

        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error('Empty response from Gemini')
        return text

      } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          throw new Error('Network error — check your internet connection')
        }
        if (isRateLimit(err.message)) {
          lastError = err.message
          if (attempt === 0) { await sleep(4000); continue }
          break
        }
        throw err
      }
    }
  }

  throw new Error(`Rate limit hit. Please wait 1 minute and try again.`)
}

// ── Anthropic (via Vite proxy) ────────────────────────────────────────────────
const callAnthropic = async (messages, systemPrompt, maxTokens = 1000) => {
  const res = await fetch('/anthropic/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error?.message || `Anthropic HTTP ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

// ── Medical document extraction ───────────────────────────────────────────────
export const extractMedicalData = async (documentText, fileNames = []) => {
  const system = `You are a clinical data extraction AI for HIA NEXUS healthcare insurance platform (India).
Extract ALL health-relevant information from the medical document(s).
Return ONLY valid JSON — no markdown, no code fences, no explanation.
Use this exact schema:
{"age":null,"gender":null,"bmi":null,"smoker":null,"conditions":[],"chronicConditions":false,"medications":[],"allergies":[],"familyHistory":[],"recentProcedures":[],"mentalHealthDiagnoses":[],"extractedSummary":"2-3 sentence clinical summary","dataQuality":"high|medium|low"}`

  const prompt = `Files: ${fileNames.join(', ') || 'uploaded document'}\nContent:\n${documentText}\n\nReturn only the JSON object.`

  try {
    const raw = USE_GEMINI
      ? await callGemini(prompt, system, 800)
      : await callAnthropic([{ role: 'user', content: prompt }], system, 800)
    const match = raw.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
  } catch (err) {
    console.error('Extraction error:', err.message)
  }
  return {
    conditions: [], medications: [], chronicConditions: false,
    extractedSummary: 'Document saved to vault. Complete the questionnaire for your recommendations.',
    dataQuality: 'low',
  }
}

// ── Follow-up questions (no API call — evidence-based hardcoded set) ──────────
export const generateFollowUpQuestions = async (healthProfile = {}) => {
  const hasChronic = healthProfile.chronicConditions ||
    (Array.isArray(healthProfile.conditions) && healthProfile.conditions.length >= 2)

  const questions = [
    { id: 'q_dependents', question: 'Are you looking for individual coverage, or do you need to cover family members?', type: 'multiple_choice', options: ['Individual only', 'Myself + spouse/partner', 'Myself + children', 'Full family (myself + spouse + children)'], category: 'family', why: 'Determines individual vs family floater plan eligibility' },
    { id: 'q_num_dependents', question: 'How many total people (including yourself) would be covered on this plan?', type: 'multiple_choice', options: ['Just me (1)', '2 people', '3 people', '4 people', '5 or more'], category: 'family', why: 'Family size directly affects premium and sum insured calculations' },
    { id: 'q_budget', question: 'What is your maximum monthly budget for health insurance premiums?', type: 'multiple_choice', options: ['Under ₹5,000/month', '₹5,000–₹10,000/month', '₹10,000–₹20,000/month', '₹20,000–₹35,000/month', 'Over ₹35,000/month'], category: 'financial', why: 'Filters plans to those within your affordability range' },
    { id: 'q_visit_freq', question: 'How many times per year do you typically visit a doctor, specialist, or clinic?', type: 'multiple_choice', options: ['0–2 visits/year (rarely)', '3–5 visits/year (occasionally)', '6–11 visits/year (regularly)', '12+ visits/year (very frequently)'], category: 'medical', why: 'High visit frequency makes a lower deductible plan more cost-effective' },
    { id: 'q_chronic', question: 'Do you have any ongoing health conditions requiring regular medical attention? (e.g., diabetes, hypertension, asthma, thyroid disease, heart disease)', type: 'boolean', category: 'medical', why: 'Chronic conditions significantly affect which plan tier is most cost-effective' },
    { id: 'q_medications', question: 'Do you take any prescription medications on an ongoing basis?', type: 'boolean', category: 'medical', why: 'Ongoing prescriptions make better medicine coverage more valuable' },
    { id: 'q_planned_surgery', question: 'Are you expecting any surgeries, procedures, or hospitalisations in the next 12 months?', type: 'boolean', category: 'medical', why: 'Planned procedures make low-deductible plans significantly cheaper overall' },
    { id: 'q_deductible_pref', question: 'What matters more to you — a lower monthly premium or lower costs when you actually need care?', type: 'scale', min: 1, max: 10, category: 'financial', why: '1 = prefer low premium (high deductible), 10 = prefer low out-of-pocket when using care' },
    { id: 'q_plan_type', question: 'Do you want the flexibility to visit any hospital, or are you comfortable with a network of empanelled providers?', type: 'multiple_choice', options: ['Full flexibility — any hospital anytime', 'Network hospitals with cashless treatment', 'Mix of both', 'No strong preference'], category: 'coverage', why: 'Network vs open access is a fundamental plan architecture decision' },
    { id: 'q_mental_health', question: 'Do you currently use or anticipate needing mental health services? (therapy, psychiatry, counselling)', type: 'boolean', category: 'coverage', why: 'Mental health coverage and session limits vary significantly between plans' },
    { id: 'q_hsa', question: 'Are you interested in a tax-saving health plan with Section 80D benefits of up to ₹75,000/year?', type: 'boolean', category: 'financial', why: 'Tax-linked health savings plans offer significant income tax benefits under Section 80D' },
    { id: 'q_pregnancy', question: 'Are you currently pregnant or planning a pregnancy within the next 12–18 months?', type: 'boolean', category: 'coverage', why: 'Maternity and newborn care coverage varies dramatically between plans' },
    { id: 'q_employer_plan', question: 'Does your employer contribute to your health insurance costs?', type: 'multiple_choice', options: ['Yes — employer pays full premium', 'Yes — employer pays part of premium', 'No — I pay 100% myself', 'Self-employed / freelancer / business owner', 'Student / not currently employed'], category: 'financial', why: 'Employer contributions significantly reduce your actual out-of-pocket cost' },
    { id: 'q_specialists', question: 'Do you regularly need access to specialists? (cardiologist, endocrinologist, oncologist, etc.)', type: 'boolean', category: 'coverage', why: 'Specialist access and referral requirements differ greatly between plan types' },
    { id: 'q_dental_vision', question: 'How important is dental and vision coverage being included in your plan?', type: 'multiple_choice', options: ['Very important — I need both', 'Dental coverage is my priority', 'Vision coverage is my priority', 'Not important — I have separate coverage', 'Not a priority right now'], category: 'coverage', why: 'Dental and vision add-ons affect overall value comparison between plans' },
  ]

  if (hasChronic) {
    questions.push({ id: 'q_care_coordinator', question: 'Would you benefit from a dedicated care coordinator or disease management programme for your conditions?', type: 'boolean', category: 'medical', why: 'Chronic care management programmes are only available in specialised plans' })
  }

  return questions
}

// ── AI reasoning for recommendations ─────────────────────────────────────────
export const generateInsuranceReasoning = async (healthProfile, mlScores, recommendedPlans) => {
  const system = `You are HIA NEXUS, an expert AI healthcare insurance advisor for the Indian market.
Provide personalised, specific reasoning for why these plans were recommended for this patient.
Reference their actual health conditions and needs. Use markdown formatting. Be concise (under 350 words).
Use Indian Rupee (₹) for all monetary values. Mention Section 80D tax benefits where relevant.`

  const prompt = `Patient health profile: ${JSON.stringify(healthProfile)}
ML model scores: ${JSON.stringify(mlScores)}
Recommended plans: ${JSON.stringify(recommendedPlans)}

Explain in markdown:
1. **Why this plan matches this patient** (reference their specific conditions)
2. **Key benefits** relevant to their health profile
3. **Financial breakdown** — estimated annual cost vs expected usage in ₹
4. **Section 80D** tax deduction benefit
5. **Bottom line** recommendation with confidence level`

  if (USE_GEMINI) return await callGemini(prompt, system, 1000)
  return await callAnthropic([{ role: 'user', content: prompt }], system, 1000)
}

// ── AI Chatbot ────────────────────────────────────────────────────────────────
export const chatWithAssistant = async (messages, userProfile = null) => {
  const system = `You are HIA NEXUS Assistant — an expert AI healthcare insurance advisor for the Indian market.

Your expertise:
- Indian health insurance: IRDAI regulations, sum insured, waiting periods, pre-existing disease clauses
- Plan types: Individual, Family Floater, Senior Citizen, Critical Illness, Top-up plans
- Key concepts: deductible, copay, coinsurance, no-claim bonus, room rent limits, cashless hospitalisation
- Government schemes: Ayushman Bharat (PMJAY), CGHS, ESI, state government schemes
- Tax benefits: Section 80D deductions — ₹25,000 self/family, ₹50,000 for senior citizens, ₹75,000 combined
- The HIA NEXUS platform: how document upload works, how AI analysis works, the secure vault, how recommendations are generated

${userProfile ? `User context: ${JSON.stringify(userProfile)}` : ''}

HIA NEXUS Plans (all amounts in ₹):
| Plan | Tier | Premium/mo | Deductible | Sum Insured |
|------|------|-----------|-----------|------------|
| Aarogya Essential | Bronze | ₹4,500 | ₹1,62,500 | ₹5 Lakh |
| Aarogya Plus | Silver | ₹8,000 | ₹75,000 | ₹10 Lakh |
| Suraksha Premium | Gold | ₹13,000 | ₹25,000 | ₹20 Lakh |
| Suraksha Elite | Platinum | ₹18,000 | ₹0 | ₹50 Lakh |
| Parivar Shield | Silver Family | ₹17,000 | ₹1,50,000 | ₹15 Lakh |
| Parivar Complete | Gold Family | ₹27,500 | ₹75,000 | ₹30 Lakh |
| Chikitsa Care | Gold Chronic | ₹12,000 | ₹12,500 | ₹20 Lakh |
| Nivesh Health | Bronze HSA | ₹6,000 | ₹1,12,500 | ₹7.5 Lakh |

Response guidelines:
- Be warm, clear, and jargon-free. Explain terms when first used.
- Give exact ₹ figures when asked about specific plans.
- Always mention Section 80D tax benefits where relevant.
- Never provide medical advice.
- Recommend consulting a licensed IRDAI-registered insurance broker for complex decisions.`

  if (USE_GEMINI) return await callGeminiChat(messages, system, 1000)
  return await callAnthropic(messages, system, 1000)
}