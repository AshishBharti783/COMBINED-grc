import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canManageCompliance } from '@/lib/auth'

// Update control assignment status for a tenant
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManageCompliance(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { controlId, tenantId, status, owner, notes } = body
  if (!controlId) return NextResponse.json({ error: 'controlId required' }, { status: 400 })

  const targetTenantId = user.role === 'super_admin' ? (tenantId || user.tenantId) : user.tenantId
  if (!targetTenantId) return NextResponse.json({ error: 'Tenant required' }, { status: 400 })

  const assignment = await db.controlAssignment.upsert({
    where: { tenantId_controlId: { tenantId: targetTenantId, controlId } },
    update: { status, owner, notes },
    create: { tenantId: targetTenantId, controlId, status, owner, notes },
  })

  await db.auditLog.create({
    data: {
      userId: user.id,
      tenantId: targetTenantId,
      action: 'control.update',
      entity: 'control',
      entityId: controlId,
      meta: JSON.stringify({ status }),
    },
  })

  return NextResponse.json({ assignment })
}
