import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      consultations: { orderBy: { createdAt: 'desc' }, take: 10 },
      medicalFiles: true
    }
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const consultationSummaries = user.consultations.map(c => {
    const msgs = c.messages as { role: string; content: string }[]
    const userMsgs = msgs.filter(m => m.role === 'user').map(m => m.content).join(', ')
    return `- ${new Date(c.createdAt).toLocaleDateString()}: ${userMsgs.slice(0, 100)} [Result: ${c.triageLevel || 'In progress'}]`
  }).join('\n')

  const prompt = `Generate a clear, professional medical summary for this patient that they can share with a doctor.

PATIENT INFO:
Name: ${user.firstName} ${user.lastName}
Date of Birth: ${user.dateOfBirth}
Blood Type: ${user.bloodType}
Phone: ${user.phone}
Emergency Contact: ${user.emergencyContactName} (${user.emergencyContactPhone})
Uploaded Medical Files: ${user.medicalFiles.map(f => f.name).join(', ') || 'None'}

RECENT CONSULTATIONS:
${consultationSummaries || 'No consultations yet'}

Write a 200-300 word professional medical summary a doctor can quickly read to understand this patient's recent health history and any concerns. Use clear sections.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  })

  const summary = response.content[0].type === 'text' ? response.content[0].text : ''

  return NextResponse.json({
    summary,
    patient: {
      name: `${user.firstName} ${user.lastName}`,
      dob: user.dateOfBirth,
      bloodType: user.bloodType,
      phone: user.phone,
      emergencyContact: `${user.emergencyContactName} (${user.emergencyContactPhone})`,
      consultationCount: user.consultations.length,
      files: user.medicalFiles.map(f => f.name),
      generatedAt: new Date().toISOString()
    }
  })
}
