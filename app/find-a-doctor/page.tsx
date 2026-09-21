'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/Logo'
import Toolbar from '@/components/Toolbar'

interface Doctor { name: string; address: string; rating?: number; type: string; lat: number; lng: number }

const specialties = [
  { value: 'clinic', osmKey: 'amenity', osmVal: 'clinic', label: 'General Doctor', icon: '⚕' },
  { value: 'hospital', osmKey: 'amenity', osmVal: 'hospital', label: 'Hospital', icon: '🏥' },
  { value: 'dentist', osmKey: 'amenity', osmVal: 'dentist', label: 'Dentist', icon: '🦷' },
  { value: 'physiotherapy', osmKey: 'amenity', osmVal: 'physiotherapy', label: 'Physio', icon: '🤸' },
  { value: 'pharmacy', osmKey: 'amenity', osmVal: 'pharmacy', label: 'Pharmacy', icon: '💊' },
  { value: 'optometrist', osmKey: 'healthcare', osmVal: 'optometrist', label: 'Eye Care', icon: '👁' },
]

export default function FindADoctor() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [error, setError] = useState('')
  const [specialty, setSpecialty] = useState('clinic')
  const [searched, setSearched] = useState(false)
  const [emailSent, setEmailSent] = useState<string|null>(null)
  const [sendingEmail, setSendingEmail] = useState<string|null>(null)

  async function findDoctors() {
    setLoading(true)
    setError('')
    setSearched(true)
    setDoctors([])
    if (!navigator.geolocation) { setError('Geolocation not supported.'); setLoading(false); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const spec = specialties.find(s => s.value === specialty)!
        try {
          // Try both node and way queries for better coverage
          const query = `[out:json][timeout:25];(node["${spec.osmKey}"="${spec.osmVal}"](around:8000,${latitude},${longitude});way["${spec.osmKey}"="${spec.osmVal}"](around:8000,${latitude},${longitude}););out center 10;`
          const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
          const data = await res.json()
          const results = (data.elements || []).slice(0, 8).map((p: {tags:{name?:string;['addr:street']?:string;['addr:city']?:string};lat?:number;lon?:number;center?:{lat:number;lon:number}}) => ({
            name: p.tags?.name || `${spec.label} Facility`,
            address: [p.tags?.['addr:street'], p.tags?.['addr:city']].filter(Boolean).join(', ') || 'Nearby',
            type: specialty,
            lat: p.lat ?? p.center?.lat ?? latitude,
            lng: p.lon ?? p.center?.lon ?? longitude
          })).filter((d: Doctor) => d.name !== `${spec.label} Facility` || d.address !== 'Nearby')

          if (results.length === 0) {
            setError(`No ${spec.label} found within 8km. Try a different type or check location access.`)
          } else {
            setDoctors(results)
          }
        } catch {
          setError('Could not fetch results. Please try again.')
        }
        setLoading(false)
      },
      () => { setError('Could not get your location. Please allow location access in your browser settings.'); setLoading(false) }
    )
  }

  async function emailDoctor(doctor: Doctor) {
    setSendingEmail(doctor.name)
    try {
      const res = await fetch('/api/emergency/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId: null,
          symptomSummary: `Patient requesting appointment at ${doctor.name}, ${doctor.address}.`
        })
      })
      if (res.ok) setEmailSent(doctor.name)
      else setError('Failed to send. Check your email settings.')
    } catch { setError('Failed to send email.') }
    setSendingEmail(null)
  }

  const selectedSpecialty = specialties.find(s => s.value === specialty)

  return (
    <div style={{ fontFamily: "var(--font-sans,'Helvetica Neue',sans-serif)", background: '#f0f8f8', minHeight: '100vh' }}>
      <Toolbar active="Find a Doctor" />
      <nav style={{ background: '#fff', borderBottom: '1px solid #c8e0e0', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100 }}>
        <Logo />
        <button onClick={() => router.push('/dashboard')} style={{ padding: '7px 16px', border: '1.5px solid #c8e0e0', borderRadius: 999, background: '#fff', color: '#4a6b6b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Dashboard</button>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#008b8b', marginBottom: 8 }}>Location-based search</div>
          <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 600, marginBottom: 8, letterSpacing: -0.5, lineHeight: 1.1 }}>
            Find care <em style={{ color: '#008b8b' }}>near you.</em>
          </div>
          <div style={{ fontSize: 14, color: '#4a6b6b', lineHeight: 1.7 }}>Doctors, hospitals, and clinics near your location. Send your medical summary directly to any facility.</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #c8e0e0', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#4a6b6b', marginBottom: 14 }}>What are you looking for?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {specialties.map(s => (
              <button key={s.value} onClick={() => { setSpecialty(s.value); setDoctors([]); setSearched(false) }}
                style={{ padding: '9px 18px', borderRadius: 999, border: `1.5px solid ${specialty === s.value ? '#008b8b' : '#c8e0e0'}`, background: specialty === s.value ? '#e0f5f5' : '#fff', color: specialty === s.value ? '#006f6f' : '#4a6b6b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, transition: 'all 0.15s' }}>
                <span>{s.icon}</span>{s.label}
              </button>
            ))}
          </div>
          <button onClick={findDoctors} disabled={loading}
            style={{ padding: '11px 28px', background: '#008b8b', color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 10 }}>
            {loading ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}/> Finding...</> : `Find ${selectedSpecialty?.label} Near Me →`}
          </button>
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px', color: '#dc2626', fontSize: 13, marginBottom: '1.5rem' }}>{error}</div>}
        {emailSent && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', color: '#16a34a', fontSize: 13, marginBottom: '1.5rem', fontWeight: 600 }}>✓ Your medical summary was sent to {emailSent}!</div>}

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', border: '1px solid #c8e0e0', borderRadius: 16 }}>
            <div style={{ width: 36, height: 36, border: '3px solid #c8e0e0', borderTop: '3px solid #008b8b', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}/>
            <div style={{ fontSize: 14, color: '#4a6b6b' }}>Finding nearby {selectedSpecialty?.label} providers...</div>
          </div>
        )}

        {!loading && searched && doctors.length === 0 && !error && (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', border: '1px solid #c8e0e0', borderRadius: 16, color: '#4a6b6b' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📍</div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>No results found nearby</div>
            <div style={{ fontSize: 13 }}>Try a different type or check your browser location permissions.</div>
          </div>
        )}

        {!loading && doctors.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#4a6b6b', marginBottom: 14 }}>{doctors.length} {selectedSpecialty?.label} results near you</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {doctors.map((d, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #c8e0e0', borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#008b8b'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#c8e0e0'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: '#e0f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {specialties.find(s => s.value === d.type)?.icon || '⚕'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2e2e', marginBottom: 3 }}>{d.name}</div>
                      <div style={{ fontSize: 13, color: '#4a6b6b' }}>{d.address}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => window.open(`https://www.openstreetmap.org/directions?to=${d.lat},${d.lng}`, '_blank')}
                      style={{ padding: '8px 16px', background: '#f0f8f8', color: '#008b8b', border: '1.5px solid #c8e0e0', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#e0f5f5'; e.currentTarget.style.borderColor = '#008b8b' }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f0f8f8'; e.currentTarget.style.borderColor = '#c8e0e0' }}>
                      📍 Directions
                    </button>
                    <button onClick={() => emailDoctor(d)} disabled={sendingEmail === d.name || emailSent === d.name}
                      style={{ padding: '8px 16px', background: emailSent === d.name ? '#f0fdf4' : '#008b8b', color: emailSent === d.name ? '#16a34a' : '#fff', border: emailSent === d.name ? '1.5px solid #bbf7d0' : 'none', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: sendingEmail === d.name ? 0.7 : 1, transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (!emailSent) e.currentTarget.style.background = '#006f6f' }}
                      onMouseLeave={e => { if (!emailSent) e.currentTarget.style.background = '#008b8b' }}>
                      {emailSent === d.name ? '✓ Sent!' : sendingEmail === d.name ? 'Sending...' : '📧 Email My Summary'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '12px 16px', background: '#e0f5f5', border: '1px solid #b2e0e0', borderRadius: 10, fontSize: 12.5, color: '#006f6f', lineHeight: 1.6 }}>
              "Email My Summary" sends your full medical history, blood type, and emergency contact to that facility so they can prepare before you arrive.
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
