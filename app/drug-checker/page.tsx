'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import Toolbar from '@/components/Toolbar'

interface DrugResult {
  safe: boolean
  interactions: { drugs: string[]; severity: string; description: string }[]
  summary: string
}

export default function DrugChecker() {
  const router = useRouter()
  const [drugs, setDrugs] = useState(['', ''])
  const [loading, setLoading] = useState(false)
  const [loadingFromFile, setLoadingFromFile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState<DrugResult | null>(null)
  const [error, setError] = useState('')

  function addDrug() {
    if (drugs.length < 8) setDrugs(p => [...p, ''])
  }

  function removeDrug(i: number) {
    if (drugs.length > 2) setDrugs(p => p.filter((_, idx) => idx !== i))
  }

  function updateDrug(i: number, val: string) {
    setDrugs(p => p.map((d, idx) => idx === i ? val : d))
  }

  async function uploadAndLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Upload failed. Please try again.')
      } else {
        await loadFromMedicalFile()
      }
    } catch {
      setError('Upload failed. Please try again.')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function loadFromMedicalFile() {
    setLoadingFromFile(true)
    setError('')
    try {
      const res = await fetch('/api/drug-checker/extract-meds')
      const data = await res.json()
      if (data.medications && data.medications.length > 0) {
        const meds = data.medications.length >= 2 ? data.medications : [...data.medications, '']
        setDrugs(meds)
      } else {
        setError(data.error || 'No medications found in your uploaded medical files.')
      }
    } catch {
      setError('Could not load medications from your files.')
    }
    setLoadingFromFile(false)
  }

  async function checkInteractions() {
    const filtered = drugs.filter(d => d.trim())
    if (filtered.length < 2) { setError('Please enter at least 2 medications.'); return }
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/drug-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs: filtered })
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const severityColor = (s: string) => {
    if (s === 'severe') return { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', dot: '#dc2626' }
    if (s === 'moderate') return { bg: '#fffbeb', border: '#fde68a', color: '#b45309', dot: '#d97706' }
    return { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', dot: '#16a34a' }
  }

  return (
    <div style={{ fontFamily: "var(--font-sans,'Helvetica Neue',sans-serif)", background: '#f0f8f8', minHeight: '100vh' }}>
      <Toolbar active="Drug Checker" />
      <nav style={{ background: '#fff', borderBottom: '1px solid #c8e0e0', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100 }}>
        <Logo />
        <button onClick={() => router.push('/dashboard')} style={{ padding: '7px 16px', border: '1.5px solid #c8e0e0', borderRadius: 999, background: '#fff', color: '#4a6b6b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
      </nav>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#008b8b', marginBottom: 8 }}>Drug Interaction Checker</div>
          <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '2rem', fontWeight: 600, marginBottom: 8, letterSpacing: -0.5 }}>Check medication interactions</div>
          <div style={{ fontSize: 14, color: '#4a6b6b', lineHeight: 1.7 }}>Enter 2 or more medications to check for potential interactions. Always consult your doctor before changing medications.</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #c8e0e0', borderRadius: 16, padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2e2e', textTransform: 'uppercase', letterSpacing: 0.5 }}>Enter Medications</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading || loadingFromFile}
                style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#008b8b', border: 'none', borderRadius: 999, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit', opacity: uploading ? 0.7 : 1 }}>
                {uploading ? 'Uploading...' : '⬆ Upload a file'}
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.doc" style={{ display: 'none' }} onChange={uploadAndLoad} />
              <button onClick={loadFromMedicalFile} disabled={loadingFromFile || uploading}
                style={{ fontSize: 12, fontWeight: 600, color: '#008b8b', background: '#e0f5f5', border: 'none', borderRadius: 999, padding: '5px 14px', cursor: 'pointer', fontFamily: 'inherit', opacity: loadingFromFile ? 0.7 : 1 }}>
                {loadingFromFile && !uploading ? 'Reading files...' : 'Load from my medical files'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
            {drugs.map((drug, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e0f5f5', color: '#008b8b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <input
                  type="text"
                  placeholder={`Medication ${i + 1} (e.g. Ibuprofen)`}
                  value={drug}
                  onChange={e => updateDrug(i, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && checkInteractions()}
                  style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #c8e0e0', borderRadius: 9, fontSize: 14, fontFamily: 'inherit', color: '#1a2e2e', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#008b8b'}
                  onBlur={e => e.target.style.borderColor = '#c8e0e0'}
                />
                {drugs.length > 2 && (
                  <button onClick={() => removeDrug(i)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#fee2e2', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={addDrug} style={{ padding: '9px 18px', background: '#e0f5f5', color: '#006f6f', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Add medication
            </button>
            <button onClick={checkInteractions} disabled={loading}
              style={{ padding: '9px 24px', background: '#008b8b', color: '#fff', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Checking...' : 'Check Interactions'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', border: '1px solid #c8e0e0', borderRadius: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #c8e0e0', borderTop: '3px solid #008b8b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, color: '#4a6b6b' }}>Analyzing interactions...</div>
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: result.safe ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${result.safe ? '#bbf7d0' : '#fecaca'}`, borderRadius: 12, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: result.safe ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 18 }}>{result.safe ? '✓' : '!'}</span>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: result.safe ? '#16a34a' : '#dc2626', marginBottom: 3 }}>
                  {result.safe ? 'No major interactions found' : 'Interactions detected'}
                </div>
                <div style={{ fontSize: 13, color: '#4a6b6b', lineHeight: 1.6 }}>{result.summary}</div>
              </div>
            </div>

            {result.interactions.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #c8e0e0', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ background: '#1a2e2e', color: '#fff', padding: '12px 20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Interaction Details</div>
                {result.interactions.map((interaction, i) => {
                  const s = severityColor(interaction.severity)
                  return (
                    <div key={i} style={{ padding: '1.25rem 1.5rem', borderBottom: i < result.interactions.length - 1 ? '1px solid #f0f8f8' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{interaction.severity} interaction</span>
                        <span style={{ fontSize: 12, background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 999, padding: '2px 10px', fontWeight: 600 }}>
                          {interaction.drugs.join(' + ')}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: '#4a6b6b', lineHeight: 1.7 }}>{interaction.description}</div>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ background: '#f0f8f8', border: '1px solid #c8e0e0', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: '#4a6b6b', lineHeight: 1.6 }}>
              This information is for educational purposes only. Always consult your pharmacist or doctor before combining medications.
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
