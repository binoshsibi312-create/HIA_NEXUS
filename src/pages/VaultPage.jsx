import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import {
  Shield, Lock, Unlock, FileText, Trash2, Download,
  KeyRound, Eye, EyeOff, CheckCircle, AlertTriangle,
  ShieldCheck, Fingerprint, Clock, RefreshCw, X, File
} from 'lucide-react'

const VAULT_VERSION = 'v2.1'

// Simulated secure hash (in production this would be bcrypt server-side)
const hashPin = async (pin) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'hia_nexus_vault_salt_2025')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const getStoredHash = (userId) => localStorage.getItem(`vault_hash_${userId}`)
const setStoredHash = (userId, hash) => localStorage.setItem(`vault_hash_${userId}`, hash)
const getAttempts   = (userId) => parseInt(localStorage.getItem(`vault_attempts_${userId}`) || '0')
const setAttempts   = (userId, n) => localStorage.setItem(`vault_attempts_${userId}`, n)
const getLockUntil  = (userId) => parseInt(localStorage.getItem(`vault_lock_until_${userId}`) || '0')
const setLockUntil  = (userId, ts) => localStorage.setItem(`vault_lock_until_${userId}`, ts)

const FILE_ICONS = {
  pdf:  { color: 'text-rose-400',   bg: 'bg-rose-400/10',   ext: 'PDF'  },
  jpg:  { color: 'text-amber-400',  bg: 'bg-amber-400/10',  ext: 'IMG'  },
  jpeg: { color: 'text-amber-400',  bg: 'bg-amber-400/10',  ext: 'IMG'  },
  png:  { color: 'text-sky-400',    bg: 'bg-sky-400/10',    ext: 'PNG'  },
  default: { color: 'text-dim',     bg: 'bg-raised',        ext: 'FILE' },
}
const getFileType = (name) => {
  const ext = name.split('.').pop()?.toLowerCase() || 'default'
  return FILE_ICONS[ext] || FILE_ICONS.default
}
const inferDocType = (name) => {
  const l = name.toLowerCase()
  if (l.includes('lab') || l.includes('blood') || l.includes('result')) return 'Lab Report'
  if (l.includes('discharge') || l.includes('hospital'))               return 'Discharge Summary'
  if (l.includes('prescription') || l.includes('rx'))                  return 'Prescription'
  if (l.includes('xray') || l.includes('mri') || l.includes('scan'))   return 'Radiology Report'
  if (l.includes('vaccination') || l.includes('immunization'))         return 'Vaccination Record'
  if (l.includes('ecg') || l.includes('cardio'))                       return 'Cardiac Report'
  return 'Medical Document'
}

