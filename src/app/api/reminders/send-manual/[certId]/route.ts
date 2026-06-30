import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, canAccessTenant } from '@/lib/auth'

// POST /api/reminders/send-manual/[certId]
// Creates a ReminderLog row with reminderType="manual" for the given certificate.
// Per project spec: actual email sending is NOT implemented here — this only
// records the audit row using the certificate's configured emailRecipients.
// If the certificate has no recipients configured, a "failed" log is still recorded
// with an explanatory errorMessage, mirroring Version A's behavior minus the SMTP call.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ certId: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { certId } = await params
  const cert = await db.certificate.findUnique({
    where: { id: certId },
    include: { client: { select: { id: true, name: true } } },
  })
  if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })

  // Tenant guard
  if (!canAccessTenant(user, cert.tenantId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse recipients — accept comma- or newline-separated emails
  const recipientsRaw = (cert.emailRecipients || '')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipients = recipientsRaw.filter((r) => emailRe.test(r))

  if (recipients.length === 0) {
    const log = await db.reminderLog.create({
      data: {
        certificateId: cert.id,
        reminderType: 'manual',
        recipients: cert.emailRecipients || null,
        status: 'failed',
        errorMessage: 'No valid email recipients configured for this certificate',
      },
    })
    return NextResponse.json(
      { error: 'No valid email recipients configured for this certificate', log },
      { status: 400 }
    )
  }

  // NOTE: actual SMTP send is intentionally omitted per project spec.
  // The log row is recorded as "sent" so the audit trail reflects that a manual
  // reminder was triggered. When email sending is wired in later, replace this
  // block with the real send call and set status based on the result.
  const log = await db.reminderLog.create({
    data: {
      certificateId: cert.id,
      reminderType: 'manual',
      recipients: recipients.join(', '),
      status: 'sent',
      errorMessage: null,
    },
  })

  return NextResponse.json({ ok: true, log })
}
