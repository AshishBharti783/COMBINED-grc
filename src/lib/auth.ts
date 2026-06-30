// Auth helpers — password hashing & session management
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'crypto'
import { db } from './db'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'isecurify_session'
const SESSION_TTL_DAYS = 7

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, 'hex')
  const testBuf = scryptSync(password, salt, 64)
  if (hashBuf.length !== testBuf.length) return false
  return timingSafeEqual(hashBuf, testBuf)
}

export type SessionUser = {
  id: string
  email: string
  name: string
  role: string
  status: string
  tenantId: string | null
  tenant?: { id: string; name: string; slug: string } | null
  jobTitle?: string | null
  avatarUrl?: string | null
}

export async function createSession(userId: string): Promise<string> {
  const token = randomUUID() + randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })
  return token
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { include: { tenant: { select: { id: true, name: true, slug: true } } } } },
    })
    if (!session) return null
    if (session.expiresAt < new Date()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    const u = session.user
    if (u.status !== 'active') return null
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      tenantId: u.tenantId,
      tenant: u.tenant,
      jobTitle: u.jobTitle,
      avatarUrl: u.avatarUrl,
    }
  } catch {
    return null
  }
}

export async function destroySession(token: string) {
  await db.session.deleteMany({ where: { token } }).catch(() => {})
}

// Role hierarchy & permissions
export type Role = 'super_admin' | 'tenant_admin' | 'compliance_officer' | 'auditor' | 'employee'

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  tenant_admin: 'Tenant Admin',
  compliance_officer: 'Compliance Officer',
  auditor: 'Auditor',
  employee: 'Employee',
}

// Super admin can do everything. Tenant admin manages their tenant. etc.
export function canAccessTenant(user: SessionUser, tenantId: string | null): boolean {
  if (user.role === 'super_admin') return true
  if (!tenantId) return false
  return user.tenantId === tenantId
}

export function canManageUsers(user: SessionUser): boolean {
  return ['super_admin', 'tenant_admin'].includes(user.role)
}

export function canManageCompliance(user: SessionUser): boolean {
  return ['super_admin', 'tenant_admin', 'compliance_officer'].includes(user.role)
}

export function canManageTenants(user: SessionUser): boolean {
  return user.role === 'super_admin'
}
