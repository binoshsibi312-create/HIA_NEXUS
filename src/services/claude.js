/**
 * HIA NEXUS — AI Service
 * Primary: Groq API (free, works globally including India, 14,400 req/day)
 * Secondary: Gemini direct (if Groq unavailable)
 * Fallback: Built-in knowledge base (always works, no API)
 */

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

// ── Groq caller — direct browser call, 15s timeout ──────────────────────────
const callGroq = async (messages, systemPrompt, maxTokens = 1000) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout

  try {
    const res = await fetch(GROQ_BASE, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature: 0.4,
      }),
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.error?.message || `Groq HTTP ${res.status}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (err) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') throw new Error('Request timed out after 15 seconds')
    throw err
  }
}

// ── Gemini caller (direct, no proxy) ─────────────────────────────────────────
const callGemini = async (userPrompt, systemPrompt, maxTokens = 1000) => {
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-8b']
  for (const model of models) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
        }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch (_) { continue }
  }
  return null
}

// ── Primary AI caller — tries Groq then Gemini ───────────────────────────────
const callAI = async (messages, systemPrompt, maxTokens = 1000) => {
  // Try Groq first (most reliable free tier globally)
  if (GROQ_KEY) {
    try {
      const result = await callGroq(messages, systemPrompt, maxTokens)
      if (result) return result
    } catch (err) {
      console.warn('Groq failed, trying Gemini:', err.message)
    }
  }
  // Try Gemini as secondary
  if (GEMINI_KEY) {
    const lastMsg = messages[messages.length - 1]?.content || ''
    const result = await callGemini(lastMsg, systemPrompt, maxTokens)
    if (result) return result
  }
  // Both failed
  return null
}

// ── Built-in knowledge base (zero API dependency) ────────────────────────────
const PLAN_DB = {
  'aarogya essential': { tier:'Bronze', premium:'₹4,500/mo', deductible:'₹1,62,500', sumInsured:'₹5 Lakh', copay:'₹1,000 consultation', section80D:'₹25,000', bestFor:'Young healthy adults, low budget, rarely need care', features:'Preventive care free, teleconsultation, 24/7 helpline, ambulance cover' },
  'aarogya plus': { tier:'Silver', premium:'₹8,000/mo', deductible:'₹75,000', sumInsured:'₹10 Lakh', copay:'₹750 consultation', section80D:'₹25,000', bestFor:'Families, moderate healthcare users, expecting mothers', features:'Open network hospitals, mental health, maternity, cashless treatment, no-claim bonus 20%', popular:true },
  'suraksha premium': { tier:'Gold', premium:'₹13,000/mo', deductible:'₹25,000', sumInsured:'₹20 Lakh', copay:'₹500 consultation', section80D:'₹50,000', bestFor:'Chronic conditions, frequent users, planned procedures', features:'Low deductible, comprehensive medicine, dental+vision add-ons, physiotherapy 30 sessions/yr' },
  'suraksha elite': { tier:'Platinum', premium:'₹18,000/mo', deductible:'₹0', sumInsured:'₹50 Lakh', copay:'₹250 consultation', section80D:'₹50,000', bestFor:'Complex conditions, maximum protection, cancer treatment', features:'Zero deductible, concierge medicine, international coverage, unlimited specialists, AYUSH cover' },
  'parivar shield': { tier:'Silver Family Floater', premium:'₹17,000/mo', deductible:'₹1,50,000', sumInsured:'₹15 Lakh', copay:'₹625 consultation', section80D:'₹25,000', bestFor:'Young families, 1-2 dependents, budget-conscious families', features:'Paediatric dental+vision, maternity+newborn, family therapy, well-child visits free, vaccination cover' },
  'parivar complete': { tier:'Gold Family Floater', premium:'₹27,500/mo', deductible:'₹75,000', sumInsured:'₹30 Lakh', copay:'₹375 consultation', section80D:'₹50,000', bestFor:'Large families (3+ kids), families with chronic needs', features:'Gold coverage, orthodontics, fertility treatments, ADHD+behavioural health' },
  'chikitsa care': { tier:'Gold Specialised', premium:'₹12,000/mo', deductible:'₹12,500', sumInsured:'₹20 Lakh', copay:'₹375 consultation', section80D:'₹50,000', bestFor:'Diabetes, heart disease, cancer, autoimmune, COPD, kidney disease', features:'Chronic disease management, dedicated care coordinator, unlimited specialists, medicine discounts, remote monitoring' },
  'nivesh health': { tier:'Bronze Tax-Saving', premium:'₹6,000/mo', deductible:'₹1,12,500', sumInsured:'₹7.5 Lakh', copay:'₹0 (pay till deductible)', section80D:'₹75,000', bestFor:'Healthy adults, tax savings seekers, self-employed, rarely need care', features:'Section 80D up to ₹75,000, tax-free savings, preventive care free, OPD included' },
}

const TERMS_DB = {
  deductible: 'The amount you pay out-of-pocket before your insurance starts covering costs. Lower deductible = higher premium. Example: With a ₹75,000 deductible, you pay the first ₹75,000 of hospitalisation costs yourself.',
  'sum insured': 'The maximum your insurer pays per policy year. Choose based on your city — metro cities like Mumbai/Delhi need at least ₹10-15 Lakh due to higher hospital costs.',
  premium: 'The monthly or annual amount you pay to keep your insurance active, regardless of whether you use it.',
  copay: 'A fixed amount you pay for each doctor visit or service, even after meeting your deductible. Example: ₹750 per consultation.',
  coinsurance: 'After your deductible, you pay a percentage (e.g. 20%) and insurance pays the rest (80%). Platinum plans have lower coinsurance.',
  'no-claim bonus': 'A reward for not making claims — your sum insured increases by 10-20% per year at no extra cost.',
  'cashless treatment': 'Get treated at network hospitals without paying upfront — the insurer settles directly with the hospital. You only pay for non-covered items.',
  'family floater': 'One policy covering all family members under one shared sum insured. Cost-effective but the full sum insured is shared among all members.',
  'waiting period': '2-4 years after policy start during which pre-existing conditions are not covered. Buy early to get this period over sooner.',
  'pre-existing disease': 'Any condition diagnosed before buying the policy. Covered after the waiting period under IRDAI regulations.',
  'section 80d': 'Income tax deduction: ₹25,000 for self+family, ₹50,000 if a member is senior citizen, up to ₹1,00,000 total including parents. Preventive health check-ups up to ₹5,000 included.',
  'room rent limit': 'Some plans cap hospital room rent (e.g. ₹5,000/day). If you choose a costlier room, you pay the difference proportionally for all charges.',
  'ayushman bharat': 'Government scheme providing ₹5 Lakh free coverage to economically weaker families. Check eligibility at pmjay.gov.in.',
  'critical illness': 'Pays a lump sum on diagnosis of serious conditions like cancer, heart attack, stroke. Separate from regular health insurance.',
  'top-up plan': 'Activates after your base policy sum insured is exhausted. Much cheaper than increasing your base policy.',
  irdai: 'Insurance Regulatory and Development Authority of India — regulates all insurers. Ensures claim settlement ratios and policy standards.',
}

const buildLocalResponse = (userMessage) => {
  const q = userMessage.toLowerCase().trim()

  // Greeting
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|namaste|hii|helo)/.test(q)) {
    return `Hello! I'm the HIA NEXUS AI Assistant — your personal healthcare insurance advisor.\n\nI can help you with:\n- **Plan details** — ask about any of our 8 plans\n- **Comparisons** — "compare Aarogya Plus vs Suraksha Premium"\n- **Insurance terms** — deductible, sum insured, cashless, Section 80D\n- **Recommendations** — "which plan for diabetes?" or "best plan for family of 4"\n- **Tax benefits** — Section 80D deductions explained\n\nWhat would you like to know?`
  }

  // Plan lookup
  const plan = Object.keys(PLAN_DB).find(n => q.includes(n))
  if (plan) {
    const p = PLAN_DB[plan]
    const name = plan.split(' ').map(w => w[0].toUpperCase()+w.slice(1)).join(' ')
    return `## ${name} ${p.popular ? '⭐ Most Popular' : ''}\n\n| Detail | Value |\n|--------|-------|\n| **Tier** | ${p.tier} |\n| **Monthly Premium** | ${p.premium} |\n| **Deductible** | ${p.deductible} |\n| **Sum Insured** | ${p.sumInsured} |\n| **Consultation Copay** | ${p.copay} |\n| **Section 80D Benefit** | Up to ${p.section80D}/year |\n\n**Best For:** ${p.bestFor}\n\n**Key Features:** ${p.features}\n\nWould you like to compare this with another plan, or do you have questions about specific coverage?`
  }

  // Term definition
  const term = Object.keys(TERMS_DB).find(t => q.includes(t))
  if (term) {
    const name = term.charAt(0).toUpperCase() + term.slice(1)
    return `**${name}**\n\n${TERMS_DB[term]}\n\nWould you like to know how this affects which HIA NEXUS plan suits you best?`
  }

  // Compare intent
  if (q.includes('compar') || q.includes(' vs ') || q.includes('versus') || q.includes('difference between') || q.includes('better')) {
    return `## All HIA NEXUS Plans — Quick Comparison\n\n| Plan | Tier | Premium | Deductible | Sum Insured | 80D |\n|------|------|---------|-----------|------------|-----|\n| Aarogya Essential | Bronze | ₹4,500/mo | ₹1,62,500 | ₹5 Lakh | ₹25,000 |\n| Aarogya Plus ⭐ | Silver | ₹8,000/mo | ₹75,000 | ₹10 Lakh | ₹25,000 |\n| Suraksha Premium | Gold | ₹13,000/mo | ₹25,000 | ₹20 Lakh | ₹50,000 |\n| Suraksha Elite | Platinum | ₹18,000/mo | ₹0 | ₹50 Lakh | ₹50,000 |\n| Parivar Shield | Silver Family | ₹17,000/mo | ₹1,50,000 | ₹15 Lakh | ₹25,000 |\n| Parivar Complete | Gold Family | ₹27,500/mo | ₹75,000 | ₹30 Lakh | ₹50,000 |\n| Chikitsa Care | Gold Chronic | ₹12,000/mo | ₹12,500 | ₹20 Lakh | ₹50,000 |\n| Nivesh Health | Bronze HSA | ₹6,000/mo | ₹1,12,500 | ₹7.5 Lakh | ₹75,000 |\n\n**Key rule:** Lower premium → higher deductible (you pay more when hospitalised). Higher premium → lower deductible (insurer covers more from day one).\n\nAsk me about any specific plan for full details!`
  }

  // Chronic conditions
  if (/diabet|heart|cancer|kidney|asthma|copd|autoimmune|chronic|thyroid|hypertension|blood pressure/.test(q)) {
    return `For chronic or serious conditions, **Chikitsa Care** is specifically designed for you:\n\n- **₹12,000/month** with only ₹12,500 deductible\n- **Dedicated care coordinator** — manages your treatment plan\n- **Unlimited specialist visits** — no referral limits\n- **Disease-specific medicine discounts**\n- **Remote health monitoring devices**\n- **₹20 Lakh sum insured**\n- **Section 80D:** ₹50,000/year tax deduction\n\nIf budget allows, **Suraksha Elite** (₹18,000/mo, ₹0 deductible) gives maximum coverage with zero out-of-pocket at the time of care.\n\nBoth plans cover pre-existing conditions after the waiting period under IRDAI regulations.`
  }

  // Family plans
  if (/family|wife|husband|spouse|child|children|dependent|floater|parivar/.test(q)) {
    return `## Family Coverage Options\n\n**Parivar Shield (Silver Family Floater) — ₹17,000/month**\n- Sum insured: ₹15 Lakh shared among all members\n- Maternity, newborn care, paediatric dental+vision\n- Best for: Families with 1-2 dependents\n\n**Parivar Complete (Gold Family Floater) — ₹27,500/month**\n- Sum insured: ₹30 Lakh shared\n- Everything in Shield + orthodontics, fertility treatments, ADHD/behavioural health\n- Best for: Larger families or higher healthcare needs\n\n**Important:** Family floaters share one sum insured. If one member has a serious illness and uses most of it, less remains for others. For families where multiple members have significant health conditions, individual plans may be safer.\n\n**Section 80D:** Premiums for self+family qualify for up to ₹25,000 tax deduction (₹50,000 if any member is a senior citizen).`
  }

  // Tax / Section 80D
  if (/tax|80d|section 80|deduction|save tax|income tax|80 d/.test(q)) {
    return `## Section 80D — Health Insurance Tax Benefits\n\n| Coverage | Max Deduction |\n|----------|---------------|\n| Self + family (all below 60) | ₹25,000 |\n| Self + family (any member 60+) | ₹50,000 |\n| Parents below 60 | + ₹25,000 |\n| Parents 60+ (senior citizens) | + ₹50,000 |\n| **Maximum total** | **₹1,00,000** |\n\n**Preventive health check-ups** — up to ₹5,000 included within these limits.\n\n**HIA NEXUS 80D benefits:**\n- Nivesh Health → **₹75,000** (highest)\n- Suraksha Premium/Elite, Chikitsa Care, Parivar Complete → ₹50,000\n- All other plans → ₹25,000\n\n**Example:** If you're in the 30% tax bracket and pay ₹8,000/month (₹96,000/year) for Aarogya Plus, you save ₹7,500 in taxes (₹25,000 × 30%). Effective annual cost becomes ₹88,500.`
  }

  // Affordable / budget
  if (/cheap|afford|low premium|budget|low cost|expensive|price|cost/.test(q)) {
    return `## Most Affordable HIA NEXUS Plans\n\n**1. Aarogya Essential — ₹4,500/month**\n- Lowest premium, ₹5 Lakh sum insured\n- ₹1,62,500 deductible — you pay the first ₹1,62,500 yourself\n- Best if you're young, healthy, and rarely need care\n\n**2. Nivesh Health — ₹6,000/month**\n- Low premium + highest Section 80D benefit (₹75,000/year)\n- Effective cost after tax savings can be significantly lower\n- Best for self-employed or high-income earners\n\n**3. Aarogya Plus — ₹8,000/month** ⭐\n- Best value — good coverage at reasonable cost\n- ₹75,000 deductible, ₹10 Lakh sum insured\n- Most popular plan overall\n\n**Key insight:** Lower premium always means higher deductible and lower sum insured. Choose based on how often you use healthcare, not just the monthly cost.`
  }

  // Cashless / network / hospital
  if (/cashless|network hospital|hospital|empanell|admission/.test(q)) {
    return `## Cashless Hospitalisation — How It Works\n\n**Step 1:** Check if your hospital is in the insurer's network (use the app or website)\n**Step 2:** At admission, show your health card and photo ID\n**Step 3:** Hospital fills the pre-authorisation form and submits to insurer\n**Step 4:** Insurer approves within 2-4 hours (immediately for emergencies)\n**Step 5:** Insurer settles the bill directly — you only pay non-covered items\n\n**For non-network hospitals:** Pay upfront and file a reimbursement claim within 30 days with original bills.\n\n**Which plans have best network access:**\n- **Suraksha Elite** — widest network including international hospitals\n- **Chikitsa Care** — priority processing for chronic condition treatments\n- **Parivar Shield/Complete** — strong paediatric and maternity network\n\n**Aarogya Essential** is the only plan without full cashless network access.`
  }

  // Maternity
  if (/maternit|pregnant|pregnanc|baby|newborn|deliver|garbh/.test(q)) {
    return `## Maternity Coverage in HIA NEXUS\n\n**Plans with maternity benefits:**\n\n| Plan | Premium | Maternity Coverage |\n|------|---------|--------------------|\n| Aarogya Plus | ₹8,000/mo | Normal + C-section delivery, newborn |\n| Parivar Shield | ₹17,000/mo | Full maternity, newborn, paediatric care |\n| Parivar Complete | ₹27,500/mo | Above + fertility treatments, IVF |\n\n**Important things to know:**\n- Most plans have a **waiting period of 9-24 months** before maternity kicks in\n- Covers: pre-natal, delivery (normal + C-section), post-natal, newborn care for first 90 days\n- **Buy the plan as early as possible** to complete the waiting period before you need it\n\n**If already pregnant:** Aarogya Plus has the shortest waiting period for maternity among individual plans.`
  }

  // How it works / platform
  if (/how does|how do|what is hia|about hia|platform|work|feature|upload|vault|analysis|recommend/.test(q)) {
    return `## How HIA NEXUS Works\n\n**1. Upload Medical Documents**\nUpload lab reports, prescriptions, discharge summaries. AI reads and extracts your health profile automatically.\n\n**2. Answer 15 Smart Questions**\nEvidence-based insurance underwriting questions covering your budget, family size, health conditions, and lifestyle. Takes about 3 minutes.\n\n**3. ML Model Scores All Plans**\nAn XGBoost model trained on 8,000 patient profiles scores all 8 HIA NEXUS plans based on your profile.\n\n**4. AI Explains the Reasoning**\nPersonalised explanation of why each plan was recommended, with financial breakdown in ₹ and Section 80D benefits.\n\n**5. Secure Medical Vault**\nAll documents encrypted, accessible only via PIN + OTP verification. Only you can view your records.\n\n**6. AI Chatbot (that's me!)**\nAsk anything about plans, coverage, premiums, insurance terminology, or tax benefits — anytime.\n\nReady to start? Click **Health Analysis** in the navigation menu.`
  }

  // Best / recommendation intent
  if (/best|recommend|suggest|which plan|should i|right for me|suit/.test(q)) {
    return `The best plan depends entirely on your situation. Here's a quick guide:\n\n**Young & healthy, rarely need care:** Aarogya Essential (₹4,500) or Nivesh Health (₹6,000 + max tax savings)\n\n**Most people — good balance:** Aarogya Plus ⭐ (₹8,000) — best value overall\n\n**Family coverage:** Parivar Shield (₹17,000) for smaller families, Parivar Complete (₹27,500) for larger ones\n\n**Chronic conditions:** Chikitsa Care (₹12,000) — purpose-built for ongoing disease management\n\n**Maximum protection:** Suraksha Premium (₹13,000) or Suraksha Elite (₹18,000)\n\n**Maximum tax savings:** Nivesh Health (₹6,000) — up to ₹75,000 Section 80D deduction\n\n**For a fully personalised recommendation**, use the **Health Analysis** feature — our ML model analyses your specific health profile and gives you a ranked list with AI reasoning.`
  }

  // Waiting period / pre-existing
  if (/waiting|pre.existing|existing condition|pre existing/.test(q)) {
    return `## Waiting Periods in Health Insurance\n\n**Pre-existing disease waiting period:** 2-4 years from policy start date. During this time, conditions you had before buying the policy are not covered.\n\n**IRDAI 2024 update:** Maximum waiting period for pre-existing diseases reduced to **3 years** for all policies.\n\n**Other waiting periods:**\n- Initial waiting period: 30 days (no claims for first 30 days except accidents)\n- Specific disease waiting period: 1-2 years for conditions like hernia, cataract, knee replacement\n- Maternity: 9-24 months depending on plan\n\n**Key tip:** Buy health insurance when you're young and healthy — complete the waiting period before you develop conditions that need coverage.\n\n**HIA NEXUS plans:** All plans follow IRDAI standard waiting period guidelines. Chikitsa Care has a specialised track for chronic conditions with faster activation.`
  }

  // Generic fallback — still informative
  return `I understand you're asking about: *"${userMessage}"*\n\nLet me help you navigate HIA NEXUS. Here are the most common things people ask me:\n\n**Plan information:**\n- "Tell me about Aarogya Plus"\n- "What does Chikitsa Care cover?"\n- "Compare all plans"\n\n**Concepts:**\n- "What is a deductible?"\n- "How does cashless treatment work?"\n- "Explain Section 80D tax benefits"\n\n**Recommendations:**\n- "Which plan is best for diabetes?"\n- "Best plan for a family of 4"\n- "Most affordable plan"\n\n**The platform:**\n- "How does HIA NEXUS work?"\n- "How is the AI recommendation generated?"\n\nCould you rephrase your question using one of these formats? I want to give you the most accurate answer.`
}

