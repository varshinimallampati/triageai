import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, phone: true, dateOfBirth: true,
      bloodType: true, emergencyContactName: true,
      emergencyContactPhone: true, autoSendEmergency: true,
      createdAt: true,
      medicalFiles: { orderBy: { createdAt: 'desc' } },
      consultations: { orderBy: { createdAt: 'desc' }, take: 10 }
    }
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user })
}
