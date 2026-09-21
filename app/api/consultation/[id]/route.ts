import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const consultation = await prisma.consultation.findFirst({
    where: { id, userId: session.userId }
  })

  if (!consultation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    messages: consultation.messages,
    triageLevel: consultation.triageLevel,
    id: consultation.id
  })
}
