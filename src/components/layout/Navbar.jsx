import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Activity, LogOut, ChevronDown, Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/dashboard',       label: 'Dashboard'       },
  { to: '/upload',          label: 'Health Analysis' },
  { to: '/recommendations', label: 'My Plans'        },
  { to: '/vault',           label: 'Vault'           },
  { to: '/chat',            label: 'AI Assistant'    },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mob, setMob] = useState(false)
  const [usr, setUsr] = useState(false)

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const isActive = (to) => location.pathname === to

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center
      bg-ink/85 backdrop-blur-2xl border-b border-border">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30
            flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
            <Activity size={15} className="text-amber-400" />
          </div>
          <span className="font-display font-extrabold text-lg text-bright tracking-tight">
            HIA <span className="text-amber-400">NEXUS</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {user ? navLinks.map(({ to, label }) => (
            <Link key={to} to={to}
              className={`px-3.5 py-2 rounded-lg text-sm font-body font-medium transition-all duration-150 ${
                isActive(to)
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-dim hover:text-soft hover:bg-raised'
              }`}>
              {label}
            </Link>
          )) : (
            <>
              <a href="#features"    className="btn-ghost text-sm">Features</a>
              <a href="#how-it-works" className="btn-ghost text-sm">How It Works</a>
            </>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button onClick={() => setUsr(!usr)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl
                  hover:bg-raised transition-colors border border-transparent hover:border-border">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20
                  flex items-center justify-center">
                  <span className="text-xs font-heading font-bold text-amber-400">{initials}</span>
                </div>
                <span className="hidden sm:block text-sm font-body text-soft max-w-28 truncate">{name}</span>
                <ChevronDown size={12} className={`text-muted transition-transform ${usr ? 'rotate-180' : ''}`} />
              </button>
              {usr && (
                <div className="absolute right-0 mt-2 w-52 bg-card border border-border
                  rounded-2xl shadow-raised overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border bg-surface">
                    <p className="text-xs font-heading font-semibold text-bright truncate">{name}</p>
                    <p className="text-xs text-muted truncate mt-0.5">{user.email}</p>
                  </div>
                  <button onClick={async () => { setUsr(false); await signOut(); navigate('/') }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-body
                      text-rose-400 hover:bg-rose-400/10 transition-colors">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth" className="btn-ghost text-sm hidden sm:flex">Sign In</Link>
              <Link to="/auth?mode=register" className="btn-primary py-2 px-4 text-sm">Get Started</Link>
            </div>
          )}
          <button className="md:hidden btn-ghost p-2" onClick={() => setMob(!mob)}>
            {mob ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mob && (
        <div className="absolute top-16 inset-x-0 bg-deep border-b border-border
          px-4 py-3 space-y-1 md:hidden shadow-raised">
          {user ? navLinks.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMob(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-body font-medium transition-colors ${
                isActive(to) ? 'bg-amber-500/10 text-amber-400' : 'text-dim hover:text-soft hover:bg-raised'
              }`}>{label}</Link>
          )) : (
            <>
              <Link to="/auth" onClick={() => setMob(false)} className="block px-4 py-2.5 text-sm text-dim font-body">Sign In</Link>
              <Link to="/auth?mode=register" onClick={() => setMob(false)} className="block px-4 py-2.5 text-sm text-amber-400 font-heading font-semibold">Get Started Free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}