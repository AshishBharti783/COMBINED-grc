import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { tenant: { select: { id: true, name: true, slug: true, status: true } } },
    })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is disabled. Contact your administrator.' }, { status: 403 })
    }
    if (user.tenant && user.tenant.status !== 'active') {
      return NextResponse.json({ error: 'Tenant account is suspended.' }, { status: 403 })
    }
    const token = await createSession(user.id)
    await setSessionCookie(token)
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await db.auditLog.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        action: 'login',
        entity: 'user',
        entityId: user.id,
        ip: req.headers.get('x-forwarded-for') || undefined,
      },
    })
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant,
        jobTitle: user.jobTitle,
      },
    })
  } catch (e) {
    console.error('Login error', e)
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 })
  }
}