// ── Public API ────────────────────────────────────────────────────────────────

export const extractMedicalData = async (documentText, fileNames = []) => {
  const system = `You are a clinical data extraction AI. Extract health info from medical documents. Return ONLY valid JSON with no markdown: {"age":null,"gender":null,"bmi":null,"smoker":null,"conditions":[],"chronicConditions":false,"medications":[],"allergies":[],"familyHistory":[],"recentProcedures":[],"mentalHealthDiagnoses":[],"extractedSummary":"summary","dataQuality":"high|medium|low"}`
  const userMsg = `Files: ${fileNames.join(', ') || 'document'}\nContent: ${documentText}\nReturn only JSON.`
  const result = await callAI([{ role: 'user', content: userMsg }], system, 800)
  if (result) {
    try {
      const match = result.replace(/```json|```/g, '').trim().match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
    } catch (_) {}
  }
  return { conditions: [], medications: [], chronicConditions: false, extractedSummary: 'Document saved to vault. Complete the questionnaire for your recommendations.', dataQuality: 'low' }
}

export const generateFollowUpQuestions = async () => {
  return [
    { id:'q_dependents', question:'Are you looking for individual coverage, or do you need to cover family members?', type:'multiple_choice', options:['Individual only','Myself + spouse/partner','Myself + children','Full family (myself + spouse + children)'], category:'family', why:'Determines individual vs family floater plan eligibility' },
    { id:'q_num_dependents', question:'How many total people (including yourself) would be covered on this plan?', type:'multiple_choice', options:['Just me (1)','2 people','3 people','4 people','5 or more'], category:'family', why:'Family size directly affects premium and sum insured calculations' },
    { id:'q_budget', question:'What is your maximum monthly budget for health insurance premiums?', type:'multiple_choice', options:['Under ₹5,000/month','₹5,000–₹10,000/month','₹10,000–₹20,000/month','₹20,000–₹35,000/month','Over ₹35,000/month'], category:'financial', why:'Filters plans within your affordability range' },
    { id:'q_visit_freq', question:'How many times per year do you typically visit a doctor, specialist, or clinic?', type:'multiple_choice', options:['0–2 visits/year (rarely)','3–5 visits/year (occasionally)','6–11 visits/year (regularly)','12+ visits/year (very frequently)'], category:'medical', why:'High visit frequency makes lower deductible plans more cost-effective' },
    { id:'q_chronic', question:'Do you have any ongoing health conditions requiring regular medical attention? (e.g., diabetes, hypertension, asthma, thyroid disease, heart disease)', type:'boolean', category:'medical', why:'Chronic conditions significantly affect which plan tier is most cost-effective' },
    { id:'q_medications', question:'Do you take any prescription medications on an ongoing basis?', type:'boolean', category:'medical', why:'Ongoing prescriptions make better medicine coverage more valuable' },
    { id:'q_planned_surgery', question:'Are you expecting any surgeries, procedures, or hospitalisations in the next 12 months?', type:'boolean', category:'medical', why:'Planned procedures make low-deductible plans significantly cheaper overall' },
    { id:'q_deductible_pref', question:'What matters more to you — a lower monthly premium or lower costs when you actually need care?', type:'scale', min:1, max:10, category:'financial', why:'1 = prefer low premium, 10 = prefer low out-of-pocket when using care' },
    { id:'q_plan_type', question:'Do you want flexibility to visit any hospital, or are you comfortable with a network of empanelled providers?', type:'multiple_choice', options:['Full flexibility — any hospital anytime','Network hospitals with cashless treatment','Mix of both','No strong preference'], category:'coverage', why:'Network vs open access is a fundamental plan architecture decision' },
    { id:'q_mental_health', question:'Do you currently use or anticipate needing mental health services? (therapy, psychiatry, counselling)', type:'boolean', category:'coverage', why:'Mental health coverage and session limits vary significantly between plans' },
    { id:'q_hsa', question:'Are you interested in a tax-saving health plan with Section 80D benefits of up to ₹75,000/year?', type:'boolean', category:'financial', why:'Tax-linked health savings plans offer significant income tax benefits' },
    { id:'q_pregnancy', question:'Are you currently pregnant or planning a pregnancy within the next 12–18 months?', type:'boolean', category:'coverage', why:'Maternity and newborn care coverage varies dramatically between plans' },
    { id:'q_employer_plan', question:'Does your employer contribute to your health insurance costs?', type:'multiple_choice', options:['Yes — employer pays full premium','Yes — employer pays part of premium','No — I pay 100% myself','Self-employed / freelancer / business owner','Student / not currently employed'], category:'financial', why:'Employer contributions significantly reduce your actual out-of-pocket cost' },
    { id:'q_specialists', question:'Do you regularly need access to specialists? (cardiologist, endocrinologist, oncologist, etc.)', type:'boolean', category:'coverage', why:'Specialist access and referral requirements differ greatly between plan types' },
    { id:'q_dental_vision', question:'How important is dental and vision coverage being included in your plan?', type:'multiple_choice', options:['Very important — I need both','Dental coverage is my priority','Vision coverage is my priority','Not important — I have separate coverage','Not a priority right now'], category:'coverage', why:'Dental and vision add-ons affect overall value comparison' },
  ]
}

