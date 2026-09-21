'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthModal from '@/components/AuthModal'
import Toolbar from '@/components/Toolbar'
import Logo from '@/components/Logo'

const stepDetails = [
  { n:1, title:'Build your health profile', body:'When you sign up, you fill in blood type, allergies, medications, and emergency contact. You can also upload lab reports and medical documents. Every consultation starts with the AI reading all of this first.', tip:'The more you add, the more accurate your results. Even just blood type and allergies makes a big difference.' },
  { n:2, title:'Describe your symptoms', body:'Start a conversation and describe what you\'re feeling in plain English. The AI asks follow-up questions — how long? Is the pain sharp or dull? Does anything make it better or worse? Natural conversation, not a checkbox form.', tip:'Be as specific as possible. "Sharp chest pain for 2 hours that gets worse when I breathe" is far more useful than "chest hurts".' },
  { n:3, title:'Get your recommendation', body:'After gathering enough context, TriageAI gives you one of three outcomes: Rest at home with care instructions, Urgent care within a few hours with nearby clinics, or ER immediately with the option to auto-alert the hospital.', tip:'For ER cases you\'ll be asked if you want to send your medical summary to the nearest hospital so they\'re prepared before you arrive.' },
  { n:4, title:'Review your history', body:'Every session is saved with the date, symptoms, and outcome. Open any past consultation, review the full conversation, and share it with your doctor before appointments.', tip:'Download or share a consultation summary before your next doctor\'s visit — it saves time and gives them useful context.' },
]

