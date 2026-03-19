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
  'Tell me about the Chikitsa Care plan in detail',
  'What does "sum insured" mean in health insurance?',
  'Compare Aarogya Plus vs Suraksha Premium',
  'What is a waiting period for pre-existing conditions?',
  'How does cashless hospitalisation work?',
]

export default function ChatbotPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const [histRes, profRes] = await Promise.all([
        supabase.from('chat_messages').select('*').eq('user_id', user.id).order('created_at').limit(60),
        supabase.from('health_questionnaire').select('answers').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1),
      ])
      if (histRes.data?.length) setMessages(histRes.data.map(m => ({ role: m.role, content: m.content })))
      if (profRes.data?.[0]) setUserProfile(profRes.data[0].answers)
    }
    load()
  }, [user])

  const sendMessage = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    const newMessages = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setLoading(true)
    await supabase.from('chat_messages').insert({ user_id: user.id, role: 'user', content })
    try {
      const reply = await chatWithAssistant(newMessages, userProfile)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      await supabase.from('chat_messages').insert({ user_id: user.id, role: 'assistant', content: reply })
    } catch (err) {
      console.error('Chat error full:', err)
      const msg = err.message || 'Unknown error'
      const isQuota = msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('resource_exhausted') || msg.toLowerCase().includes('429')
      const isNetwork = msg.toLowerCase().includes('network') || msg.toLowerCase().includes('failed to fetch')
      if (isQuota) {
        const retryMsg = { role: 'assistant', content: "I've hit the free API rate limit momentarily. Please wait about **60 seconds** and try again. This is a Gemini free tier limit." }
        setMessages(prev => [...prev, retryMsg])
      } else if (isNetwork) {
        toast.error('Network error — make sure the dev server is running and you restarted it after changing vite.config.js')
        setMessages(prev => prev.slice(0, -1))
      } else {
        toast.error('Error: ' + msg, { duration: 8000 })
        setMessages(prev => prev.slice(0, -1))
      }
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
    <div className="min-h-screen bg-midnight flex flex-col pt-16">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-navy/60 backdrop-blur-xl px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <Bot size={18} className="text-teal-400" />
            </div>
            <div>
              <h1 className="font-heading font-semibold text-white text-sm">HIA NEXUS Assistant</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-500">Powered by Gemini AI · Indian insurance specialist</span>
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn-ghost text-xs flex items-center gap-1.5 text-slate-500">
              <Trash2 size={12} /> Clear history
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={26} className="text-teal-400" />
              </div>
              <h2 className="font-heading font-semibold text-white text-lg mb-1">Ask Me Anything</h2>
              <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
                I can help with plan comparisons, coverage questions, Section 80D benefits, and anything about HIA NEXUS.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left max-w-2xl mx-auto">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="p-3 rounded-xl border border-slate-700/60 hover:border-teal-500/40 hover:bg-teal-500/5 text-sm text-slate-400 hover:text-slate-200 transition-all text-left font-body leading-snug">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'assistant' ? 'bg-teal-500/20 border border-teal-500/30' : 'bg-slate-700/60 border border-slate-600'
                }`}>
                  {msg.role === 'assistant' ? <Bot size={14} className="text-teal-400" /> : <User size={14} className="text-slate-400" />}
                </div>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-teal-500 text-white rounded-tr-sm'
                    : 'bg-slate-800/80 border border-slate-700/60 rounded-tl-sm text-slate-200'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h3]:text-white [&>h3]:font-heading [&>h3]:text-sm [&>strong]:text-white [&>p]:leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-teal-400" />
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3.5">
                <div className="flex gap-1.5 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-700/50 bg-navy/60 backdrop-blur-xl px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ask about insurance plans, coverage, premiums, or Section 80D benefits..."
              rows={1}
              className="input-field resize-none flex-1 py-3 leading-relaxed"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="btn-primary p-3 flex-shrink-0 disabled:opacity-40">
              {loading ? <Loader size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 justify-center">
            <Info size={10} className="text-slate-600" />
            <p className="text-xs text-slate-600">For informational purposes only. Not financial or medical advice. Consult a licensed IRDAI broker for final decisions.</p>
          </div>
        </div>
      </div>
    </div>
  )
}