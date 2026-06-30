---
Task ID: 1
Agent: main (Super Z)
Task: Extend prisma/schema.mysql.prisma with Client / Certificate / ReminderLog + back-relations on Tenant and User. Show diff only, then stop for review.

Work Log:
- Extracted both uploaded tarballs. Confirmed mapping:
  - /home/z/my-project/codebase-a  = Version B (primary, full GRC, MySQL schema at prisma/schema.mysql.prisma)
  - /home/z/my-project/codebase-b  = Version A (legacy Client/Certificate/ReminderLog, SQLite)
- Read both schemas in full to confirm Version B's conventions:
  cuid ids, @db.Text for long strings, @@index([tenantId]), onDelete: Cascade from Tenant,
  onDelete: SetNull for createdBy-style user refs, section-header comments using // ==== style.
- Edited prisma/schema.mysql.prisma:
  1. Tenant model: added `clients Client[]` and `certificates Certificate[]` back-relations
     (placed between `audits Audit[]` and `notifications Notification[]`).
  2. User model: added `certificates Certificate[]` back-relation (placed after `passwordResets PasswordReset[]`).
  3. Appended new section "CLIENTS & CERTIFICATES (compliance certificate tracking)" at end of file
     containing the three new models: Client, Certificate, ReminderLog.
- Verified schema syntax visually. Prisma CLI on this system is v7.x which rejects the
  pre-existing `url = env("DATABASE_URL")` in datasource (the project targets Prisma 6.x per user spec).
  This error is NOT introduced by Task 1 edits — it pre-exists in the file.

Stage Summary:
- File modified: /home/z/my-project/codebase-a/prisma/schema.mysql.prisma
- 3 hunks applied (Tenant back-relations, User back-relation, new models section at EOF).
- Stopping for user review per instructions. Awaiting approval before starting Task 2 (API routes).

---
Task ID: 2
Agent: main (Super Z)
Task: Create API routes for clients, certificates, and reminders following Version B's existing conventions (getSessionUser, canAccessTenant, { items } / { item } / { ok: true } response shapes, params: Promise<{...}> for [id] routes).

Work Log:
- Read Version B reference routes: src/app/api/risks/route.ts, src/app/api/policies/route.ts, src/app/api/audits/route.ts, src/app/api/audits/[id]/route.ts
- Read Version B src/lib/auth.ts (getSessionUser, canAccessTenant, SessionUser type) and src/lib/db.ts (PrismaClient singleton)
- Read Version A (legacy) reference for behavior shape: dashboard-stats, upcoming, send-manual, logs
- Confirmed Version B conventions:
  - GET list: tenantId from searchParams, super_admin may override, non-super-admin forced to user.tenantId
  - POST: targetTenantId resolution + canAccessTenant check before create
  - PATCH: destructure { id, ...data }, findUnique, tenant guard, update: any = { ...data }, explicit new Date() for date fields
  - DELETE: read id from searchParams (not body), findUnique, tenant guard, delete
  - [id] route signature: { params }: { params: Promise<{ id: string }> }, const { id } = await params
  - Response shapes: { items }, { item }, { ok: true }, { error: '...' }
- Created 8 route files under src/app/api/:
  1. clients/route.ts                       (GET list, POST, PATCH, DELETE — flat style matching risks/route.ts)
  2. clients/[id]/route.ts                  (GET, PATCH, DELETE — Promise<{id}> style matching audits/[id]/route.ts)
  3. certificates/route.ts                  (GET list with clientId/status/framework filters, POST with client tenancy cross-check, PATCH with date conversions + clientId cross-tenant guard, DELETE)
  4. certificates/[id]/route.ts             (GET with includes, PATCH, DELETE)
  5. certificates/dashboard-stats/route.ts  (total/active/expiringSoon/overdue/completed/expired/pending + frameworks/byCountry/alerts breakdown, tenant-scoped)
  6. certificates/upcoming/route.ts         (next 30/60/90 days via ?days= param, uses nearestUpcomingDate with nextAuditDate fallback, computes daysUntil)
  7. reminders/logs/route.ts                (GET logs tenant-scoped via certificate.tenantId, optional ?certId and ?limit)
  8. reminders/send-manual/[certId]/route.ts (POST — creates ReminderLog with reminderType='manual'. Per spec: NO actual email sending. Records 'sent' on success or 'failed' with errorMessage when no recipients configured)
