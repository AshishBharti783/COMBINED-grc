import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

const RESET_TTL_HOURS = 1

// POST /api/auth/forgot-password — request a password reset link
// Body: { email }
// NOTE: In production, the reset link would be emailed via SMTP. Since this sandbox
// has no email service, the reset token is returned in the response so it can be
// displayed/shared manually. In a real deployment, remove the `token` from the
// response and send it via email instead.
export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user) {
    // Don't reveal whether the email exists — return success either way
    return NextResponse.json({ ok: true, message: 'If an account exists for that email, a reset link has been generated.' })
  }
  if (user.status !== 'active') {
    return NextResponse.json({ ok: true, message: 'If an account exists for that email, a reset link has been generated.' })
  }

  // Invalidate any existing unused reset tokens for this user
  await db.passwordReset.updateMany({
    where: { userId: user.id, used: false },
    data: { used: true },
  })

  // Create a new reset token
  const token = randomUUID() + randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000)
  await db.passwordReset.create({
    data: { token, userId: user.id, expiresAt },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      tenantId: user.tenantId,
      action: 'password.forgot',
      entity: 'user',
      entityId: user.id,
      ip: req.headers.get('x-forwarded-for') || undefined,
    },
  })

  // In production: send email with reset link `${origin}/?reset=${token}`
  // In sandbox: return the token so it can be used in the UI
  return NextResponse.json({
    ok: true,
    token,
    message: 'Reset token generated. (In production, this would be emailed.)',
  })
}
