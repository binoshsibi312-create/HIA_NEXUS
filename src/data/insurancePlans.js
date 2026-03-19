export const INSURANCE_PLANS = [
  {
    id: 'nexus-basic',
    name: 'Aarogya Essential',
    tier: 'Bronze', type: 'Network',
    monthlyPremium: { individual: 4500, family: 10500 },
    deductible: { individual: 162500, family: 325000 },
    outOfPocketMax: { individual: 217500, family: 435000 },
    copay: { primaryCare: 1000, specialist: 1750, urgentCare: 1875, emergency: 8750 },
    coinsurance: 40,
    prescriptionCoverage: { generic: 375, brandName: 1250, specialty: 3750 },
    features: ['Preventive care 100% covered', 'Teleconsultation ₹0 copay', 'Basic mental health', '24/7 health helpline', 'Ambulance cover'],
    bestFor: ['Young healthy adults', 'Low budget', 'Rarely need care', 'Emergency-only coverage'],
    color: '#4A6080', badge: 'Most Affordable',
    annualPremium: { individual: 54000, family: 126000 },
    sumInsured: 500000,
    section80D: 25000,
  },
  {
    id: 'nexus-plus',
    name: 'Aarogya Plus',
    tier: 'Silver', type: 'Floater',
    monthlyPremium: { individual: 8000, family: 18000 },
    deductible: { individual: 75000, family: 150000 },
    outOfPocketMax: { individual: 175000, family: 350000 },
    copay: { primaryCare: 750, specialist: 1375, urgentCare: 1500, emergency: 6250 },
    coinsurance: 30,
    prescriptionCoverage: { generic: 250, brandName: 1000, specialty: 2500 },
    features: ['Open network hospitals', 'Mental health + therapy', 'Maternity coverage', 'Cashless treatment', 'No-claim bonus 20%'],
    bestFor: ['Families', 'Moderate healthcare users', 'Need specialist flexibility', 'Expecting mothers'],
    color: '#00D4FF', badge: 'Most Popular',
    annualPremium: { individual: 96000, family: 216000 },
    sumInsured: 1000000,
    section80D: 25000,
  },
  {
    id: 'nexus-premium',
    name: 'Suraksha Premium',
    tier: 'Gold', type: 'Floater',
    monthlyPremium: { individual: 13000, family: 26250 },
    deductible: { individual: 25000, family: 50000 },
    outOfPocketMax: { individual: 100000, family: 200000 },
    copay: { primaryCare: 500, specialist: 1000, urgentCare: 1125, emergency: 3750 },
    coinsurance: 20,
    prescriptionCoverage: { generic: 125, brandName: 625, specialty: 1500 },
    features: ['Low ₹25,000 deductible', 'Comprehensive medicine cover', 'Dental + vision add-ons', 'Physiotherapy 30 sessions/yr', 'Wellness programmes'],
    bestFor: ['Chronic conditions', 'Frequent healthcare users', 'Planned procedures', 'Families with health needs'],
    color: '#00FF9D', badge: 'Best Coverage',
    annualPremium: { individual: 156000, family: 315000 },
    sumInsured: 2000000,
    section80D: 50000,
  },
  {
    id: 'nexus-elite',
    name: 'Suraksha Elite',
    tier: 'Platinum', type: 'Floater',
    monthlyPremium: { individual: 18000, family: 36250 },
    deductible: { individual: 0, family: 0 },
    outOfPocketMax: { individual: 50000, family: 100000 },
    copay: { primaryCare: 250, specialist: 500, urgentCare: 625, emergency: 1875 },
    coinsurance: 10,
    prescriptionCoverage: { generic: 0, brandName: 375, specialty: 750 },
    features: ['₹0 deductible', 'Concierge medicine', 'International coverage', 'Unlimited specialist visits', 'Alternative medicine (AYUSH)'],
    bestFor: ['Complex conditions', 'High healthcare utilisation', 'Cancer treatment', 'Maximum protection seekers'],
    color: '#FFB800', badge: 'Premium',
    annualPremium: { individual: 216000, family: 435000 },
    sumInsured: 5000000,
    section80D: 50000,
  },
  {
    id: 'nexus-family',
    name: 'Parivar Shield',
    tier: 'Silver', type: 'Family Floater',
    monthlyPremium: { individual: null, family: 17000 },
    deductible: { individual: null, family: 150000 },
    outOfPocketMax: { individual: null, family: 300000 },
    copay: { primaryCare: 625, specialist: 1250, urgentCare: 1375, emergency: 5000 },
    coinsurance: 30,
    prescriptionCoverage: { generic: 250, brandName: 875, specialty: 2250 },
    features: ['Paediatric dental + vision', 'Maternity + newborn care', 'Family therapy sessions', 'Well-child visits free', 'Vaccination cover'],
    bestFor: ['Young families', 'Family planning', '1–2 dependents', 'Budget-conscious families'],
    color: '#FF4D6D', badge: 'Family Pick',
    annualPremium: { family: 204000 },
    sumInsured: 1500000,
    section80D: 25000,
  },
  {
    id: 'nexus-family-complete',
    name: 'Parivar Complete',
    tier: 'Gold', type: 'Family Floater',
    monthlyPremium: { individual: null, family: 27500 },
    deductible: { individual: null, family: 75000 },
    outOfPocketMax: { individual: null, family: 175000 },
    copay: { primaryCare: 375, specialist: 875, urgentCare: 1000, emergency: 3125 },
    coinsurance: 20,
    prescriptionCoverage: { generic: 125, brandName: 500, specialty: 1250 },
    features: ['Gold family coverage', 'Orthodontics included', 'Fertility treatments', 'ADHD + behavioural health', 'School physicals free'],
    bestFor: ['Large families (3+ kids)', 'Families with chronic needs', 'High healthcare usage families'],
    color: '#00FF9D', badge: 'Best Family',
    annualPremium: { family: 330000 },
    sumInsured: 3000000,
    section80D: 50000,
  },
  {
    id: 'nexus-chronic',
    name: 'Chikitsa Care',
    tier: 'Gold', type: 'Specialised',
    monthlyPremium: { individual: 12000, family: 24000 },
    deductible: { individual: 12500, family: 25000 },
    outOfPocketMax: { individual: 87500, family: 175000 },
    copay: { primaryCare: 375, specialist: 625, urgentCare: 1000, emergency: 3125 },
    coinsurance: 15,
    prescriptionCoverage: { generic: 125, brandName: 375, specialty: 1000 },
    features: ['Chronic disease management programme', 'Dedicated care coordinator', 'Unlimited specialist visits', 'Disease-specific medicine discount', 'Remote health monitoring'],
    bestFor: ['Diabetes', 'Heart disease', 'Cancer', 'Autoimmune conditions', 'COPD/Asthma', 'Kidney disease'],
    color: '#FF4D6D', badge: 'Chronic Care',
    annualPremium: { individual: 144000, family: 288000 },
    sumInsured: 2000000,
    section80D: 50000,
  },
  {
    id: 'nexus-hsa',
    name: 'Nivesh Health',
    tier: 'Bronze', type: 'Tax-Saving',
    monthlyPremium: { individual: 6000, family: 13000 },
    deductible: { individual: 112500, family: 225000 },
    outOfPocketMax: { individual: 176250, family: 352500 },
    copay: { primaryCare: 0, specialist: 0, urgentCare: 0, emergency: 0 },
    coinsurance: 20,
    prescriptionCoverage: { generic: 500, brandName: 1500, specialty: 3000 },
    features: ['Section 80D tax benefit up to ₹75,000', 'Tax-free health savings', 'Preventive care ₹0', 'Low monthly premium', 'OPD coverage included'],
    bestFor: ['Healthy young adults', 'Tax savings seekers', 'Self-employed', 'Rarely need care'],
    color: '#00D4FF', badge: 'Tax Saver',
    annualPremium: { individual: 72000, family: 156000 },
    sumInsured: 750000,
    section80D: 75000,
  },
]

