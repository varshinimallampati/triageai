import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { messages, consultationId } = await req.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { medicalFiles: true }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const healthProfile = `
PATIENT HEALTH PROFILE:
- Name: ${user.firstName} ${user.lastName}
- Date of Birth: ${user.dateOfBirth}
- Blood Type: ${user.bloodType}
- Emergency Contact: ${user.emergencyContactName} (${user.emergencyContactPhone})
- Uploaded medical files: ${user.medicalFiles.map(f => f.name).join(', ') || 'None'}
`

    const systemPrompt = `You are TriageAI, a compassionate and intelligent medical triage assistant. You help patients determine the appropriate level of care they need.

${healthProfile}

YOUR ROLE:
- Ask intelligent follow-up questions about symptoms (duration, severity 1-10, location, what makes it better/worse, associated symptoms, fever, etc.)
- Use the patient's medical history and profile to personalize your responses
- Be warm, calm, and reassuring — never alarming
- After gathering enough information (usually 3-5 exchanges), give a clear triage recommendation
- Do NOT use markdown formatting like **bold** or # headers. Write in plain conversational text only.

TRIAGE LEVELS — when you make a final recommendation, you MUST include one of these exact tags:
- [TRIAGE:REST] — Patient can safely rest at home. Provide specific home care tips.
- [TRIAGE:URGENT] — Patient should visit urgent care within a few hours.
- [TRIAGE:ER] — Patient needs emergency care immediately.

IMPORTANT RULES:
- Never diagnose. Say "this sounds like it could be..." not "you have..."
- Always end with "If symptoms worsen significantly, go to the ER immediately" for REST cases
- Ask ONE follow-up question at a time
- If the patient describes chest pain, difficulty breathing, stroke symptoms, severe bleeding — immediately recommend [TRIAGE:ER]
- Always remind patients: "I am an AI assistant, not a doctor. This is not a medical diagnosis."
- Use the patient's first name naturally in conversation
- Write in plain text — no asterisks, no pound signs, no markdown`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string; image?: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.image ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: m.image } },
          { type: 'text', text: m.content || 'Please analyze this image and tell me what you see from a medical perspective.' }
        ] : m.content
      }))
    })

    const aiMessage = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleanMessage = aiMessage.replace(/\[TRIAGE:(REST|URGENT|ER)\]/g, '').trim()

    let triageLevel: string | null = null
    if (aiMessage.includes('[TRIAGE:REST]')) triageLevel = 'REST'
    else if (aiMessage.includes('[TRIAGE:URGENT]')) triageLevel = 'URGENT'
    else if (aiMessage.includes('[TRIAGE:ER]')) triageLevel = 'ER'

    const allMessages = [...messages, { role: 'assistant', content: cleanMessage }]
    let savedConsultation
    if (consultationId) {
      savedConsultation = await prisma.consultation.update({
        where: { id: consultationId },
        data: { messages: allMessages, triageLevel: triageLevel || undefined }
      })
    } else {
      savedConsultation = await prisma.consultation.create({
        data: {
          userId: session.userId,
          messages: allMessages,
          triageLevel: triageLevel || undefined
        }
      })
    }

    if (triageLevel === 'ER' && user.autoSendEmergency) {
      await sendEmergencyEmail(user, messages.filter((m: {role:string}) => m.role === 'user').map((m: {content:string}) => m.content).join(' | '))
    }

    return NextResponse.json({
      message: cleanMessage,
      triageLevel,
      consultationId: savedConsultation.id,
      autoSentEmail: triageLevel === 'ER' && user.autoSendEmergency
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function sendEmergencyEmail(user: {
  firstName: string; lastName: string; dateOfBirth: string;
  bloodType: string; emergencyContactName: string; emergencyContactPhone: string; email: string
}, symptomSummary: string) {
  try {
    await resend.emails.send({
      from: 'TriageAI Emergency Alert <onboarding@resend.dev>',
      to: [user.email],
      subject: `URGENT: Emergency Medical Alert — ${user.firstName} ${user.lastName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px">
        <div style="background:#dc2626;color:white;padding:20px"><h1 style="margin:0;font-size:20px">EMERGENCY MEDICAL ALERT</h1></div>
        <div style="padding:24px;border:1px solid #e5e7eb">
          <p><strong>Patient:</strong> ${user.firstName} ${user.lastName}</p>
          <p><strong>DOB:</strong> ${user.dateOfBirth}</p>
          <p><strong>Blood Type:</strong> ${user.bloodType}</p>
          <p><strong>Symptoms:</strong> ${symptomSummary}</p>
          <p><strong>Emergency Contact:</strong> ${user.emergencyContactName} — ${user.emergencyContactPhone}</p>
        </div>
      </div>`
    })
  } catch (err) { console.error('Email error:', err) }
}
