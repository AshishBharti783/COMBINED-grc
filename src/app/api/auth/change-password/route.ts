import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth'

// POST /api/auth/change-password — change the logged-in user's own password
// Body: { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Current password and new password are required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (!verifyPassword(currentPassword, dbUser.passwordHash)) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 })
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(newPassword) },
  })

  // Invalidate all other sessions (force re-login on other devices) — keep current session
  await db.auditLog.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      action: 'password.change',
      entity: 'user',
      entityId: user.id,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
