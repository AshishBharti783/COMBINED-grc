import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// POST /api/controls/import — bulk import controls for a framework (super_admin only)
// Body: { frameworkId: string, controls: Array<{ ref, title, description?, category?, guidance?, order? }> }
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { frameworkId, controls } = body

  if (!frameworkId || !Array.isArray(controls)) {
    return NextResponse.json({ error: 'frameworkId and controls[] required' }, { status: 400 })
  }

  // Verify framework exists
  const fw = await db.framework.findUnique({ where: { id: frameworkId } })
  if (!fw) return NextResponse.json({ error: 'Framework not found' }, { status: 404 })

  if (controls.length === 0) {
    return NextResponse.json({ error: 'No controls to import' }, { status: 400 })
  }

  // Validate each entry has required fields
  const invalid = controls.findIndex((c: any) => !c.ref || !c.title)
  if (invalid !== -1) {
    return NextResponse.json({ error: `Control at index ${invalid} is missing ref or title` }, { status: 400 })
  }

  // SQLite does not support skipDuplicates in createMany, so we filter out
  // existing refs for this framework first.
  const incomingRefs = controls.map((c: any) => String(c.ref))
  const existing = await db.control.findMany({
    where: { frameworkId, ref: { in: incomingRefs } },
    select: { ref: true },
  })
  const existingRefs = new Set(existing.map((c) => c.ref))
  const toCreate = controls
    .filter((c: any) => !existingRefs.has(String(c.ref)))
    .map((c: any, i: number) => ({
      frameworkId,
      ref: String(c.ref),
      title: String(c.title),
      description: c.description ? String(c.description) : null,
      category: c.category ? String(c.category) : null,
      guidance: c.guidance ? String(c.guidance) : null,
      order: typeof c.order === 'number' ? c.order : i,
    }))

  const skipped = controls.length - toCreate.length

  if (toCreate.length === 0) {
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: 'control.import',
        entity: 'framework',
        entityId: frameworkId,
        meta: JSON.stringify({ count: 0, skipped, framework: fw.code }),
      },
    })
    return NextResponse.json({ created: 0, skipped })
  }

  const created = await db.control.createMany({ data: toCreate })

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'control.import',
      entity: 'framework',
      entityId: frameworkId,
      meta: JSON.stringify({ count: created.count, skipped, framework: fw.code }),
    },
  })

  return NextResponse.json({ created: created.count, skipped })
}
