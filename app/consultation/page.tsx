'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'
import Toolbar from '@/components/Toolbar'
import EmailSummaryModal from '@/components/EmailSummaryModal'

interface Message { role:'user'|'assistant'; content:string; image?:string }

function ChatContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [consultationId, setConsultationId] = useState<string|null>(params.get('id'))
  const [triageLevel, setTriageLevel] = useState<string|null>(null)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [autoOpenEmail, setAutoOpenEmail] = useState(false)
  const [userName, setUserName] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string|null>(null)
  const [imagePreview, setImagePreview] = useState<string|null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)
  const isViewingHistory = !!params.get('id')

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => { if (!r.ok) { router.push('/'); return null } return r.json() })
      .then(d => { if (d?.user) { setUserName(d.user.firstName); setAutoOpenEmail(!!d.user.autoSendEmergency) } })
  }, [router])

  useEffect(() => {
    if (!userName || initialized) return
    setInitialized(true)
    const historyId = params.get('id')
    if (historyId) {
      setLoadingHistory(true)
      fetch(`/api/consultation/${historyId}`)
        .then(r => r.json())
        .then(d => {
          if (d.messages) setMessages(d.messages)
          if (d.triageLevel) setTriageLevel(d.triageLevel)
          setConsultationId(d.id)
        })
        .finally(() => setLoadingHistory(false))
    } else {
      const greeting: Message = { role: 'user', content: 'Hi, I need help with my health.' }
      setMessages([greeting])
      startConsultation(greeting)
    }
  }, [userName])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function startConsultation(greeting: Message) {
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [greeting], consultationId: null })
      })
      const data = await res.json()
      if (!res.ok) { setLoading(false); return }
      setMessages([greeting, { role: 'assistant', content: data.message }])
      setConsultationId(data.consultationId)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function sendMessage(userText: string) {
    if (!userText.trim() && !selectedImage) return
    const newMsg: Message = { role: 'user', content: userText || 'I uploaded an image for you to analyze.' }
    if (selectedImage) newMsg.image = selectedImage
    const newMessages = [...messages, newMsg]
    setMessages(newMessages)
    setInput('')
    setSelectedImage(null)
    setImagePreview(null)
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, consultationId })
      })
      const data = await res.json()
      if (!res.ok) { setLoading(false); return }
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
      setConsultationId(data.consultationId)
      if (data.triageLevel) {
        setTriageLevel(data.triageLevel)
        if (data.triageLevel === 'ER') {
          setShowEmailPrompt(true)
          if (autoOpenEmail) setShowEmailModal(true)
        }
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1]
      setSelectedImage(base64)
      setImagePreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() || selectedImage) sendMessage(input.trim())
    }
  }

  const triageInfo = (level: string) => {
    if (level === 'REST') return { label: 'Rest at home', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', msg: 'Based on your symptoms, you should be able to recover at home. Follow the care instructions and monitor your symptoms.' }
    if (level === 'URGENT') return { label: 'Visit urgent care', color: '#b45309', bg: '#fffbeb', border: '#fde68a', msg: 'You should visit an urgent care clinic within the next few hours. Not an emergency, but you need professional attention soon.' }
    if (level === 'ER') return { label: 'Go to the ER now', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', msg: 'Based on your symptoms, you need emergency care immediately. Please go to the nearest ER or call 911.' }
    return null
  }

  const triage = triageLevel ? triageInfo(triageLevel) : null

  return (
    <div style={{ fontFamily: "var(--font-sans,'Helvetica Neue',sans-serif)", background: '#f0f8f8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar active="Symptom Checker" />
      <nav style={{ background: '#fff', borderBottom: '1px solid #c8e0e0', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, flexShrink: 0 }}>
        <Logo />
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isViewingHistory && (
            <span style={{ fontSize: 12, background: '#e0f5f5', color: '#006f6f', padding: '4px 12px', borderRadius: 999, fontWeight: 600 }}>Continuing past consultation</span>
          )}
          <button onClick={() => router.push('/dashboard?refresh=' + Date.now())} style={{ padding: '7px 16px', border: '1.5px solid #c8e0e0', borderRadius: 999, background: '#fff', color: '#4a6b6b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Dashboard
          </button>
          {isViewingHistory && (
            <button onClick={() => router.push('/consultation')} style={{ padding: '7px 16px', border: 'none', borderRadius: 999, background: '#008b8b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              New Consultation
            </button>
          )}
        </div>
      </nav>

      <div style={{ flex: 1, maxWidth: 780, width: '100%', margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {triage && (
          <div style={{ background: triage.bg, border: `1.5px solid ${triage.border}`, borderRadius: 12, padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: triage.color, display: 'inline-block' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: triage.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>Triage Result: {triage.label}</span>
            </div>
            <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.65 }}>{triage.msg}</div>
          </div>
        )}

        {showEmailPrompt && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '1.1rem', marginBottom: 6, color: '#7f1d1d', fontWeight: 600 }}>Email your medical summary to the hospital?</div>
            <div style={{ fontSize: 13, color: '#991b1b', marginBottom: '1rem', lineHeight: 1.65 }}>This opens your email with your name, blood type, current symptoms, and medical history already filled in, so the ER team can prepare. <strong>If this is life-threatening, call 911 first.</strong></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowEmailModal(true)} style={{ padding: '9px 20px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Prepare email
              </button>
              <button onClick={() => setShowEmailPrompt(false)} style={{ padding: '9px 20px', background: 'transparent', color: '#7f1d1d', border: '1.5px solid #fecaca', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                No, skip
              </button>
            </div>
          </div>
        )}

        <div style={{ background: '#fff', border: '1px solid #c8e0e0', borderRadius: 16, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 520 }}>
          <div style={{ background: '#008b8b', color: '#fff', padding: '14px 20px', borderRadius: '16px 16px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c5d928', animation: 'pulse 1.8s infinite', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '1rem' }}>TriageAI Consultation</span>
            {userName && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginLeft: 4 }}>· {userName}</span>}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginLeft: 'auto' }}>AI-assisted · Not a medical diagnosis</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 400, maxHeight: 500 }}>
            {loadingHistory && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #c8e0e0', borderTop: '3px solid #008b8b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13 }}>Loading consultation...</div>
              </div>
            )}
            {messages.map((msg, i) => {
              if (i === 0 && msg.role === 'user' && msg.content === 'Hi, I need help with my health.') return null
              return (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f5f5', color: '#008b8b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, marginRight: 8, marginTop: 4 }}>AI</div>
                  )}
                  <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {msg.image && (
                      <img src={`data:image/jpeg;base64,${msg.image}`} alt="uploaded" style={{ maxWidth: '100%', borderRadius: 10, border: '1px solid #c8e0e0' }} />
                    )}
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.role === 'user' ? '#008b8b' : '#f8fafc',
                      color: msg.role === 'user' ? '#fff' : '#1a2e2e',
                      fontSize: 14, lineHeight: 1.7,
                      border: msg.role === 'assistant' ? '1px solid #c8e0e0' : 'none',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {msg.content}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f5f5', color: '#008b8b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, marginLeft: 8, marginTop: 4 }}>
                      {userName?.[0] || 'U'}
                    </div>
                  )}
                </div>
              )
            })}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e0f5f5', color: '#008b8b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>AI</div>
                <div style={{ background: '#f8fafc', border: '1px solid #c8e0e0', borderRadius: '18px 18px 18px 4px', padding: '14px 18px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#008b8b', display: 'inline-block', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* IMAGE PREVIEW */}
          {imagePreview && (
            <div style={{ padding: '0 1.25rem', paddingBottom: 8 }}>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={imagePreview} alt="preview" style={{ height: 80, borderRadius: 8, border: '1px solid #c8e0e0' }} />
                <button onClick={() => { setSelectedImage(null); setImagePreview(null) }}
                  style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>
          )}

          {/* INPUT */}
          <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #f0f8f8', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {/* Image upload button */}
            <label style={{ width: 38, height: 38, borderRadius: 10, background: '#f0f8f8', border: '1.5px solid #c8e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#008b8b'; e.currentTarget.style.background = '#e0f5f5' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#c8e0e0'; e.currentTarget.style.background = '#f0f8f8' }}
              title="Upload image">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a6b6b" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
              </svg>
              <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </label>

            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedImage ? "Add a description (optional) and send..." : "Describe your symptoms or answer the question above..."}
              rows={2}
              style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #c8e0e0', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#1a2e2e', outline: 'none', resize: 'none', lineHeight: 1.5, transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = '#008b8b'}
              onBlur={e => e.target.style.borderColor = '#c8e0e0'}
            />
            <button
              onClick={() => { if (input.trim() || selectedImage) sendMessage(input.trim()) }}
              disabled={loading || (!input.trim() && !selectedImage)}
              style={{ padding: '10px 22px', background: '#008b8b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', opacity: loading || (!input.trim() && !selectedImage) ? 0.45 : 1, alignSelf: 'flex-end', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              Send →
            </button>
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', lineHeight: 1.6 }}>
          TriageAI is an AI assistant, not a doctor. This is not a medical diagnosis. Always call 911 in a life-threatening emergency.
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <EmailSummaryModal open={showEmailModal} onClose={() => setShowEmailModal(false)} urgent
        currentTriage={triageLevel} currentSymptoms={messages.filter(m => m.role === 'user').map(m => m.content)} />
    </div>
  )
}

export default function ConsultationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <ChatContent />
    </Suspense>
  )
}
