import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

// GET tasks for a project
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await db.project.findUnique({ where: { id }, select: { tenantId: true } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!canAccessTenant(user, project.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const tasks = await db.projectTask.findMany({
    where: { projectId: id },
    orderBy: [{ order: 'asc' }, { startDate: 'asc' }],
  })
  return NextResponse.json({ items: tasks })
}

// POST — create a new task in the project
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await db.project.findUnique({ where: { id }, select: { tenantId: true } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (!canAccessTenant(user, project.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { phase, title, description, owner, ownerName, startDate, endDate, deliverables, progress, order } = body
  if (!title || !startDate || !endDate) {
    return NextResponse.json({ error: 'title, startDate, endDate required' }, { status: 400 })
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))

  const item = await db.projectTask.create({
    data: {
      projectId: id,
      phase: phase || 'General',
      title,
      description: description || null,
      owner: owner || null,
      ownerName: ownerName || null,
      startDate: start,
      endDate: end,
      days,
      deliverables: deliverables || null,
      progress: typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : 0,
      order: typeof order === 'number' ? order : 0,
    },
  })
  return NextResponse.json({ item })
}
