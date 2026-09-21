import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { readFile } from 'fs/promises'
import path from 'path'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { medicalFiles: true }
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fileContents: string[] = []
  for (const f of user.medicalFiles) {
    if (f.name.endsWith('.txt') || f.name.endsWith('.doc')) {
      try {
        const filePath = path.join(process.cwd(), 'public', f.url)
        const content = await readFile(filePath, 'utf-8')
        fileContents.push(content)
      } catch { /* skip unreadable files */ }
    }
  }

  if (fileContents.length === 0) {
    return NextResponse.json({ medications: [] })
  }

  const prompt = `Extract all medication/drug names from this medical document. Return ONLY a JSON array of medication names, nothing else. No explanation, no markdown, just the array. Example: ["Ibuprofen", "Aspirin", "Metformin"]

Document:
${fileContents.join('\n\n')}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const medications = JSON.parse(clean)
    return NextResponse.json({ medications })
  } catch {
    return NextResponse.json({ medications: [] })
  }
}
