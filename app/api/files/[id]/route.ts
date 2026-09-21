import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// View a file (only the owner can open it)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const file = await prisma.medicalFile.findFirst({ where: { id, userId: session.userId } })
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const stored = await prisma.medicalFileData.findUnique({ where: { fileId: id } })
  if (!stored) return NextResponse.json({ error: 'File contents not found. Please upload it again.' }, { status: 404 })

  return new NextResponse(new Uint8Array(stored.data), {
    headers: {
      'Content-Type': stored.mime,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const file = await prisma.medicalFile.findFirst({ where: { id, userId: session.userId } })
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  await prisma.medicalFileData.deleteMany({ where: { fileId: id } })
  await prisma.medicalFile.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
