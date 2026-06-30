import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const checklist = await db.checklist.findUnique({
    where: { id },
    include: {
      framework: { select: { id: true, code: true, name: true } },
      items: { orderBy: { order: 'asc' } },
      answers: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  })

  if (!checklist) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Tenant guard
  if (user.role !== 'super_admin' && checklist.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Attach tenant name for super admin
  const tenant = await db.tenant.findUnique({ where: { id: checklist.tenantId }, select: { id: true, name: true } })

  return NextResponse.json({ checklist: { ...checklist, tenant } })
}
