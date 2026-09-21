import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save to public/uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', session.userId)
    await mkdir(uploadsDir, { recursive: true })
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = path.join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    const url = `/uploads/${session.userId}/${filename}`

    const savedFile = await prisma.medicalFile.create({
      data: {
        userId: session.userId,
        name: file.name,
        url,
        type: file.type,
      }
    })

    return NextResponse.json({ file: savedFile })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
