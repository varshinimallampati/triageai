'use client'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const items = [
  { label: 'Symptom Checker', href: '/consultation' },
  { label: 'Drug Checker', href: '/drug-checker' },
  { label: 'Find a Doctor', href: '/find-a-doctor' },
  { label: 'Health Profile', href: '/dashboard' },
  { label: 'My Consultations', href: '/dashboard?tab=history' },
  { label: 'Emergency Settings', href: '/dashboard?tab=settings' },
]

const icons: Record<string, ReactNode> = {
  'Symptom Checker': <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>,
  'Drug Checker': <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>,
  'Find a Doctor': <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>,
  'Health Profile': <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>,
  'My Consultations': <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>,
  'Emergency Settings': <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>,
}

export default function Toolbar({ active }: { active?: string }) {
  const router = useRouter()
  return (
    <div style={{ background: '#1a2e2e', padding: '0 2rem', display: 'flex', alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
      {items.map(item => (
        <a key={item.label}
          onClick={() => router.push(item.href)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '11px 18px', fontSize: 12.5, fontWeight: 600,
            color: active === item.label ? '#fff' : 'rgba(255,255,255,0.65)',
            cursor: 'pointer',
            borderBottom: active === item.label ? '2.5px solid #c5d928' : '2.5px solid transparent',
            whiteSpace: 'nowrap', transition: 'all 0.15s', textDecoration: 'none',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#fff'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = active === item.label ? '#fff' : 'rgba(255,255,255,0.65)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icons[item.label]}
          </svg>
          {item.label}
        </a>
      ))}
    </div>
  )
}
