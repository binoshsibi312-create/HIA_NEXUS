/**
 * HIA NEXUS — AI Service
 * Routes through /api/chat (Vite middleware on localhost, Vercel function in prod)
 * Falls back to built-in knowledge base if API unavailable
 */

// ── Server-side AI call (no CORS issues) ──────────────────────────────────────
const askAI = async (messages, systemPrompt, maxTokens = 800) => {
  try {
    console.log('[HIA AI] Sending to /api/chat...')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)

    const res = await fetch('/api/chat', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemPrompt, maxTokens }),
    })
    clearTimeout(timer)

    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      console.error('[HIA AI] Error:', res.status, e.error)
      return null
    }

    const data = await res.json()
    console.log('[HIA AI] ✅ Reply from:', data.provider, '| chars:', data.text?.length)
    return data.text || null
  } catch (err) {
    if (err.name === 'AbortError') console.warn('[HIA AI] Timed out after 25s')
    else console.error('[HIA AI] Fetch error:', err.message)
    return null
  }
}

// ── Medical document extraction ───────────────────────────────────────────────
export const extractMedicalData = async (documentText, fileNames = []) => {
  const system = `You are a clinical data extraction AI. Extract health info from medical documents.
Return ONLY valid JSON, no markdown:
{"age":null,"gender":null,"bmi":null,"smoker":null,"conditions":[],"chronicConditions":false,"medications":[],"allergies":[],"familyHistory":[],"recentProcedures":[],"mentalHealthDiagnoses":[],"extractedSummary":"2-3 sentence summary","dataQuality":"low"}`

  const result = await askAI(
    [{ role: 'user', content: `Files: ${fileNames.join(', ')}\n${documentText}\nReturn only JSON.` }],
    system, 600
  )

  if (result) {
    try {
      const match = result.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
    } catch (_) {}
  }

  return {
    conditions: [], medications: [], chronicConditions: false,
    extractedSummary: 'Document saved. Complete the questionnaire for your recommendations.',
    dataQuality: 'low',
  }
}

