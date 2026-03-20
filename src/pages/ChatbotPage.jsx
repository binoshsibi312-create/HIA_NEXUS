import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { chatWithAssistant } from '../services/claude'
import { Send, Bot, User, Trash2, MessageSquare, Loader, Info } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'What is the difference between individual and family floater plans?',
  'Which plan is best for someone with diabetes?',
  'How does Section 80D tax benefit work?',
  'Tell me about the Chikitsa Care plan',
  'What does "sum insured" mean?',
  'Compare Aarogya Plus vs Suraksha Premium',
  'What is a waiting period for pre-existing conditions?',
  'How does cashless hospitalisation work?',
]

export default function ChatbotPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [profile, setProfile]   = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('chat_messages').select('*').eq('user_id', user.id).order('created_at').limit(60),
      supabase.from('health_questionnaire').select('answers').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1),
    ]).then(([hr, pr]) => {
      if (hr.data?.length) setMessages(hr.data.map(m => ({ role: m.role, content: m.content })))
      if (pr.data?.[0]) setProfile(pr.data[0].answers)
    })
  }, [user])

  const send = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    await supabase.from('chat_messages').insert({ user_id: user.id, role: 'user', content }).catch(() => {})
    try {
      const reply = await chatWithAssistant(next, profile)
      setMessages(p => [...p, { role: 'assistant', content: reply }])
      await supabase.from('chat_messages').insert({ user_id: user.id, role: 'assistant', content: reply }).catch(() => {})
    } catch (err) {
      toast.error('Something went wrong. Try again.')
      setMessages(p => p.slice(0, -1))
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const clearChat = async () => {
    if (!confirm('Clear all chat history?')) return
    await supabase.from('chat_messages').delete().eq('user_id', user.id)
    setMessages([])
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col pt-16">

      {/* Header */}
      <div className="border-b border-border bg-deep/80 backdrop-blur-xl px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20
              flex items-center justify-center">
              <Bot size={17} className="text-amber-400" />
            </div>
            <div>
              <p className="font-heading font-bold text-bright text-sm">HIA NEXUS Assistant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-muted font-body">Indian insurance specialist · Powered by Groq AI</span>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost text-xs text-muted">
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20
                flex items-center justify-center mx-auto mb-5">
                <MessageSquare size={26} className="text-amber-400" />
              </div>
              <h2 className="font-display font-extrabold text-2xl text-bright tracking-tight mb-2">
                Ask Me Anything
              </h2>
              <p className="text-muted text-sm font-body mb-8 max-w-md mx-auto">
                Plan comparisons, coverage questions, Section 80D benefits, insurance terminology — I know it all.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto text-left">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="p-3.5 rounded-xl border border-border text-sm text-dim font-body
                      hover:border-amber-500/30 hover:bg-raised hover:text-soft
                      transition-all duration-150 text-left leading-snug">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant'
                    ? 'bg-amber-500/10 border border-amber-500/20'
                    : 'bg-raised border border-border'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot  size={14} className="text-amber-400" />
                    : <User size={14} className="text-dim" />
                  }
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-amber-500 text-ink rounded-tr-sm font-body'
                    : 'bg-card border border-border rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose-chat">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed font-medium">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20
                flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-amber-400" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3.5">
                <div className="flex gap-1.5 items-center">
                  {[0,1,2].map(i => (
                    <span key={i}
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-deep/80 backdrop-blur-xl px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask about plans, premiums, Section 80D, or insurance concepts..."
              rows={1}
              className="input resize-none flex-1 py-3 leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="btn-primary p-3 flex-shrink-0 disabled:opacity-40 shadow-glow-amber">
              {loading ? <Loader size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <Info size={10} className="text-muted" />
            <p className="text-xs text-muted font-body">
              For informational purposes only. Consult a licensed IRDAI broker for final decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}