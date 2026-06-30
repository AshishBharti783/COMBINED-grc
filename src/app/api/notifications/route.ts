import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = user.role === 'super_admin' ? {} : { tenantId: user.tenantId! }
  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  const unread = await db.notification.count({ where: { ...where, read: false } })
  return NextResponse.json({ notifications, unread })
}

export async function PATCH() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const where = user.role === 'super_admin' ? {} : { tenantId: user.tenantId! }
  await db.notification.updateMany({ where: { ...where, read: false }, data: { read: true } })
  return NextResponse.json({ ok: true })
}
