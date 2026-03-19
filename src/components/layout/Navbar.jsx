import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Activity, LogOut, User, Menu, X, ChevronDown } from 'lucide-react'

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Health Analysis' },
  { to: '/recommendations', label: 'My Plans' },
  { to: '/vault', label: 'Medical Vault' },
  { to: '/chat', label: 'AI Assistant' },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-700/50 bg-midnight/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
            <Activity size={15} className="text-teal-400" />
          </div>
          <div>
            <span className="font-display text-lg text-white tracking-widest">HIA NEXUS</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {user ? navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className={`px-3 py-2 rounded-lg text-sm font-heading font-medium transition-all ${
              location.pathname === to
                ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}>{label}</Link>
          )) : (
            <>
              <a href="#features" className="btn-ghost text-sm">Features</a>
              <a href="#how-it-works" className="btn-ghost text-sm">How It Works</a>
            </>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-slate-700/50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                  <span className="text-xs font-heading font-semibold text-teal-400">{initials}</span>
                </div>
                <span className="hidden sm:block text-sm text-slate-300 font-heading max-w-28 truncate">{name}</span>
                <ChevronDown size={13} className="text-slate-500" />
              </button>
              {userOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-2xl shadow-2xl shadow-black/40 py-2 z-50">
                  <div className="px-4 py-2.5 border-b border-border">
                    <p className="text-xs font-heading font-medium text-white truncate">{name}</p>
                    <p className="text-xs text-muted truncate mt-0.5">{user.email}</p>
                  </div>
                  <button onClick={async () => { await signOut(); navigate('/') }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors font-heading mt-1">
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/auth" className="btn-ghost text-sm hidden sm:flex">Sign In</Link>
              <Link to="/auth?mode=register" className="btn-primary py-2 text-sm">Get Started</Link>
            </div>
          )}
          <button className="md:hidden text-slate-400 hover:text-white p-1.5" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile */}
      {mobileOpen && (
        <div className="md:hidden bg-navy border-t border-border px-4 py-3 space-y-1">
          {user ? navLinks.map(({ to, label }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2.5 rounded-xl text-sm font-heading font-medium transition-colors ${
                location.pathname === to ? 'bg-teal-500/10 text-teal-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}>{label}</Link>
          )) : (
            <>
              <Link to="/auth" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-slate-400 font-heading">Sign In</Link>
              <Link to="/auth?mode=register" onClick={() => setMobileOpen(false)} className="block px-4 py-2.5 text-sm text-teal-400 font-heading font-semibold">Get Started Free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}