'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Logo from '@/components/Logo'
import Toolbar from '@/components/Toolbar'

interface MedicalFile { id:string; name:string; type:string; createdAt:string; url:string }
interface Consultation { id:string; triageLevel:string|null; createdAt:string; messages:{role:string;content:string}[] }
interface User {
  id:string; firstName:string; lastName:string; email:string; phone:string
  bloodType:string; dateOfBirth:string; emergencyContactName:string
  emergencyContactPhone:string; autoSendEmergency:boolean
  medicalFiles:MedicalFile[]; consultations:Consultation[]
}

function Badge({ level }: { level: string|null }) {
  const map: Record<string,{label:string;bg:string;color:string}> = {
    REST:   { label:'Rest at home', bg:'#f0fdf4', color:'#16a34a' },
    URGENT: { label:'Urgent care',  bg:'#fffbeb', color:'#b45309' },
    ER:     { label:'Emergency',    bg:'#fef2f2', color:'#dc2626' },
  }
  const b = level ? map[level] : null
  if (!b) return <span style={{ fontSize:12, color:'#4a6b6b', background:'#f1f5f9', padding:'3px 10px', borderRadius:999, fontWeight:600 }}>In progress</span>
  return <span style={{ fontSize:12, background:b.bg, color:b.color, padding:'4px 12px', borderRadius:999, fontWeight:700 }}>{b.label}</span>
}

function DashboardContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [user, setUser] = useState<User|null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview'|'files'|'history'|'settings'|'summary'|'nearby'>(() => {
    return 'overview'
  })
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<User>>({})
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState('')
  const [summaryData, setSummaryData] = useState<{name:string;dob:string;bloodType:string;phone:string;emergencyContact:string;consultationCount:number;files:string[];generatedAt:string}|null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [nearbyHospitals, setNearbyHospitals] = useState<{name:string;address:string;distance:string;lat:number;lng:number}[]>([])
  const [locationError, setLocationError] = useState('')
  const [loadingNearby, setLoadingNearby] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  async function fetchUser() {
    const res = await fetch('/api/auth/me')
    if (!res.ok) { router.push('/'); return }
    const d = await res.json()
    if (d?.user) { setUser(d.user); setEditData(d.user) }
    setLoading(false)
  }

  useEffect(() => { fetchUser() }, [router])

  useEffect(() => {
    if (params.get('refresh')) fetchUser()
  }, [params])

  useEffect(() => {
    const tab = params.get('tab')
    if (tab && ['overview','files','history','settings','summary','nearby'].includes(tab)) {
      setActiveTab(tab as typeof activeTab)
    }
  }, [params])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/user', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(editData) })
    const data = await res.json()
    if (data.user) setUser(p => p ? { ...p, ...data.user } : p)
    setSaving(false)
    setEditMode(false)
  }

  async function toggleAutoSend() {
    if (!user) return
    setToggling(true)
    const res = await fetch('/api/user', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ autoSendEmergency: !user.autoSendEmergency }) })
    const data = await res.json()
    if (data.user) setUser(p => p ? { ...p, autoSendEmergency: data.user.autoSendEmergency } : p)
    setToggling(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    const formData = new FormData(); formData.append('file', file)
    const res = await fetch('/api/files/upload', { method:'POST', body: formData })
    if (res.ok) { const data = await res.json(); setUser(p => p ? { ...p, medicalFiles: [data.file, ...p.medicalFiles] } : p) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteFile(fileId: string) {
    const res = await fetch(`/api/files/${fileId}`, { method:'DELETE' })
    if (res.ok) setUser(p => p ? { ...p, medicalFiles: p.medicalFiles.filter(f => f.id !== fileId) } : p)
  }

  async function generateSummary() {
    setLoadingSummary(true)
    const res = await fetch('/api/summary')
    const data = await res.json()
    setSummary(data.summary)
    setSummaryData(data.patient)
    setLoadingSummary(false)
  }

  async function findNearbyHospitals() {
    setLoadingNearby(true)
    setLocationError('')
    if (!navigator.geolocation) { setLocationError('Geolocation not supported by your browser.'); setLoadingNearby(false); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
        if (!key || key === 'your-google-maps-api-key-here') {
          setNearbyHospitals([
            { name:'City General Hospital', address:'123 Main St', distance:'0.8 mi', lat:latitude+0.01, lng:longitude+0.01 },
            { name:'St. Mary Medical Center', address:'456 Oak Ave', distance:'1.2 mi', lat:latitude-0.01, lng:longitude+0.02 },
            { name:'Regional Urgent Care', address:'789 Pine Rd', distance:'2.1 mi', lat:latitude+0.02, lng:longitude-0.01 },
          ])
          setLoadingNearby(false)
          return
        }
        const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=hospital&key=${key}`)
        const data = await res.json()
        setNearbyHospitals((data.results||[]).slice(0,5).map((p: {name:string;vicinity:string;geometry:{location:{lat:number;lng:number}}}) => ({
          name: p.name, address: p.vicinity, distance: '—', lat: p.geometry.location.lat, lng: p.geometry.location.lng
        })))
        setLoadingNearby(false)
      },
      () => { setLocationError('Could not get your location. Please allow location access and try again.'); setLoadingNearby(false) }
    )
  }

  async function sendEmergencyEmail(hospitalName: string) {
    if (!user) return
    const symptomSummary = user.consultations.slice(0,3).flatMap(c => (c.messages as {role:string;content:string}[]).filter(m=>m.role==='user').map(m=>m.content)).join(' | ')
    await fetch('/api/emergency/send', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ consultationId: null, symptomSummary: `Sending to ${hospitalName}. Recent symptoms: ${symptomSummary}` }) })
    alert(`Emergency email sent to ${hospitalName} with your full medical summary.`)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f8f8' }}>
      <div style={{ width:40, height:40, border:'3px solid #c8e0e0', borderTop:'3px solid #008b8b', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!user) return null

  const inputStyle: React.CSSProperties = { padding:'9px 12px', border:'1.5px solid #c8e0e0', borderRadius:9, fontSize:13.5, fontFamily:'inherit', color:'#1a2e2e', background:'#fff', outline:'none', width:'100%' }
  const tab = (id: typeof activeTab) => ({ padding:'10px 16px', fontSize:13, fontWeight:600, cursor:'pointer', border:'none', fontFamily:'inherit', borderBottom: activeTab===id ? '2.5px solid #008b8b' : '2.5px solid transparent', background:'transparent', color: activeTab===id ? '#008b8b' : '#4a6b6b', transition:'all 0.15s', whiteSpace:'nowrap' as const })

  return (
    <div style={{ fontFamily:"var(--font-sans,'Helvetica Neue',sans-serif)", background:'#f0f8f8', minHeight:'100vh' }}>
      <Toolbar active="Health Profile" />

      {/* NAV */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #c8e0e0', padding:'0 2rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:64, position:'sticky', top:0, zIndex:100 }}>
        <Logo />
        <div style={{ position:'relative' }} ref={dropdownRef}>
          <button onClick={() => setShowDropdown(!showDropdown)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 14px 6px 8px', border:`1.5px solid ${showDropdown?'#008b8b':'#c8e0e0'}`, borderRadius:999, background:'#fff', cursor:'pointer', transition:'all 0.15s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#008b8b'}
            onMouseLeave={e=>{ if(!showDropdown) e.currentTarget.style.borderColor='#c8e0e0' }}>
            {/* Initials avatar */}
            <div style={{ width:32, height:32, borderRadius:'50%', background:'#e0f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'#008b8b', flexShrink:0 }}>
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <span style={{ fontSize:14, fontWeight:600, color:'#1a2e2e' }}>{user.firstName} {user.lastName}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4a6b6b" strokeWidth="2.5" strokeLinecap="round" style={{ transform:showDropdown?'rotate(180deg)':'rotate(0)', transition:'transform 0.2s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {showDropdown && (
            <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'#fff', border:'1px solid #c8e0e0', borderRadius:14, boxShadow:'0 8px 32px rgba(0,139,139,0.12)', minWidth:300, zIndex:200, overflow:'hidden' }}>
              <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid #f0f8f8', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:'#e0f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#008b8b', flexShrink:0 }}>
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:14 }}>{user.firstName} {user.lastName}</div>
                  <div style={{ fontSize:12, color:'#4a6b6b' }}>{user.email}</div>
                </div>
              </div>

              {!editMode ? (
                <>
                  <div style={{ padding:'0.75rem 1.25rem' }}>
                    {[
                      { label:'Blood type', value:user.bloodType, highlight:true },
                      { label:'Date of birth', value:user.dateOfBirth },
                      { label:'Phone', value:user.phone },
                      { label:'Emergency contact', value:user.emergencyContactName },
                    ].map(row => (
                      <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #f0f8f8', fontSize:13 }}>
                        <span style={{ color:'#4a6b6b' }}>{row.label}</span>
                        <span style={{ fontWeight:600, color:row.highlight?'#dc2626':'#1a2e2e' }}>{row.value||'—'}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:'0.5rem', borderTop:'1px solid #f0f8f8', display:'flex', flexDirection:'column', gap:6 }}>
                    <button onClick={() => setEditMode(true)}
                      style={{ width:'100%', padding:'9px 14px', background:'#e0f5f5', color:'#006f6f', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Edit account information
                    </button>
                    <button onClick={logout}
                      style={{ width:'100%', padding:'9px 14px', background:'transparent', color:'#dc2626', border:'1px solid #fecaca', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ padding:'1rem 1.25rem' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1a2e2e', marginBottom:12 }}>Edit your information</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[
                      { label:'First name', key:'firstName', type:'text' },
                      { label:'Last name', key:'lastName', type:'text' },
                      { label:'Phone', key:'phone', type:'tel' },
                      { label:'Emergency contact name', key:'emergencyContactName', type:'text' },
                      { label:'Emergency contact phone', key:'emergencyContactPhone', type:'tel' },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize:10.5, fontWeight:700, color:'#4a6b6b', textTransform:'uppercase' as const, letterSpacing:0.3, display:'block', marginBottom:3 }}>{f.label}</label>
                        <input type={f.type} value={(editData as Record<string,string>)[f.key]||''}
                          onChange={e=>setEditData(p=>({...p,[f.key]:e.target.value}))}
                          style={{ ...inputStyle, fontSize:13 }}/>
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize:10.5, fontWeight:700, color:'#4a6b6b', textTransform:'uppercase' as const, letterSpacing:0.3, display:'block', marginBottom:3 }}>Blood type</label>
                      <select value={editData.bloodType||''} onChange={e=>setEditData(p=>({...p,bloodType:e.target.value}))} style={{ ...inputStyle, fontSize:13 }}>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:12 }}>
                    <button onClick={saveProfile} disabled={saving}
                      style={{ flex:1, padding:'9px', background:'#008b8b', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      {saving?'Saving...':'Save changes'}
                    </button>
                    <button onClick={()=>setEditMode(false)}
                      style={{ flex:1, padding:'9px', background:'transparent', color:'#4a6b6b', border:'1px solid #c8e0e0', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem' }}>

        {/* BIG CTA */}
        <div style={{ background:'#008b8b', borderRadius:16, padding:'2.5rem', marginBottom:'2rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1.5rem' }}>
          <div>
            <div style={{ fontFamily:'var(--font-serif,serif)', fontSize:'1.8rem', color:'#fff', marginBottom:8 }}>Good to see you, {user.firstName}.</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,0.75)', maxWidth:460, lineHeight:1.7 }}>Ready to start a new consultation? Describe your symptoms and get a personalized care recommendation in minutes.</div>
          </div>
          <button onClick={() => router.push('/consultation')}
            style={{ padding:'14px 36px', background:'#fff', color:'#008b8b', border:'none', borderRadius:999, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' }}>
            Start Consultation →
          </button>
        </div>

        {/* TABS */}
        <div style={{ background:'#fff', border:'1px solid #c8e0e0', borderRadius:'12px 12px 0 0', borderBottom:'none', display:'flex', overflowX:'auto' }}>
          {([
            { id:'overview', label:'Overview' },
            { id:'files', label:'Medical Files' },
            { id:'history', label:'My Consultations' },
            { id:'nearby', label:'Nearby Hospitals' },
            { id:'summary', label:'Patient Summary' },
            { id:'settings', label:'Emergency Settings' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id); setEditMode(false) }} style={tab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ background:'#fff', border:'1px solid #c8e0e0', borderTop:'none', borderRadius:'0 0 12px 12px', padding:'1.75rem' }}>

          {/* OVERVIEW */}
          {activeTab==='overview' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' }}>
              <div>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#4a6b6b', marginBottom:14 }}>Personal Info</div>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:'1rem', paddingBottom:'1rem', borderBottom:'1px solid #f0f8f8' }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:'#e0f5f5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:'#008b8b', flexShrink:0 }}>{user.firstName[0]}{user.lastName[0]}</div>
                  <div><div style={{ fontWeight:700, fontSize:16 }}>{user.firstName} {user.lastName}</div><div style={{ fontSize:13, color:'#4a6b6b' }}>{user.email}</div></div>
                </div>
                {[
                  { label:'Date of Birth', value:user.dateOfBirth },
                  { label:'Blood Type', value:user.bloodType, highlight:true },
                  { label:'Phone', value:user.phone },
                  { label:'Emergency Contact', value:`${user.emergencyContactName} · ${user.emergencyContactPhone}` },
                ].map(row => (
                  <div key={row.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f8fafc', fontSize:13 }}>
                    <span style={{ color:'#4a6b6b' }}>{row.label}</span>
                    <span style={{ fontWeight:600, color:row.highlight?'#dc2626':'#1a2e2e' }}>{row.value||'—'}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'#4a6b6b', marginBottom:14 }}>Quick Stats</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { label:'Consultations', value:user.consultations.length },
                    { label:'Medical Files', value:user.medicalFiles.length },
                    { label:'ER Visits', value:user.consultations.filter(c=>c.triageLevel==='ER').length },
                    { label:'Urgent Care', value:user.consultations.filter(c=>c.triageLevel==='URGENT').length },
                  ].map(stat => (
                    <div key={stat.label} style={{ background:'#f0f8f8', borderRadius:10, padding:'1rem', textAlign:'center' }}>
                      <div style={{ fontSize:28, fontWeight:800, color:'#008b8b', lineHeight:1 }}>{stat.value}</div>
                      <div style={{ fontSize:12, color:'#4a6b6b', marginTop:4 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* MEDICAL FILES */}
          {activeTab==='files' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                <div><div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Medical Files & Records</div><div style={{ fontSize:13, color:'#4a6b6b' }}>Uploaded files are used as context in every AI consultation.</div></div>
                <label style={{ padding:'9px 18px', background:'#008b8b', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  {uploading?'Uploading...':'+ Upload file'}
                  <input ref={fileRef} type="file" style={{ display:'none' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleFileUpload} disabled={uploading}/>
                </label>
              </div>
              {user.medicalFiles.length===0 ? (
                <div style={{ textAlign:'center', padding:'3rem', color:'#4a6b6b', background:'#f0f8f8', borderRadius:12 }}>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>No files uploaded yet</div>
                  <div style={{ fontSize:13 }}>Upload lab reports, prescriptions, or medical records to personalize your AI consultations.</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
                  {user.medicalFiles.map(f => (
                    <div key={f.id} style={{ border:'1px solid #c8e0e0', borderRadius:10, padding:'1rem', display:'flex', alignItems:'flex-start', gap:10, background:'#f0f8f8' }}>
                      <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.name}</div><div style={{ fontSize:11, color:'#4a6b6b', marginTop:2 }}>{new Date(f.createdAt).toLocaleDateString()}</div></div>
                      <button onClick={() => deleteFile(f.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:18, lineHeight:1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY / MY CONSULTATIONS */}
          {activeTab==='history' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                <div style={{ fontSize:16, fontWeight:700 }}>My Consultations</div>
                <button onClick={() => router.push('/consultation')} style={{ padding:'9px 20px', background:'#008b8b', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>New Consultation →</button>
              </div>
              {user.consultations.length===0 ? (
                <div style={{ textAlign:'center', padding:'3rem', background:'#f0f8f8', borderRadius:12, color:'#4a6b6b' }}>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>No consultations yet</div>
                  <button onClick={() => router.push('/consultation')} style={{ padding:'10px 24px', background:'#008b8b', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', marginTop:8 }}>Start your first consultation</button>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {user.consultations.map(c => {
                    const msgs = c.messages as {role:string;content:string}[]
                    const firstUserMsg = msgs.find(m=>m.role==='user' && m.content !== 'Hello, I need help with my symptoms.')
                    const displayMsg = firstUserMsg?.content || msgs.find(m=>m.role==='user')?.content || 'Consultation'
                    return (
                      <div key={c.id} onClick={() => router.push(`/consultation?id=${c.id}`)}
                        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', border:'1px solid #c8e0e0', borderRadius:10, cursor:'pointer', background:'#fff', transition:'border-color 0.15s' }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor='#008b8b'}
                        onMouseLeave={e=>e.currentTarget.style.borderColor='#c8e0e0'}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:500, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:500 }}>{displayMsg}</div>
                          <div style={{ fontSize:11, color:'#94a3b8' }}>{new Date(c.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}</div>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <Badge level={c.triageLevel}/>
                          <span style={{ color:'#4a6b6b', fontSize:16 }}>→</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* NEARBY HOSPITALS */}
          {activeTab==='nearby' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Nearby Hospitals & Urgent Care</div>
                  <div style={{ fontSize:13, color:'#4a6b6b' }}>Find the closest care facilities based on your current location.</div>
                </div>
                <button onClick={findNearbyHospitals} disabled={loadingNearby}
                  style={{ padding:'9px 20px', background:'#008b8b', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:loadingNearby?0.7:1 }}>
                  {loadingNearby ? 'Finding...' : 'Find Nearby'}
                </button>
              </div>
              {locationError && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'12px 16px', color:'#dc2626', fontSize:13, marginBottom:'1rem' }}>{locationError}</div>}
              {nearbyHospitals.length === 0 && !loadingNearby && !locationError && (
                <div style={{ textAlign:'center', padding:'3rem', background:'#f0f8f8', borderRadius:12, color:'#4a6b6b' }}>
                  <div style={{ fontSize:32, marginBottom:10, opacity:0.3 }}>📍</div>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>Click &quot;Find Nearby&quot; to locate hospitals</div>
                  <div style={{ fontSize:13 }}>We&apos;ll ask for your location to find the closest emergency rooms and urgent care clinics.</div>
                </div>
              )}
              {nearbyHospitals.length > 0 && (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {nearbyHospitals.map((h, i) => (
                    <div key={i} style={{ border:'1px solid #c8e0e0', borderRadius:12, padding:'1.25rem', background:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:700, marginBottom:3 }}>{h.name}</div>
                        <div style={{ fontSize:13, color:'#4a6b6b' }}>{h.address}</div>
                        {h.distance !== '—' && <div style={{ fontSize:12, color:'#008b8b', fontWeight:600, marginTop:3 }}>{h.distance} away</div>}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`, '_blank')}
                          style={{ padding:'8px 16px', background:'#e0f5f5', color:'#006f6f', border:'none', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          Get Directions
                        </button>
                        <button onClick={() => sendEmergencyEmail(h.name)}
                          style={{ padding:'8px 16px', background:'#dc2626', color:'#fff', border:'none', borderRadius:999, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                          Alert Hospital
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PATIENT SUMMARY */}
          {activeTab==='summary' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Patient Summary</div>
                  <div style={{ fontSize:13, color:'#4a6b6b' }}>AI-generated summary of your health history. Share with any doctor.</div>
                </div>
                <button onClick={generateSummary} disabled={loadingSummary}
                  style={{ padding:'9px 20px', background:'#008b8b', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity:loadingSummary?0.7:1 }}>
                  {loadingSummary ? 'Generating...' : summary ? 'Regenerate' : 'Generate Summary'}
                </button>
              </div>

              {!summary && !loadingSummary && (
                <div style={{ textAlign:'center', padding:'3rem', background:'#f0f8f8', borderRadius:12, color:'#4a6b6b' }}>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:6 }}>Generate your patient summary</div>
                  <div style={{ fontSize:13, maxWidth:400, margin:'0 auto' }}>Claude will analyze your health profile and consultation history to create a professional medical summary you can share with any doctor.</div>
                </div>
              )}

              {loadingSummary && (
                <div style={{ textAlign:'center', padding:'3rem', color:'#4a6b6b' }}>
                  <div style={{ width:36, height:36, border:'3px solid #c8e0e0', borderTop:'3px solid #008b8b', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
                  <div style={{ fontSize:14 }}>Generating your summary...</div>
                </div>
              )}

              {summary && summaryData && (
                <div>
                  {/* Header card */}
                  <div style={{ background:'#008b8b', borderRadius:12, padding:'1.25rem 1.5rem', marginBottom:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                    <div>
                      <div style={{ fontFamily:'var(--font-serif,serif)', fontSize:'1.1rem', color:'#fff', marginBottom:4 }}>{summaryData.name}</div>
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Generated {new Date(summaryData.generatedAt).toLocaleString()}</div>
                    </div>
                    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                      {[
                        { label:'Blood Type', value:summaryData.bloodType, red:true },
                        { label:'DOB', value:summaryData.dob },
                        { label:'Consultations', value:String(summaryData.consultationCount) },
                      ].map(s => (
                        <div key={s.label} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:2 }}>{s.label}</div>
                          <div style={{ fontSize:14, fontWeight:700, color: s.red ? '#fca5a5' : '#fff' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary text */}
                  <div style={{ background:'#f0f8f8', border:'1px solid #c8e0e0', borderRadius:12, padding:'1.5rem', marginBottom:'1rem', fontSize:14, lineHeight:1.9, color:'#1a2e2e', whiteSpace:'pre-wrap' }}>
                    {summary}
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    <button onClick={() => {
                      const text = `PATIENT SUMMARY\n\nPatient: ${summaryData.name}\nDOB: ${summaryData.dob}\nBlood Type: ${summaryData.bloodType}\nPhone: ${summaryData.phone}\nEmergency Contact: ${summaryData.emergencyContact}\nGenerated: ${new Date(summaryData.generatedAt).toLocaleString()}\n\n${summary}`
                      const blob = new Blob([text], { type:'text/plain' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `${summaryData.name.replace(' ','_')}_medical_summary.txt`
                      a.click()
                    }} style={{ padding:'10px 20px', background:'#008b8b', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Download Summary
                    </button>
                    <button onClick={() => {
                      const text = `Patient: ${summaryData.name} | DOB: ${summaryData.dob} | Blood Type: ${summaryData.bloodType}\n\n${summary}`
                      navigator.clipboard.writeText(text).then(() => alert('Summary copied to clipboard!'))
                    }} style={{ padding:'10px 20px', background:'#e0f5f5', color:'#006f6f', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Copy to Clipboard
                    </button>
                    <button onClick={() => {
                      window.open(`mailto:?subject=Medical Summary - ${summaryData.name}&body=${encodeURIComponent(`Patient: ${summaryData.name}\nDOB: ${summaryData.dob}\nBlood Type: ${summaryData.bloodType}\n\n${summary}`)}`)
                    }} style={{ padding:'10px 20px', background:'transparent', color:'#1a2e2e', border:'1.5px solid #c8e0e0', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                      Email to Doctor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EMERGENCY SETTINGS */}
          {activeTab==='settings' && (
            <div style={{ maxWidth:560 }}>
              <div style={{ fontSize:16, fontWeight:700, marginBottom:'1.5rem' }}>Emergency Settings</div>
              <div style={{ background:'#fff5f5', border:'1.5px solid #fecaca', borderRadius:14, overflow:'hidden', marginBottom:'1.5rem' }}>
                <div style={{ background:'#dc2626', color:'#fff', padding:'12px 20px', fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#fff', display:'inline-block', animation:'pulse 1.5s infinite' }}/>
                  Auto-send emergency email
                </div>
                <div style={{ padding:'1.5rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:'1rem' }}>
                    <button onClick={toggleAutoSend} disabled={toggling}
                      style={{ width:50, height:28, borderRadius:999, background:user.autoSendEmergency?'#16a34a':'#e2e8f0', border:'none', cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background:'#fff', position:'absolute', top:4, left:user.autoSendEmergency?26:4, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }}/>
                    </button>
                    <div style={{ fontSize:15, fontWeight:700, color:user.autoSendEmergency?'#16a34a':'#4a6b6b' }}>
                      {user.autoSendEmergency ? 'Enabled — will auto-send' : 'Disabled — will ask first'}
                    </div>
                  </div>
                  <div style={{ fontSize:13, color:'#7f1d1d', lineHeight:1.7 }}>When enabled, TriageAI automatically emails the nearest hospital with your full medical summary when an ER emergency is detected.</div>
                </div>
              </div>
              <div style={{ background:'#f0f8f8', border:'1px solid #c8e0e0', borderRadius:12, padding:'1.25rem' }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:8 }}>Alert nearby hospital manually</div>
                <div style={{ fontSize:13, color:'#4a6b6b', marginBottom:12, lineHeight:1.6 }}>Go to the &quot;Nearby Hospitals&quot; tab to find hospitals near you and send them your medical summary with one click.</div>
                <button onClick={() => setActiveTab('nearby')}
                  style={{ padding:'9px 20px', background:'#dc2626', color:'#fff', border:'none', borderRadius:999, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                  Find & Alert Nearby Hospital
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f8f8' }}><div style={{ width:40, height:40, border:'3px solid #c8e0e0', borderTop:'3px solid #008b8b', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}>
      <DashboardContent />
    </Suspense>
  )
}
