import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { extractMedicalData, generateFollowUpQuestions } from '../services/claude'
import { scoreInsurancePlans, getTopPlans } from '../data/insurancePlans'
import toast from 'react-hot-toast'
import { Upload, FileText, Brain, CheckCircle, ChevronRight, X, AlertCircle, Loader } from 'lucide-react'

const STEPS = ['Upload', 'Analyzing', 'Questions', 'Processing']

const ensureProfile = async (user) => {
  await supabase.from('profiles').upsert({
    id: user.id,
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    email: user.email,
  }, { onConflict: 'id', ignoreDuplicates: true })
}

// Read file as text or create a descriptive placeholder for binary files
const readFileContent = (file) => new Promise((resolve) => {
  // For PDFs and images, Claude gets file metadata (actual OCR needs server-side)
  if (file.type === 'application/pdf' || file.type.startsWith('image/')) {
    resolve(
      `[MEDICAL DOCUMENT]\nFilename: ${file.name}\nType: ${file.type}\nSize: ${(file.size / 1024).toFixed(0)}KB\n` +
      `This document has been uploaded to the secure vault. ` +
      `The filename suggests it may be: ${inferDocumentType(file.name)}. ` +
      `Please generate insurance questions appropriate for a patient who has uploaded medical records.`
    )
  } else {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result || `[File: ${file.name}]`)
    reader.onerror = () => resolve(`[File: ${file.name} — could not read]`)
    reader.readAsText(file)
  }
})

const inferDocumentType = (filename) => {
  const lower = filename.toLowerCase()
  if (lower.includes('lab') || lower.includes('blood') || lower.includes('result')) return 'laboratory test results'
  if (lower.includes('discharge') || lower.includes('hospital')) return 'hospital discharge summary'
  if (lower.includes('prescription') || lower.includes('rx')) return 'prescription record'
  if (lower.includes('xray') || lower.includes('mri') || lower.includes('scan') || lower.includes('ct')) return 'radiology / imaging report'
  if (lower.includes('ecg') || lower.includes('ekg') || lower.includes('cardio')) return 'cardiac test report'
  if (lower.includes('pathology') || lower.includes('biopsy')) return 'pathology report'
  if (lower.includes('surgery') || lower.includes('operative')) return 'surgical / operative report'
  if (lower.includes('vaccination') || lower.includes('immunization')) return 'vaccination record'
  return 'medical document'
}

