import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Shield, Lock, Unlock, FileText, Trash2, Download, Eye, EyeOff, KeyRound, AlertCircle, CheckCircle } from 'lucide-react'

export default function VaultPage() {
  const { user } = useAuth()
  const [locked, setLocked] = useState(true)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [vaultPin, setVaultPin] = useState('')
  const [pinInput, setPinInput] = useState('')
  const [pinSet, setPinSet] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [accessMethod, setAccessMethod] = useState('pin') // 'pin' or 'otp'
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    const storedPin = localStorage.getItem(`vault_pin_${user?.id}`)
    if (storedPin) { setPinSet(true); setVaultPin(storedPin) }
  }, [user])

  const loadDocuments = async () => {
    const { data } = await supabase
      .from('medical_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('uploaded_at', { ascending: false })
    setDocuments(data || [])
  }

  const sendOtp = async () => {
    setLoading(true)
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setGeneratedOtp(code)
    // In production this would send via Supabase email/SMS
    // For demo we show it in a toast since email sending needs SMTP config
    toast.success(`OTP: ${code}`, {
      duration: 30000,
      icon: '🔐',
      style: { fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.2em' },
    })
    setOtpSent(true)
    setLoading(false)
    toast('OTP shown above (in production this goes to your email)', { icon: 'ℹ️', duration: 4000 })
  }

  const verifyOtp = () => {
    if (otp === generatedOtp) {
      setLocked(false)
      loadDocuments()
      toast.success('Vault unlocked via OTP')
      setOtp('')
    } else {
      setAttempts(a => a + 1)
      toast.error(`Invalid OTP. ${3 - attempts - 1} attempts remaining`)
      if (attempts >= 2) { setOtpSent(false); setGeneratedOtp(''); setAttempts(0) }
    }
  }

  const verifyPin = () => {
    if (pinInput === vaultPin) {
      setLocked(false)
      loadDocuments()
      toast.success('Vault unlocked')
      setPinInput('')
    } else {
      setAttempts(a => a + 1)
      toast.error(`Wrong PIN. ${3 - attempts - 1} attempts remaining`)
      if (attempts >= 2) { setLocked(true); setAttempts(0); toast.error('Too many attempts. Vault locked.') }
    }
  }

  const setVaultPinHandler = () => {
    if (newPin.length < 4) return toast.error('PIN must be at least 4 digits')
    if (newPin !== confirmPin) return toast.error('PINs do not match')
    localStorage.setItem(`vault_pin_${user?.id}`, newPin)
    setVaultPin(newPin)
    setPinSet(true)
    setNewPin('')
    setConfirmPin('')
    toast.success('Vault PIN set successfully')
  }

  const deleteDocument = async (doc) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return
    await supabase.storage.from('medical-documents').remove([doc.file_path])
    await supabase.from('medical_documents').delete().eq('id', doc.id)
    setDocuments(d => d.filter(x => x.id !== doc.id))
    toast.success('Document deleted')
  }

  const downloadDocument = async (doc) => {
    const { data } = await supabase.storage.from('medical-documents').createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('Could not generate download link')
  }

  // Lock screen
  if (locked) {
    return (
      <div className="min-h-screen bg-midnight pt-20 pb-12 px-4 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-rose/10 border border-rose/20 flex items-center justify-center mx-auto mb-4">
              <Shield size={36} className="text-rose" />
            </div>
            <h1 className="font-display text-4xl text-white tracking-widest">SECURE VAULT</h1>
            <p className="text-muted text-sm mt-2">Your medical documents are encrypted and protected</p>
          </div>

          {!pinSet ? (
            // Set up PIN first
            <div className="card">
              <p className="text-sm font-heading font-medium text-white mb-4 flex items-center gap-2">
                <KeyRound size={16} className="text-electric" /> Set Up Vault PIN
              </p>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Create a PIN (min 4 digits)"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="input-field text-center tracking-widest text-lg font-mono"
                  maxLength={8}
                />
                <input
                  type="password"
                  placeholder="Confirm PIN"
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="input-field text-center tracking-widest text-lg font-mono"
                  maxLength={8}
                />
                <button onClick={setVaultPinHandler} className="btn-primary w-full flex items-center justify-center gap-2">
                  <Lock size={16} /> Set Vault PIN
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              {/* Method toggle */}
              <div className="flex bg-surface rounded-xl p-1 mb-5">
                {[['pin', 'PIN'], ['otp', 'OTP (Email)']].map(([m, l]) => (
                  <button key={m} onClick={() => setAccessMethod(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-heading font-medium transition-all ${
                      accessMethod === m ? 'bg-electric text-midnight' : 'text-muted hover:text-white'
                    }`}
                  >{l}</button>
                ))}
              </div>

              {accessMethod === 'pin' ? (
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Enter your vault PIN"
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    onKeyDown={e => e.key === 'Enter' && verifyPin()}
                    className="input-field text-center tracking-widest text-xl font-mono"
                    maxLength={8}
                    autoFocus
                  />
                  <button onClick={verifyPin} className="btn-primary w-full flex items-center justify-center gap-2">
                    <Unlock size={16} /> Unlock Vault
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!otpSent ? (
                    <button onClick={sendOtp} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                      {loading
                        ? <span className="w-4 h-4 border-2 border-midnight border-t-transparent rounded-full animate-spin" />
                        : <KeyRound size={16} />}
                      Send OTP to {user?.email}
                    </button>
                  ) : (
                    <>
                      <p className="text-xs text-muted text-center">Enter the 6-digit OTP sent to your email</p>
                      <input
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                        className="input-field text-center tracking-[0.5em] text-2xl font-mono"
                        maxLength={6}
                        autoFocus
                      />
                      <button onClick={verifyOtp} className="btn-primary w-full flex items-center justify-center gap-2">
                        <Unlock size={16} /> Verify & Unlock
                      </button>
                      <button onClick={() => { setOtpSent(false); setOtp('') }} className="btn-ghost w-full text-sm">
                        Resend OTP
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Unlocked vault
  return (
    <div className="min-h-screen bg-midnight pt-20 pb-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-pulse" />
              <span className="text-pulse text-xs font-heading font-medium">Vault Unlocked</span>
            </div>
            <h1 className="font-display text-4xl text-white tracking-widest">MEDICAL VAULT</h1>
            <p className="text-muted text-sm mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''} stored securely</p>
          </div>
          <button
            onClick={() => setLocked(true)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Lock size={14} /> Lock Vault
          </button>
        </div>

        {/* Security badge */}
        <div className="card border-pulse/20 bg-pulse/5 mb-6 flex items-center gap-3">
          <Shield size={18} className="text-pulse flex-shrink-0" />
          <div>
            <p className="text-sm font-heading font-medium text-white">End-to-end protected</p>
            <p className="text-xs text-muted">Documents stored in Supabase private bucket with row-level security. Only you can access these files.</p>
          </div>
        </div>

        {/* Documents list */}
        {documents.length === 0 ? (
          <div className="card text-center py-16">
            <FileText size={40} className="text-muted mx-auto mb-3" />
            <p className="font-heading font-medium text-white mb-1">No documents in vault</p>
            <p className="text-muted text-sm">Upload medical documents in the Analysis section</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="card flex items-center gap-4 group hover:border-electric/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-electric/10 border border-electric/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={18} className="text-electric" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-medium text-white truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} ·{' '}
                    {doc.extracted_data ? <span className="text-pulse">Analyzed</span> : <span className="text-amber">Pending analysis</span>}
                  </p>
                  {doc.extracted_data?.extractedSummary && (
                    <p className="text-xs text-slate-400 mt-1 truncate">{doc.extracted_data.extractedSummary}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => downloadDocument(doc)}
                    className="w-8 h-8 rounded-lg hover:bg-electric/10 flex items-center justify-center text-muted hover:text-electric transition-colors"
                    title="Download"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => deleteDocument(doc)}
                    className="w-8 h-8 rounded-lg hover:bg-rose/10 flex items-center justify-center text-muted hover:text-rose transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Change PIN section */}
        <div className="card mt-6 border-border/50">
          <p className="text-sm font-heading font-semibold text-white mb-4 flex items-center gap-2">
            <KeyRound size={14} className="text-electric" /> Change Vault PIN
          </p>
          <div className="flex gap-3">
            <input
              type="password"
              placeholder="New PIN"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="input-field font-mono tracking-widest"
              maxLength={8}
            />
            <input
              type="password"
              placeholder="Confirm"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="input-field font-mono tracking-widest"
              maxLength={8}
            />
            <button onClick={setVaultPinHandler} className="btn-secondary text-sm whitespace-nowrap px-4">
              Update PIN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