// ── Follow-up questions (hardcoded, no API) ───────────────────────────────────
export const generateFollowUpQuestions = async () => [
  { id:'q_dependents',     question:'Are you looking for individual coverage, or do you need to cover family members?',                                type:'multiple_choice', options:['Individual only','Myself + spouse/partner','Myself + children','Full family (myself + spouse + children)'],  category:'family',    why:'Determines individual vs family floater eligibility' },
  { id:'q_num_dependents', question:'How many total people (including yourself) would be covered?',                                                   type:'multiple_choice', options:['Just me (1)','2 people','3 people','4 people','5 or more'],                                                  category:'family',    why:'Affects premium and sum insured' },
  { id:'q_budget',         question:'What is your maximum monthly budget for health insurance premiums?',                                              type:'multiple_choice', options:['Under ₹5,000/month','₹5,000–₹10,000/month','₹10,000–₹20,000/month','₹20,000–₹35,000/month','Over ₹35,000/month'], category:'financial', why:'Filters plans within affordability range' },
  { id:'q_visit_freq',     question:'How many times per year do you visit a doctor or specialist?',                                                   type:'multiple_choice', options:['0–2 visits/year','3–5 visits/year','6–11 visits/year','12+ visits/year'],                                  category:'medical',   why:'High frequency makes lower deductible plans cost-effective' },
  { id:'q_chronic',        question:'Do you have any ongoing health conditions? (diabetes, hypertension, asthma, thyroid, heart disease)',            type:'boolean',                                                                                                                           category:'medical',   why:'Affects which tier is most cost-effective' },
  { id:'q_medications',    question:'Do you take any prescription medications on an ongoing basis?',                                                  type:'boolean',                                                                                                                           category:'medical',   why:'Ongoing prescriptions make better Rx coverage more valuable' },
  { id:'q_planned_surgery',question:'Are you expecting any surgeries, procedures, or hospitalisations in the next 12 months?',                       type:'boolean',                                                                                                                           category:'medical',   why:'Planned procedures make low-deductible plans cheaper' },
  { id:'q_deductible_pref',question:'What matters more — a lower monthly premium, or lower costs when you need care? (1=low premium, 10=low costs)', type:'scale', min:1, max:10,                                                                                                            category:'financial', why:'Drives Bronze vs Gold vs Platinum recommendation' },
  { id:'q_plan_type',      question:'Do you want flexibility to visit any hospital, or are you comfortable with a network of providers?',             type:'multiple_choice', options:['Full flexibility — any hospital','Network hospitals with cashless','Mix of both','No preference'],    category:'coverage',  why:'Network vs open access is fundamental' },
  { id:'q_mental_health',  question:'Do you currently use or anticipate needing mental health services?',                                             type:'boolean',                                                                                                                           category:'coverage',  why:'Mental health coverage varies significantly' },
  { id:'q_hsa',            question:'Are you interested in a tax-saving plan with Section 80D benefits up to ₹75,000/year?',                        type:'boolean',                                                                                                                           category:'financial', why:'Tax-linked plans offer significant income tax benefits' },
  { id:'q_pregnancy',      question:'Are you currently pregnant or planning a pregnancy within 12–18 months?',                                       type:'boolean',                                                                                                                           category:'coverage',  why:'Maternity coverage varies dramatically between plans' },
  { id:'q_employer_plan',  question:'Does your employer contribute to your health insurance costs?',                                                  type:'multiple_choice', options:['Yes — full premium','Yes — partial premium','No — I pay myself','Self-employed','Student'],           category:'financial', why:'Employer contributions reduce your actual cost' },
  { id:'q_specialists',    question:'Do you regularly need access to specialists? (cardiologist, oncologist, neurologist, etc.)',                    type:'boolean',                                                                                                                           category:'coverage',  why:'Specialist access differs greatly between plan types' },
  { id:'q_dental_vision',  question:'How important is dental and vision coverage?',                                                                   type:'multiple_choice', options:['Very important — need both','Dental priority','Vision priority','Have separate coverage','Not a priority'], category:'coverage', why:'Add-ons affect overall value comparison' },
]

// ── AI reasoning for plan recommendations ─────────────────────────────────────
export const generateInsuranceReasoning = async (healthProfile, mlScores, recommendedPlans) => {
  const plan = recommendedPlans?.[0]
  const system = `You are HIA NEXUS, an expert Indian healthcare insurance advisor. Write personalised plan reasoning in markdown under 250 words. Use ₹. Mention Section 80D.`
  const prompt = `Patient: ${JSON.stringify(healthProfile)}
Plan recommended: ${plan?.name}, match score ${plan?.score}%, premium ₹${plan?.premium}/mo
Explain: 1) Why this plan fits this patient 2) Key benefits 3) Annual cost in ₹ 4) Section 80D deduction 5) One-line bottom line`

  const result = await askAI([{ role: 'user', content: prompt }], system, 600)
  if (result) return result

  const yr = ((plan?.premium || 0) * 12).toLocaleString('en-IN')
  const s80d = (plan?.tier === 'Gold' || plan?.tier === 'Platinum') ? '₹50,000' : plan?.name?.includes('Nivesh') ? '₹75,000' : '₹25,000'
  return `## Why ${plan?.name || 'this plan'} — ${plan?.score || 0}% match\n\nSelected based on your health profile, budget, and healthcare needs.\n\n**Annual premium:** ₹${yr}\n**Section 80D:** Up to ${s80d}/year\n\n**Bottom line:** Best balance of coverage and cost for your profile.`
}

