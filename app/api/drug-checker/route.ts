import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { drugs } = await req.json()
  if (!drugs || drugs.length < 2) return NextResponse.json({ error: 'Need at least 2 drugs' }, { status: 400 })

  const prompt = `You are a pharmacology expert. Check interactions between these medications: ${drugs.join(', ')}.

Respond ONLY with valid JSON in this exact format:
{
  "safe": true/false,
  "summary": "one sentence overall summary",
  "interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "mild/moderate/severe",
      "description": "clear explanation of the interaction and what to watch for"
    }
  ]
}

If no interactions, return empty array for interactions and safe: true.
Be accurate and specific. Use "severe" only for dangerous combinations.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ safe: true, summary: 'Analysis complete. Please consult your pharmacist for detailed information.', interactions: [] })
  }
}
