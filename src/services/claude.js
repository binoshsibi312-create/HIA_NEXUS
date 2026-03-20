/**
 * HIA NEXUS — AI Service
 * Direct Groq call with no proxy needed
 * Groq supports CORS for browser requests when using their API
 */

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

// ── Single reliable Groq call ─────────────────────────────────────────────────
const askGroq = async (systemPrompt, userContent, maxTokens = 800) => {
  if (!GROQ_KEY) {
    console.warn('No GROQ key')
    return null
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent  },
        ],
        max_tokens: maxTokens,
        temperature: 0.4,
        stream: false,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq HTTP', response.status, err.slice(0, 200))
      return null
    }

    const data = await response.json()
    return data?.choices?.[0]?.message?.content || null
  } catch (err) {
    console.error('Groq error:', err.message)
    return null
  }
}

// ── Medical document extraction ───────────────────────────────────────────────
export const extractMedicalData = async (documentText, fileNames = []) => {
  const system = `Extract health info from medical documents. Return ONLY valid JSON no markdown:
{"age":null,"gender":null,"bmi":null,"smoker":null,"conditions":[],"chronicConditions":false,"medications":[],"allergies":[],"familyHistory":[],"recentProcedures":[],"mentalHealthDiagnoses":[],"extractedSummary":"summary","dataQuality":"low"}`

  const result = await askGroq(system, `Files: ${fileNames.join(', ')}\n${documentText}\nReturn only JSON.`, 600)

  if (result) {
    try {
      const match = result.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
    } catch (_) {}
  }

  return {
    conditions: [], medications: [], chronicConditions: false,
    extractedSummary: 'Document saved to vault. Complete the questionnaire for your recommendations.',
    dataQuality: 'low',
  }
}

// ── Follow-up questions ───────────────────────────────────────────────────────
export const generateFollowUpQuestions = async () => [
  { id:'q_dependents',     question:'Are you looking for individual coverage, or do you need to cover family members?',                                          type:'multiple_choice', options:['Individual only','Myself + spouse/partner','Myself + children','Full family (myself + spouse + children)'], category:'family',    why:'Determines individual vs family floater eligibility' },
  { id:'q_num_dependents', question:'How many total people (including yourself) would be covered on this plan?',                                                 type:'multiple_choice', options:['Just me (1)','2 people','3 people','4 people','5 or more'],                                                  category:'family',    why:'Affects premium and sum insured calculations' },
  { id:'q_budget',         question:'What is your maximum monthly budget for health insurance premiums?',                                                        type:'multiple_choice', options:['Under ₹5,000/month','₹5,000–₹10,000/month','₹10,000–₹20,000/month','₹20,000–₹35,000/month','Over ₹35,000/month'], category:'financial', why:'Filters plans within affordability range' },
  { id:'q_visit_freq',     question:'How many times per year do you typically visit a doctor or specialist?',                                                    type:'multiple_choice', options:['0–2 visits/year','3–5 visits/year','6–11 visits/year','12+ visits/year'],                                  category:'medical',   why:'High frequency makes lower deductible plans more cost-effective' },
  { id:'q_chronic',        question:'Do you have any ongoing health conditions? (diabetes, hypertension, asthma, thyroid, heart disease)',                      type:'boolean',                                                                                                                           category:'medical',   why:'Chronic conditions affect which tier is most cost-effective' },
  { id:'q_medications',    question:'Do you take any prescription medications on an ongoing basis?',                                                            type:'boolean',                                                                                                                           category:'medical',   why:'Ongoing prescriptions make better Rx coverage more valuable' },
  { id:'q_planned_surgery',question:'Are you expecting any surgeries, procedures, or hospitalisations in the next 12 months?',                                 type:'boolean',                                                                                                                           category:'medical',   why:'Planned procedures make low-deductible plans cheaper overall' },
  { id:'q_deductible_pref',question:'What matters more — a lower monthly premium, or lower costs when you need care? (1=low premium, 10=low deductible)',      type:'scale', min:1, max:10,                                                                                                            category:'financial', why:'Core preference driving Bronze vs Gold vs Platinum' },
  { id:'q_plan_type',      question:'Do you want flexibility to visit any hospital, or are you comfortable with a network of empanelled providers?',            type:'multiple_choice', options:['Full flexibility — any hospital','Network hospitals with cashless treatment','Mix of both','No preference'], category:'coverage', why:'Network vs open access is fundamental' },
  { id:'q_mental_health',  question:'Do you currently use or anticipate needing mental health services? (therapy, psychiatry, counselling)',                    type:'boolean',                                                                                                                           category:'coverage',  why:'Mental health coverage varies significantly between plans' },
  { id:'q_hsa',            question:'Are you interested in a tax-saving health plan with Section 80D benefits up to ₹75,000/year?',                           type:'boolean',                                                                                                                           category:'financial', why:'Tax-linked plans offer significant income tax benefits' },
  { id:'q_pregnancy',      question:'Are you currently pregnant or planning a pregnancy within the next 12–18 months?',                                        type:'boolean',                                                                                                                           category:'coverage',  why:'Maternity coverage varies dramatically between plans' },
  { id:'q_employer_plan',  question:'Does your employer contribute to your health insurance costs?',                                                            type:'multiple_choice', options:['Yes — full premium','Yes — partial premium','No — I pay myself','Self-employed','Student'],           category:'financial', why:'Employer contributions reduce your actual cost' },
  { id:'q_specialists',    question:'Do you regularly need access to specialists? (cardiologist, oncologist, neurologist, etc.)',                              type:'boolean',                                                                                                                           category:'coverage',  why:'Specialist access differs greatly between plan types' },
  { id:'q_dental_vision',  question:'How important is dental and vision coverage to you?',                                                                      type:'multiple_choice', options:['Very important — need both','Dental priority','Vision priority','Have separate coverage','Not a priority'], category:'coverage', why:'Dental/vision add-ons affect overall value' },
]