// ── AI Chatbot — real conversational AI ──────────────────────────────────────
export const chatWithAssistant = async (messages, userProfile = null) => {
  const lastMsg = messages[messages.length - 1]?.content || ''

  const system = `You are HIA NEXUS Assistant, a warm, expert Indian healthcare insurance advisor.
Have a genuine conversation — be helpful, clear, and natural. Never sound robotic.
Use ₹ for all amounts. Mention Section 80D tax benefits where relevant.
Never give medical advice. If unsure, say so honestly.

HIA NEXUS Plans (know these well):
- Aarogya Essential: ₹4,500/mo, Bronze, ₹5 Lakh sum insured, ₹1,62,500 deductible
- Aarogya Plus: ₹8,000/mo, Silver PPO, ₹10 Lakh, ₹75,000 deductible — MOST POPULAR
- Suraksha Premium: ₹13,000/mo, Gold, ₹20 Lakh, ₹25,000 deductible
- Suraksha Elite: ₹18,000/mo, Platinum, ₹50 Lakh, ₹0 deductible
- Parivar Shield: ₹17,000/mo, Silver Family Floater, ₹15 Lakh, ₹1,50,000 deductible
- Parivar Complete: ₹27,500/mo, Gold Family Floater, ₹30 Lakh, ₹75,000 deductible
- Chikitsa Care: ₹12,000/mo, Gold Chronic, ₹20 Lakh, ₹12,500 deductible — for chronic conditions
- Nivesh Health: ₹6,000/mo, Bronze HSA, ₹7.5 Lakh — max Section 80D ₹75,000/year

Section 80D: ₹25,000 self+family, ₹50,000 if senior citizen, up to ₹1,00,000 total with parents.
Waiting period: 2-3 years for pre-existing conditions. Buy early.
Cashless: Available at all network hospitals except Aarogya Essential.
${userProfile ? `User context: ${JSON.stringify(userProfile)}` : ''}`

  // Pass full conversation so AI has context
  const result = await askAI(messages, system, 800)
  if (result) return result

  // Fallback to built-in if AI unavailable
  console.warn('[HIA AI] Using built-in fallback for:', lastMsg.slice(0, 50))
  return buildLocalResponse(lastMsg)
}

// ── Built-in knowledge base (instant fallback) ────────────────────────────────
const PLANS = {
  'aarogya essential': { tier:'Bronze',       p:'₹4,500/mo', d:'₹1,62,500', s:'₹5L',   tax:'₹25,000', for:'Young healthy adults, low budget',            feat:'Preventive care free, teleconsultation, ambulance' },
  'aarogya plus':      { tier:'Silver',       p:'₹8,000/mo', d:'₹75,000',   s:'₹10L',  tax:'₹25,000', for:'Families, moderate users, expecting mothers',  feat:'Cashless, mental health, maternity, NCB 20%', hot:true },
  'suraksha premium':  { tier:'Gold',         p:'₹13,000/mo',d:'₹25,000',   s:'₹20L',  tax:'₹50,000', for:'Chronic conditions, frequent users',            feat:'Low deductible, full Rx, dental+vision' },
  'suraksha elite':    { tier:'Platinum',     p:'₹18,000/mo',d:'₹0',        s:'₹50L',  tax:'₹50,000', for:'Complex conditions, maximum protection',        feat:'Zero deductible, concierge, international, AYUSH' },
  'parivar shield':    { tier:'Silver Family',p:'₹17,000/mo',d:'₹1,50,000', s:'₹15L',  tax:'₹25,000', for:'Young families, 1-2 dependents',                feat:'Maternity, newborn, paediatric care, vaccination' },
  'parivar complete':  { tier:'Gold Family',  p:'₹27,500/mo',d:'₹75,000',   s:'₹30L',  tax:'₹50,000', for:'Large families, complex needs',                 feat:'Orthodontics, fertility, ADHD support' },
  'chikitsa care':     { tier:'Gold Chronic', p:'₹12,000/mo',d:'₹12,500',   s:'₹20L',  tax:'₹50,000', for:'Diabetes, heart, cancer, COPD, kidney disease', feat:'Care coordinator, unlimited specialists, monitoring' },
  'nivesh health':     { tier:'Bronze HSA',   p:'₹6,000/mo', d:'₹1,12,500', s:'₹7.5L', tax:'₹75,000', for:'Healthy adults, tax savings, self-employed',    feat:'Max 80D ₹75,000, preventive free, OPD included' },
}

