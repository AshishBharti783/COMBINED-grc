import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, hashPassword, canManageUsers } from '@/lib/auth'

// POST /api/auth/reset-password — admin resets a user's password
// Body: { userId, newPassword }
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 })

  const { userId, newPassword } = await req.json()
  if (!userId || !newPassword) {
    return NextResponse.json({ error: 'userId and newPassword are required' }, { status: 400 })
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const target = await db.user.findUnique({ where: { id: userId } })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Tenant admin can only reset passwords within their own tenant
  if (user.role !== 'super_admin' && target.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden — cannot reset password for a user outside your tenant' }, { status: 403 })
  }
  // No one resets a super admin's password except themselves (via change-password)
  if (target.role === 'super_admin' && user.id !== target.id) {
    return NextResponse.json({ error: 'Cannot reset a Super Admin\'s password' }, { status: 403 })
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  })

  // Invalidate ALL sessions for the target user (force re-login everywhere)
  await db.session.deleteMany({ where: { userId } })

  await db.auditLog.create({
    data: {
      userId: user.id,
      tenantId: target.tenantId,
      action: 'password.reset',
      entity: 'user',
      entityId: userId,
      meta: JSON.stringify({ targetEmail: target.email }),
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
