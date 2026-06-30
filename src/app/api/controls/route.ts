import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const frameworkId = searchParams.get('frameworkId')
  const tenantId = searchParams.get('tenantId')

  if (!frameworkId) return NextResponse.json({ error: 'frameworkId required' }, { status: 400 })

  const controls = await db.control.findMany({
    where: { frameworkId },
    orderBy: [{ order: 'asc' }, { ref: 'asc' }],
    include: {
      assignments: user.role === 'super_admin' && tenantId
        ? { where: { tenantId } }
        : user.tenantId ? { where: { tenantId: user.tenantId } } : false,
      _count: { select: { evidence: true } },
    },
  })

  return NextResponse.json({
    controls: controls.map(c => ({
      ...c,
      assignment: c.assignments?.[0] || null,
      evidenceCount: c._count.evidence,
    })),
  })
}

// POST /api/controls — create a new control (super_admin only)
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { frameworkId, ref, title, description, category, guidance, order } = body
  if (!frameworkId || !ref || !title) {
    return NextResponse.json({ error: 'frameworkId, ref and title required' }, { status: 400 })
  }

  // Verify framework exists
  const fw = await db.framework.findUnique({ where: { id: frameworkId } })
  if (!fw) return NextResponse.json({ error: 'Framework not found' }, { status: 404 })

  const control = await db.control.create({
    data: {
      frameworkId,
      ref,
      title,
      description: description || null,
      category: category || null,
      guidance: guidance || null,
      order: order || 0,
    },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'control.create',
      entity: 'control',
      entityId: control.id,
      meta: JSON.stringify({ ref, title, framework: fw.code }),
    },
  })

  return NextResponse.json({ control }, { status: 201 })
}

// DELETE /api/controls?id=xxx — delete a single control (super_admin only)
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await db.control.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Control not found' }, { status: 404 })

  await db.control.delete({ where: { id } })
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'control.delete',
      entity: 'control',
      entityId: id,
      meta: JSON.stringify({ ref: existing.ref }),
    },
  })

  return NextResponse.json({ ok: true })
}
