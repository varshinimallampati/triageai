import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { consultationId, symptomSummary } = await req.json()

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  try {
    await resend.emails.send({
      from: 'TriageAI Emergency Alert <emergency@triageai.app>',
      to: ['er-intake@nearest-hospital.com'],
      subject: `URGENT: Emergency Medical Alert — ${user.firstName} ${user.lastName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <div style="background: #dc2626; color: white; padding: 20px;">
            <h1 style="margin:0; font-size:20px;">EMERGENCY MEDICAL ALERT — TriageAI</h1>
          </div>
          <div style="padding: 24px; border: 1px solid #e5e7eb;">
            <p><strong>Patient:</strong> ${user.firstName} ${user.lastName}</p>
            <p><strong>DOB:</strong> ${user.dateOfBirth}</p>
            <p><strong>Blood Type:</strong> ${user.bloodType}</p>
            <p><strong>Symptoms:</strong> ${symptomSummary}</p>
            <p><strong>Emergency Contact:</strong> ${user.emergencyContactName} — ${user.emergencyContactPhone}</p>
          </div>
        </div>
      `
    })

    if (consultationId) {
      await prisma.consultation.update({
        where: { id: consultationId },
        data: { summary: 'Emergency email sent' }
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
