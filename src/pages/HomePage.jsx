import { Link } from 'react-router-dom'
import { FileText, Brain, Shield, MessageSquare, Lock, CheckCircle, ArrowRight, TrendingUp, Users, Zap, Star, Activity } from 'lucide-react'

const features = [
  { icon: FileText,    title: 'Medical Document Analysis',     desc: 'Upload lab reports, prescriptions, discharge summaries. AI extracts your complete health picture automatically.', accent: 'amber' },
  { icon: Brain,       title: 'AI + ML Recommendation Engine', desc: 'XGBoost model trained on 8,000 patient profiles combined with Groq AI reasoning delivers hyper-personalised plan matches.', accent: 'teal'  },
  { icon: MessageSquare, title: '15 Smart Follow-up Questions', desc: 'Evidence-based insurance underwriting questions covering budget, lifestyle, family, and medical needs.', accent: 'amber' },
  { icon: Shield,      title: 'Personalised Plan Matching',    desc: 'Ranked insurance plans with transparent AI reasoning — understand exactly why each plan fits your profile.', accent: 'teal'  },
  { icon: Lock,        title: 'Secure Medical Vault',          desc: 'Documents encrypted at rest, accessible only via PIN and OTP. Your medical data never leaves your control.', accent: 'amber' },
  { icon: MessageSquare, title: 'Insurance AI Chatbot',        desc: 'Ask anything — plan comparisons, coverage details, Section 80D benefits, or insurance terminology.', accent: 'teal'  },
]

const steps = [
  { n: '01', title: 'Create Your Account',        desc: 'Register in under a minute. Your data is private, encrypted, and never shared with third parties.' },
  { n: '02', title: 'Upload Medical Documents',   desc: 'Lab reports, prescriptions, discharge summaries. AI reads and builds your health profile automatically.' },
  { n: '03', title: 'Answer Smart Questions',     desc: '15 personalised underwriting questions about your family, budget, and healthcare needs. About 3 minutes.' },
  { n: '04', title: 'Get Your Recommendation',    desc: 'ML model scores all 8 plans. AI explains the reasoning. You get your perfect insurance match with full clarity.' },
]

const plans = [
  { name: 'Aarogya Essential', tier: 'Bronze',   price: '₹4,500' },
  { name: 'Aarogya Plus',      tier: 'Silver',   price: '₹8,000',   hot: true },
  { name: 'Suraksha Premium',  tier: 'Gold',     price: '₹13,000'  },
  { name: 'Chikitsa Care',     tier: 'Chronic',  price: '₹12,000'  },
]

