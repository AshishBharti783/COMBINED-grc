import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

// PATCH — update a single task (used for inline progress editing, drag-to-reorder, etc.)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, taskId } = await params
  const task = await db.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { tenantId: true } } },
  })
  if (!task || task.projectId !== id) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (!canAccessTenant(user, task.project.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { startDate, endDate, progress, ...data } = body

  const update: any = { ...data }
  if (startDate) {
    update.startDate = new Date(startDate)
    // Recompute days if endDate is unchanged
    const end = endDate ? new Date(endDate) : task.endDate
    update.days = Math.max(1, Math.ceil((end.getTime() - update.startDate.getTime()) / (1000 * 60 * 60 * 24)))
  }
  if (endDate) {
    update.endDate = new Date(endDate)
    const start = startDate ? new Date(startDate) : task.startDate
    update.days = Math.max(1, Math.ceil((update.endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }
  if (typeof progress === 'number') {
    update.progress = Math.max(0, Math.min(100, progress))
  }

  const item = await db.projectTask.update({ where: { id: taskId }, data: update })
  return NextResponse.json({ item })
}

// DELETE — delete a task
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, taskId } = await params
  const task = await db.projectTask.findUnique({
    where: { id: taskId },
    include: { project: { select: { tenantId: true } } },
  })
  if (!task || task.projectId !== id) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (!canAccessTenant(user, task.project.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.projectTask.delete({ where: { id: taskId } })
  return NextResponse.json({ ok: true })
}
