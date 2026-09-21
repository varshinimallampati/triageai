import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const file = await prisma.medicalFile.findFirst({
    where: { id, userId: session.userId }
  })
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  try {
    const filepath = path.join(process.cwd(), 'public', file.url)
    await unlink(filepath).catch(() => {})
  } catch { /* file might not exist on disk */ }

  await prisma.medicalFile.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
