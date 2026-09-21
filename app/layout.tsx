import type { Metadata } from 'next'
import { DM_Serif_Display, Outfit } from 'next/font/google'
import './globals.css'

const dmSerif = DM_Serif_Display({
  weight: ['400'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'TriageAI — Know When to Seek Care',
  description: 'AI-powered medical triage personalized to your health history.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSerif.variable} ${outfit.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
