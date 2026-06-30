import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const frameworks = await db.framework.findMany({
    orderBy: { code: 'asc' },
    include: { _count: { select: { controls: true } } },
  })

  // Per-framework compliance for the current user's tenant (or aggregate for super admin)
  const result = []
  for (const fw of frameworks) {
    const where = user.role === 'super_admin'
      ? { control: { frameworkId: fw.id } }
      : { tenantId: user.tenantId!, control: { frameworkId: fw.id } }
    const total = await db.controlAssignment.count({ where })
    const compliant = await db.controlAssignment.count({ where: { ...where, status: { in: ['compliant', 'implemented'] } } })
    const inProgress = await db.controlAssignment.count({ where: { ...where, status: 'in_progress' } })
    const notStarted = await db.controlAssignment.count({ where: { ...where, status: 'not_started' } })
    const nonCompliant = await db.controlAssignment.count({ where: { ...where, status: 'non_compliant' } })
    result.push({
      ...fw,
      controlCount: fw._count.controls,
      stats: { total, compliant, inProgress, notStarted, nonCompliant },
      progress: total > 0 ? Math.round((compliant / total) * 100) : 0,
    })
  }
  return NextResponse.json({ frameworks: result })
}

// POST /api/frameworks — create a new framework (super_admin only)
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { code, name, description, category, version, icon } = body
  if (!code || !name) return NextResponse.json({ error: 'code and name required' }, { status: 400 })

  const existing = await db.framework.findUnique({ where: { code } })
  if (existing) return NextResponse.json({ error: 'Framework code already exists' }, { status: 409 })

  const fw = await db.framework.create({
    data: {
      code,
      name,
      description: description || null,
      category: category || null,
      version: version || null,
      icon: icon || null,
    },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'framework.create',
      entity: 'framework',
      entityId: fw.id,
      meta: JSON.stringify({ code, name }),
    },
  })

  return NextResponse.json({ framework: fw }, { status: 201 })
}

// DELETE /api/frameworks?id=xxx — delete framework + all its controls (super_admin only)
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Verify exists
  const existing = await db.framework.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Framework not found' }, { status: 404 })

  // Cascades to controls (and their assignments/evidence via schema relations)
  await db.framework.delete({ where: { id } })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'framework.delete',
      entity: 'framework',
      entityId: id,
      meta: JSON.stringify({ code: existing.code }),
    },
  })

  return NextResponse.json({ ok: true })
}
