import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// POST /api/auth/reset-password-confirm — set a new password using a reset token
// Body: { token, newPassword }
export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json()
  if (!token || !newPassword) {
    return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const reset = await db.passwordReset.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, status: true, tenantId: true } } },
  })
  if (!reset) return NextResponse.json({ error: 'Invalid or unknown reset token' }, { status: 400 })
  if (reset.used) return NextResponse.json({ error: 'This reset token has already been used' }, { status: 400 })
  if (reset.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset token has expired. Please request a new one.' }, { status: 400 })
  }
  if (reset.user.status !== 'active') {
    return NextResponse.json({ error: 'Account is disabled. Contact your administrator.' }, { status: 403 })
  }

  // Set the new password
  await db.user.update({
    where: { id: reset.userId },
    data: { passwordHash: hashPassword(newPassword) },
  })

  // Mark token as used
  await db.passwordReset.update({ where: { id: reset.id }, data: { used: true } })

  // Invalidate all existing sessions for this user (force re-login)
  await db.session.deleteMany({ where: { userId: reset.userId } })

  await db.auditLog.create({
    data: {
      userId: reset.userId,
      tenantId: reset.user.tenantId,
      action: 'password.reset-confirm',
      entity: 'user',
      entityId: reset.userId,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