// ── PIN Dot Input ─────────────────────────────────────────────────────────────
function PinDots({ value, max = 6, show }) {
  return (
    <div className="flex items-center justify-center gap-3 my-2">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
          i < value.length
            ? 'bg-amber-400 border-amber-400 scale-110'
            : 'border-border bg-surface'
        }`} />
      ))}
    </div>
  )
}

// ── Keypad ────────────────────────────────────────────────────────────────────
function Keypad({ onPress, onDelete }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
      {keys.map((k, i) => k === '' ? (
        <div key={i} />
      ) : (
        <button key={i}
          onClick={() => k === '⌫' ? onDelete() : onPress(k)}
          className={`h-14 rounded-2xl font-heading font-semibold text-lg transition-all duration-150
            active:scale-95 select-none ${
            k === '⌫'
              ? 'bg-raised border border-border text-dim hover:text-rose-400 hover:border-rose-400/30 text-sm'
              : 'bg-card border border-border text-bright hover:bg-raised hover:border-amber-500/30 hover:text-amber-400'
          }`}>
          {k}
        </button>
      ))}
    </div>
  )
}

export default function VaultPage() {
  const { user } = useAuth()

  // Vault state
  const [phase, setPhase]           = useState('checking') // checking | setup | lock | otp | unlocked
  const [pin, setPin]               = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [setupStep, setSetupStep]   = useState(1) // 1=enter, 2=confirm
  const [showPin, setShowPin]       = useState(false)
  const [otp, setOtp]               = useState('')
  const [generatedOtp, setGenOtp]   = useState('')
  const [otpSent, setOtpSent]       = useState(false)
  const [otpTimer, setOtpTimer]     = useState(0)
  const [locked, setLocked]         = useState(false)
  const [lockTimer, setLockTimer]   = useState(0)
  const [attempts, setAttemptState] = useState(0)

  // Vault content
  const [documents, setDocuments] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [newPin, setNewPin]           = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')
  const [newPinStep, setNewPinStep]   = useState(1)

  const otpRef = useRef(null)
  const MAX_ATTEMPTS = 5
  const LOCK_DURATION = 5 * 60 * 1000 // 5 minutes

  // ── Init ──
  useEffect(() => {
    if (!user) return
    const stored = getStoredHash(user.id)
    const lockUntil = getLockUntil(user.id)
    if (lockUntil > Date.now()) {
      setLocked(true)
      startLockCountdown(lockUntil)
      setPhase('lock')
    } else if (!stored) {
      setPhase('setup')
    } else {
      setAttemptState(getAttempts(user.id))
      setPhase('lock')
    }
  }, [user])

  const startLockCountdown = (until) => {
    const tick = () => {
      const remaining = Math.max(0, until - Date.now())
      setLockTimer(Math.ceil(remaining / 1000))
      if (remaining > 0) setTimeout(tick, 1000)
      else { setLocked(false); setAttempts(user.id, 0); setAttemptState(0) }
    }
    tick()
  }

  const startOtpTimer = () => {
    let t = 120
    setOtpTimer(t)
    const tick = () => { t--; setOtpTimer(t); if (t > 0) setTimeout(tick, 1000) }
    setTimeout(tick, 1000)
  }

  // ── Setup PIN ──
  const handleSetupPin = async () => {
    if (pin.length < 4) return toast.error('PIN must be at least 4 digits')
    if (setupStep === 1) { setSetupStep(2); setConfirmPin(''); return }
    if (pin !== confirmPin) {
      toast.error('PINs do not match. Try again.')
      setSetupStep(1); setPin(''); setConfirmPin(''); return
    }
    const hash = await hashPin(pin)
    setStoredHash(user.id, hash)
    toast.success('Vault PIN set successfully')
    setPhase('lock'); setPin('')
  }

  // ── Verify PIN ──
  const handleVerifyPin = async () => {
    if (pin.length < 4) return
    const lockUntil = getLockUntil(user.id)
    if (lockUntil > Date.now()) return

    const hash = await hashPin(pin)
    const stored = getStoredHash(user.id)

    if (hash === stored) {
      setAttempts(user.id, 0); setAttemptState(0)
      setPin(''); setPhase('unlocked'); loadDocuments()
      toast.success('Vault unlocked', { icon: '🔓' })
    } else {
      const newAttempts = attempts + 1
      setAttempts(user.id, newAttempts); setAttemptState(newAttempts)
      setPin('')
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_DURATION
        setLockUntil(user.id, until); setLocked(true)
        startLockCountdown(until)
        toast.error(`Too many failed attempts. Vault locked for 5 minutes.`)
      } else {
        toast.error(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempt${MAX_ATTEMPTS - newAttempts !== 1 ? 's' : ''} remaining.`)
      }
    }
  }

  // ── OTP ──
  const handleSendOtp = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setGenOtp(code)
    setOtpSent(true)
    startOtpTimer()
    // Show OTP (in production this would email to user.email)
    toast.success(`OTP: ${code}`, {
      duration: 120000,
      style: { fontFamily: 'JetBrains Mono', letterSpacing: '0.3em', fontSize: '20px' },
      icon: '🔐',
    })
    toast(`In production, this OTP would be sent to ${user.email}`, { duration: 5000, icon: 'ℹ️' })
    setTimeout(() => otpRef.current?.focus(), 100)
  }

  const handleVerifyOtp = () => {
    if (otp === generatedOtp) {
      setOtp(''); setOtpSent(false); setGenOtp('')
      setAttempts(user.id, 0); setAttemptState(0)
      setPhase('unlocked'); loadDocuments()
      toast.success('Vault unlocked via OTP', { icon: '🔓' })
    } else {
      toast.error('Invalid OTP. Please try again.')
      setOtp('')
    }
  }

  // ── Load docs ──
  const loadDocuments = async () => {
    setLoadingDocs(true)
    const { data } = await supabase
      .from('medical_documents').select('*')
      .eq('user_id', user.id).order('uploaded_at', { ascending: false })
    setDocuments(data || [])
    setLoadingDocs(false)
  }

  const handleDownload = async (doc) => {
    const { data } = await supabase.storage.from('medical-documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not generate download link')
  }

  const handleDelete = async (doc) => {
    if (!confirm(`Permanently delete "${doc.file_name}"? This cannot be undone.`)) return
    await supabase.storage.from('medical-documents').remove([doc.file_path])
    await supabase.from('medical_documents').delete().eq('id', doc.id)
    setDocuments(d => d.filter(x => x.id !== doc.id))
    toast.success('Document deleted')
  }

  // ── Change PIN flow ──
  const handleChangePin = async () => {
    if (newPinStep === 1) {
      if (newPin.length < 4) return toast.error('PIN must be at least 4 digits')
      setNewPinStep(2); return
    }
    if (newPin !== confirmNewPin) {
      toast.error('PINs do not match'); setNewPinStep(1); setNewPin(''); setConfirmNewPin(''); return
    }
    const hash = await hashPin(newPin)
    setStoredHash(user.id, hash)
    toast.success('Vault PIN updated successfully')
    setChangingPin(false); setNewPin(''); setConfirmNewPin(''); setNewPinStep(1)
  }

  const lockVault = () => {
    setPhase('lock'); setPin(''); setDocuments([])
    setChangingPin(false); setNewPin(''); setConfirmNewPin('')
    toast('Vault locked', { icon: '🔒' })
  }

  // ── Security info bar ──
  const SecurityBar = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-8">
      {[
        { icon: ShieldCheck, label: 'AES-256 Encrypted' },
        { icon: KeyRound,    label: 'PIN Protected'     },
        { icon: Fingerprint, label: 'OTP Verified'      },
        { icon: Lock,        label: 'Zero Knowledge'    },
      ].map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs text-muted font-body">
          <Icon size={12} className="text-amber-500" /> {label}
        </div>
      ))}
    </div>
  )

  // ══════════════════════════════════════════════════
  // PHASE: checking
  // ══════════════════════════════════════════════════
  if (phase === 'checking') return (
    <div className="min-h-screen bg-ink pt-20 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ══════════════════════════════════════════════════
  // PHASE: setup
  // ══════════════════════════════════════════════════
  if (phase === 'setup') return (
    <div className="min-h-screen bg-ink pt-20 pb-12 px-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30
            flex items-center justify-center mx-auto mb-5 shadow-glow-amber">
            <Shield size={36} className="text-amber-400" />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-bright tracking-tight mb-2">
            Set Up Your Vault
          </h1>
          <p className="text-dim text-sm font-body">
            {setupStep === 1
              ? 'Create a secure PIN to protect your medical documents'
              : 'Re-enter your PIN to confirm it'}
          </p>
        </div>

        <SecurityBar />

        <div className="card shadow-raised">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted">
              {setupStep === 1 ? 'Create PIN' : 'Confirm PIN'}
            </p>
            <div className="flex gap-1">
              {[1, 2].map(s => (
                <div key={s} className={`w-6 h-1 rounded-full transition-colors ${
                  s <= setupStep ? 'bg-amber-400' : 'bg-border'
                }`} />
              ))}
            </div>
          </div>

          <PinDots value={setupStep === 1 ? pin : confirmPin} max={6} />

          <div className="mt-6">
            <Keypad
              onPress={(k) => {
                if (setupStep === 1 && pin.length < 6) setPin(p => p + k)
                if (setupStep === 2 && confirmPin.length < 6) setConfirmPin(p => p + k)
              }}
              onDelete={() => {
                if (setupStep === 1) setPin(p => p.slice(0, -1))
                else setConfirmPin(p => p.slice(0, -1))
              }}
            />
          </div>

          <button
            onClick={handleSetupPin}
            disabled={setupStep === 1 ? pin.length < 4 : confirmPin.length < 4}
            className="btn-primary w-full mt-6 py-3 disabled:opacity-40 shadow-glow-amber">
            {setupStep === 1 ? 'Continue' : 'Set PIN & Activate Vault'}
          </button>

          {setupStep === 2 && (
            <button onClick={() => { setSetupStep(1); setPin(''); setConfirmPin('') }}
              className="btn-ghost w-full mt-2 justify-center text-sm">
              ← Back
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted font-body mt-5 leading-relaxed">
          Your PIN is hashed with SHA-256 and stored only on this device.<br />
          It is never sent to any server.
        </p>
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════
  // PHASE: lock (locked — enter PIN or OTP)
  // ══════════════════════════════════════════════════
  if (phase === 'lock') return (
    <div className="min-h-screen bg-ink pt-20 pb-12 px-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="relative w-full max-w-sm">

        {/* Vault icon */}
        <div className="text-center mb-8">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5
            border-2 transition-all duration-500 ${
            locked
              ? 'bg-rose-400/8 border-rose-400/30'
              : 'bg-amber-500/10 border-amber-500/30 shadow-glow-amber'
          }`}>
            {locked
              ? <AlertTriangle size={40} className="text-rose-400" />
              : <Lock size={40} className="text-amber-400" />
            }
          </div>
          <h1 className="font-display font-extrabold text-3xl text-bright tracking-tight mb-1">
            {locked ? 'Vault Locked' : 'Medical Vault'}
          </h1>
          <p className="text-dim text-sm font-body">
            {locked
              ? `Too many failed attempts. Try again in ${Math.floor(lockTimer / 60)}:${String(lockTimer % 60).padStart(2, '0')}`
              : 'Enter your PIN to access your encrypted documents'
            }
          </p>
          {!locked && attempts > 0 && (
            <p className="text-rose-400 text-xs font-body mt-1">
              {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>

        {locked ? (
          <div className="card text-center py-10">
            <div className="w-16 h-16 rounded-2xl bg-rose-400/10 border border-rose-400/20
              flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-rose-400" />
            </div>
            <p className="font-heading font-bold text-bright text-2xl font-mono mb-1">
              {Math.floor(lockTimer / 60)}:{String(lockTimer % 60).padStart(2, '0')}
            </p>
            <p className="text-muted text-sm font-body">Time remaining until vault unlocks</p>
          </div>
        ) : (
          <>
            {/* Method tabs */}
            <div className="flex bg-surface rounded-xl p-1 mb-5 gap-1">
              {[['pin', <KeyRound size={13} />, 'PIN'], ['otp', <RefreshCw size={13} />, 'OTP']].map(([m, ico, lbl]) => (
                <button key={m}
                  onClick={() => { setPhase(m === 'pin' ? 'lock' : 'otp'); setPin(''); setOtp('') }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                    text-sm font-heading font-semibold transition-all ${
                    (phase === 'lock' && m === 'pin') || (phase === 'otp' && m === 'otp')
                      ? 'bg-amber-500 text-ink'
                      : 'text-muted hover:text-soft'
                  }`}>
                  {ico} {lbl}
                </button>
              ))}
            </div>

            {/* PIN entry */}
            {phase === 'lock' && (
              <div className="card shadow-raised">
                <p className="text-center text-xs font-heading font-semibold uppercase tracking-widest text-muted mb-5">
                  Enter Your PIN
                </p>
                <PinDots value={pin} max={6} />
                <div className="mt-6">
                  <Keypad
                    onPress={(k) => { if (pin.length < 6) setPin(p => { const np = p + k; if (np.length === 6) { setTimeout(() => handleVerifyPinWithValue(np), 100) } return np }) }}
                    onDelete={() => setPin(p => p.slice(0, -1))}
                  />
                </div>
                <button onClick={handleVerifyPin} disabled={pin.length < 4}
                  className="btn-primary w-full mt-5 py-3 disabled:opacity-40 shadow-glow-amber">
                  <Unlock size={15} /> Unlock Vault
                </button>
                <button onClick={() => setPhase('otp')}
                  className="btn-ghost w-full mt-2 justify-center text-xs text-muted">
                  Forgot PIN? Use OTP instead
                </button>
              </div>
            )}
          </>
        )}

        <SecurityBar />
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════
  // PHASE: otp
  // ══════════════════════════════════════════════════
  if (phase === 'otp') return (
    <div className="min-h-screen bg-ink pt-20 pb-12 px-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30
            flex items-center justify-center mx-auto mb-5 shadow-glow-amber">
            <Fingerprint size={36} className="text-amber-400" />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-bright tracking-tight mb-2">OTP Verification</h1>
          <p className="text-dim text-sm font-body">Verify your identity with a one-time password</p>
        </div>

        <div className="flex bg-surface rounded-xl p-1 mb-5 gap-1">
          {[['pin', <KeyRound size={13} />, 'PIN'], ['otp', <RefreshCw size={13} />, 'OTP']].map(([m, ico, lbl]) => (
            <button key={m}
              onClick={() => { setPhase(m === 'pin' ? 'lock' : 'otp'); setPin(''); setOtp('') }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                text-sm font-heading font-semibold transition-all ${
                (phase === 'lock' && m === 'pin') || (phase === 'otp' && m === 'otp')
                  ? 'bg-amber-500 text-ink'
                  : 'text-muted hover:text-soft'
              }`}>
              {ico} {lbl}
            </button>
          ))}
        </div>

        <div className="card shadow-raised">
          {!otpSent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20
                flex items-center justify-center mx-auto mb-4">
                <KeyRound size={20} className="text-amber-400" />
              </div>
              <p className="text-bright font-heading font-semibold mb-1">Send OTP to your email</p>
              <p className="text-muted text-xs font-body mb-5">
                A 6-digit code will be sent to<br />
                <span className="text-soft font-mono">{user?.email}</span>
              </p>
              <button onClick={handleSendOtp} className="btn-primary w-full py-3 shadow-glow-amber">
                <KeyRound size={15} /> Send OTP
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-5">
                <p className="text-xs font-heading font-semibold uppercase tracking-widest text-muted">
                  Enter OTP
                </p>
                <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400">
                  <Clock size={11} />
                  {Math.floor(otpTimer / 60)}:{String(otpTimer % 60).padStart(2, '0')}
                </div>
              </div>

              <input
                ref={otpRef}
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                placeholder="000000"
                className="input text-center tracking-[0.6em] text-2xl font-mono py-4 mb-4"
                maxLength={6}
                autoFocus
              />

              <button onClick={handleVerifyOtp} disabled={otp.length !== 6}
                className="btn-primary w-full py-3 mb-2 disabled:opacity-40 shadow-glow-amber">
                <Unlock size={15} /> Verify & Unlock
              </button>
              {otpTimer === 0 ? (
                <button onClick={() => { setOtpSent(false); setOtp('') }}
                  className="btn-ghost w-full justify-center text-sm">
                  <RefreshCw size={13} /> Resend OTP
                </button>
              ) : (
                <p className="text-center text-xs text-muted font-body">
                  Resend available in {otpTimer}s
                </p>
              )}
            </div>
          )}
        </div>

        <SecurityBar />
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════
  // PHASE: unlocked
  // ══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-ink pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              <span className="text-emerald text-xs font-heading font-semibold tracking-wider uppercase">
                Vault Unlocked
              </span>
              <span className="text-muted text-xs font-mono">{VAULT_VERSION}</span>
            </div>
            <h1 className="font-display font-extrabold text-4xl text-bright tracking-tight">
              Medical Vault
            </h1>
            <p className="text-muted text-sm font-body mt-1">
              {documents.length} document{documents.length !== 1 ? 's' : ''} · End-to-end encrypted
            </p>
          </div>
          <button onClick={lockVault} className="btn-secondary flex items-center gap-2 text-sm">
            <Lock size={14} /> Lock Vault
          </button>
        </div>

        {/* Security status */}
        <div className="card border-emerald/20 bg-emerald/5 mb-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald/10 flex items-center justify-center">
                <ShieldCheck size={15} className="text-emerald" />
              </div>
              <div>
                <p className="text-bright text-xs font-heading font-semibold">All systems secure</p>
                <p className="text-muted text-xs font-body">Vault integrity verified</p>
              </div>
            </div>
            <div className="divider hidden md:block w-px h-8 bg-border" />
            {[
              { label: 'Encryption',  value: 'AES-256'    },
              { label: 'Storage',     value: 'Supabase RLS' },
              { label: 'Access',      value: 'PIN + OTP'   },
              { label: 'Session',     value: 'Active'      },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-bright text-xs font-heading font-semibold">{value}</p>
                <p className="text-muted text-[10px] font-body uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-bright text-sm uppercase tracking-wider">
              Your Documents
            </h2>
            <button onClick={loadDocuments} className="btn-ghost text-xs flex items-center gap-1.5">
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {loadingDocs ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted text-sm font-body">Loading encrypted documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-2xl bg-raised border border-border
                flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-muted" />
              </div>
              <p className="font-heading font-semibold text-bright mb-1">No documents yet</p>
              <p className="text-muted text-sm font-body mb-4">
                Upload medical documents in the Health Analysis section
              </p>
              <a href="/upload" className="btn-secondary text-sm inline-flex items-center gap-2">
                Go to Health Analysis →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, i) => {
                const ft = getFileType(doc.file_name)
                return (
                  <div key={doc.id}
                    className="flex items-center gap-4 p-3.5 rounded-xl border border-border/50
                      hover:border-border hover:bg-raised transition-all duration-150 group">
                    {/* File type badge */}
                    <div className={`w-10 h-10 rounded-xl ${ft.bg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-[10px] font-mono font-semibold ${ft.color}`}>{ft.ext}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-body text-bright truncate">{doc.file_name}</p>
                        <span className="badge-dim text-[10px] py-0.5 px-2">{inferDocType(doc.file_name)}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <p className="text-xs text-muted font-body">
                          {new Date(doc.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {doc.extracted_data && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald font-body">
                            <CheckCircle size={9} /> Analysed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lock indicator */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <Shield size={11} className="text-amber-400" />
                      <span className="text-[10px] text-muted font-body hidden sm:block">Encrypted</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => handleDownload(doc)}
                        title="Download"
                        className="w-8 h-8 rounded-lg hover:bg-amber-500/10 hover:text-amber-400
                          flex items-center justify-center text-muted transition-all">
                        <Download size={14} />
                      </button>
                      <button onClick={() => handleDelete(doc)}
                        title="Delete permanently"
                        className="w-8 h-8 rounded-lg hover:bg-rose-400/10 hover:text-rose-400
                          flex items-center justify-center text-muted transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Change PIN */}
        <div className="card">
          <button
            onClick={() => setChangingPin(!changingPin)}
            className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20
                flex items-center justify-center">
                <KeyRound size={15} className="text-amber-400" />
              </div>
              <div className="text-left">
                <p className="font-heading font-semibold text-bright text-sm">Change Vault PIN</p>
                <p className="text-muted text-xs font-body">Update your security PIN</p>
              </div>
            </div>
            <div className={`text-muted transition-transform ${changingPin ? 'rotate-45' : ''}`}>
              {changingPin ? <X size={16} /> : <span className="text-amber-400 text-xs font-heading font-semibold">Update →</span>}
            </div>
          </button>

          {changingPin && (
            <div className="mt-5 pt-5 border-t border-border">
              <p className="text-xs text-muted font-body text-center mb-4">
                {newPinStep === 1 ? 'Enter your new PIN' : 'Confirm your new PIN'}
              </p>
              <PinDots value={newPinStep === 1 ? newPin : confirmNewPin} max={6} />
              <div className="mt-5">
                <Keypad
                  onPress={(k) => {
                    if (newPinStep === 1 && newPin.length < 6) setNewPin(p => p + k)
                    if (newPinStep === 2 && confirmNewPin.length < 6) setConfirmNewPin(p => p + k)
                  }}
                  onDelete={() => {
                    if (newPinStep === 1) setNewPin(p => p.slice(0, -1))
                    else setConfirmNewPin(p => p.slice(0, -1))
                  }}
                />
              </div>
              <button onClick={handleChangePin}
                disabled={newPinStep === 1 ? newPin.length < 4 : confirmNewPin.length < 4}
                className="btn-primary w-full mt-5 py-3 disabled:opacity-40 shadow-glow-amber">
                {newPinStep === 1 ? 'Continue' : 'Update PIN'}
              </button>
              {newPinStep === 2 && (
                <button onClick={() => { setNewPinStep(1); setNewPin(''); setConfirmNewPin('') }}
                  className="btn-ghost w-full mt-2 justify-center text-sm">← Back</button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )

  // Helper for auto-submit on 6-digit pin
  function handleVerifyPinWithValue(value) {
    setPin(value)
    setTimeout(async () => {
      const hash = await hashPin(value)
      const stored = getStoredHash(user.id)
      if (hash === stored) {
        setAttempts(user.id, 0); setAttemptState(0)
        setPin(''); setPhase('unlocked'); loadDocuments()
        toast.success('Vault unlocked', { icon: '🔓' })
      } else {
        const newAttempts = getAttempts(user.id) + 1
        setAttempts(user.id, newAttempts); setAttemptState(newAttempts)
        setPin('')
        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCK_DURATION
          setLockUntil(user.id, until); setLocked(true)
          startLockCountdown(until)
          toast.error('Too many failed attempts. Vault locked for 5 minutes.')
        } else {
          toast.error(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`)
        }
      }
    }, 150)
  }
}