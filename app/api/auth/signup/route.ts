import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      firstName, lastName, email, phone,
      dateOfBirth, bloodType,
      emergencyContactName, emergencyContactPhone,
      password
    } = body

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        firstName, lastName, email, phone,
        dateOfBirth, bloodType,
        emergencyContactName, emergencyContactPhone,
        password: hashed,
      }
    })

    const token = signToken({ userId: user.id, email: user.email })

    const res = NextResponse.json({
      success: true,
      user: { id: user.id, firstName: user.firstName, email: user.email }
    })

    res.cookies.set('triageai_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return res
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