export default function Home() {
  const router = useRouter()
  const [authModal, setAuthModal] = useState<'signup'|'login'|null>(null)
  const [stepModal, setStepModal] = useState<typeof stepDetails[0]|null>(null)
  const [toggleOn, setToggleOn] = useState(true)

  const s: React.CSSProperties = {}
  void s

  return (
    <div style={{ fontFamily: "var(--font-sans,'Helvetica Neue',sans-serif)", background: '#fff', color: '#1a2e2e', overflowX: 'hidden' }}>

      {/* TOOLBAR */}
      <Toolbar active="Symptom Checker" />

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #c8e0e0', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, position: 'sticky', top: 0, zIndex: 200 }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {['Conditions','Medications','Find a Doctor','Well-Being'].map(l => (
            <a key={l} href="#" style={{ padding: '8px 14px', fontSize: 13.5, fontWeight: 500, color: '#4a6b6b', textDecoration: 'none', borderRadius: 8, transition: 'all 0.15s' }}
              onMouseEnter={e=>(e.currentTarget.style.background='#e0f5f5')}
              onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
              {l}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setAuthModal('login')} style={{ padding: '8px 18px', border: '1.5px solid #c8e0e0', borderRadius: 999, background: '#fff', color: '#1a2e2e', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s' }}
            onMouseEnter={e=>(e.currentTarget.style.borderColor='#008b8b')}
            onMouseLeave={e=>(e.currentTarget.style.borderColor='#c8e0e0')}>
            Sign in
          </button>
          <button onClick={() => setAuthModal('signup')} style={{ padding: '8px 20px', border: 'none', borderRadius: 999, background: '#008b8b', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.18s' }}
            onMouseEnter={e=>(e.currentTarget.style.background='#006f6f')}
            onMouseLeave={e=>(e.currentTarget.style.background='#008b8b')}>
            Get started free
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ background: '#f0f8f8', padding: '5rem 2rem 4rem', position: 'relative', overflow: 'hidden' }}>
        {/* decorative blobs */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: '#008b8b', opacity: 0.07, top: -100, right: -80, pointerEvents: 'none' }}/>
        <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: '#c5d928', opacity: 0.1, bottom: -80, left: '5%', pointerEvents: 'none' }}/>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          {/* Left */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#e0f5f5', border: '1px solid #b2e0e0', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#006f6f', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: '1.5rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#008b8b', display: 'inline-block', animation: 'pulse 2s infinite' }}/>
              AI-powered triage
            </div>
            <h1 style={{ fontFamily: 'var(--font-serif,serif)', fontSize: 'clamp(2.6rem,5vw,4rem)', fontWeight: 600, lineHeight: 1.1, letterSpacing: -1, marginBottom: '1.2rem' }}>
              Health should<br/>be this <em style={{ color: '#008b8b' }}>clear.</em>
            </h1>
            <p style={{ fontSize: '1rem', color: '#4a6b6b', lineHeight: 1.8, maxWidth: 440, marginBottom: '2.2rem' }}>
              Describe your symptoms. TriageAI asks the right questions and tells you exactly what to do — backed by your full medical history.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setAuthModal('signup')} style={{ padding: '14px 32px', borderRadius: 999, background: '#008b8b', color: '#fff', border: 'none', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s' }}
                onMouseEnter={e=>{e.currentTarget.style.background='#006f6f';e.currentTarget.style.transform='translateY(-1px)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='#008b8b';e.currentTarget.style.transform='translateY(0)'}}>
                Start for free
              </button>
              <button onClick={() => setStepModal(stepDetails[0])} style={{ padding: '14px 32px', borderRadius: 999, background: '#fff', color: '#1a2e2e', border: '1.5px solid #c8e0e0', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#008b8b';e.currentTarget.style.color='#008b8b'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#c8e0e0';e.currentTarget.style.color='#1a2e2e'}}>
                See how it works
              </button>
            </div>
          </div>
          {/* Right — triage card */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ background: '#fff', border: '1px solid #c8e0e0', borderRadius: 20, padding: '1.75rem', width: '100%', maxWidth: 360, boxShadow: '0 4px 40px rgba(0,139,139,0.08)' }}>
              <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>What does TriageAI tell you?</div>
              {[
                { bg:'#f0fdf4', dot:'#16a34a', label:'Rest at home', desc:'With personalized care tips', color:'#16a34a' },
                { bg:'#fffbeb', dot:'#d97706', label:'Visit urgent care', desc:'With nearby clinics listed', color:'#b45309' },
                { bg:'#fef2f2', dot:'#dc2626', label:'Go to the ER', desc:'Auto-alert hospital option', color:'#dc2626' },
              ].map(t => (
                <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderRadius: 12, marginBottom: 10, background: t.bg, cursor: 'pointer', transition: 'transform 0.15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.transform='translateX(4px)')}
                  onMouseLeave={e=>(e.currentTarget.style.transform='translateX(0)')}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.dot, flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: t.color, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 11.5, color: t.color, opacity: 0.8 }}>{t.desc}</div>
                  </div>
                  <span style={{ fontSize: 16, color: t.color, opacity: 0.5 }}>→</span>
                </div>
              ))}
              <button onClick={() => setAuthModal('signup')} style={{ marginTop: 5, width: '100%', padding: 12, background: '#008b8b', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.18s' }}
                onMouseEnter={e=>(e.currentTarget.style.background='#006f6f')}
                onMouseLeave={e=>(e.currentTarget.style.background='#008b8b')}>
                Check your symptoms now →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE STRIP */}
      <div style={{ background: '#008b8b', padding: '1.2rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem' }}>
          {['Personalized to your history','Conversational AI','Nearest care finder','Emergency auto-alert','Encrypted & private'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c5d928', flexShrink: 0 }}/>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '5rem 2rem' }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#008b8b', marginBottom: 10 }}>Why TriageAI</div>
        <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: 600, letterSpacing: -0.5, marginBottom: '1rem', lineHeight: 1.2 }}>Built different from<br/>every other symptom checker</div>
        <div style={{ fontSize: 15, color: '#4a6b6b', maxWidth: 520, lineHeight: 1.75, marginBottom: '3rem' }}>Most tools give generic answers. TriageAI knows your blood type, your medications, your history — and uses all of it.</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
          {[
            { title:'Your full health profile in context', desc:'Upload lab reports, list medications and allergies. Every consultation starts with a complete picture of you — not a blank slate.' },
            { title:'A real conversation, not a checkbox', desc:'TriageAI asks smart follow-up questions — duration, severity, triggers — the same way a nurse would in a clinic.' },
            { title:'Instant clarity on next steps', desc:'No vague disclaimers. You get one of three clear outcomes with specific actions to take right now.' },
            { title:'Nearest care, instantly mapped', desc:'For urgent care cases, get a live list of the closest clinics sorted by distance and wait time — no extra searching.' },
            { title:'Auto-alert the ER before you arrive', desc:'One toggle sends your complete medical summary to the nearest hospital when an emergency is detected.' },
            { title:'Full consultation history', desc:'Every session is saved. Share your history with your doctor or review how symptoms have changed over time.' },
          ].map(f => (
            <div key={f.title} style={{ background: '#fff', border: '1px solid #c8e0e0', borderRadius: 16, padding: '1.75rem', transition: 'border-color 0.2s,transform 0.2s', cursor: 'default' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#008b8b';e.currentTarget.style.transform='translateY(-3px)'}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#c8e0e0';e.currentTarget.style.transform='translateY(0)'}}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#c5d928', marginBottom: '1rem' }}/>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: '#4a6b6b', lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ background: '#f0f8f8', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#008b8b', marginBottom: 10 }}>How it works</div>
          <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: 'clamp(1.8rem,3.5vw,2.6rem)', fontWeight: 600, letterSpacing: -0.5, marginBottom: '0.75rem' }}>Four steps. Total clarity.</div>
          <div style={{ fontSize: 15, color: '#4a6b6b', marginBottom: '2.5rem' }}>Click any step to learn what happens behind the scenes.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {stepDetails.map(s => (
              <button key={s.n} onClick={() => setStepModal(s)} style={{ background: '#fff', border: '1.5px solid #c8e0e0', borderRadius: 16, padding: '1.5rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.18s' }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='#008b8b';e.currentTarget.style.background='#e0f5f5'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='#c8e0e0';e.currentTarget.style.background='#fff'}}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#008b8b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>{s.n}</div>
                  <span style={{ fontSize: 14, color: '#008b8b' }}>▾</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2e2e', marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#4a6b6b' }}>{s.body.slice(0,55)}...</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* EMERGENCY SECTION */}
      <div style={{ background: '#f0f8f8', padding: '0 2rem 4rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', background: '#fff', border: '1px solid #c8e0e0', borderRadius: 24, padding: '3rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 999, padding: '5px 14px', fontSize: 11.5, fontWeight: 700, color: '#dc2626', marginBottom: '1rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
              Emergency Feature
            </div>
            <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '2rem', fontWeight: 600, lineHeight: 1.2, marginBottom: '1rem', letterSpacing: -0.5 }}>Automated hospital alert —<br/>when seconds count</div>
            <div style={{ fontSize: 14, color: '#4a6b6b', lineHeight: 1.8 }}>When TriageAI detects an emergency, it instantly sends your complete medical summary to the nearest hospital — name, blood type, symptoms, history, and emergency contact. The team knows what&apos;s coming before you arrive.<br/><br/>You control when this happens. Toggle it on for full automation, or keep it off and we&apos;ll ask you in the moment.</div>
          </div>
          <div style={{ background: '#f0f8f8', border: '1px solid #c8e0e0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ background: '#1a2e2e', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.8 }}>Emergency auto-alert settings</span>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px', background: '#fff', borderRadius: 10, marginBottom: 12 }}>
                <button onClick={() => setToggleOn(!toggleOn)} style={{ width: 46, height: 26, borderRadius: 999, background: toggleOn ? '#008b8b' : '#d1d5db', border: 'none', position: 'relative', cursor: 'pointer', flexShrink: 0, marginTop: 2, transition: 'background 0.2s' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, transition: 'left 0.2s', left: toggleOn ? 22 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}/>
                </button>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1a2e2e', marginBottom: 3 }}>{toggleOn ? 'Auto-send is on' : 'Auto-send is off'}</div>
                  <div style={{ fontSize: 12.5, color: '#4a6b6b', lineHeight: 1.6 }}>TriageAI will automatically email the nearest ER with your medical summary when an emergency is detected.</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#4a6b6b', background: '#e0f5f5', borderRadius: 8, padding: '10px 12px', lineHeight: 1.6 }}>
                Even with auto-send off, TriageAI will always ask you before sending anything during an ER recommendation.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#1a2e2e', color: 'rgba(255,255,255,0.55)', padding: '3rem 2rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '2rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
            <div>
              <Logo variant="dark" />
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 10, maxWidth: 220, lineHeight: 1.6 }}>AI-powered triage that knows you and acts fast when it matters.</div>
            </div>
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
              {[
                { title: 'Product', links: ['Symptom Checker','Drug Checker','Find a Doctor','Emergency Settings'] },
                { title: 'Company', links: ['About','Blog','Careers','Contact'] },
                { title: 'Legal', links: ['Privacy Policy','Terms of Use','Cookie Policy'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>{col.title}</div>
                  {col.links.map(l => <a key={l} href="#" style={{ display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', marginBottom: 7, transition: 'color 0.15s' }}
                    onMouseEnter={e=>(e.currentTarget.style.color='#fff')}
                    onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,0.55)')}>{l}</a>)}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, fontSize: 12 }}>
            <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.3)', maxWidth: 600, lineHeight: 1.6 }}>TriageAI is not a substitute for professional medical advice. Always call 911 in a life-threatening emergency.</div>
            <div>© 2025 TriageAI</div>
          </div>
        </div>
      </footer>

      {/* STEP MODAL */}
      {stepModal && (
        <div onClick={() => setStepModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,30,30,0.55)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '2.5rem', maxWidth: 480, width: '100%', position: 'relative', animation: 'fadeIn 0.2s ease' }}>
            <button onClick={() => setStepModal(null)} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#4a6b6b' }}>✕</button>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#008b8b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, marginBottom: '1rem' }}>{stepModal.n}</div>
            <div style={{ fontFamily: 'var(--font-serif,serif)', fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.8rem' }}>{stepModal.title}</div>
            <div style={{ fontSize: 14, color: '#4a6b6b', lineHeight: 1.8, marginBottom: '1.25rem' }}>{stepModal.body}</div>
            <div style={{ background: '#e0f5f5', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#006f6f', fontWeight: 500 }}>{stepModal.tip}</div>
          </div>
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
        </div>
      )}

      {/* AUTH MODAL */}
      {authModal && <AuthModal onClose={() => setAuthModal(null)} initialScreen={authModal} />}

      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}`}</style>
    </div>
  )
}