- Verified all 8 files exist with correct paths and reasonable line counts (654 lines total).

Stage Summary:
- 8 new route files created under src/app/api/{clients,certificates,reminders}/
- All routes use the existing getSessionUser/canAccessTenant pattern from src/lib/auth.ts — no new auth pattern introduced
- All routes return Version B's standard response shapes ({ items }, { item }, { ok: true }, { error })
- Tenant scoping follows Version B's super_admin-override pattern throughout
- Manual reminder endpoint creates audit log row only (no SMTP) per user spec
- Stopping for user review. Awaiting approval before starting Task 3 (UI views).

---
Task ID: 3
Agent: main (Super Z)
Task: Create ClientsView.tsx and CertificatesView.tsx following Version B's existing RisksView/PoliciesView patterns; register both in sidebar nav; refresh iSecurify branding assets.

Work Log:
- Read reference views in depth: RisksView.tsx (flat Card list + create dialog), PoliciesView.tsx (grid Card list + view dialog + create dialog)
- Read shared.tsx (PageHeader, EmptyState, StatCard with tone variants)
- Read src/lib/api.ts (api helper with global 401 handling + formatDate/formatDateTime/timeAgo)
- Read src/lib/stores.ts (useAuthStore.user, useUIStore.activeView)
- Read AppShell.tsx in full — confirmed NAV array structure, sidebar section grouping, conditional view rendering
- Read globals.css — confirmed iSecurify brand palette already wired up:
    Primary #812671 (purple), Teal #1B887D, Orange #C46C1D, Blue #146F9E, Charcoal #2B2A29
    Light + dark mode + custom scrollbar tinted with brand purple
- Confirmed branding assets already referenced in: layout.tsx (favicon), AppShell.tsx (sidebar logo), LoginPage.tsx (2 places)
- Refreshed public/isecurify-icon.png with the user's higher-quality uploaded full-colour transparent version (same filename = no code changes needed)
- Added public/isecurify-logo-small.png as additional asset (small logo variant for future use)
- Created src/components/app/views/ClientsView.tsx (~280 lines):
    * PageHeader with "Add Client" button
    * 4 StatCards: Total Clients, Total Certificates (sum of _count), Countries, Filtered count
    * Search input (matches name/country/state/city)
    * Super-admin tenant filter
    * Grid of client Cards (icon, name, location pill, certificate-count badge, createdAt)
    * Card dropdown menu: Edit / Delete
    * Create/Edit ClientDialog (name, city, state, country, tenant for super_admin)
- Created src/components/app/views/CertificatesView.tsx (~570 lines, biggest view in the app):
    * PageHeader with "Add Certificate" button
    * 4 StatCards: Total, Active, Expiring <=60d, Overdue
    * 5 filter controls: search, status, framework (auto-populated from data), client, tenant (super_admin only)
    * Card list with: framework + client badge, vendor/auditor/cert# subtitle, status badge, expiry countdown badge (color-coded by 30/60/overdue thresholds), next-audit date, reminder count, certificate link, alert message
    * Card dropdown menu: View details / Edit / Send manual reminder (calls /api/reminders/send-manual/[certId]) / Delete
    * Create/Edit CertificateDialog: client picker, framework (datalist of common frameworks), vendor/auditor/cert#, 8 date fields, status, recipients textarea, cert link, INR+USD prices, alert message, notes, tenant picker for super_admin
    * CertificateDetailsDialog (read-only): expiry banner, full date grid, pricing cards, recipients, link, alert, notes, reminder history list with "Send Manual Reminder" button
    * Expiry color logic: <0 or <=30 days = rose (danger), <=60 = amber (warning), >60 = emerald (success)
- Registered both views in AppShell.tsx:
    * Added Award import from lucide-react
    * Added import statements for ClientsView and CertificatesView
    * Added 2 new NAV entries in a new "Certificates" sidebar section (between Compliance and Assurance):
        - { id: 'clients', label: 'Clients', icon: Building2, section: 'Certificates' }
        - { id: 'certificates', label: 'Certificates', icon: Award, section: 'Certificates' }
    * Added 2 conditional render lines in the main view switch
