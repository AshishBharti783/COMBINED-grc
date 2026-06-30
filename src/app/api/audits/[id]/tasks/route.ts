import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

// POST /api/audits/[id]/tasks — create a task in an audit
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { title, description, assigneeId, dueDate, status } = body
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })

  const audit = await db.audit.findUnique({ where: { id }, select: { id: true, tenantId: true } })
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  if (!canAccessTenant(user, audit.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const maxOrder = await db.auditTask.aggregate({ where: { auditId: id }, _max: { order: true } })
  const order = (maxOrder._max.order || 0) + 1

  const task = await db.auditTask.create({
    data: {
      auditId: id,
      title,
      description: description || null,
      assigneeId: assigneeId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status || 'todo',
      order,
    },
    include: { assignee: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ task }, { status: 201 })
}

// PATCH /api/audits/[id]/tasks — update task status (body: { taskId, status })
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { taskId, status, title, description, assigneeId, dueDate } = body
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const audit = await db.audit.findUnique({ where: { id }, select: { id: true, tenantId: true } })
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  if (!canAccessTenant(user, audit.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const update: any = {}
  if (status) update.status = status
  if (title !== undefined) update.title = title
  if (description !== undefined) update.description = description
  if (assigneeId !== undefined) update.assigneeId = assigneeId || null
  if (dueDate !== undefined) update.dueDate = dueDate ? new Date(dueDate) : null

  const task = await db.auditTask.update({
    where: { id: taskId },
    data: update,
    include: { assignee: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ task })
}

// DELETE /api/audits/[id]/tasks?taskId=xxx — delete a task
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const taskId = new URL(req.url).searchParams.get('taskId')
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 })

  const audit = await db.audit.findUnique({ where: { id }, select: { id: true, tenantId: true } })
  if (!audit) return NextResponse.json({ error: 'Audit not found' }, { status: 404 })
  if (!canAccessTenant(user, audit.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.auditTask.delete({ where: { id: taskId } })
  return NextResponse.json({ ok: true })
}