export const formatINR = (amount) => {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export const scoreInsurancePlans = (healthProfile = {}, questionnaire = {}) => {
  const scores = {}
  INSURANCE_PLANS.forEach(p => { scores[p.id] = 50 })

  const age = healthProfile.age || 35
  const nChronic = healthProfile.conditions?.length || 0
  const nMeds = healthProfile.medications?.length || 0
  const hasCancer = healthProfile.conditions?.some(c =>
    ['cancer','tumor','malignant','carcinoma','lymphoma','leukemia'].some(k => c.toLowerCase().includes(k))
  )
  const smoker = healthProfile.smoker || false
  const bmi = healthProfile.bmi || 25
  const isHighRisk = nChronic >= 2 || hasCancer || smoker

  const hasDependents = ['Myself + spouse/partner','Myself + children','Full family (myself + spouse + children)'].includes(questionnaire.q_dependents)
  const nDependents = parseInt(questionnaire.q_num_dependents) || 0
  const visitFreq = questionnaire.q_visit_freq || ''
  const hasMeds = questionnaire.q_medications === true || questionnaire.q_medications === 'Yes'
  const budget = questionnaire.q_budget || ''
  const lowDeductPref = parseInt(questionnaire.q_deductible_pref) || 5
  const plannedSurgery = questionnaire.q_planned_surgery === true
  const prefersPPO = questionnaire.q_plan_type?.includes('flexibility') || false
  const needsMentalHealth = questionnaire.q_mental_health === true
  const wantsHSA = questionnaire.q_hsa === true
  const hasChronicFromQ = questionnaire.q_chronic === true
  const plannedPregnancy = questionnaire.q_pregnancy === true

  if (age < 26) { scores['nexus-basic'] += 22; scores['nexus-hsa'] += 25; scores['nexus-elite'] -= 20 }
  else if (age < 35) { scores['nexus-hsa'] += 18; scores['nexus-basic'] += 10; scores['nexus-plus'] += 10 }
  else if (age >= 50 && age < 65) { scores['nexus-premium'] += 22; scores['nexus-chronic'] += 15; scores['nexus-basic'] -= 18 }
  else if (age >= 65) { scores['nexus-elite'] += 25; scores['nexus-chronic'] += 20; scores['nexus-basic'] -= 35 }

  if (hasCancer || nChronic >= 3 || hasChronicFromQ) {
    scores['nexus-chronic'] += 45; scores['nexus-elite'] += 28; scores['nexus-premium'] += 18
    scores['nexus-basic'] -= 40; scores['nexus-hsa'] -= 35
  } else if (nChronic === 2) {
    scores['nexus-chronic'] += 22; scores['nexus-premium'] += 28; scores['nexus-plus'] += 12; scores['nexus-basic'] -= 18
  } else if (nChronic === 1) { scores['nexus-plus'] += 18; scores['nexus-premium'] += 12 }

  if (nMeds >= 5 || hasMeds) { scores['nexus-chronic'] += 22; scores['nexus-premium'] += 18; scores['nexus-elite'] += 12; scores['nexus-hsa'] -= 22 }
  else if (nMeds >= 3) { scores['nexus-plus'] += 14; scores['nexus-premium'] += 18 }

  if (plannedSurgery) { scores['nexus-premium'] += 35; scores['nexus-elite'] += 28; scores['nexus-basic'] -= 38; scores['nexus-hsa'] -= 20 }

  if (hasDependents && nDependents >= 4) { scores['nexus-family-complete'] += 45; scores['nexus-family'] += 22; scores['nexus-basic'] -= 30 }
  else if (hasDependents || nDependents >= 2) { scores['nexus-family'] += 38; scores['nexus-plus'] += 14; scores['nexus-basic'] -= 10 }
  else { scores['nexus-family'] -= 25; scores['nexus-family-complete'] -= 30 }

  if (budget.includes('₹5,000')) { scores['nexus-basic'] += 28; scores['nexus-hsa'] += 22; scores['nexus-premium'] -= 25; scores['nexus-elite'] -= 40 }
  else if (budget.includes('₹10,000')) { scores['nexus-basic'] += 12; scores['nexus-hsa'] += 18; scores['nexus-plus'] += 15 }
  else if (budget.includes('₹20,000')) { scores['nexus-plus'] += 18; scores['nexus-premium'] += 22 }
  else if (budget.includes('₹35,000')) { scores['nexus-premium'] += 18; scores['nexus-elite'] += 28 }

  if (visitFreq.includes('12+')) { scores['nexus-premium'] += 22; scores['nexus-elite'] += 18; scores['nexus-basic'] -= 22; scores['nexus-hsa'] -= 18 }
  else if (visitFreq.includes('6')) { scores['nexus-plus'] += 16; scores['nexus-premium'] += 14 }
  else if (visitFreq.includes('0–2')) { scores['nexus-basic'] += 18; scores['nexus-hsa'] += 24 }

  if (lowDeductPref >= 8) { scores['nexus-elite'] += 22; scores['nexus-premium'] += 16; scores['nexus-hsa'] -= 28; scores['nexus-basic'] -= 18 }
  else if (lowDeductPref <= 3) { scores['nexus-hsa'] += 22; scores['nexus-basic'] += 12 }

  if (prefersPPO) { ['nexus-plus','nexus-premium','nexus-elite','nexus-chronic','nexus-family-complete'].forEach(p => scores[p] += 10) }
  if (needsMentalHealth) { scores['nexus-plus'] += 15; scores['nexus-premium'] += 12; scores['nexus-basic'] -= 8 }
  if (wantsHSA && !isHighRisk) scores['nexus-hsa'] += 40
  if (plannedPregnancy) { scores['nexus-plus'] += 22; scores['nexus-family'] += 28; scores['nexus-family-complete'] += 18; scores['nexus-basic'] -= 20 }
  if (bmi >= 35 || smoker) { scores['nexus-premium'] += 12; scores['nexus-chronic'] += 10 }

  Object.keys(scores).forEach(k => { scores[k] = Math.max(0, Math.min(100, Math.round(scores[k]))) })
  return scores
}

export const getTopPlans = (scores, limit = 8) =>
  Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id, score]) => ({ plan: INSURANCE_PLANS.find(p => p.id === id), score }))
    .filter(({ plan }) => plan)