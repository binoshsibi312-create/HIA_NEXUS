import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { generateInsuranceReasoning } from '../services/claude'
import { INSURANCE_PLANS } from '../data/insurancePlans'
import { Brain, ChevronDown, ChevronUp, Star, MessageSquare, RefreshCw, Loader, Activity, IndianRupee, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const tierStyle = {
  Bronze: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  Silver: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
  Gold: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  Platinum: 'text-teal-300 bg-teal-500/10 border-teal-500/30',
}

function PlanCard({ plan, score, rank, reasoning, onGetReasoning, loadingReasoning }) {
  const [expanded, setExpanded] = useState(rank === 1)
  const full = INSURANCE_PLANS.find(p => p.id === plan.id)
  const isTop = rank === 1

  return (
    <div className={`card border transition-all duration-300 ${isTop ? 'border-teal-500/40 bg-teal-500/5' : 'border-slate-700/60 hover:border-slate-600'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-semibold flex-shrink-0 ${
            isTop ? 'bg-teal-500 text-white' : 'bg-slate-700/60 text-slate-400 border border-slate-600'
          }`}>
            {isTop ? <Star size={15} /> : rank}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-semibold text-white">{plan.name}</h3>
              <span className={`badge border text-xs ${tierStyle[plan.tier] || tierStyle.Bronze}`}>{plan.tier}</span>
              {full?.type && <span className="badge bg-slate-700/50 border-slate-600 text-slate-400 text-xs">{full.type}</span>}
              {isTop && <span className="badge bg-teal-500/20 border-teal-500/30 text-teal-400 text-xs">Best Match</span>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-slate-500 text-xs">Match score:</span>
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: score >= 75 ? '#10B981' : score >= 55 ? '#14B8A6' : '#F59E0B' }} />
                </div>
                <span className="font-mono text-xs" style={{ color: score >= 75 ? '#10B981' : score >= 55 ? '#14B8A6' : '#F59E0B' }}>{score}%</span>
              </div>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="flex items-center gap-0.5 justify-end">
            <IndianRupee size={14} className="text-white" />
            <span className="font-display text-2xl text-white tracking-wider">{plan.premium?.toLocaleString('en-IN') ?? '—'}</span>
          </div>
          <p className="text-xs text-slate-500">per month</p>
        </div>
      </div>

      {expanded && full && (
        <div className="mt-5 space-y-4 border-t border-slate-700/50 pt-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Deductible', value: `₹${(full.deductible.individual ?? 0).toLocaleString('en-IN')}` },
              { label: 'OOP Maximum', value: `₹${(full.outOfPocketMax.individual ?? 0).toLocaleString('en-IN')}` },
              { label: 'Consultation Copay', value: `₹${full.copay.primaryCare}` },
              { label: 'Coinsurance', value: `${full.coinsurance}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-900/50 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="font-heading font-semibold text-white text-sm">{value}</p>
              </div>
            ))}
          </div>

          {full.section80D && (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
              <CheckCircle size={15} className="text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-300 font-heading">Section 80D tax deduction: up to <span className="font-semibold">₹{full.section80D.toLocaleString('en-IN')}</span> per year</p>
            </div>
          )}

          <div>
            <p className="text-xs text-slate-500 font-heading font-medium mb-2">Medicine Coverage</p>
            <div className="flex gap-3">
              {[['Generic', full.prescriptionCoverage.generic], ['Brand', full.prescriptionCoverage.brandName], ['Specialty', full.prescriptionCoverage.specialty]].map(([label, val]) => (
                <div key={label} className="flex-1 bg-slate-900/50 rounded-xl p-2.5 text-center">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-heading font-medium text-teal-400">₹{val}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-heading font-medium mb-2">Key Features</p>
            <div className="flex flex-wrap gap-2">
              {full.features.map(f => <span key={f} className="badge bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs">{f}</span>)}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 font-heading font-medium mb-2">Best Suited For</p>
            <div className="flex flex-wrap gap-2">
              {full.bestFor.map(b => <span key={b} className="badge bg-slate-700/50 border border-slate-600 text-slate-300 text-xs">{b}</span>)}
            </div>
          </div>

          {reasoning ? (
            <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-4">
              <p className="text-xs text-teal-400 font-heading font-medium mb-2 flex items-center gap-1.5"><Brain size={12} /> AI Analysis</p>
              <div className="text-sm text-slate-300 leading-relaxed prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>strong]:text-white">
                <ReactMarkdown>{reasoning}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <button onClick={() => onGetReasoning(plan.id)} disabled={loadingReasoning}
              className="btn-secondary w-full text-sm py-2.5 flex items-center justify-center gap-2">
              {loadingReasoning ? <Loader size={14} className="animate-spin" /> : <Brain size={14} />}
              {loadingReasoning ? 'Generating AI Analysis...' : 'Get Personalised AI Reasoning'}
            </button>
          )}
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 mt-4 text-xs text-slate-500 hover:text-teal-400 transition-colors font-heading">
        {expanded ? <><ChevronUp size={13} /> Show Less</> : <><ChevronDown size={13} /> View Details & AI Analysis</>}
      </button>
    </div>
  )
}

export default function RecommendationsPage() {
  const { user } = useAuth()
  const [recommendation, setRecommendation] = useState(null)
  const [reasonings, setReasonings] = useState({})
  const [loadingReason, setLoadingReason] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await supabase.from('recommendations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      setRecommendation(data)
      setLoading(false)
    }
    load()
  }, [user])

  const handleGetReasoning = async (planId) => {
    if (!recommendation) return
    setLoadingReason(planId)
    try {
      const plan = recommendation.recommended_plans?.find(p => p.id === planId)
      const r = await generateInsuranceReasoning(recommendation.health_profile, recommendation.ml_scores, [plan])
      setReasonings(prev => ({ ...prev, [planId]: r }))
    } catch (err) {
      toast.error('AI reasoning failed: ' + err.message)
    } finally { setLoadingReason(null) }
  }

  if (loading) return (
    <div className="min-h-screen bg-midnight pt-20 flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-slate-500 text-sm font-heading">Loading recommendations...</p></div>
    </div>
  )

  if (!recommendation) return (
    <div className="min-h-screen bg-midnight pt-20 pb-12 px-4">
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4"><Brain size={28} className="text-slate-600" /></div>
        <h2 className="font-display text-4xl text-white tracking-wider mb-3">No Recommendations Yet</h2>
        <p className="text-slate-400 mb-2">Complete your health analysis to receive personalised insurance plan recommendations.</p>
        <p className="text-slate-600 text-xs mb-8 font-mono">If you just completed the analysis, try refreshing this page.</p>
        <Link to="/upload" className="btn-primary"><Activity size={15} /> Start Health Analysis</Link>
      </div>
    </div>
  )

  const plans = recommendation.recommended_plans || []
  return (
    <div className="min-h-screen bg-midnight pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="section-tag mb-3">AI + ML Powered</div>
            <h1 className="font-display text-4xl md:text-5xl text-white tracking-wider">Your Plans</h1>
            <p className="text-slate-500 text-sm mt-1">Generated {new Date(recommendation.created_at).toLocaleDateString('en-IN')} · {plans.length} plans ranked by match score</p>
          </div>
          <Link to="/upload" className="btn-secondary text-sm"><RefreshCw size={13} /> Re-analyse</Link>
        </div>

        {recommendation.health_profile?.extractedSummary && (
          <div className="card border-teal-500/20 bg-teal-500/5 mb-6">
            <p className="text-xs text-teal-400 font-heading font-semibold mb-1.5">Your Health Profile Summary</p>
            <p className="text-sm text-slate-300 leading-relaxed">{recommendation.health_profile.extractedSummary}</p>
            {recommendation.health_profile.conditions?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {recommendation.health_profile.conditions.map(c => <span key={c} className="badge bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{c}</span>)}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id || i} plan={plan} score={plan.score} rank={i + 1}
              reasoning={reasonings[plan.id]} onGetReasoning={handleGetReasoning} loadingReasoning={loadingReason === plan.id} />
          ))}
        </div>

        <div className="mt-8 card border-amber-500/20 bg-amber-500/5 flex items-center gap-4 flex-wrap">
          <MessageSquare size={20} className="text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-heading font-semibold text-white text-sm">Have questions about these plans?</p>
            <p className="text-slate-500 text-xs mt-0.5">Ask about premiums, coverage, Section 80D benefits, or anything else</p>
          </div>
          <Link to="/chat" className="btn-secondary text-sm py-2">Ask AI Assistant</Link>
        </div>
      </div>
    </div>
  )
}