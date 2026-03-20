import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Activity, Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react'

export default function AuthPage() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState(params.get('mode') === 'register' ? 'register' : 'login')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '', confirmPassword: '' })
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (mode === 'register' && form.password !== form.confirmPassword)
      return toast.error('Passwords do not match')
    if (form.password.length < 6)
      return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        toast.success('Welcome back!')
        navigate('/dashboard')
      } else {
        const { error } = await signUp(form.email, form.password, form.fullName)
        if (error) throw error
        toast.success('Account created! Check your email to confirm.', { duration: 6000 })
        setMode('login')
      }
    } catch (err) {
      toast.error(err.message || 'Authentication failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 pt-16">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm">

        {/* Back */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted hover:text-soft
          text-sm font-body mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to home
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl border border-amber-500/20
            flex items-center justify-center">
            <Activity size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="font-display font-extrabold text-bright text-lg tracking-tight leading-none">
              HIA <span className="text-amber-400">NEXUS</span>
            </p>
            <p className="text-muted text-xs font-body mt-0.5">
              {mode === 'login' ? 'Sign in to your account' : 'Create your free account'}
            </p>
          </div>
        </div>

        <div className="card shadow-raised">
          {/* Tab toggle */}
          <div className="flex bg-surface rounded-xl p-1 mb-6 gap-1">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all ${
                  mode === m
                    ? 'bg-amber-500 text-ink shadow-sm'
                    : 'text-muted hover:text-soft'
                }`}>
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input type="text" placeholder="Your full name"
                    value={form.fullName} onChange={set('fullName')} required
                    className="input pl-10" />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input type="email" placeholder="your@email.com"
                  value={form.email} onChange={set('email')} required
                  className="input pl-10" />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={set('password')} required
                  className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-soft transition-colors">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input type="password" placeholder="••••••••"
                    value={form.confirmPassword} onChange={set('confirmPassword')} required
                    className="input pl-10" />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 mt-2 disabled:opacity-50 shadow-glow-amber">
              {loading && <span className="w-4 h-4 border-2 border-ink/30 border-t-ink rounded-full animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-card text-xs text-muted font-body">or</span>
            </div>
          </div>

          <button onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl
              border border-border text-soft text-sm font-body
              hover:border-amber-500/30 hover:bg-raised transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-xs text-muted font-body mt-5">
          By continuing you agree to our{' '}
          <span className="text-amber-500 cursor-pointer hover:text-amber-400">Terms</span> and{' '}
          <span className="text-amber-500 cursor-pointer hover:text-amber-400">Privacy Policy</span>
        </p>
      </div>
    </div>
  )
}