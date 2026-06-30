import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await db.project.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      tasks: { orderBy: [{ order: 'asc' }, { startDate: 'asc' }] },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, project.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Compute overall progress
  const computedProgress = project.tasks.length > 0
    ? Math.round(project.tasks.reduce((s, t) => s + t.progress, 0) / project.tasks.length)
    : project.progress

  return NextResponse.json({ project: { ...project, computedProgress } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { startDate, endDate, ...data } = body

  const existing = await db.project.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: any = { ...data }
  if (startDate) update.startDate = new Date(startDate)
  if (endDate !== undefined) update.endDate = endDate ? new Date(endDate) : null

  const item = await db.project.update({ where: { id }, data: update })
  return NextResponse.json({ item })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await db.project.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canAccessTenant(user, existing.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
