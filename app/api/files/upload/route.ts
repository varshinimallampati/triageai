import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Vercel rejects request bodies over ~4.5 MB, so keep uploads under 4 MB
const MAX_BYTES = 4 * 1024 * 1024

function guessMime(name: string, given: string): string {
  if (given) return given
  const n = name.toLowerCase()
  if (n.endsWith('.pdf')) return 'application/pdf'
  if (n.endsWith('.png')) return 'image/png'
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg'
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (n.endsWith('.txt') || n.endsWith('.doc')) return 'text/plain'
  return 'application/octet-stream'
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large. Please upload a file under 4 MB.' }, { status: 413 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const mime = guessMime(file.name, file.type)

    // Save the file record, then store the file contents in the database
    // (Vercel does not allow saving files to disk)
    const created = await prisma.medicalFile.create({
      data: { userId: session.userId, name: file.name, url: '', type: mime },
    })
    await prisma.medicalFileData.create({
      data: { fileId: created.id, data: bytes, mime },
    })
    const savedFile = await prisma.medicalFile.update({
      where: { id: created.id },
      data: { url: `/api/files/${created.id}` },
    })

    return NextResponse.json({ file: savedFile })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