- Both views use only Version B's existing UI primitives: Card, Button, Input, Label, Textarea, Badge, Select, Dialog, DropdownMenu — no new libraries.
- Both views use the existing api() helper from src/lib/api.ts — no new fetch pattern.
- Both views use the existing useAuthStore — no new state pattern.
- Verified zero AI/Copilot/AI-assistant references in any Task 3 file (per project rules).

Stage Summary:
- 2 new view files: ClientsView.tsx (~11KB), CertificatesView.tsx (~37KB)
- 1 file modified: AppShell.tsx (4 surgical edits — imports, NAV entries, view renders)
- 2 brand assets refreshed/added: public/isecurify-icon.png (full-colour transparent), public/isecurify-logo-small.png
- Existing iSecurify brand palette in globals.css was already complete and correct — no CSS changes needed
- New "Certificates" sidebar section sits naturally between "Compliance" and "Assurance"
- Stopping for user review. Awaiting approval before starting Task 4 (Dashboard widget).

---
Task ID: 4
Agent: main (Super Z)
Task: Add a "Certificates Expiring Soon" widget to the main dashboard, reusing the existing dashboard widget/card pattern, pulling from /api/certificates/upcoming.

Work Log:
- Read DashboardView.tsx in full (648 lines originally) to understand the established widget pattern.
- Confirmed the dashboard uses a consistent widget template:
    * <Card> with <CardHeader className="flex flex-row items-center justify-between space-y-0">
      containing CardTitle + CardDescription on the left, icon on the right
    * <CardContent> with <ScrollArea className="h-[280px]"> wrapping a "space-y-2 pr-3" list
    * Empty state: muted text or a centered CheckCircle2 "All clear!" message
    * Row items are <button> elements with hover:bg-muted/50 + hover:border-primary/40 transitions
    * Deep-link navigation via goTo(view, flags) which sets sessionStorage flags before setActiveView
