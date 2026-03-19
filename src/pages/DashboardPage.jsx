import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { FileText, Brain, Shield, MessageSquare, ArrowRight, TrendingUp, Clock, CheckCircle, Activity, Upload } from 'lucide-react'

const quickActions = [
  { to: '/upload', icon: Upload, label: 'Start Health Analysis', desc: 'Upload documents & answer questions', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20', primary: true },
  { to: '/recommendations', icon: Brain, label: 'View My Plans', desc: 'See your insurance recommendations', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { to: '/vault', icon: Shield, label: 'Medical Vault', desc: 'Access your secure documents', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  { to: '/chat', icon: MessageSquare, label: 'Ask AI Assistant', desc: 'Get answers to insurance questions', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ docs: 0, recs: 0, chats: 0 })
  const [recentDocs, setRecentDocs] = useState([])
  const [latestRec, setLatestRec] = useState(null)
  const [loading, setLoading] = useState(true)

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const firstName = name.split(' ')[0]
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const [docsRes, recsRes, chatsRes] = await Promise.all([
        supabase.from('medical_documents').select('id,file_name,uploaded_at').eq('user_id', user.id).order('uploaded_at', { ascending: false }).limit(4),
        supabase.from('recommendations').select('id,recommended_plans,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('chat_messages').select('id', { count: 'exact' }).eq('user_id', user.id),
      ])
      setRecentDocs(docsRes.data || [])
      setLatestRec(recsRes.data || null)
      setStats({ docs: docsRes.data?.length || 0, recs: recsRes.data ? 1 : 0, chats: chatsRes.count || 0 })
      setLoading(false)
    }
    load()
  }, [user])

  return (
    <div className="min-h-screen bg-midnight pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-slate-500 text-sm font-heading mb-1">{greeting},</p>
            <h1 className="font-display text-4xl md:text-5xl text-white tracking-wider">{firstName.toUpperCase()}</h1>
            <p className="text-slate-500 text-sm mt-1">{user?.email}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <span className="font-display text-xl text-teal-400">{initials}</span>
          </div>
        </div>

        {/* No activity prompt */}
        {!loading && stats.docs === 0 && stats.recs === 0 && (
          <div className="card border-teal-500/30 bg-teal-500/5 mb-8 flex items-center gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
              <Activity size={18} className="text-teal-400" />
            </div>
            <div className="flex-1">
              <p className="font-heading font-semibold text-white text-sm">Start your personalised health analysis</p>
              <p className="text-slate-500 text-xs mt-0.5">Upload medical documents and answer 15 questions to get your insurance recommendation</p>
            </div>
            <Link to="/upload" className="btn-primary text-sm py-2.5">
              Begin Analysis <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Documents', value: stats.docs, icon: FileText, color: 'text-teal-400', bg: 'bg-teal-500/10' },
            { label: 'Recommendations', value: stats.recs, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { label: 'Chat Messages', value: stats.chats, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="card text-center">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                <Icon size={16} className={color} />
              </div>
              <div className="font-display text-3xl text-white tracking-wider">{loading ? '—' : value}</div>
              <div className="text-xs text-slate-500 mt-1 font-heading">{label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="font-heading font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {quickActions.map(({ to, icon: Icon, label, desc, color, bg, primary }) => (
            <Link key={to} to={to} className={`card-hover group flex flex-col gap-3 ${primary ? 'border-teal-500/30 bg-teal-500/5' : ''}`}>
              <div className={`w-10 h-10 rounded-xl border ${bg} flex items-center justify-center`}>
                <Icon size={17} className={color} />
              </div>
              <div>
                <p className="font-heading font-semibold text-white text-sm">{label}</p>
                <p className="text-slate-500 text-xs mt-0.5 leading-snug">{desc}</p>
              </div>
              <ArrowRight size={13} className="text-slate-600 group-hover:text-teal-400 transition-colors mt-auto" />
            </Link>
          ))}
        </div>

        {/* Bottom grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-semibold text-white text-sm">Recent Documents</h3>
              <Link to="/vault" className="text-teal-400 text-xs font-heading hover:underline">View vault</Link>
            </div>
            {recentDocs.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No documents uploaded yet</p>
                <Link to="/upload" className="text-teal-400 text-xs mt-2 inline-block hover:underline">Upload your first document</Link>
              </div>
            ) : recentDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 py-3 border-b border-slate-700/40 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={13} className="text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-heading text-white truncate">{doc.file_name}</p>
                  <p className="text-xs text-slate-500">{new Date(doc.uploaded_at).toLocaleDateString('en-IN')}</p>
                </div>
                <CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-semibold text-white text-sm">Latest Recommendation</h3>
              <Link to="/recommendations" className="text-teal-400 text-xs font-heading hover:underline">View all</Link>
            </div>
            {!latestRec ? (
              <div className="text-center py-8">
                <Brain size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No recommendations yet</p>
                <Link to="/upload" className="text-teal-400 text-xs mt-2 inline-block hover:underline">Start your analysis</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {(latestRec.recommended_plans?.slice(0, 3) || []).map((plan, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-700/40 last:border-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-medium flex-shrink-0 ${
                      i === 0 ? 'bg-teal-500 text-white' : 'bg-slate-700 text-slate-400 border border-slate-600'
                    }`}>{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-heading text-white">{plan.name}</p>
                      <p className="text-xs text-slate-500">Match score: {plan.score}%</p>
                    </div>
                    {plan.premium && <p className="text-xs font-mono text-teal-400">₹{plan.premium?.toLocaleString('en-IN')}/mo</p>}
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
                  <Clock size={11} />Generated {new Date(latestRec.created_at).toLocaleDateString('en-IN')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}