// ── AI reasoning ──────────────────────────────────────────────────────────────
export const generateInsuranceReasoning = async (healthProfile, mlScores, recommendedPlans) => {
  const plan = recommendedPlans?.[0]

  const system = `You are HIA NEXUS, an expert Indian healthcare insurance advisor. Write concise personalised reasoning in markdown under 250 words. Use ₹. Mention Section 80D.`
  const prompt = `Patient: ${JSON.stringify(healthProfile)}
Plan: ${plan?.name}, score ${plan?.score}%, premium ₹${plan?.premium}/mo
Explain: why this plan fits, key benefits, annual cost, Section 80D deduction, bottom line.`

  const result = await askGroq(system, prompt, 600)
  if (result) return result

  // Fallback
  const yr = ((plan?.premium || 0) * 12).toLocaleString('en-IN')
  const s80d = (plan?.tier === 'Gold' || plan?.tier === 'Platinum') ? '₹50,000' : plan?.name?.includes('Nivesh') ? '₹75,000' : '₹25,000'
  return `## Why ${plan?.name || 'this plan'} — ${plan?.score || 0}% match\n\nSelected based on your health profile, budget, and healthcare needs.\n\n**Annual premium:** ₹${yr}\n**Section 80D deduction:** Up to ${s80d}/year\n\n**Bottom line:** Best balance of coverage and cost for your profile.`
}

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const chatWithAssistant = async (messages, userProfile = null) => {
  const lastMsg = messages[messages.length - 1]?.content || ''

  const system = `You are HIA NEXUS Assistant, an expert Indian healthcare insurance advisor.
Be conversational, warm, helpful. Use ₹ for amounts. Mention Section 80D where relevant.
Never give medical advice. Always answer completely.

HIA NEXUS Plans:
- Aarogya Essential: ₹4,500/mo Bronze, ₹5L sum insured, ₹1,62,500 deductible
- Aarogya Plus: ₹8,000/mo Silver, ₹10L, ₹75,000 deductible (most popular)
- Suraksha Premium: ₹13,000/mo Gold, ₹20L, ₹25,000 deductible
- Suraksha Elite: ₹18,000/mo Platinum, ₹50L, zero deductible
- Parivar Shield: ₹17,000/mo Silver family, ₹15L, ₹1,50,000 deductible
- Parivar Complete: ₹27,500/mo Gold family, ₹30L, ₹75,000 deductible
- Chikitsa Care: ₹12,000/mo Gold chronic, ₹20L, ₹12,500 deductible
- Nivesh Health: ₹6,000/mo Bronze HSA, ₹7.5L, max Section 80D ₹75,000
Section 80D: ₹25,000 self, ₹50,000 seniors, ₹1,00,000 max with parents.`

  // Build conversation for Groq — flatten to single user message to avoid turn issues
  const history = messages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')
  const userContent = messages.length > 1
    ? `Conversation so far:\n${history}\n\nPlease respond to the last user message.`
    : lastMsg

  const result = await askGroq(system, userContent, 800)
  if (result) return result

  return buildLocalResponse(lastMsg)
}