const tierColor = { Bronze: 'text-amber-600', Silver: 'text-dim', Gold: 'text-amber-400', Chronic: 'text-rose-400', Platinum: 'text-sky-400' }

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ink overflow-x-hidden">

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-4">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px]
          bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="tag mb-8 anim-up d1">
            <Zap size={11} /> AI-Powered Healthcare Insurance for India
          </div>

          <h1 className="font-display font-extrabold text-6xl md:text-7xl lg:text-[88px]
            text-bright tracking-tight mb-6 anim-up d2 leading-none">
            The Smarter Way<br />
            to Choose <span className="text-amber-400">Health Insurance</span>
          </h1>

          <p className="text-lg text-dim max-w-2xl mx-auto mb-4 anim-up d3 leading-relaxed font-body">
            Upload your medical documents, answer 15 targeted questions, and receive a
            personalised insurance recommendation backed by machine learning and AI reasoning.
          </p>
          <p className="text-sm text-muted mb-10 anim-up d3 font-body">
            Section 80D tax guidance included · IRDAI-aligned plan parameters · All prices in ₹
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14 anim-up d4">
            <Link to="/auth?mode=register" className="btn-primary px-8 py-3.5 text-base shadow-glow-amber">
              Start Free Analysis <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-8 py-3.5 text-base">
              See How It Works
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 anim-up d5">
            {[
              { icon: Users,      t: 'Individual & Family Plans' },
              { icon: Brain,      t: 'AI + ML Powered'           },
              { icon: Shield,     t: 'Encrypted Medical Vault'   },
              { icon: TrendingUp, t: 'Section 80D Benefits'      },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-2 text-muted text-sm font-body">
                <Icon size={13} className="text-amber-500" /> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plan preview strip ── */}
      <section className="py-12 px-4 border-y border-border bg-surface/40">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-8">
            Available Insurance Plans
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {plans.map(({ name, tier, price, hot }) => (
              <div key={name} className={`card-sm text-center relative ${hot ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                {hot && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="badge-amber text-[10px] px-2 py-0.5 flex items-center gap-1">
                      <Star size={8} className="fill-amber-400" /> Popular
                    </span>
                  </div>
                )}
                <p className={`text-[10px] font-heading font-semibold uppercase tracking-wider mb-2 ${tierColor[tier]}`}>{tier}</p>
                <p className="font-heading font-bold text-bright text-sm leading-tight mb-1">{name}</p>
                <p className="font-mono text-amber-400 font-medium text-base">{price}<span className="text-muted text-xs">/mo</span></p>
              </div>
            ))}
          </div>
          <p className="text-center text-muted text-xs mt-4 font-body">
            + 4 more plans including Suraksha Elite, Parivar Shield, Parivar Complete, Nivesh Health
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="tag mb-5 inline-flex">Platform Features</div>
            <h2 className="font-display font-extrabold text-5xl text-bright tracking-tight mb-4">
              Everything in One Place
            </h2>
            <p className="text-dim max-w-xl mx-auto font-body">
              From document upload to personalised plan selection — a complete healthcare insurance intelligence platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc, accent }) => (
              <div key={title} className="card group hover:border-amber-500/20 hover:bg-raised hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 border ${
                  accent === 'amber'
                    ? 'bg-amber-500/10 border-amber-500/20'
                    : 'bg-teal-500/10 border-teal-500/20'
                }`}>
                  <Icon size={18} className={accent === 'amber' ? 'text-amber-400' : 'text-teal-400'} />
                </div>
                <h3 className="font-heading font-bold text-bright text-base mb-2 leading-snug">{title}</h3>
                <p className="text-dim text-sm font-body leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 px-4 bg-surface/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="tag mb-5 inline-flex">The Process</div>
            <h2 className="font-display font-extrabold text-5xl text-bright tracking-tight">How It Works</h2>
          </div>

          <div className="space-y-3">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="card group hover:border-amber-500/20 hover:bg-raised transition-all duration-200 flex gap-5 items-start">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20
                  flex items-center justify-center flex-shrink-0
                  group-hover:bg-amber-500/20 transition-colors">
                  <span className="font-mono text-amber-400 text-xs font-medium">{n}</span>
                </div>
                <div className="pt-2.5">
                  <h3 className="font-heading font-bold text-bright mb-1 text-base">{title}</h3>
                  <p className="text-dim text-sm font-body leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="card border-amber-500/20 bg-amber-500/5 text-center shadow-glow-amber">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20
              flex items-center justify-center mx-auto mb-6">
              <Brain size={24} className="text-amber-400" />
            </div>
            <h2 className="font-display font-extrabold text-4xl text-bright tracking-tight mb-3">
              Find Your Plan Today
            </h2>
            <p className="text-dim mb-8 font-body max-w-md mx-auto">
              Get your personalised insurance recommendation in under 10 minutes. Data-driven, transparent, and completely free.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/auth?mode=register" className="btn-primary px-8 py-3 shadow-glow-amber">
                <Brain size={15} /> Start Free Analysis
              </Link>
              <Link to="/auth" className="btn-secondary px-8 py-3">Sign In</Link>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-5 mt-8 pt-6 border-t border-border/60">
              {['No credit card required', 'Section 80D guidance included', 'Your data stays private'].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-muted font-body">
                  <CheckCircle size={11} className="text-emerald-400" /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Activity size={11} className="text-amber-400" />
            </div>
            <span className="font-display font-bold text-sm text-bright tracking-tight">HIA NEXUS</span>
            <span className="text-muted text-xs font-body">— Healthcare Insurance Assistant</span>
          </div>
          <p className="text-xs text-muted font-body">© 2025 HIA NEXUS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}