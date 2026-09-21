import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    // Only allow safe fields to be updated
    const allowedFields = ['firstName', 'lastName', 'phone', 'bloodType', 'emergencyContactName', 'emergencyContactPhone', 'autoSendEmergency']
    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field]
    }

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: updateData,
      select: {
        id: true, firstName: true, lastName: true,
        email: true, phone: true, bloodType: true,
        emergencyContactName: true, emergencyContactPhone: true,
        autoSendEmergency: true
      }
    })
    return NextResponse.json({ user })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
