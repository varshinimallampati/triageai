'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthModalProps {
  onClose: () => void
  initialScreen?: 'signup' | 'login'
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1.5px solid #c8e0e0', borderRadius: 9,
  fontSize: 13.5, fontFamily: 'inherit', color: '#1a2e2e',
  background: '#fff', outline: 'none', width: '100%', transition: 'border-color 0.15s',
}

export default function AuthModal({ onClose, initialScreen = 'signup' }: AuthModalProps) {
  const router = useRouter()
  const [screen, setScreen] = useState<'signup' | 'login'>(initialScreen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [signup, setSignup] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    dateOfBirth: '', bloodType: '', emergencyContactName: '',
    emergencyContactPhone: '', password: ''
  })
  const [login, setLogin] = useState({ email: '', password: '' })

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/dashboard')
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/dashboard')
    } catch { setError('Something went wrong. Please try again.') }
    finally { setLoading(false) }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,20,0.65)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto', padding: '2.25rem', position: 'relative', animation: 'fadeIn 0.2s ease' }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#4a6b6b', lineHeight: 1 }}>✕</button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <svg width="28" height="28" viewBox="0 0 38 38" fill="none">
            <rect width="38" height="38" rx="11" fill="#e0f5f5"/>
            <path d="M5 19 L11 19 L14 11 L17 24 L20 15 L22 19 L27 19" stroke="#008b8b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <circle cx="31" cy="19" r="3" fill="#c5d928"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '1rem', fontWeight: 600, color: '#008b8b' }}>TriageAI</span>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>
        )}

        {screen === 'signup' ? (
          <form onSubmit={handleSignup}>
            <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '1.55rem', fontWeight: 600, marginBottom: 4, color: '#1a2e2e' }}>Create your account</div>
            <div style={{ fontSize: 13, color: '#4a6b6b', marginBottom: '1.5rem' }}>Your health data is private and encrypted.</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'First name', key: 'firstName', type: 'text', placeholder: 'Jane', full: false },
                { label: 'Last name', key: 'lastName', type: 'text', placeholder: 'Doe', full: false },
                { label: 'Date of birth', key: 'dateOfBirth', type: 'date', placeholder: '', full: false },
                { label: 'Email address', key: 'email', type: 'email', placeholder: 'jane@example.com', full: true },
                { label: 'Phone number', key: 'phone', type: 'tel', placeholder: '+1 (555) 000-0000', full: true },
                { label: 'Emergency contact name', key: 'emergencyContactName', type: 'text', placeholder: 'John Doe', full: true },
                { label: 'Emergency contact phone', key: 'emergencyContactPhone', type: 'tel', placeholder: '+1 (555) 000-0000', full: true },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Minimum 8 characters', full: true },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: f.full ? '1/-1' : 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 800, color: '#4a6b6b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={(signup as Record<string,string>)[f.key]}
                    onChange={e => setSignup(p => ({ ...p, [f.key]: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#008b8b'}
                    onBlur={e => e.target.style.borderColor = '#c8e0e0'}
                    style={inputStyle} required />
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 10.5, fontWeight: 800, color: '#4a6b6b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Blood type</label>
                <select value={signup.bloodType} onChange={e => setSignup(p => ({ ...p, bloodType: e.target.value }))} style={inputStyle}>
                  <option value="">Select blood type</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, background: '#008b8b', color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginTop: 16, opacity: loading ? 0.7 : 1, transition: 'background 0.18s' }}>
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#4a6b6b', marginTop: 12 }}>
              Already have an account?{' '}
              <span onClick={() => { setScreen('login'); setError('') }} style={{ color: '#006f6f', fontWeight: 700, cursor: 'pointer' }}>Sign in</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '1.55rem', fontWeight: 600, marginBottom: 4, color: '#1a2e2e' }}>Welcome back</div>
            <div style={{ fontSize: 13, color: '#4a6b6b', marginBottom: '1.5rem' }}>Sign in to your TriageAI account.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Email address', key: 'email', type: 'email', placeholder: 'jane@example.com' },
                { label: 'Password', key: 'password', type: 'password', placeholder: 'Your password' },
              ].map(f => (
                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 800, color: '#4a6b6b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder}
                    value={(login as Record<string,string>)[f.key]}
                    onChange={e => setLogin(p => ({ ...p, [f.key]: e.target.value }))}
                    onFocus={e => e.target.style.borderColor = '#008b8b'}
                    onBlur={e => e.target.style.borderColor = '#c8e0e0'}
                    style={inputStyle} required />
                </div>
              ))}
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: 13, background: '#008b8b', color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginTop: 16, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 13, color: '#4a6b6b', marginTop: 12 }}>
              No account yet?{' '}
              <span onClick={() => { setScreen('signup'); setError('') }} style={{ color: '#006f6f', fontWeight: 700, cursor: 'pointer' }}>Create one free</span>
            </div>
          </form>
        )}
      </div>
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  )
}