// ── Built-in fallback (zero API) ──────────────────────────────────────────────
const PLANS = {
  'aarogya essential': { tier:'Bronze',       premium:'₹4,500/mo',  ded:'₹1,62,500', sum:'₹5L',   s80d:'₹25,000', for:'Young healthy adults, low budget',              feat:'Preventive care free, teleconsultation, ambulance' },
  'aarogya plus':      { tier:'Silver',       premium:'₹8,000/mo',  ded:'₹75,000',   sum:'₹10L',  s80d:'₹25,000', for:'Families, moderate users, expecting mothers',    feat:'Cashless network, mental health, maternity, NCB 20%', hot:true },
  'suraksha premium':  { tier:'Gold',         premium:'₹13,000/mo', ded:'₹25,000',   sum:'₹20L',  s80d:'₹50,000', for:'Chronic conditions, frequent users',              feat:'Low deductible, comprehensive Rx, dental+vision' },
  'suraksha elite':    { tier:'Platinum',     premium:'₹18,000/mo', ded:'₹0',        sum:'₹50L',  s80d:'₹50,000', for:'Complex conditions, maximum protection',          feat:'Zero deductible, concierge, international, AYUSH' },
  'parivar shield':    { tier:'Silver Family',premium:'₹17,000/mo', ded:'₹1,50,000', sum:'₹15L',  s80d:'₹25,000', for:'Young families, 1-2 dependents',                  feat:'Maternity, newborn, paediatric dental+vision' },
  'parivar complete':  { tier:'Gold Family',  premium:'₹27,500/mo', ded:'₹75,000',   sum:'₹30L',  s80d:'₹50,000', for:'Large families, complex needs',                   feat:'Orthodontics, fertility, ADHD support' },
  'chikitsa care':     { tier:'Gold Chronic', premium:'₹12,000/mo', ded:'₹12,500',   sum:'₹20L',  s80d:'₹50,000', for:'Diabetes, heart, cancer, COPD, kidney disease',   feat:'Care coordinator, unlimited specialists, monitoring' },
  'nivesh health':     { tier:'Bronze HSA',   premium:'₹6,000/mo',  ded:'₹1,12,500', sum:'₹7.5L', s80d:'₹75,000', for:'Healthy adults, tax savings, self-employed',       feat:'Max 80D ₹75,000, preventive free, OPD included' },
}
const TERMS = {
  'deductible':        'Amount you pay before insurance kicks in. ₹75,000 deductible means you pay the first ₹75,000 of hospitalisation.',
  'sum insured':       'Max your insurer pays per year. Choose ₹10–15L minimum in metro cities.',
  'premium':           'Monthly amount you pay to keep insurance active.',
  'copay':             'Fixed fee per visit (e.g. ₹750/consultation).',
  'no-claim bonus':    'Sum insured grows 10–20% per claim-free year at no extra cost.',
  'cashless treatment':'Treatment at network hospitals with insurer paying directly — no upfront payment.',
  'family floater':    'One policy for all family members sharing one sum insured.',
  'waiting period':    '2–3 years before pre-existing conditions are covered. Buy early.',
  'section 80d':       'Tax deduction: ₹25,000 self+family, ₹50,000 if senior citizen, ₹1,00,000 max with parents.',
  'room rent limit':   'Cap on hospital room cost. Exceeding it means paying the difference proportionally.',
}

