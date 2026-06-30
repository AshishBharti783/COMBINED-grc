import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const audit = await db.audit.findUnique({
    where: { id },
    include: {
      framework: { select: { id: true, code: true, name: true } },
      tenant: { select: { id: true, name: true } },
      tasks: {
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        include: { assignee: { select: { id: true, name: true, email: true } } },
      },
    },
  })

  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Tenant guard
  if (user.role !== 'super_admin' && audit.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ audit })
}
