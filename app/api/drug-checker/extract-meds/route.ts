import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ImageType = (typeof IMAGE_TYPES)[number]

function kindOf(name: string, mime: string): 'pdf' | 'image' | 'text' | null {
  const n = name.toLowerCase()
  if (mime === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if ((IMAGE_TYPES as readonly string[]).includes(mime) || /\.(jpe?g|png|gif|webp)$/.test(n)) return 'image'
  if (mime.startsWith('text/') || /\.(txt|doc|md|csv)$/.test(n)) return 'text'
  return null // e.g. .docx, which can't be read directly
}

function imageType(name: string, mime: string): ImageType {
  if ((IMAGE_TYPES as readonly string[]).includes(mime)) return mime as ImageType
  const n = name.toLowerCase()
  if (n.endsWith('.png')) return 'image/png'
  if (n.endsWith('.gif')) return 'image/gif'
  if (n.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const files = await prisma.medicalFile.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  if (files.length === 0) {
    return NextResponse.json({ medications: [], error: 'You have no uploaded medical files yet. Click "Upload a file" to add one.' })
  }

  const blocks: Anthropic.Messages.ContentBlockParam[] = []
  let used = 0
  for (const f of files) {
    if (used >= 5) break // use the 5 most recent readable files to keep the request small
    const stored = await prisma.medicalFileData.findUnique({ where: { fileId: f.id } })
    if (!stored) continue // uploaded before files were stored in the database
    const kind = kindOf(f.name, stored.mime)
    const base64 = Buffer.from(stored.data).toString('base64')
    if (kind === 'pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } })
    } else if (kind === 'image') {
      blocks.push({ type: 'image', source: { type: 'base64', media_type: imageType(f.name, stored.mime), data: base64 } })
    } else if (kind === 'text') {
      blocks.push({ type: 'text', text: `File "${f.name}":\n${Buffer.from(stored.data).toString('utf-8')}` })
    } else {
      continue
    }
    used++
  }

  if (blocks.length === 0) {
    return NextResponse.json({ medications: [], error: 'None of your saved files could be read (files uploaded before the latest update need to be uploaded again). Click "Upload a file" to add a PDF, photo (JPG/PNG), or text file.' })
  }

  blocks.push({
    type: 'text',
    text: 'Extract every medication or drug name from the medical documents above. Return ONLY a JSON array of medication names, with no explanation and no markdown. Example: ["Ibuprofen", "Aspirin", "Metformin"]. If there are none, return [].',
  })

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: blocks }],
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text : '[]'
    const match = text.match(/\[[\s\S]*\]/)
    const parsed: unknown = JSON.parse(match ? match[0] : '[]')
    const medications = Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((m): m is string => typeof m === 'string' && m.trim() !== '').map(m => m.trim())))
      : []
    if (medications.length === 0) {
      return NextResponse.json({ medications: [], error: 'No medications were found in your uploaded files.' })
    }
    return NextResponse.json({ medications })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ medications: [], error: 'Could not read your files right now. Please try again.' }, { status: 500 })
  }
}
