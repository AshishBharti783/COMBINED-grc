import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

// POST /api/checklists/answer — upsert an answer for a checklist item
// Body: { checklistId, itemId, value, notes? }
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { checklistId, itemId, value, notes } = body
  if (!checklistId || !itemId) return NextResponse.json({ error: 'checklistId and itemId required' }, { status: 400 })

  // Verify checklist exists and user has access
  const checklist = await db.checklist.findUnique({ where: { id: checklistId }, select: { id: true, tenantId: true } })
  if (!checklist) return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
  if (!canAccessTenant(user, checklist.tenantId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const answer = await db.checklistAnswer.upsert({
    where: { checklistId_itemId: { checklistId, itemId } },
    update: { value: value ?? null, notes: notes ?? null, userId: user.id },
    create: { checklistId, itemId, userId: user.id, value: value ?? null, notes: notes ?? null },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  return NextResponse.json({ answer })
}