const buildLocalResponse = (q) => {
  const l = q.toLowerCase()
  if (/^(hi|hello|hey|namaste)/.test(l))
    return `Hello! I'm your HIA NEXUS Insurance Assistant.\n\nI can help with:\n- **Plan details** — "Tell me about Aarogya Plus"\n- **Comparisons** — "Compare all plans"\n- **Terms** — "What is a deductible?"\n- **Tax savings** — "How does Section 80D work?"\n- **Recommendations** — "Best plan for diabetes"\n\nWhat would you like to know?`

  const plan = Object.keys(PLANS).find(n => l.includes(n))
  if (plan) {
    const p = PLANS[plan]
    const name = plan.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')
    return `## ${name}${p.hot?' ⭐':''}\n\n| | |\n|---|---|\n| **Tier** | ${p.tier} |\n| **Premium** | ${p.p} |\n| **Deductible** | ${p.d} |\n| **Sum Insured** | ${p.s} |\n| **Section 80D** | Up to ${p.tax}/yr |\n\n**Best for:** ${p.for}\n**Features:** ${p.feat}\n\nAnything specific you'd like to know about this plan?`
  }

  if (/compar|all plan|vs |versus/.test(l))
    return `## All HIA NEXUS Plans\n\n| Plan | Premium | Deductible | Sum Insured |\n|------|---------|------------|-------------|\n| Aarogya Essential | ₹4,500 | ₹1,62,500 | ₹5L |\n| **Aarogya Plus** ⭐ | ₹8,000 | ₹75,000 | ₹10L |\n| Suraksha Premium | ₹13,000 | ₹25,000 | ₹20L |\n| Suraksha Elite | ₹18,000 | ₹0 | ₹50L |\n| Parivar Shield | ₹17,000 | ₹1,50,000 | ₹15L |\n| Parivar Complete | ₹27,500 | ₹75,000 | ₹30L |\n| Chikitsa Care | ₹12,000 | ₹12,500 | ₹20L |\n| Nivesh Health | ₹6,000 | ₹1,12,500 | ₹7.5L |`

  if (/diabet|heart|cancer|kidney|asthma|chronic|hypertension/.test(l))
    return `For chronic conditions, **Chikitsa Care** (₹12,000/mo) is purpose-built:\n- Only ₹12,500 deductible\n- Dedicated care coordinator\n- Unlimited specialist visits\n- ₹20 Lakh sum insured\n- Section 80D: ₹50,000/year`

  if (/family|spouse|child|floater/.test(l))
    return `**Parivar Shield** (₹17,000/mo) — Silver, ₹15L, maternity+newborn\n**Parivar Complete** (₹27,500/mo) — Gold, ₹30L, fertility+orthodontics`

  if (/tax|80d|deduction/.test(l))
    return `**Section 80D:**\n- Self + family: ₹25,000\n- Any member 60+: ₹50,000\n- Parents below 60: +₹25,000\n- Parents 60+: +₹50,000\n- **Max: ₹1,00,000**\n\nBest for tax savings: **Nivesh Health** (₹6,000/mo, ₹75,000 deduction)`

  if (/cheap|afford|budget|low cost/.test(l))
    return `Most affordable:\n1. **Aarogya Essential** — ₹4,500/mo\n2. **Nivesh Health** — ₹6,000/mo + ₹75,000 tax saving\n3. **Aarogya Plus** ⭐ — ₹8,000/mo (best value)`

  if (/best|recommend|which plan|suggest/.test(l))
    return `Quick guide:\n- Healthy, young → **Aarogya Essential** ₹4,500 or **Nivesh Health** ₹6,000\n- Most people → **Aarogya Plus** ⭐ ₹8,000\n- Family → **Parivar Shield** ₹17,000\n- Chronic conditions → **Chikitsa Care** ₹12,000\n- Max coverage → **Suraksha Elite** ₹18,000`

  return `I can answer questions about any HIA NEXUS plan, insurance terms, Section 80D tax benefits, or give plan recommendations.\n\nTry: "Tell me about Aarogya Plus" or "Compare all plans" or "Best plan for a family of 4"`
}