export const generateInsuranceReasoning = async (healthProfile, mlScores, recommendedPlans) => {
  const plan = recommendedPlans?.[0]
  const system = `You are HIA NEXUS, an expert Indian healthcare insurance advisor. Explain in markdown (under 300 words) why this plan suits this patient. Use Indian Rupee symbol for amounts. Mention Section 80D tax benefit. Be specific, practical and empathetic.`
  const prompt = `Patient health profile: ${JSON.stringify(healthProfile)}
Recommended plan: ${JSON.stringify(plan)}
ML match score: ${plan?.score || 0}%

Write a personalised explanation covering:
1. **Why this plan matches** — reference their specific health conditions and needs
2. **Key benefits** — most relevant features for this patient
3. **Annual cost estimate** — premium x 12 months
4. **Section 80D tax benefit** — exact deduction amount
5. **Bottom line** — one sentence recommendation with confidence level`

  try {
    const result = await callAI([{ role: 'user', content: prompt }], system, 1000)
    if (result && result.length > 50) return result
  } catch (err) {
    console.warn('Reasoning AI call failed:', err.message)
  }

  // Always-working local reasoning
  const conditions = healthProfile?.conditions?.length > 0
    ? `your conditions (${healthProfile.conditions.slice(0,3).join(', ')})`
    : 'your health profile'
  const annualPremium = ((plan?.premium || 0) * 12).toLocaleString('en-IN')
  const planName = plan?.name || 'this plan'
  const score = plan?.score || 0
  const tier = plan?.tier || 'Gold'
  const section80D = tier === 'Platinum' || tier === 'Gold' ? '₹50,000' : tier === 'Bronze' && planName.includes('Nivesh') ? '₹75,000' : '₹25,000'

  return `## Why ${planName} was recommended for you

**Match score: ${score}%** — based on your health profile and questionnaire responses.

### Why this plan matches
Our ML model selected this plan based on ${conditions}, your budget preference, family coverage requirements, and expected healthcare utilisation frequency. Among all 8 HIA NEXUS plans, this scored highest for your specific combination of needs.

### Key benefits for you
- **${tier} tier coverage** with appropriate sum insured for your needs
- Coverage structured to minimise your out-of-pocket expenses based on your usage pattern
- ${healthProfile?.chronicConditions ? 'Chronic condition management support included' : 'Preventive care and routine consultations covered'}
- Cashless treatment at empanelled hospitals across India

### Financial breakdown
- **Annual premium:** ₹${annualPremium}
- **Section 80D deduction:** Up to ${section80D}/year — reduces your effective cost
- ${healthProfile?.chronicConditions ? 'Lower deductible saves money given your regular healthcare needs' : 'Premium optimised for your healthcare utilisation frequency'}

### Bottom line
${planName} is your best match with ${score}% confidence. ${score >= 75 ? 'This is a strong recommendation — the plan aligns well with your health and financial profile.' : 'This is a good starting point — consider consulting an IRDAI-registered broker to finalise.'}`
}

export const chatWithAssistant = async (messages, userProfile = null) => {
  const lastMsg = messages[messages.length - 1]?.content || ''
  const system = `You are HIA NEXUS Assistant, an expert Indian healthcare insurance advisor. Be conversational, warm, and practical. Use ₹ for all amounts. Always mention Section 80D tax benefits where relevant. Know these plans: Aarogya Essential ₹4,500/mo Bronze 5L sum insured, Aarogya Plus ₹8,000/mo Silver 10L (most popular), Suraksha Premium ₹13,000/mo Gold 20L, Suraksha Elite ₹18,000/mo Platinum 50L zero deductible, Parivar Shield ₹17,000/mo Silver family 15L, Parivar Complete ₹27,500/mo Gold family 30L, Chikitsa Care ₹12,000/mo Gold chronic 20L, Nivesh Health ₹6,000/mo Bronze HSA 7.5L max 80D. Answer questions fully and follow up with a helpful question. Never say you cannot help — always give your best answer.`

  // Try live AI first
  const result = await callAI(messages, system, 1000)
  if (result) return result

  // Intelligent fallback — always gives a real answer
  return buildLocalResponse(lastMsg)
}