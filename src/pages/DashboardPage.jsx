import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Upload, Brain, Shield, MessageSquare, ArrowRight, FileText, TrendingUp, Clock, CheckCircle, Activity } from 'lucide-react'

const actions = [
  { to: '/upload',          icon: Upload,        label: 'Health Analysis',  desc: 'Upload docs & answer questions',  accent: 'amber', primary: true  },
  { to: '/recommendations', icon: Brain,         label: 'My Plans',         desc: 'View insurance recommendations',  accent: 'teal'               },
  { to: '/vault',           icon: Shield,        label: 'Medical Vault',    desc: 'Access encrypted documents',      accent: 'amber'              },
  { to: '/chat',            icon: MessageSquare, label: 'AI Assistant',     desc: 'Ask insurance questions',         accent: 'teal'               },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]     = useState({ docs: 0, recs: 0, chats: 0 })
  const [docs, setDocs]       = useState([])
  const [rec, setRec]         = useState(null)
  const [loading, setLoading] = useState(true)

  const name      = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const firstName = name.split(' ')[0]
  const initials  = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const hour      = new Date().getHours()
  const greet     = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [dr, rr, cr] = await Promise.all([
        supabase.from('medical_documents').select('id,file_name,uploaded_at').eq('user_id', user.id).order('uploaded_at', { ascending: false }).limit(4),
        supabase.from('recommendations').select('id,recommended_plans,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('chat_messages').select('id', { count: 'exact' }).eq('user_id', user.id),
      ])
      setDocs(dr.data || [])
      setRec(rr.data || null)
      setStats({ docs: dr.data?.length || 0, recs: rr.data ? 1 : 0, chats: cr.count || 0 })
      setLoading(false)
    }
    load()
  }, [user])

  const fresh = !loading && stats.docs === 0 && stats.recs === 0

  return (
    <div className="min-h-screen bg-ink pt-20 pb-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <p className="text-muted text-sm font-body mb-1">{greet},</p>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl text-bright tracking-tight leading-none">
              {firstName}
            </h1>
            <p className="text-muted text-xs font-body mt-2">{user?.email}</p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/20
            flex items-center justify-center flex-shrink-0 mt-1">
            <span className="font-display font-extrabold text-lg text-amber-400">{initials}</span>
          </div>
        </div>

        {/* Onboarding prompt */}
        {fresh && (
          <div className="card-accent mb-8 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20
              flex items-center justify-center flex-shrink-0">
              <Activity size={17} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="font-heading font-bold text-bright text-sm">Start your personalised health analysis</p>
              <p className="text-muted text-xs font-body mt-0.5">
                Upload medical documents and answer 15 questions to receive your insurance recommendation
              </p>
            </div>
            <Link to="/upload" className="btn-primary text-sm py-2.5 shadow-glow-amber">
              Begin <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Documents',        value: stats.docs,  icon: FileText,    color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
            { label: 'Recommendations',  value: stats.recs,  icon: TrendingUp,  color: 'text-teal-400',   bg: 'bg-teal-500/10'   },
            { label: 'Chat Messages',    value: stats.chats, icon: MessageSquare, color: 'text-sky-400',      bg: 'bg-sky/10'        },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card text-center py-5">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mx-auto mb-3`}>
                <Icon size={16} className={color} />
              </div>
              <p className="font-display font-extrabold text-3xl text-bright tracking-tight">
                {loading ? '—' : value}
              </p>
              <p className="text-muted text-xs font-body mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="font-heading font-bold text-bright text-sm uppercase tracking-wider mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {actions.map(({ to, icon: Icon, label, desc, accent, primary }) => (
            <Link key={to} to={to}
              className={`card group flex flex-col gap-3 hover:-translate-y-0.5 transition-all duration-200 ${
                primary
                  ? 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40'
                  : 'hover:border-border hover:bg-raised'
              }`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                accent === 'amber'
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-teal-500/10 border-teal-500/20'
              }`}>
                <Icon size={17} className={accent === 'amber' ? 'text-amber-400' : 'text-teal-400'} />
              </div>
              <div>
                <p className="font-heading font-bold text-bright text-sm leading-snug">{label}</p>
                <p className="text-muted text-xs font-body mt-0.5">{desc}</p>
              </div>
              <ArrowRight size={13} className="text-muted group-hover:text-amber-400 transition-colors mt-auto" />
            </Link>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Documents */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <p className="font-heading font-bold text-bright text-sm">Recent Documents</p>
              <Link to="/vault" className="text-amber-400 text-xs font-body hover:text-amber-300 transition-colors">View vault →</Link>
            </div>
            {docs.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={22} className="text-muted mx-auto mb-2" />
                <p className="text-muted text-sm font-body">No documents uploaded yet</p>
                <Link to="/upload" className="text-amber-400 text-xs mt-2 inline-block hover:underline font-body">
                  Upload your first document →
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-raised transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={13} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-bright truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted font-body">{new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Latest recommendation */}
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <p className="font-heading font-bold text-bright text-sm">Latest Recommendation</p>
              <Link to="/recommendations" className="text-amber-400 text-xs font-body hover:text-amber-300 transition-colors">View all →</Link>
            </div>
            {!rec ? (
              <div className="text-center py-8">
                <Brain size={22} className="text-muted mx-auto mb-2" />
                <p className="text-muted text-sm font-body">No recommendations yet</p>
                <Link to="/upload" className="text-amber-400 text-xs mt-2 inline-block hover:underline font-body">
                  Start your analysis →
                </Link>
              </div>
            ) : (
              <div>
                <div className="space-y-1 mb-3">
                  {(rec.recommended_plans?.slice(0, 3) || []).map((p, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-raised transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-medium flex-shrink-0 ${
                        i === 0 ? 'bg-amber-500 text-ink' : 'bg-raised text-muted border border-border'
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body text-bright truncate">{p.name}</p>
                        <p className="text-xs text-muted font-body">Match: {p.score}%</p>
                      </div>
                      {p.premium && (
                        <p className="text-xs font-mono text-amber-400 flex-shrink-0">
                          ₹{p.premium?.toLocaleString('en-IN')}/mo
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted font-body px-3">
                  <Clock size={10} /> {new Date(rec.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}