const buildLocalResponse = (q) => {
  const l = q.toLowerCase()

  if (/^(hi|hello|hey|namaste)/.test(l))
    return `Hello! I'm your HIA NEXUS Insurance Assistant.\n\nI can help with:\n- **Plan details** — "Tell me about Aarogya Plus"\n- **Comparisons** — "Compare all plans"\n- **Terms** — "What is a deductible?"\n- **Tax** — "How does Section 80D work?"\n- **Recommendations** — "Best plan for diabetes"\n\nWhat would you like to know?`

  const plan = Object.keys(PLANS).find(n => l.includes(n))
  if (plan) {
    const p = PLANS[plan]
    const name = plan.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')
    return `## ${name} ${p.hot?'⭐':''}\n\n| Detail | Value |\n|---|---|\n| Tier | ${p.tier} |\n| Premium | ${p.premium} |\n| Deductible | ${p.ded} |\n| Sum Insured | ${p.sum} |\n| Section 80D | Up to ${p.s80d}/yr |\n\n**Best for:** ${p.for}\n**Features:** ${p.feat}`
  }

  const term = Object.keys(TERMS).find(t => l.includes(t))
  if (term) return `**${term.charAt(0).toUpperCase()+term.slice(1)}:** ${TERMS[term]}`

  if (/compar|vs |versus|all plan/.test(l))
    return `## All Plans\n\n| Plan | Premium | Deductible | Sum Insured |\n|------|---------|------------|-------------|\n| Aarogya Essential | ₹4,500 | ₹1,62,500 | ₹5L |\n| **Aarogya Plus** ⭐ | ₹8,000 | ₹75,000 | ₹10L |\n| Suraksha Premium | ₹13,000 | ₹25,000 | ₹20L |\n| Suraksha Elite | ₹18,000 | ₹0 | ₹50L |\n| Parivar Shield | ₹17,000 | ₹1,50,000 | ₹15L |\n| Parivar Complete | ₹27,500 | ₹75,000 | ₹30L |\n| Chikitsa Care | ₹12,000 | ₹12,500 | ₹20L |\n| Nivesh Health | ₹6,000 | ₹1,12,500 | ₹7.5L |`

  if (/diabet|heart|cancer|kidney|asthma|chronic|hypertension/.test(l))
    return `For chronic conditions, **Chikitsa Care** (₹12,000/mo) is purpose-built:\n- Only ₹12,500 deductible\n- Dedicated care coordinator\n- Unlimited specialist visits\n- ₹20 Lakh sum insured\n- Section 80D: ₹50,000/year`

  if (/family|spouse|child|floater/.test(l))
    return `**Parivar Shield** (₹17,000/mo) — Silver family floater, ₹15L, maternity+newborn included\n**Parivar Complete** (₹27,500/mo) — Gold family floater, ₹30L, fertility+orthodontics included`

  if (/tax|80d|deduction/.test(l))
    return `**Section 80D deductions:**\n- Self + family: ₹25,000\n- Any member 60+: ₹50,000\n- Parents below 60: +₹25,000\n- Parents 60+: +₹50,000\n- **Max total: ₹1,00,000**\n\nBest plan for tax savings: **Nivesh Health** — ₹75,000 deduction at ₹6,000/mo.`

  if (/cheap|afford|low premium|budget/.test(l))
    return `Most affordable options:\n1. **Aarogya Essential** — ₹4,500/mo\n2. **Nivesh Health** — ₹6,000/mo (+ ₹75,000 tax saving)\n3. **Aarogya Plus** ⭐ — ₹8,000/mo (best value)`

  if (/best|recommend|which|suggest/.test(l))
    return `Quick guide:\n- Rarely need care → **Aarogya Essential** ₹4,500 or **Nivesh Health** ₹6,000\n- Most people → **Aarogya Plus** ⭐ ₹8,000\n- Family → **Parivar Shield** ₹17,000\n- Chronic conditions → **Chikitsa Care** ₹12,000\n- Maximum coverage → **Suraksha Elite** ₹18,000\n\nFor personalised match, use **Health Analysis** in the menu.`

  return `I can answer questions about:\n- Any specific plan ("Tell me about Aarogya Plus")\n- All plans ("Compare all plans")\n- Terms ("What is a deductible?")\n- Tax ("Section 80D benefits")\n- Recommendations ("Best plan for diabetes")\n\nWhat would you like to know?`
}