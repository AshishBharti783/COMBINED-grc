import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { destroySession, clearSessionCookie, getSessionUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user) {
    const cookieStore = await cookies()
    const token = cookieStore.get('isecurify_session')?.value
    if (token) await destroySession(token)
    await db.auditLog.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        action: 'logout',
        entity: 'user',
        entityId: user.id,
        ip: req.headers.get('x-forwarded-for') || undefined,
      },
    })
  }
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
}