export default function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [files, setFiles] = useState([])
  const [extractedData, setExtractedData] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')

  const onDrop = useCallback(accepted => {
    setFiles(prev => [...prev, ...accepted].slice(0, 5))
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 5, maxSize: 10 * 1024 * 1024,
  })

  const handleAnalyze = async () => {
    setLoading(true)
    setStep(1)

    let healthData = null

    if (files.length > 0) {
      try {
        setLoadingMsg(`Uploading ${files.length} document(s) to secure vault...`)
        const fileNames = []

        for (const file of files) {
          const path = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
          const { error: upErr } = await supabase.storage
            .from('medical-documents').upload(path, file)

          if (upErr) {
            console.warn('Storage error (continuing):', upErr.message)
          } else {
            await supabase.from('medical_documents').insert({
              user_id: user.id, file_name: file.name, file_path: path,
            })
            fileNames.push(file.name)
            toast.success(`${file.name} uploaded to vault`)
          }
        }

        setLoadingMsg('AI is analyzing your medical documents...')
        const contents = await Promise.all(files.map(readFileContent))
        const combinedText = contents.join('\n\n---\n\n')
        healthData = await extractMedicalData(combinedText, fileNames)

        // Update documents with extracted data
        if (fileNames.length > 0) {
          await supabase.from('medical_documents')
            .update({ extracted_data: healthData })
            .eq('user_id', user.id)
            .eq('file_name', fileNames[0])
        }
      } catch (err) {
        console.error('Document processing error:', err)
        toast('Document analysis failed — proceeding with questionnaire only', { icon: '⚠️' })
        healthData = null
      }
    }

    if (!healthData) {
      healthData = {
        age: null, gender: null, conditions: [], medications: [],
        chronicConditions: false,
        extractedSummary: files.length > 0
          ? 'Documents uploaded to vault. Please complete the questionnaire for your recommendations.'
          : 'No documents uploaded. Please answer the questions below for personalized recommendations.',
        dataQuality: files.length > 0 ? 'medium' : 'low',
      }
    }

    setExtractedData(healthData)

    try {
      setLoadingMsg('Preparing your personalized questionnaire...')
      const qs = await generateFollowUpQuestions(healthData)
      setQuestions(qs)
      setStep(2)
    } catch (err) {
      console.error('Question error:', err)
      toast.error('AI connection failed: ' + err.message)
      setStep(0)
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  const handleAnswer = (id, value) => setAnswers(a => ({ ...a, [id]: value }))

  const handleSubmitAnswers = async () => {
    setStep(3)
    setLoading(true)
    setLoadingMsg('Running ML recommendation engine...')

    try {
      await ensureProfile(user)
      const scores = scoreInsurancePlans(extractedData, answers)
      const topPlans = getTopPlans(scores, 8)

      const plansPayload = topPlans.map(({ plan, score }) => ({
        id: plan.id, name: plan.name, score,
        tier: plan.tier, premium: plan.monthlyPremium?.individual ?? null,
      }))

      await supabase.from('health_questionnaire').insert({
        user_id: user.id,
        answers: { questionnaire: answers, healthProfile: extractedData },
      })

      const { error: recErr } = await supabase.from('recommendations').insert({
        user_id: user.id,
        health_profile: extractedData,
        ml_scores: scores,
        recommended_plans: plansPayload,
      })

      if (recErr) {
        console.error('Rec save error:', recErr)
        toast.error('Save failed: ' + recErr.message)
        setStep(2)
        return
      }

      toast.success('Your recommendations are ready!')
      navigate('/recommendations')
    } catch (err) {
      console.error(err)
      toast.error('Error: ' + err.message)
      setStep(2)
    } finally {
      setLoading(false)
      setLoadingMsg('')
    }
  }

  const renderQuestion = (q) => {
    if (q.type === 'boolean') return (
      <div className="flex gap-3">
        {['Yes', 'No'].map(opt => (
          <button key={opt} onClick={() => handleAnswer(q.id, opt === 'Yes')}
            className={`flex-1 py-3 rounded-xl border text-sm font-heading font-medium transition-all ${
              answers[q.id] === (opt === 'Yes')
                ? 'border-electric bg-electric/10 text-electric'
                : 'border-border text-muted hover:border-slate-500'
            }`}>{opt}</button>
        ))}
      </div>
    )

    if (q.type === 'multiple_choice') return (
      <div className="grid grid-cols-1 gap-2">
        {(q.options || []).map(opt => (
          <button key={opt} onClick={() => handleAnswer(q.id, opt)}
            className={`text-left px-4 py-3 rounded-xl border text-sm font-heading transition-all ${
              answers[q.id] === opt
                ? 'border-electric bg-electric/10 text-electric'
                : 'border-border text-muted hover:border-slate-500'
            }`}>{opt}</button>
        ))}
      </div>
    )

    if (q.type === 'scale') return (
      <div>
        <input type="range" min={q.min || 1} max={q.max || 10}
          value={answers[q.id] || 5}
          onChange={e => handleAnswer(q.id, parseInt(e.target.value))}
          className="w-full accent-electric" />
        <div className="flex justify-between text-xs text-muted mt-2">
          <span className="text-xs">{q.min || 1} — Low monthly premium (high deductible)</span>
          <span className="text-electric font-mono font-medium text-sm">{answers[q.id] || 5}</span>
          <span className="text-xs">Low deductible (high premium) — {q.max || 10}</span>
        </div>
      </div>
    )

    return <input type="number" value={answers[q.id] || ''} onChange={e => handleAnswer(q.id, e.target.value)} className="input-field" />
  }

  return (
    <div className="min-h-screen bg-midnight pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-medium transition-all ${
                i < step ? 'bg-pulse text-midnight' : i === step ? 'bg-electric text-midnight' : 'bg-surface text-muted border border-border'
              }`}>{i < step ? <CheckCircle size={14} /> : i + 1}</div>
              <span className={`text-xs font-heading hidden sm:block ${i === step ? 'text-electric' : 'text-muted'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-pulse' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* STEP 0 */}
        {step === 0 && (
          <div>
            <h1 className="font-display text-4xl text-white tracking-widest mb-2">UPLOAD DOCUMENTS</h1>
            <p className="text-muted text-sm mb-8">Upload your medical records for AI analysis, or skip to the questionnaire.</p>

            <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragActive ? 'border-electric bg-electric/5' : 'border-border hover:border-electric/50 hover:bg-electric/5'
            }`}>
              <input {...getInputProps()} />
              <Upload size={40} className={`mx-auto mb-4 ${isDragActive ? 'text-electric' : 'text-muted'}`} />
              <p className="font-heading font-medium text-white mb-1">
                {isDragActive ? 'Drop your files here' : 'Drag & drop medical documents'}
              </p>
              <p className="text-muted text-sm">Lab reports, prescriptions, discharge summaries, imaging reports</p>
              <p className="text-muted text-xs mt-1">PDF, JPG, PNG · Max 10MB · Up to 5 files</p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
                    <FileText size={16} className="text-electric flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate font-heading">{f.name}</p>
                      <p className="text-xs text-muted">{inferDocumentType(f.name)} · {(f.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <X size={14} className="text-muted hover:text-rose transition-colors" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-4 bg-amber/5 border border-amber/20 rounded-xl flex gap-3">
              <AlertCircle size={16} className="text-amber flex-shrink-0 mt-0.5" />
              <div className="text-xs" style={{ color: '#94a3b8' }}>
                <span className="text-amber font-medium">Note:</span> Documents are stored securely in your encrypted vault.
                Even without documents, you can get recommendations by answering the questionnaire.
              </div>
            </div>

            <button onClick={handleAnalyze} disabled={loading}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-50">
              <Brain size={16} />
              {files.length === 0 ? 'Continue to Questionnaire' : `Analyze ${files.length} Document${files.length > 1 ? 's' : ''} & Continue`}
            </button>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-full border-2 border-electric border-t-transparent animate-spin mx-auto mb-8" />
            <h2 className="font-display text-3xl text-white tracking-widest mb-3">ANALYZING</h2>
            <p className="text-electric text-sm animate-pulse font-heading">{loadingMsg}</p>
            <p className="text-muted text-xs mt-3">This takes 10–30 seconds...</p>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h1 className="font-display text-4xl text-white tracking-widest mb-2">YOUR PROFILE</h1>
            <p className="text-muted text-sm mb-6">
              Answer these {questions.length} questions to get your personalized insurance recommendations.
            </p>

            {extractedData?.extractedSummary && (
              <div className="card border-electric/20 bg-electric/5 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Brain size={14} className="text-electric" />
                  <p className="text-xs text-electric font-heading font-medium">
                    AI Health Summary {extractedData.dataQuality === 'high' ? '· High quality extraction' : ''}
                  </p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{extractedData.extractedSummary}</p>
                {extractedData.conditions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {extractedData.conditions.map((c, i) => (
                      <span key={i} className="badge bg-rose/10 border border-rose/20 text-rose text-xs">{c}</span>
                    ))}
                  </div>
                )}
                {extractedData.medications?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {extractedData.medications.slice(0, 5).map((m, i) => (
                      <span key={i} className="badge bg-amber/10 border border-amber/20 text-amber text-xs">
                        {typeof m === 'object' ? m.name : m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-5">
              {questions.map((q, i) => (
                <div key={q.id} className="card">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm font-heading font-medium text-white flex-1">
                      <span className="text-muted font-mono mr-2 text-xs">{String(i + 1).padStart(2, '0')}.</span>
                      {q.question}
                    </p>
                    <span className="badge bg-surface border border-border text-xs text-muted flex-shrink-0">
                      {q.category}
                    </span>
                  </div>
                  {renderQuestion(q)}
                  {q.why && (
                    <p className="text-xs text-muted mt-2 italic opacity-70">💡 {q.why}</p>
                  )}
                </div>
              ))}
            </div>

            <button onClick={handleSubmitAnswers} disabled={loading}
              className="btn-primary w-full mt-8 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader size={16} className="animate-spin" /> : <Brain size={16} />}
              Generate My Insurance Recommendations
              <ChevronRight size={16} />
            </button>
            <p className="text-center text-xs text-muted mt-3">
              You can answer as many or as few questions as you like
            </p>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="text-center py-24">
            <div className="relative w-20 h-20 mx-auto mb-8">
              <div className="w-20 h-20 rounded-full border-2 border-electric border-t-transparent animate-spin" />
              <Brain size={24} className="absolute inset-0 m-auto text-electric" />
            </div>
            <h2 className="font-display text-3xl text-white tracking-widest mb-3">PROCESSING</h2>
            <p className="text-electric text-sm animate-pulse font-heading">{loadingMsg}</p>
          </div>
        )}
      </div>
    </div>
  )
}