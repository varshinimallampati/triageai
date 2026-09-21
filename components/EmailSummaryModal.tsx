'use client'
import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  urgent?: boolean
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  /** Symptoms from the current consultation, if any */
  currentSymptoms?: string[]
  /** Triage result of the current consultation: HOME | URGENT | ER */
  currentTriage?: string | null
}

interface MeUser {
  firstName: string; lastName: string; phone: string; dateOfBirth: string; bloodType: string
  emergencyContactName: string; emergencyContactPhone: string
  medicalFiles: { name: string }[]
  consultations: { createdAt: string; triageLevel: string | null; messages: { role: string; content: string }[] }[]
}

const TRIAGE_LABEL: Record<string, string> = { HOME: 'Rest at home', URGENT: 'Urgent care', ER: 'Emergency (ER)' }
// Long mailto links can fail in some mail apps, so keep the body compact
const MAX_BODY = 1800

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

function buildBody(u: MeUser, p: Props): string {
  const lines: string[] = []
  lines.push(p.urgent ? 'EMERGENCY MEDICAL SUMMARY' : 'PATIENT MEDICAL SUMMARY')
  lines.push('Prepared by the patient using TriageAI. The triage result is AI-generated and is not a diagnosis.')
  lines.push('')
  lines.push(`Patient: ${u.firstName} ${u.lastName}`)
  if (u.dateOfBirth) lines.push(`Date of birth: ${u.dateOfBirth}`)
  if (u.bloodType) lines.push(`Blood type: ${u.bloodType}`)
  if (u.phone) lines.push(`Phone: ${u.phone}`)
  if (u.emergencyContactName || u.emergencyContactPhone) {
    lines.push(`Emergency contact: ${[u.emergencyContactName, u.emergencyContactPhone].filter(Boolean).join(' - ')}`)
  }

  const symptoms = (p.currentSymptoms ?? []).filter(s => s && s !== 'Hi, I need help with my health.')
  if (p.currentTriage || symptoms.length) {
    lines.push('')
    lines.push('CURRENT CONSULTATION')
    if (p.currentTriage) lines.push(`Triage result: ${TRIAGE_LABEL[p.currentTriage] ?? p.currentTriage}`)
    symptoms.slice(-4).forEach(s => lines.push(`- ${clip(s, 200)}`))
  }

  const past = u.consultations.filter(c => c.triageLevel).slice(0, 3)
  if (past.length) {
    lines.push('')
    lines.push('RECENT CONSULTATIONS')
    past.forEach(c => {
      const first = (c.messages || []).find(m => m.role === 'user' && m.content !== 'Hi, I need help with my health.')
      const date = new Date(c.createdAt).toLocaleDateString()
      lines.push(`- ${date} | ${TRIAGE_LABEL[c.triageLevel ?? ''] ?? c.triageLevel}${first ? ` | ${clip(first.content, 120)}` : ''}`)
    })
  }

  if (u.medicalFiles.length) {
    lines.push('')
    lines.push(`Medical files on record: ${u.medicalFiles.slice(0, 5).map(f => f.name).join(', ')}`)
  }
  lines.push('')
  lines.push(`Sent: ${new Date().toLocaleString()}`)

  const body = lines.join('\n')
  return body.length > MAX_BODY ? body.slice(0, MAX_BODY - 1) + '…' : body
}

export default function EmailSummaryModal(props: Props) {
  const { open, onClose, urgent, recipientName, recipientEmail, recipientPhone } = props
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setTo(recipientEmail ?? '')
    setCopied(false)
    setError('')
    setLoading(true)
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((d: { user: MeUser }) => {
        const name = `${d.user.firstName} ${d.user.lastName}`
        setSubject(urgent ? `URGENT: Medical summary for ${name}` : `Medical summary for ${name}`)
        setBody(buildBody(d.user, props))
      })
      .catch(() => setError('Could not load your profile. Please make sure you are logged in.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const q = (s: string) => encodeURIComponent(s)
  function openMailApp() {
    window.location.href = `mailto:${q(to)}?subject=${q(subject)}&body=${q(body)}`
  }
  function openGmail() {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${q(to)}&su=${q(subject)}&body=${q(body)}`, '_blank', 'noopener')
  }
  async function copy() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    setCopied(true)
  }

  const btn = { padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none' } as const
  const input = { width: '100%', padding: '9px 12px', border: '1.5px solid #c8e0e0', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' } as const

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,30,30,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2eeee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{urgent ? 'Send emergency summary' : 'Email your medical summary'}</div>
            {recipientName && <div style={{ fontSize: 13, color: '#4a6b6b', marginTop: 2 }}>To: {recipientName}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#4a6b6b' }}>×</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {urgent && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b', lineHeight: 1.6 }}>
              <strong>If this is life-threatening, call 911 now.</strong> Email is not monitored in real time, so do not rely on it to get emergency help.{' '}
              <a href="tel:911" style={{ color: '#dc2626', fontWeight: 700 }}>Call 911</a>
            </div>
          )}
          {recipientPhone && (
            <div style={{ fontSize: 13, color: '#4a6b6b' }}>
              Faster option: call {recipientName ?? 'them'} at <a href={`tel:${recipientPhone}`} style={{ color: '#008b8b', fontWeight: 700 }}>{recipientPhone}</a>
            </div>
          )}

          {loading && <div style={{ fontSize: 13, color: '#4a6b6b' }}>Preparing your summary…</div>}
          {error && <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>}

          {!loading && !error && (
            <>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4a6b6b' }}>
                To {recipientEmail ? '' : '(this facility has no public email listed, so add one if you have it)'}
                <input value={to} onChange={e => setTo(e.target.value)} placeholder="email@example.com" style={{ ...input, marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4a6b6b' }}>
                Subject
                <input value={subject} onChange={e => setSubject(e.target.value)} style={{ ...input, marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#4a6b6b' }}>
                Message (you can edit it)
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} style={{ ...input, marginTop: 6, resize: 'vertical', lineHeight: 1.5 }} />
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={openMailApp} style={{ ...btn, background: urgent ? '#dc2626' : '#008b8b', color: '#fff' }}>Open in Mail app</button>
                <button onClick={openGmail} style={{ ...btn, background: '#e0f5f5', color: '#006f6f' }}>Open in Gmail</button>
                <button onClick={copy} style={{ ...btn, background: '#f1f5f5', color: '#4a6b6b' }}>{copied ? '✓ Copied' : 'Copy text'}</button>
              </div>
              <div style={{ fontSize: 12, color: '#6b8a8a', lineHeight: 1.6 }}>
                Your email opens with everything filled in. Nothing is sent until you press Send in your email.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