- Confirmed the existing useEffect loads /api/dashboard + /api/frameworks in parallel — extended it to also load /api/certificates/upcoming?days=60 (separate endpoint so /api/dashboard doesn't need to know about the new Certificate model).
- Made 3 surgical edits to DashboardView.tsx:
  1. Added Award to the lucide-react import list
  2. Added expiringCerts state + the api('/api/certificates/upcoming?days=60') fetch call to the existing useEffect
  3. Inserted a new "Certificates Expiring Soon" Card widget immediately after the "Active Audits" card (last widget in the dashboard, full-width)
- Widget features:
    * CardTitle with Award icon in brand purple
    * Dynamic CardDescription showing count + "click a row to view in the Certificates screen"
    * "View all" ghost button in the header that navigates to the Certificates view
    * ScrollArea h-[280px] matching the other widgets' height
    * Empty state: CheckCircle2 + "All clear! No certificates are due in the next 60 days."
    * Row: Award icon in brand-purple tint, framework name + client name, certificate # + next date + reminder count, color-coded days-until badge, ArrowRight chevron
    * Color thresholds match CertificatesView exactly: <0 or <=30d = rose (danger), <=60d = amber (warning), >60d = emerald (success)
    * Row click sets sessionStorage flag 'certificateDetailId' and navigates to 'certificates' view (deep-link convention matches the existing auditDetailId / vulnSeverityFilter / evidenceSearch patterns)
- File grew from 648 to 755 lines (+107 lines, all additive — no existing widget was modified).

Stage Summary:
- File modified: src/components/app/views/DashboardView.tsx (3 surgical edits, +107 lines)
- New widget renders as the last dashboard section, full-width below "Recent Evidence + Active Audits"
- Pulls from /api/certificates/upcoming?days=60 (the endpoint created in Task 2)
- Uses the same color thresholds, ScrollArea height, hover styles, and goTo() deep-link pattern as every other dashboard widget
- No new libraries, no new state-management pattern, no new auth pattern, no AI/Copilot
- Stopping for user review. Awaiting approval before starting Task 5 (seed data).

---
Task ID: 5
Agent: main (Super Z)
Task: Extend prisma/seed.ts with sample Clients (2-3) and Certificates (4-6) for the existing demo tenant (Acme), using realistic ISO 27001 / SOC 2 framework values and following the existing seed file's style.

Work Log:
- Read prisma/seed.ts in full (637 lines originally) to learn the established style:
    * db.<model>.upsert({ where: { uniqueKey }, update: {}, create: {...} }) for things with natural unique keys
    * const items = [...] array + for (const x of items) { await db.<model>.create({ data: { ...x, tenantId: tenant.id } }) } for sample data
    * console.log('  ✓ ...') per section
    * Relative date math via Date.now() + N * 24 * 60 * 60 * 1000
    * // ---- Section Title ---- comment headers
- Confirmed the demo tenant (Acme Corporation, slug='acme-corp', id stored in `tenant` variable) and the complianceOfficer user (Mark Lee, id stored in `complianceOfficer` variable) — both created earlier in the seed file.
- Inserted a new 3-section block right before the existing "---- Notifications ----" section (so notifications stays as the last thing before the final summary log):
  1. // ---- Sample Clients (tenant-scoped under Acme) ---- — 3 clients
     * Northwind Trading Co. (San Francisco, US)
     * Contoso Pharmaceuticals (London, UK)
     * Fabrikam FinServe Pvt Ltd (Bengaluru, India)
     * Idempotency via db.client.findFirst({ where: { tenantId, name } }) since Client has no natural unique key besides id
  2. // ---- Sample Certificates (mix of frameworks + urgency states) ---- — 6 certificates
     * Cert 1: Northwind / ISO 27001 / BSI / KPMG / nextAudit in 20d (≤30d → red on dashboard)
     * Cert 2: Northwind / SOC 2 Type II / AICPA / EY / nearestUpcoming in 45d (≤60d → amber)
     * Cert 3: Contoso / ISO 27001 / DNV / BDO / nextAudit overdue by 12d (red)
     * Cert 4: Contoso / GDPR / DPO Office / nearestUpcoming in 75d (>60d → green)
     * Cert 5: Fabrikam / PCI DSS / PCI SSC / PwC / nearestUpcoming in 240d (green)
     * Cert 6: Fabrikam / ISO 27017 / TUV Nord / Deloitte / nextAudit in 50d (≤60d → amber)
     * Each cert exercises all 8 date fields, alertMessage (where relevant), emailRecipients, notes, certificateLink, priceInr + priceUsd
     * Idempotency via findFirst on { tenantId, clientId, certificateNumber }
     * createdById = complianceOfficer.id (Mark Lee)
  3. // ---- Sample Reminder Logs (one manual log per certificate) ---- — 6 logs
     * One ReminderLog row per certificate, reminderType='manual', sentAt=7 days ago
     * status='sent' for certs with emailRecipients, 'failed' with errorMessage otherwise
     * Gives the CertificateDetailsDialog "Reminder History" panel something to render on first login
- File grew from 637 to 850 lines (+213 lines, all additive — no existing seed section was modified).
- Verified all 3 new sections appear in the correct order (Clients → Certificates → Reminder Logs → Notifications).
- Verified the file still ends cleanly with main().catch().finally().
- Verified zero AI/Copilot references.
- The 6 certificates span all 3 dashboard urgency buckets (red/amber/green) so the new "Certificates Expiring Soon" widget from Task 4 will have meaningful content on first login.

Stage Summary:
- File modified: prisma/seed.ts (+213 lines, 3 new sections)
- 3 sample clients created for the Acme demo tenant (US, UK, India — geographic diversity)
- 6 sample certificates created spanning ISO 27001 / SOC 2 / GDPR / PCI DSS / ISO 27017 (matches the frameworks already in the Frameworks table)
- 6 sample reminder logs created (one per certificate) so the reminder history panel renders non-empty
- All sections use the same idempotent pattern (findFirst before create) so re-running `bun run db:seed` won't duplicate rows
- Dates are computed relative to `now` so the dashboard widget always has certs in the 0-30 / 31-60 / >60d buckets regardless of when the seed is run
- Stopping for user review. Awaiting approval before starting Task 6 (Ubuntu deployment files).

---
Task ID: 6
Agent: main (Super Z)
Task: Generate plain Ubuntu 22.04 deployment files (no Docker/Coolify): systemd unit, Nginx internal conf (port 8080), Apache2 edge conf (port 80/443 + SSL), deploy.sh, update.sh, .env.production.example.

Work Log:
- Read existing deploy/ files in Version B: deploy.sh (single-tier Nginx deployment), isecurify.service (systemd unit), nginx/isecurify.conf (Nginx on 80/443 directly).
- Read Dockerfile, docker-compose.yml, docker-entrypoint.sh, Caddyfile, .env, next.config.ts to inventory all env vars and understand the existing build/start commands.
- Confirmed env var inventory: DATABASE_URL, NEXTAUTH_SECRET (required by next-auth package even though custom auth is used), NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NODE_ENV, PORT, HOSTNAME, UPLOAD_PATH, SEED_DB.
- Confirmed build/start commands: `bun run build` produces .next/standalone/server.js (next.config.ts has output: 'standalone'); `bun .next/standalone/server.js` starts the app on PORT (default 3000).
- Created new directory structure:
    deploy/systemd/   — systemd unit
    deploy/apache/    — Apache2 edge vhost (new)
    deploy/scripts/   — deploy.sh + update.sh (replaces old deploy/deploy.sh at root)
    deploy/nginx/     — rewrote existing isecurify.conf for internal-only :8080
- Removed the old single-tier deploy artifacts per spec ("replacing the Docker/Coolify deployment path"):
    rm deploy/deploy.sh
    rm deploy/isecurify.service
  (Kept Dockerfile + docker-compose.yml + Caddyfile at repo root untouched — those are the old Docker path and the user can delete them manually if desired; spec only asked to replace the deployment TARGET, not to delete the Docker files.)
- Wrote 6 files:
  1. deploy/systemd/isecurify.service (51 lines)
     * User=isecurify, Group=isecurify, WorkingDirectory=/opt/isecurify
     * EnvironmentFile=/opt/isecurify/.env (so PORT=3000 comes from .env)
     * ExecStart=/usr/local/bin/bun /opt/isecurify/.next/standalone/server.js
     * Restart=always, RestartSec=5
     * StandardOutput=journal, StandardError=journal, SyslogIdentifier=isecurify
     * NoNewPrivileges=true, LimitNOFILE=65535
     * KillSignal=SIGTERM, TimeoutStopSec=15 (graceful shutdown)
     * After=network.target mysql.service, Wants=mysql.service
  2. deploy/nginx/isecurify.conf (85 lines)
     * listen 127.0.0.1:8080 ONLY (internal — Apache2 is the public edge)
     * Preserved all security headers from the existing config (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, CSP)
     * Preserved client_max_body_size 50M (matches Apache2 LimitRequestBody)
     * Preserved proxy_pass http://127.0.0.1:3000 with WebSocket upgrade headers + timeouts
     * Preserved static-asset caching for /_next/static/ (365d) and /isecurify-icon.png (30d)
     * Preserved health-check block for /api/auth/me with access_log off
     * Preserved deny rules for dotfiles and /prisma/
  3. deploy/apache/isecurify.conf (106 lines) — NEW
     * Two VirtualHost blocks: :80 (HTTP→HTTPS redirect + Let's Encrypt challenge) and :443 (SSL + reverse proxy)
     * SSL via Let's Encrypt placeholders (certbot --apache will rewrite them)
     * SSL hardening: TLSv1.2+1.3 only, ECDHE cipher suite, session tickets off, HSTS preload
     * Security headers (mirror Nginx's): X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, CSP, HSTS, Permissions-Policy
     * LimitRequestBody 52428800 (50M, matches Nginx client_max_body_size)
     * ProxyPreserveHost On, ProxyRequests Off
     * ProxyPass / http://127.0.0.1:8080/ (reverse proxy to Nginx, NOT directly to Bun)
     * RequestHeader set X-Forwarded-Proto "https" + X-Forwarded-Port "443"
     * ProxyTimeout 120 (matches Nginx proxy_read_timeout)
     * Header comment block listing the a2enmod/a2ensite/certbot commands
  4. deploy/scripts/deploy.sh (307 lines, executable) — NEW, replaces old deploy/deploy.sh
     * 11 numbered steps matching the spec:
       1. apt-get install curl git apache2 nginx mysql-server mysql-client certbot python3-certbot-apache
       2. Install Bun (curl bun.sh/install, symlink to /usr/local/bin/bun)
       3. Create isecurify system user + /opt/isecurify + /opt/isecurify/uploads
       4. Create MySQL database + user (try password first, fall back to auth_socket via sudo; random 24-char app password via openssl)
       5. Clone from GIT_REPO arg OR rsync from CWD (excludes node_modules/.next/.git/etc.)
       6. bun install + bunx prisma generate --schema prisma/schema.mysql.prisma + bunx prisma db push --accept-data-loss + bun run build + copy static+public into standalone bundle
       7. Write /opt/isecurify/.env from template (DATABASE_URL with generated MySQL password, NEXTAUTH_SECRET via openssl rand -base64 32, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NODE_ENV=production, PORT=3000, HOSTNAME=0.0.0.0, UPLOAD_PATH, SEED_DB=false), chmod 600, chown isecurify:isecurify
       8. cp systemd unit to /etc/systemd/system/, daemon-reload, enable, restart
       9. cp Nginx conf to /etc/nginx/sites-available/, symlink to sites-enabled/, remove default site, nginx -t, reload
       10. a2enmod proxy proxy_http ssl headers rewrite; cp Apache conf; sed domain substitution; a2dissite 000-default; a2ensite isecurify; apache2ctl configtest; reload; certbot --apache -d DOMAIN --non-interactive --agree-tos --redirect
       11. Final status check (systemctl is-active for all 3 services) + login credentials reminder + seed instructions
     * Colored output helpers (ok/info/warn/die)
     * set -euo pipefail for robustness
     * Syntax-verified with `bash -n` (caught and fixed one bug: invalid array literal with || and redirect — rewrote the MySQL auth logic to be straightforward if/elif)
  5. deploy/scripts/update.sh (51 lines, executable) — NEW
     * 5-step quick redeploy: git pull → bun install → bunx prisma db push → bun run build → systemctl restart isecurify
     * Copies static+public into standalone bundle (matches package.json 'build' script behavior)
     * set -euo pipefail, root check
  6. .env.production.example (at repo root, 60 lines) — NEW
     * DATABASE_URL=mysql://isecurify:PASSWORD@localhost:3306/isecurify (plain MySQL, not Coolify-managed)
     * NEXTAUTH_SECRET with explanatory comment about why it's required even though custom auth is used
     * NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, NODE_ENV, PORT, HOSTNAME, UPLOAD_PATH, SEED_DB
     * Inline SQL snippet showing how to manually create the DB + user (alternative to the deploy script)
- Both shell scripts pass `bash -n` syntax check.
- Apache config has exactly 2 <VirtualHost> blocks (one :80, one :443).
- Nginx config listens on 127.0.0.1:8080 ONLY (verified by grep).
- Systemd unit has all required fields (User, Group, WorkingDirectory, EnvironmentFile, ExecStart, Restart, Description, After, Wants).
- No AI/Copilot references in any Task 6 file.
- Old single-tier deploy/deploy.sh and deploy/isecurify.service removed (replaced by deploy/scripts/deploy.sh and deploy/systemd/isecurify.service respectively).

Stage Summary:
- 6 new files created:
    deploy/systemd/isecurify.service    (51 lines)
    deploy/nginx/isecurify.conf         (85 lines, rewritten from old version)
    deploy/apache/isecurify.conf        (106 lines, NEW)
    deploy/scripts/deploy.sh            (307 lines, NEW, executable)
    deploy/scripts/update.sh            (51 lines, NEW, executable)
    .env.production.example             (60 lines, NEW at repo root)
- 2 old files removed (old single-tier deploy path):
    deploy/deploy.sh
    deploy/isecurify.service
- Architecture implemented: Internet → Apache2 (:443 SSL) → Nginx (:8080) → Bun/Next.js (:3000) → MySQL (:3306)
- deploy.sh is fully automated: takes domain as $1 (and optional git repo URL as $2), handles everything from apt-get through certbot SSL issuance
- Stopping for user review. Awaiting approval before starting Task 7 (README rewrite).

---
Task ID: 7
Agent: main (Super Z)
Task: Rewrite the deployment section of README.md for plain Ubuntu + Apache2 + Nginx + MySQL (replacing the Coolify section entirely), including architecture diagram, step-by-step using the Task 6 scripts, troubleshooting table for systemd/Apache2/Nginx, and mysqldump cron backup example.

Work Log:
- Read existing README.md (491 lines) in full — mapped all 14 sections:
    TOC, Features, Tech Stack, Quick Start (Nginx-only), Docker alternative, Apache alternative,
    Environment Variables, Database Schema, Default Login Credentials, Post-Deployment Checklist,
    Useful Commands, Troubleshooting, Local Development, Project Structure, License
- Wrote a Python helper script at /home/z/my-project/scripts/replace_readme_deploy_section.py to
  surgically replace the 220-line deployment section (Quick Start + Docker + Apache alternative)
  with the new Apache2+Nginx+MySQL flow. The script finds the start marker
  ("## 🚀 Quick Start — Ubuntu Server + Nginx + MySQL") and end marker
  ("## ⚙️ Environment Variables") and replaces everything in between.
- After the bulk replacement, made 6 additional targeted edits via MultiEdit:
  1. Table of Contents — updated to reflect new section list (removed Docker/Apache alternatives, renamed Quick Start to "Deployment — Ubuntu + Apache2 + Nginx + MySQL")
  2. Environment Variables — added note pointing to .env.production.example, updated DATABASE_URL example to plain MySQL format, clarified NEXTAUTH_SECRET is required by next-auth package even though custom auth is used
  3. Database Schema — updated from "17 models" to "20 models", added the 3 new models (Client, Certificate, ReminderLog) to the list
  4. Default Login Credentials — replaced incorrect table (showed admin@isecurify.com / Admin@123456) with the actual seed file credentials (superadmin@isecurify.com / Admin@123 + 4 tenant users), added Tenant column
  5. Post-Deployment Checklist — updated for new stack (systemctl status isecurify nginx apache2, references to Certificates Expiring Soon widget, 20 tables expectation, etc.)
  6. Useful Commands — restructured into 6 subsections: Bun/Next.js (systemd), Nginx, Apache2, SSL/certbot, Database Management, Updates (now references update.sh), Automatic MySQL Backup (rewrote with proper heredoc + chmod 700 + cron.d permissions)
  7. Troubleshooting — replaced 10-row table with 18-row table covering: 502 Bad Gateway (2 variants), 503, connection refused on :443, redirect loop, SSL cert errors, certbot failures, systemd "failed" state, MySQL ECONNREFUSED, apache2ctl configtest failures, nginx -t failures, 413 upload too large, permission denied, prisma access denied, blank page, data lost after restart, OOM kills, cron backup not running, port 80/443 in use
  8. Local Development — fixed credentials reference (was admin@isecurify.com, now superadmin@isecurify.com / Admin@123), added note about SQLite vs MySQL schema dual-maintenance
  9. Project Structure — rewrote the deploy/ tree to show the new systemd/nginx/apache/scripts subfolders, added .env.production.example, marked Dockerfile/docker-compose.yml/docker-entrypoint.sh/Caddyfile as "(Legacy)" with explanatory note
- The new deployment section includes:
    * ASCII art architecture diagram showing the 4-layer stack (Internet → Apache2 :443 → Nginx :8080 → Bun :3000 → MySQL :3306) with explanations of each layer's role
    * "Why two reverse proxies?" callout explaining the Apache2-vs-Nginx division of responsibility
    * Prerequisites subsection
    * 5 numbered steps: Upload code, Run deploy script, Seed demo data, Verify deployment, Updates
    * Manual deployment subsection with the 4 config files table + 11-step bash sequence for users who don't want to use deploy.sh
- Final README: 573 lines (up from 491 — net +82 lines, but the deployment section is much denser and more comprehensive)
- All Docker/Coolify references are either removed or explicitly marked as "(Legacy)" in the Project Structure section with a note explaining they're superseded.
- No AI/Copilot references anywhere in the file.
- The mysqldump cron backup example uses a proper heredoc, chmod 700 on the backup script (since it contains the DB password), and /etc/cron.d/ with root:root ownership — replacing the old "echo to /etc/cron.d" approach which had permission issues.

Stage Summary:
- File modified: README.md (491 → 573 lines, +82 net)
- 9 targeted edits via MultiEdit + 1 bulk Python-script-driven replacement
- Old deployment sections (Quick Start Nginx-only, Docker alternative, Apache alternative) all removed
- New deployment section is comprehensive: architecture diagram, 5 numbered steps, manual deployment alternative, all 4 config files documented
- Troubleshooting table expanded from 10 to 18 rows, all specific to the new Apache2+Nginx+systemd stack
- Useful Commands restructured into 6 clear subsections (Bun, Nginx, Apache2, SSL, Database, Updates, Backup)
- Project Structure tree updated to reflect new deploy/ subfolders + legacy Docker files marked
- Default Login Credentials corrected to match the actual seed file
- Database Schema count updated from 17 to 20 models (added Client, Certificate, ReminderLog)
- All 7 tasks now complete.
