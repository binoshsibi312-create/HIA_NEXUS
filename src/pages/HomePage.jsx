import { Link } from 'react-router-dom'
import { FileText, Brain, Shield, MessageSquare, Lock, CheckCircle, ArrowRight, Star, TrendingUp, Users, Zap } from 'lucide-react'

const features = [
  { icon: FileText, title: 'Medical Document Analysis', desc: 'Upload lab reports, prescriptions, or discharge summaries. Our AI reads and understands your health history automatically.', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  { icon: Brain, title: 'AI + ML Recommendation Engine', desc: 'An XGBoost model trained on 8,000 patient profiles combined with Gemini AI reasoning gives you hyper-personalised plan matches.', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { icon: MessageSquare, title: 'Smart Follow-up Questions', desc: '15 evidence-based insurance underwriting questions that refine your recommendation — covering budget, lifestyle, family, and medical needs.', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' },
  { icon: Shield, title: 'Personalised Plan Matching', desc: 'Get ranked insurance plans with clear explanations of why each plan fits your unique health and financial profile.', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { icon: Lock, title: 'Secure Medical Vault', desc: 'All medical documents encrypted and locked behind PIN and OTP-verified access. Only you can view your records.', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { icon: MessageSquare, title: 'AI Insurance Chatbot', desc: 'Ask anything about plans, premiums, coverage, or Section 80D benefits. Powered by Gemini with full knowledge of all plans.', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
]

const steps = [
  { num: '01', title: 'Create Your Account', desc: 'Register in under a minute. Your data is private, encrypted, and never shared.' },
  { num: '02', title: 'Upload Medical Documents', desc: 'Add lab reports, prescriptions, or health summaries. Our AI extracts the relevant health data automatically.' },
  { num: '03', title: 'Answer Smart Questions', desc: 'Go through 15 personalised questions about your family, budget, and healthcare needs. Takes about 3 minutes.' },
  { num: '04', title: 'Receive Your Recommendation', desc: 'The ML model scores all plans and Gemini AI explains the reasoning. You get your perfect insurance match with full transparency.' },
]

const plans = [
  { name: 'Aarogya Essential', tier: 'Bronze', price: '₹4,500', desc: 'Basic individual coverage', color: 'border-slate-600' },
  { name: 'Aarogya Plus', tier: 'Silver', price: '₹8,000', desc: 'Most popular plan', color: 'border-teal-500', highlight: true },
  { name: 'Suraksha Premium', tier: 'Gold', price: '₹13,000', desc: 'Comprehensive coverage', color: 'border-amber-500' },
  { name: 'Chikitsa Care', tier: 'Gold', price: '₹12,000', desc: 'For chronic conditions', color: 'border-rose-500' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-midnight">
      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="section-tag mb-6 animate-up delay-1">
            <Zap size={12} /> AI-Powered Healthcare Insurance Intelligence
          </div>

          <h1 className="font-display text-6xl md:text-7xl lg:text-8xl text-white tracking-wider mb-6 animate-up delay-2 leading-none">
            HIA <span className="text-teal-400">NEXUS</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-3 animate-up delay-3 leading-relaxed">
            India's intelligent healthcare insurance assistant. Upload your medical documents,
            answer a few questions, and get a personalised insurance recommendation backed by AI and machine learning.
          </p>
          <p className="text-sm text-slate-500 mb-10 animate-up delay-3">
            Includes Section 80D tax benefit guidance · IRDAI-aligned plan parameters · Indian Rupee pricing
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-up delay-4">
            <Link to="/auth?mode=register" className="btn-primary px-8 py-3.5 text-base">
              Get Your Free Recommendation <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-8 py-3.5 text-base">
              See How It Works
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 animate-up delay-4">
            {[
              { icon: Users, text: 'Individual & Family Plans' },
              { icon: Brain, text: 'AI + ML Powered' },
              { icon: Shield, text: 'Encrypted Medical Vault' },
              { icon: TrendingUp, text: 'Section 80D Benefits' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-slate-500 text-sm">
                <Icon size={14} className="text-teal-500" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans preview */}
      <section className="py-16 px-4 bg-navy/40">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-slate-500 text-sm font-heading font-medium uppercase tracking-widest mb-8">Available Plans</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plans.map(({ name, tier, price, desc, color, highlight }) => (
              <div key={name} className={`card border ${color} ${highlight ? 'bg-teal-500/5' : ''} text-center py-5`}>
                <div className={`badge mx-auto mb-3 ${highlight ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-700/50 text-slate-400'}`}>{tier}</div>
                <p className="font-heading font-semibold text-white text-sm mb-1">{name}</p>
                <p className="font-mono text-teal-400 font-medium text-base">{price}<span className="text-xs text-slate-500">/mo</span></p>
                <p className="text-xs text-slate-500 mt-1">{desc}</p>
                {highlight && <div className="flex items-center justify-center gap-1 mt-2"><Star size={10} className="text-amber-400 fill-amber-400" /><span className="text-xs text-amber-400">Most Popular</span></div>}
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-xs mt-4">+ 4 more plans including family floaters and chronic care specialists</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-tag mb-4 inline-flex">Platform Features</div>
            <h2 className="font-display text-5xl text-white tracking-wider mb-4">Everything You Need</h2>
            <p className="text-slate-400 max-w-xl mx-auto">A complete healthcare insurance intelligence platform — from document upload to personalised plan selection.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="card-hover group">
                <div className={`w-11 h-11 rounded-xl border ${bg} flex items-center justify-center mb-4`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-heading font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-navy/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-tag mb-4 inline-flex">The Process</div>
            <h2 className="font-display text-5xl text-white tracking-wider">How It Works</h2>
          </div>
          <div className="space-y-4">
            {steps.map(({ num, title, desc }, i) => (
              <div key={num} className="flex gap-5 items-start card-hover group">
                <div className="w-12 h-12 flex-shrink-0 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <span className="font-mono text-teal-400 font-medium text-xs">{num}</span>
                </div>
                <div className="pt-3">
                  <h3 className="font-heading font-semibold text-white mb-1">{title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="card border-teal-500/20 bg-teal-500/5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto mb-5">
              <Brain size={24} className="text-teal-400" />
            </div>
            <h2 className="font-display text-4xl text-white tracking-wider mb-3">Find Your Plan Today</h2>
            <p className="text-slate-400 mb-7">Get your personalised healthcare insurance recommendation in under 10 minutes. No agents, no jargon — just data-driven guidance.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth?mode=register" className="btn-primary px-8"><Brain size={16} /> Start Free Analysis</Link>
              <Link to="/auth" className="btn-secondary px-8">Sign In</Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-7 pt-5 border-t border-slate-700/50">
              {['No credit card required', 'Section 80D guidance included', 'Your data stays private'].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle size={11} className="text-teal-500" />{t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-base text-white tracking-widest">HIA NEXUS</span>
            <span className="text-slate-600 text-xs">— Healthcare Insurance Assistant</span>
          </div>
          <p className="text-xs text-slate-600">Masters Research Project · React + Supabase + Gemini AI + XGBoost</p>
        </div>
      </footer>
    </div>
  )
}