/* iSecurify GRC — Seed Script
 * Creates Super Admin, sample tenant, users, frameworks, controls, and demo data
 */
import { db } from '../src/lib/db'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

function hashPassword(password: string): string {
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

async function main() {
  console.log('🌱 Seeding iSecurify GRC database...')

  // ---- Super Admin (tenant-less) ----
  const superAdmin = await db.user.upsert({
    where: { email: 'superadmin@isecurify.com' },
    update: {},
    create: {
      email: 'superadmin@isecurify.com',
      name: 'Super Admin',
      passwordHash: hashPassword('Admin@123'),
      role: 'super_admin',
      jobTitle: 'Platform Super Administrator',
      status: 'active',
    },
  })
  console.log('  ✓ Super Admin:', superAdmin.email)

  // ---- Demo Tenant ----
  const tenant = await db.tenant.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      industry: 'Financial Services',
      plan: 'enterprise',
      status: 'active',
      contactName: 'Sarah Mitchell',
      contactEmail: 'sarah.mitchell@acme.com',
      contactPhone: '+1-555-0100',
      address: '120 Market Street, San Francisco, CA 94105',
    },
  })
  console.log('  ✓ Tenant:', tenant.name)

  // ---- Second demo tenant ----
  const tenant2 = await db.tenant.upsert({
    where: { slug: 'globex-health' },
    update: {},
    create: {
      name: 'Globex Health Systems',
      slug: 'globex-health',
      industry: 'Healthcare',
      plan: 'business',
      status: 'active',
      contactName: 'Dr. James Patel',
      contactEmail: 'j.patel@globexhealth.com',
      contactPhone: '+1-555-0200',
      address: '88 Wellness Blvd, Boston, MA 02115',
    },
  })
  console.log('  ✓ Tenant:', tenant2.name)

  // ---- Tenant Users (multiple users per client company) ----
  const tenantAdmin = await db.user.upsert({
    where: { email: 'sarah.mitchell@acme.com' },
    update: {},
    create: {
      email: 'sarah.mitchell@acme.com',
      name: 'Sarah Mitchell',
      passwordHash: hashPassword('Tenant@123'),
      role: 'tenant_admin',
      jobTitle: 'CISO',
      department: 'Security',
      tenantId: tenant.id,
      status: 'active',
    },
  })
  const complianceOfficer = await db.user.upsert({
    where: { email: 'mark.lee@acme.com' },
    update: {},
    create: {
      email: 'mark.lee@acme.com',
      name: 'Mark Lee',
      passwordHash: hashPassword('Tenant@123'),
      role: 'compliance_officer',
      jobTitle: 'Compliance Manager',
      department: 'Compliance',
      tenantId: tenant.id,
      status: 'active',
    },
  })
  const auditor = await db.user.upsert({
    where: { email: 'priya.sharma@acme.com' },
    update: {},
    create: {
      email: 'priya.sharma@acme.com',
      name: 'Priya Sharma',
      passwordHash: hashPassword('Tenant@123'),
      role: 'auditor',
      jobTitle: 'Internal Auditor',
      department: 'Audit',
      tenantId: tenant.id,
      status: 'active',
    },
  })
  const employee = await db.user.upsert({
    where: { email: 'tom.reyes@acme.com' },
    update: {},
    create: {
      email: 'tom.reyes@acme.com',
      name: 'Tom Reyes',
      passwordHash: hashPassword('Tenant@123'),
      role: 'employee',
      jobTitle: 'IT Engineer',
      department: 'IT',
      tenantId: tenant.id,
      status: 'active',
    },
  })
  console.log('  ✓ Tenant users (4) created for Acme')

  // ---- Frameworks ----
  const frameworks = [
    {
      code: 'ISO27001',
      name: 'ISO/IEC 27001:2022',
      description: 'International standard for information security management systems (ISMS).',
      category: 'security',
      version: '2022',
      icon: 'shield',
    },
    {
      code: 'SOC2',
      name: 'SOC 2 Type II',
      description: 'Service Organization Control 2 — Trust Services Criteria for security, availability, processing integrity, confidentiality, and privacy.',
      category: 'security',
      version: '2017',
      icon: 'lock',
    },
    {
      code: 'GDPR',
      name: 'GDPR',
      description: 'General Data Protection Regulation — EU privacy and data protection law.',
      category: 'privacy',
      version: '2018',
      icon: 'eye',
    },
    {
      code: 'HIPAA',
      name: 'HIPAA',
      description: 'Health Insurance Portability and Accountability Act — US healthcare data protection.',
      category: 'healthcare',
      version: '1996',
      icon: 'heart-pulse',
    },
    {
      code: 'PCI_DSS',
      name: 'PCI DSS v4.0',
      description: 'Payment Card Industry Data Security Standard for cardholder data protection.',
      category: 'financial',
      version: '4.0',
      icon: 'credit-card',
    },
    {
      code: 'NIST_CSF',
      name: 'NIST Cybersecurity Framework',
      description: 'Voluntary framework for improving cybersecurity risk management.',
      category: 'security',
      version: '2.0',
      icon: 'network',
    },
    {
      code: 'DPDPA',
      name: 'Digital Personal Data Protection Act, 2023',
      description: 'India\'s data protection law governing the processing of digital personal data, with obligations for Data Fiduciaries, Data Principals\' rights, consent management, breach notification, and Significant Data Fiduciary duties.',
      category: 'privacy',
      version: '2023',
      icon: 'eye',
    },
  ]

  const frameworkRecords = []
  for (const fw of frameworks) {
    const rec = await db.framework.upsert({
      where: { code: fw.code },
      update: { description: fw.description },
      create: fw,
    })
    frameworkRecords.push(rec)
  }
  console.log('  ✓ Frameworks:', frameworkRecords.length)

  // ---- Controls for ISO 27001 ----
  const iso = frameworkRecords.find((f) => f.code === 'ISO27001')!
  const isoControls = [
    { ref: 'A.5.1', title: 'Policies for information security', category: 'Organizational', description: 'Information security policy shall be defined and approved by management.', guidance: 'Document an information security policy, communicate to employees, and review at planned intervals.' },
    { ref: 'A.5.2', title: 'Information security roles and responsibilities', category: 'Organizational', description: 'Roles and responsibilities for information security shall be allocated.', guidance: 'Allocate security responsibilities to defined roles and document them.' },
    { ref: 'A.5.3', title: 'Segregation of duties', category: 'Organizational', description: 'Conflicting duties shall be segregated to reduce unauthorized modification.', guidance: 'Separate development, testing, and production duties.' },
    { ref: 'A.6.1', title: 'Screening', category: 'People', description: 'Background verification checks on all candidates for employment shall be carried out.', guidance: 'Conduct background checks prior to employment per legal requirements.' },
    { ref: 'A.6.3', title: 'Information security awareness, education, and training', category: 'People', description: 'Employees shall receive appropriate awareness education and training.', guidance: 'Deliver security awareness training at hire and annually thereafter.' },
    { ref: 'A.7.1', title: 'Physical security perimeters', category: 'Physical', description: 'Security perimeters shall be defined and used to protect areas with sensitive information.', guidance: 'Use multi-layer physical security (badge, CCTV, guards) for data centers.' },
    { ref: 'A.8.1', title: 'User endpoint devices', category: 'Technological', description: 'Information stored on user endpoint devices shall be protected.', guidance: 'Enforce full-disk encryption, screen lock, and remote wipe on endpoints.' },
    { ref: 'A.8.2', title: 'Privileged access rights', category: 'Technological', description: 'Privileged access rights shall be restricted and controlled.', guidance: 'Use PAM tools, MFA, and just-in-time elevation for admin accounts.' },
    { ref: 'A.8.3', title: 'Information access restriction', category: 'Technological', description: 'Access to information shall be restricted in line with access control policy.', guidance: 'Apply least-privilege and RBAC across all systems.' },
    { ref: 'A.8.4', title: 'Access to source code', category: 'Technological', description: 'Access to source code shall be restricted and managed.', guidance: 'Use version control with code-review gates and branch protection.' },
    { ref: 'A.8.5', title: 'Secure authentication', category: 'Technological', description: 'Secure authentication technologies and procedures shall be implemented.', guidance: 'MFA for all external access; passwordless where possible.' },
    { ref: 'A.8.7', title: 'Protection against malware', category: 'Technological', description: 'Protection against malware shall be implemented and maintained.', guidance: 'Deploy EDR with behavioral detection; quarantine on detection.' },
    { ref: 'A.8.8', title: 'Management of technical vulnerabilities', category: 'Technological', description: 'Information about technical vulnerabilities shall be collected and evaluated.', guidance: 'Run weekly vuln scans; SLA-based remediation (critical <= 7d).' },
    { ref: 'A.8.9', title: 'Configuration management', category: 'Technological', description: 'Configuration baselines shall be established, documented, and maintained.', guidance: 'Use CIS benchmarks; automated config drift detection.' },
    { ref: 'A.8.10', title: 'Information deletion', category: 'Technological', description: 'Information stored in information systems shall be deleted when no longer required.', guidance: 'Define data retention; cryptographically erase on disposal.' },
    { ref: 'A.8.11', title: 'Data masking', category: 'Technological', description: 'Data masking shall be used in line with access control policy.', guidance: 'Mask PII in non-production; use tokenization for card data.' },
    { ref: 'A.8.12', title: 'Data leakage prevention', category: 'Technological', description: 'Data leakage prevention measures shall be applied.', guidance: 'DLP at endpoint, network, and cloud egress.' },
    { ref: 'A.8.13', title: 'Information backup', category: 'Technological', description: 'Backup copies of information shall be maintained.', guidance: '3-2-1 backup rule; test restores quarterly.' },
    { ref: 'A.8.14', title: 'Redundancy of information processing facilities', category: 'Technological', description: 'Redundancy shall be implemented to meet availability requirements.', guidance: 'Multi-AZ deployments; documented RTO/RPO.' },
    { ref: 'A.8.15', title: 'Logging', category: 'Technological', description: 'Logs that record user activities, exceptions, faults, and events shall be produced.', guidance: 'Centralized SIEM with 1-year retention; immutable storage.' },
    { ref: 'A.8.16', title: 'Monitoring activities', category: 'Technological', description: 'Systems shall be monitored for anomalies.', guidance: '24x7 SOC monitoring; anomaly detection alerts.' },
    { ref: 'A.8.24', title: 'Use of cryptography', category: 'Technological', description: 'Cryptography shall be used to protect confidentiality, integrity, and authenticity.', guidance: 'Use TLS 1.3, AES-256 at rest; rotate keys annually.' },
    { ref: 'A.8.25', title: 'Secure development life cycle', category: 'Technological', description: 'Rules for secure development of systems shall be established.', guidance: 'Integrate SAST/DAST in CI; threat-model new features.' },
    { ref: 'A.8.28', title: 'Secure coding', category: 'Technological', description: 'Secure coding principles shall be applied.', guidance: 'Follow OWASP Top 10; peer-reviewed code.' },
  ]

  for (const c of isoControls) {
    await db.control.upsert({
      where: { id: `iso-${c.ref}` },
      update: { description: c.description, guidance: c.guidance, category: c.category, frameworkId: iso.id, title: c.title, ref: c.ref },
      create: { id: `iso-${c.ref}`, ...c, frameworkId: iso.id },
    })
  }
  console.log('  ✓ ISO 27001 controls:', isoControls.length)

  // ---- Controls for SOC 2 ----
  const soc2 = frameworkRecords.find((f) => f.code === 'SOC2')!
  const soc2Controls = [
    { ref: 'CC1.1', title: 'Control Environment — Integrity & Ethics', category: 'Common Criteria', description: 'Demonstrates commitment to integrity and ethical values.', guidance: 'Maintain a code of conduct; tone at the top.' },
    { ref: 'CC1.2', title: 'Board Independence', category: 'Common Criteria', description: 'Board of directors demonstrates independence from management.', guidance: 'Audit committee oversight of security.' },
    { ref: 'CC2.1', title: 'Internal Communication', category: 'Common Criteria', description: 'Information is communicated internally.', guidance: 'Security incidents reported within 24h.' },
    { ref: 'CC2.2', title: 'External Communication', category: 'Common Criteria', description: 'Information is communicated externally.', guidance: 'Customer breach notification within 72h.' },
    { ref: 'CC3.1', title: 'Risk Identification', category: 'Common Criteria', description: 'Identifies and assesses risks.', guidance: 'Annual enterprise risk assessment.' },
    { ref: 'CC3.2', title: 'Risk Assessment — Changes', category: 'Common Criteria', description: 'Assesses changes that could significantly impact the system.', guidance: 'Change management risk reviews.' },
    { ref: 'CC4.1', title: 'Monitoring — Ongoing', category: 'Common Criteria', description: 'Ongoing evaluations to ascertain controls are present and functioning.', guidance: 'Continuous control monitoring via CCP.' },
    { ref: 'CC4.2', title: 'Monitoring — Deficiencies', category: 'Common Criteria', description: 'Evaluates and communicates deficiencies.', guidance: 'Quarterly control deficiency review.' },
    { ref: 'CC5.1', title: 'Control Implementation', category: 'Common Criteria', description: 'Selects and develops controls to mitigate risks.', guidance: 'Risk-based control selection.' },
    { ref: 'CC5.2', title: 'Control Deployment', category: 'Common Criteria', description: 'Deploys controls as designed.', guidance: 'Documented control deployment evidence.' },
    { ref: 'CC6.1', title: 'Logical & Physical Access', category: 'Common Criteria', description: 'Implements logical access security software, infrastructure, and architectures.', guidance: 'IAM with SSO + MFA + RBAC.' },
    { ref: 'CC6.2', title: 'User Provisioning', category: 'Common Criteria', description: 'Prior to issuance, identifies and authenticates users.', guidance: 'Joiner-Mover-Leaver process.' },
    { ref: 'CC6.3', title: 'Authentication', category: 'Common Criteria', description: 'Authorizes, modifies, and revokes access.', guidance: 'MFA, least-privilege, periodic access review.' },
    { ref: 'CC7.1', title: 'Detection & Monitoring', category: 'Common Criteria', description: 'Detects security events.', guidance: 'SIEM + 24x7 monitoring.' },
    { ref: 'CC7.2', title: 'Incident Response', category: 'Common Criteria', description: 'Responds to identified incidents.', guidance: 'Documented IR plan; tabletop exercises.' },
    { ref: 'CC8.1', title: 'Change Management', category: 'Common Criteria', description: 'Manages changes to systems.', guidance: 'Change advisory board; peer-reviewed code.' },
    { ref: 'CC9.1', title: 'Risk Mitigation', category: 'Common Criteria', description: 'Mitigates risks identified in risk assessment.', guidance: 'Risk treatment plans with owners.' },
    { ref: 'A1.1', title: 'Availability — Capacity', category: 'Availability', description: 'Maintains environmental protections, software, and infrastructure.', guidance: 'Capacity planning; redundancy.' },
    { ref: 'A1.2', title: 'Availability — Recovery', category: 'Availability', description: 'Implements recovery procedures.', guidance: 'Tested DR runbooks; RTO/RPO.' },
    { ref: 'C1.1', title: 'Confidentiality — Protection', category: 'Confidentiality', description: 'Protects confidential information.', guidance: 'Encryption + access controls.' },
    { ref: 'P1.1', title: 'Privacy — Notice', category: 'Privacy', description: 'Provides notice of entity privacy practices.', guidance: 'Public privacy policy.' },
    { ref: 'P2.1', title: 'Privacy — Choice & Consent', category: 'Privacy', description: 'Provides choice and consent for PII use.', guidance: 'Consent management platform.' },
  ]
  for (const c of soc2Controls) {
    await db.control.upsert({
      where: { id: `soc2-${c.ref}` },
      update: { description: c.description, guidance: c.guidance, category: c.category, frameworkId: soc2.id, title: c.title, ref: c.ref },
      create: { id: `soc2-${c.ref}`, ...c, frameworkId: soc2.id },
    })
  }
  console.log('  ✓ SOC 2 controls:', soc2Controls.length)

  // ---- Controls for GDPR ----
  const gdpr = frameworkRecords.find((f) => f.code === 'GDPR')!
  const gdprControls = [
    { ref: 'Art.5', title: 'Principles for processing personal data', category: 'Principles', description: 'Lawfulness, fairness, transparency; purpose limitation; data minimization.', guidance: 'Document lawful basis for each processing activity.' },
    { ref: 'Art.6', title: 'Lawfulness of processing', category: 'Lawful Basis', description: 'Identify a lawful basis for processing.', guidance: 'Consent, contract, legal obligation, vital interest, public task, legitimate interest.' },
    { ref: 'Art.7', title: 'Conditions for consent', category: 'Consent', description: 'Consent must be freely given, specific, informed, and unambiguous.', guidance: 'Granular consent; easy withdrawal.' },
    { ref: 'Art.9', title: 'Special categories of personal data', category: 'Sensitive Data', description: 'Processing of special categories prohibited unless exception applies.', guidance: 'Explicit consent for health, biometric, genetic data.' },
    { ref: 'Art.12', title: 'Transparency of information', category: 'Data Subject Rights', description: 'Provide information in concise, transparent, intelligible, and easily accessible form.', guidance: 'Plain-language privacy notices.' },
    { ref: 'Art.13', title: 'Information to be provided (collected from subject)', category: 'Data Subject Rights', description: 'Inform data subjects when collecting their data.', guidance: 'Collection notice at point of capture.' },
    { ref: 'Art.15', title: 'Right of access', category: 'Data Subject Rights', description: 'Data subject may obtain confirmation of processing and copy of data.', guidance: 'DSAR fulfillment within 1 month.' },
    { ref: 'Art.16', title: 'Right to rectification', category: 'Data Subject Rights', description: 'Data subject may correct inaccurate data.', guidance: 'Self-service profile editing.' },
    { ref: 'Art.17', title: 'Right to erasure (right to be forgotten)', category: 'Data Subject Rights', description: 'Data subject may request deletion.', guidance: 'End-to-end deletion including backups per retention schedule.' },
    { ref: 'Art.20', title: 'Right to data portability', category: 'Data Subject Rights', description: 'Receive data in structured, machine-readable format.', guidance: 'JSON/CSV export endpoint.' },
    { ref: 'Art.25', title: 'Data protection by design and by default', category: 'Accountability', description: 'Implement appropriate technical and organizational measures.', guidance: 'Privacy-by-design assessments; default privacy settings.' },
    { ref: 'Art.28', title: 'Processor obligations', category: 'Accountability', description: 'Use only processors providing sufficient guarantees.', guidance: 'DPAs with all subprocessors.' },
    { ref: 'Art.30', title: 'Records of processing activities', category: 'Accountability', description: 'Maintain ROPA for each processing activity.', guidance: 'Living ROPA document.' },
    { ref: 'Art.32', title: 'Security of processing', category: 'Security', description: 'Implement appropriate technical and organizational security measures.', guidance: 'Encryption, pseudonymization, regular testing.' },
    { ref: 'Art.33', title: 'Notification of breach to authority', category: 'Breach Notification', description: 'Notify supervisory authority within 72 hours of breach.', guidance: 'Breach playbook; legal counsel on standby.' },
    { ref: 'Art.34', title: 'Notification of breach to data subject', category: 'Breach Notification', description: 'Notify data subjects without undue delay if high risk.', guidance: 'Pre-drafted customer notification templates.' },
    { ref: 'Art.35', title: 'Data protection impact assessment', category: 'DPIA', description: 'Conduct DPIA for high-risk processing.', guidance: 'DPIA template; DPO sign-off.' },
    { ref: 'Art.37', title: 'Designation of DPO', category: 'Governance', description: 'Designate a Data Protection Officer where required.', guidance: 'DPO reports to highest management level.' },
    { ref: 'Art.44', title: 'Transfers to third countries', category: 'Transfers', description: 'Transfers only with adequate safeguards.', guidance: 'SCCs; transfer impact assessments.' },
  ]
  for (const c of gdprControls) {
    await db.control.upsert({
      where: { id: `gdpr-${c.ref}` },
      update: { description: c.description, guidance: c.guidance, category: c.category, frameworkId: gdpr.id, title: c.title, ref: c.ref },
      create: { id: `gdpr-${c.ref}`, ...c, frameworkId: gdpr.id },
    })
  }
  console.log('  ✓ GDPR controls:', gdprControls.length)

  // ---- HIPAA controls ----
  const hipaa = frameworkRecords.find((f) => f.code === 'HIPAA')!
  const hipaaControls = [
    { ref: '164.308(a)(1)', title: 'Security Management Process', category: 'Administrative', description: 'Implement risk analysis and risk management.', guidance: 'Annual risk analysis; documented risk treatment.' },
    { ref: '164.308(a)(3)', title: 'Workforce Security', category: 'Administrative', description: 'Implement policies for workforce access.', guidance: 'Sanction policy; authorization levels.' },
    { ref: '164.308(a)(4)', title: 'Information Access Management', category: 'Administrative', description: 'Implement access authorization and modification.', guidance: 'Role-based access; periodic review.' },
    { ref: '164.308(a)(5)', title: 'Security Awareness & Training', category: 'Administrative', description: 'Implement security awareness and training program.', guidance: 'Annual training; phishing simulations.' },
    { ref: '164.308(a)(6)', title: 'Security Incident Procedures', category: 'Administrative', description: 'Implement procedures to respond to security incidents.', guidance: 'Documented IR plan; post-incident review.' },
    { ref: '164.308(a)(7)', title: 'Contingency Plan', category: 'Administrative', description: 'Establish and implement contingency plan.', guidance: 'DR plan; data backup; emergency mode ops.' },
    { ref: '164.310(a)(1)', title: 'Facility Access Controls', category: 'Physical', description: 'Implement policies for facility access.', guidance: 'Badge access; visitor logs; CCTV.' },
    { ref: '164.310(b)', title: 'Workstation Use', category: 'Physical', description: 'Implement workstation use policies.', guidance: 'Clean desk; screen lock policy.' },
    { ref: '164.310(c)', title: 'Workstation Security', category: 'Physical', description: 'Implement physical safeguards for workstations.', guidance: 'Secure workstations; cable locks.' },
    { ref: '164.310(d)', title: 'Device & Media Controls', category: 'Physical', description: 'Implement controls for devices and media.', guidance: 'Asset tracking; secure disposal.' },
    { ref: '164.312(a)(1)', title: 'Access Control', category: 'Technical', description: 'Implement technical access controls.', guidance: 'Unique user IDs; emergency access; auto logoff.' },
    { ref: '164.312(b)', title: 'Audit Controls', category: 'Technical', description: 'Implement audit controls.', guidance: 'Audit logging; periodic review.' },
    { ref: '164.312(c)(1)', title: 'Integrity', category: 'Technical', description: 'Implement controls to protect ePHI integrity.', guidance: 'Hashing; integrity monitoring.' },
    { ref: '164.312(e)(1)', title: 'Transmission Security', category: 'Technical', description: 'Implement technical security for ePHI transmission.', guidance: 'TLS; VPN; encrypted email.' },
  ]
  for (const c of hipaaControls) {
    await db.control.upsert({
      where: { id: `hipaa-${c.ref}` },
      update: { description: c.description, guidance: c.guidance, category: c.category, frameworkId: hipaa.id, title: c.title, ref: c.ref },
      create: { id: `hipaa-${c.ref}`, ...c, frameworkId: hipaa.id },
    })
  }
  console.log('  ✓ HIPAA controls:', hipaaControls.length)

  // ---- PCI DSS controls ----
  const pci = frameworkRecords.find((f) => f.code === 'PCI_DSS')!
  const pciControls = [
    { ref: '1.1', title: 'Firewall Configuration Standard', category: 'Network Security', description: 'Establish and implement firewall and router configuration standards.', guidance: 'Documented standards; semi-annual review.' },
    { ref: '1.2', title: 'Network Architecture Diagrams', category: 'Network Security', description: 'Build firewall and router configurations that restrict connections.', guidance: 'Current network diagrams; DMZ segmentation.' },
    { ref: '2.1', title: 'Default Passwords', category: 'Configuration', description: 'Always change vendor-supplied defaults.', guidance: 'Remove defaults; unique per system.' },
    { ref: '2.2', title: 'Configuration Standards', category: 'Configuration', description: 'Develop configuration standards for all system components.', guidance: 'CIS benchmarks; hardening checklists.' },
    { ref: '3.1', title: 'Cardholder Data Retention', category: 'Data Protection', description: 'Limit retention of cardholder data.', guidance: 'Retention policy; secure deletion.' },
    { ref: '3.4', title: 'Render PAN Unreadable', category: 'Data Protection', description: 'Render PAN unreadable wherever stored.', guidance: 'Tokenization; truncation; strong crypto.' },
    { ref: '4.1', title: 'Encrypt Transmission', category: 'Data Protection', description: 'Use strong cryptography to encrypt cardholder data over open networks.', guidance: 'TLS 1.2+; no fallback to weak ciphers.' },
    { ref: '5.1', title: 'Anti-Malware', category: 'Vulnerability Mgmt', description: 'Deploy anti-malware on all systems commonly affected by malware.', guidance: 'EDR; signature + behavioral.' },
    { ref: '6.1', title: 'Vulnerability Scanning', category: 'Vulnerability Mgmt', description: 'Establish a process to identify security vulnerabilities.', guidance: 'Weekly internal; quarterly external scans.' },
    { ref: '6.2', title: 'Patch Management', category: 'Vulnerability Mgmt', description: 'Install critical security patches within one month.', guidance: 'Critical patches within 7 days.' },
    { ref: '7.1', title: 'Least Privilege Access', category: 'Access Control', description: 'Limit access to cardholder data to need-to-know.', guidance: 'RBAC; periodic access review.' },
    { ref: '8.1', title: 'User Identification', category: 'Access Control', description: 'Define and implement policies for user identification.', guidance: 'Unique IDs; shared accounts prohibited.' },
    { ref: '8.2', title: 'Authentication', category: 'Access Control', description: 'Authenticate all access to system components.', guidance: 'MFA for CDE; password complexity.' },
    { ref: '9.1', title: 'Physical Access', category: 'Physical', description: 'Use appropriate facility entry controls.', guidance: 'Badge access; visitor escorts.' },
    { ref: '10.1', title: 'Audit Trails', category: 'Monitoring', description: 'Implement audit trails for all system components.', guidance: 'Log all access to CHD; synchronize time.' },
    { ref: '11.1', title: 'Wireless Scanning', category: 'Testing', description: 'Test for unauthorized wireless access points.', guidance: 'Quarterly wireless scans.' },
    { ref: '11.2', title: 'Internal & External Scans', category: 'Testing', description: 'Run internal and external network vulnerability scans.', guidance: 'ASV scans quarterly.' },
    { ref: '11.3', title: 'Penetration Testing', category: 'Testing', description: 'Perform penetration testing at least annually.', guidance: 'Annual pentest; retest after changes.' },
  ]
  for (const c of pciControls) {
    await db.control.upsert({
      where: { id: `pci-${c.ref}` },
      update: { description: c.description, guidance: c.guidance, category: c.category, frameworkId: pci.id, title: c.title, ref: c.ref },
      create: { id: `pci-${c.ref}`, ...c, frameworkId: pci.id },
    })
  }
  console.log('  ✓ PCI DSS controls:', pciControls.length)

  // ---- NIST CSF controls ----
  const nist = frameworkRecords.find((f) => f.code === 'NIST_CSF')!
  const nistControls = [
    { ref: 'GV.OC-01', title: 'Organizational Context', category: 'Govern', description: 'Cybersecurity risk management activities are informed by organizational mission.', guidance: 'Map cybersecurity to business objectives.' },
    { ref: 'GV.OC-03', title: 'Legal & Regulatory', category: 'Govern', description: 'Legal and regulatory requirements are understood.', guidance: 'Compliance register maintained.' },
    { ref: 'GV.RM-01', title: 'Risk Management Strategy', category: 'Govern', description: 'Risk management strategy is established.', guidance: 'Documented risk appetite and tolerance.' },
    { ref: 'ID.AM-01', title: 'Inventory of Physical Devices', category: 'Identify', description: 'Inventories of physical devices are maintained.', guidance: 'Asset management system; CMDB.' },
    { ref: 'ID.AM-02', title: 'Inventory of Software', category: 'Identify', description: 'Inventories of software platforms and applications are maintained.', guidance: 'Software asset management; SaaS inventory.' },
    { ref: 'ID.RA-01', title: 'Vulnerabilities Identified', category: 'Identify', description: 'Vulnerabilities are identified and documented.', guidance: 'Continuous vuln scanning; CVE tracking.' },
    { ref: 'ID.RA-04', title: 'Potential Impacts', category: 'Identify', description: 'Potential business impacts and likelihoods are identified.', guidance: 'Business impact analysis (BIA).' },
    { ref: 'PR.AA-01', title: 'Identity Verification', category: 'Protect', description: 'Identities are verified before access.', guidance: 'Strong authentication; MFA.' },
    { ref: 'PR.AA-05', title: 'Network Integrity', category: 'Protect', description: 'Network integrity is protected.', guidance: 'Segmentation; micro-segmentation.' },
    { ref: 'PR.DS-01', title: 'Data-at-rest Confidentiality', category: 'Protect', description: 'Confidentiality of data-at-rest is protected.', guidance: 'Encryption; access controls.' },
    { ref: 'PR.DS-02', title: 'Data-in-transit Confidentiality', category: 'Protect', description: 'Confidentiality of data-in-transit is protected.', guidance: 'TLS; VPN; mTLS.' },
    { ref: 'PR.IR-01', title: 'Configuration Baselines', category: 'Protect', description: 'Configuration baselines are established and maintained.', guidance: 'CIS benchmarks; IaC.' },
    { ref: 'DE.CM-01', title: 'Network Monitoring', category: 'Detect', description: 'Networks are monitored to detect anomalies.', guidance: 'IDS/IPS; NDR.' },
    { ref: 'DE.CM-03', title: 'Personnel Activity', category: 'Detect', description: 'Personnel activity is monitored.', guidance: 'UEBA; access logs.' },
    { ref: 'DE.AE-02', title: 'Event Analysis', category: 'Detect', description: 'Events are analyzed to understand targets and methods.', guidance: 'SIEM correlation rules.' },
    { ref: 'RS.MA-01', title: 'Incident Response Plan', category: 'Respond', description: 'IR plan is executed once an incident is declared.', guidance: 'Tested IR plan; clear roles.' },
    { ref: 'RS.AN-01', title: 'Incident Analysis', category: 'Respond', description: 'Incidents are analyzed.', guidance: 'Forensics; root-cause analysis.' },
    { ref: 'RC.RP-01', title: 'Recovery Plan', category: 'Recover', description: 'Recovery plan is executed during incident.', guidance: 'Tested recovery runbooks.' },
  ]
  for (const c of nistControls) {
    await db.control.upsert({
      where: { id: `nist-${c.ref}` },
      update: { description: c.description, guidance: c.guidance, category: c.category, frameworkId: nist.id, title: c.title, ref: c.ref },
      create: { id: `nist-${c.ref}`, ...c, frameworkId: nist.id },
    })
  }
  console.log('  ✓ NIST CSF controls:', nistControls.length)

  // ---- Controls for DPDPA 2023 (India) ----
  const dpdpa = frameworkRecords.find((f) => f.code === 'DPDPA')!
  const dpdpaControls = [
    // Preliminary & Scope
    { ref: 'S.1',   title: 'Short title, extent and commencement', category: 'Preliminary', description: 'Act may be called the Digital Personal Data Protection Act, 2023; extends to whole of India; applies to processing of digital personal data online, and offline digitized data.', guidance: 'Document applicability assessment — confirm which data processing activities fall under DPDPA scope.' },
    { ref: 'S.2',   title: 'Definitions', category: 'Preliminary', description: 'Defines key terms: Data Fiduciary, Data Principal, Personal Data, Processing, Consent, Consent Manager, Data Processor, Significant Data Fiduciary, Harm.', guidance: 'Maintain a glossary mapping internal terminology to DPDPA definitions; ensure data maps use statutory terms.' },
    { ref: 'S.3',   title: 'Application of Act', category: 'Preliminary', description: 'Act applies to processing of digital personal data within India, and outside India where processing is undertaken in connection with offering goods/services to Data Principals in India.', guidance: 'Conduct extraterritorial-scope assessment for any processing of Indian residents\' data overseas.' },

    // Obligations of Data Fiduciary
    { ref: 'S.4',   title: 'Processing of personal data only with consent', category: 'Data Fiduciary Obligations', description: 'Personal data may be processed only for a lawful purpose with consent (or for certain legitimate uses). Consent must be free, specific, informed, and unambiguous.', guidance: 'Capture granular, purpose-specific consent; integrate a Consent Manager API for consent lifecycle management.' },
    { ref: 'S.5',   title: 'Notice requirement', category: 'Data Fiduciary Obligations', description: 'Before collecting personal data, the Data Fiduciary shall give notice to the Data Principal describing the personal data sought, purpose of processing, retention period, rights of Data Principal, and grievance redressal mechanism.', guidance: 'Multi-lingual layered notice at point of collection; privacy policy + just-in-time notices for new processing.' },
    { ref: 'S.6',   title: 'Processing for certain legitimate uses', category: 'Data Fiduciary Obligations', description: 'Permits processing without consent for: voluntary provision of data, state functions, employment, response to medical emergency, disaster, and certain other legitimate uses.', guidance: 'Document and approve each legitimate-use basis; restrict to minimum data necessary; maintain auditable records.' },
    { ref: 'S.7',   title: 'Consent Manager', category: 'Data Fiduciary Obligations', description: 'Consent may be managed through a Consent Manager registered with the Data Protection Board. Consent Manager must be interoperable, transparent, and allow Data Principals to review, withdraw, or manage consent.', guidance: 'Integrate with a Board-registered Consent Manager; expose consent dashboard to users.' },
    { ref: 'S.8',   title: 'General obligations of Data Fiduciary', category: 'Data Fiduciary Obligations', description: 'Data Fiduciary must: comply with all provisions, ensure data accuracy, retain data only as long as necessary, implement reasonable security safeguards (including data breach prevention), and provide grievance redressal mechanism.', guidance: 'Implement data minimization, accuracy controls, retention schedules, and a DSAR/grievance workflow.' },
    { ref: 'S.9',   title: 'Processing of personal data of children', category: 'Special Categories', description: 'Processing of personal data of children (< 18) requires verifiable parental consent. No tracking, behavioral monitoring, targeted advertising, or processing detrimental to children.', guidance: 'Age-assurance mechanism (estimation/verification); parental consent flow; suppress behavioural ads to minors.' },
    { ref: 'S.10',  title: 'Processing of personal data of persons with disabilities', category: 'Special Categories', description: 'Where Data Principal is a person with disability, consent of their lawful guardian is required.', guidance: 'Identify guardian-protected accounts; legal guardian verification workflow.' },
    { ref: 'S.11',  title: 'Processing of certain personal data (Sensitive categories)', category: 'Special Categories', description: 'Data Fiduciary shall not process personal data about the Data Principal\'s health, biometric, genetic, caste, tribe, religious/political beliefs, etc., without consent or for legitimate uses.', guidance: 'Inventory sensitive data fields; require enhanced consent + access controls + DPIA.' },

    // Significant Data Fiduciary
    { ref: 'S.12',  title: 'Significant Data Fiduciary — additional obligations', category: 'SDF Obligations', description: 'Significant Data Fiduciaries must: appoint a Data Protection Officer (DPO), appoint an independent Data Auditor, and conduct periodic Data Protection Impact Assessments (DPIAs) and audits.', guidance: 'Classify organization as SDF based on volume, sensitivity, risk; appoint DPO reporting to board; annual DPIA + audit cycle.' },

    // Rights & Duties of Data Principals
    { ref: 'S.11A', title: 'Right to access information about personal data', category: 'Data Principal Rights', description: 'Data Principal has the right to obtain a summary of personal data processed and the processing activities undertaken.', guidance: 'Self-service privacy portal exposing data inventory and processing summary.' },
    { ref: 'S.12A', title: 'Right to correction and erasure', category: 'Data Principal Rights', description: 'Data Principal has the right to correction, completion, updating, and erasure of personal data, subject to retention requirements.', guidance: 'DSAR fulfillment workflow; deletion across production, backups, and downstream processors.' },
    { ref: 'S.13',  title: 'Right of grievance redressal', category: 'Data Principal Rights', description: 'Data Principal has the right to easily and effectively lodge grievances with the Data Fiduciary and have them resolved within a prescribed period.', guidance: 'Grievance officer + SLA-based ticketing; published contact information.' },
    { ref: 'S.14',  title: 'Right to nominate', category: 'Data Principal Rights', description: 'Data Principal may nominate any other individual to exercise rights in the event of death or incapacity.', guidance: 'Nomination flow in account settings; legal nominee verification process.' },
    { ref: 'S.15',  title: 'Duties of Data Principal', category: 'Data Principal Rights', description: 'Data Principal shall: not register false or frivolous complaints, furnish only verifiably authentic information, and not impersonate another.', guidance: 'Publish duties in privacy notice; verification step during complaint submission.' },

    // Breach Notification & Penalties
    { ref: 'S.8(6)', title: 'Personal data breach — intimation to Board', category: 'Breach Notification', description: 'On becoming aware of a personal data breach, the Data Fiduciary shall intimate the Data Protection Board and affected Data Principals without undue delay.', guidance: 'Breach response playbook; legal+DPO+comms on standby; 72-hour internal SLA for Board intimation.' },
    { ref: 'S.25',  title: 'Penalties for breach of obligations', category: 'Enforcement', description: 'The Data Protection Board may impose monetary penalties up to ₹250 crore per instance for non-compliance with Data Fiduciary obligations, breach notification, and other provisions.', guidance: 'Risk-based compliance monitoring; legal reserve for potential penalties; periodic compliance attestation.' },
    { ref: 'S.33',  title: 'Data Protection Board — composition & powers', category: 'Governance', description: 'Board constituted by Central Government to adjudicate non-compliance, issue directions, and impose penalties.', guidance: 'Track Board orders and precedents; maintain response templates for Board notices.' },

    // Cross-Border Transfer & Exemptions
    { ref: 'S.16',  title: 'Cross-border transfer of personal data', category: 'Transfers', description: 'Personal data may be transferred to any country or territory outside India, except those notified by the Central Government as restricted.', guidance: 'Maintain list of restricted countries; TIA for transfers; ensure SCC-equivalent contractual safeguards.' },
    { ref: 'S.17',  title: 'Exemptions — certain processing', category: 'Exemptions', description: 'Exemptions for: processing by individuals for personal/domestic use, journalistic purposes, research/archival/statistical purposes, and certain startups.', guidance: 'Maintain exemption register; document basis for each claimed exemption; periodic review.' },
    { ref: 'S.18',  title: 'Exemptions — processing by State', category: 'Exemptions', description: 'Processing by the State for sovereignty, integrity, security, friendly relations with foreign states, public order, etc., is exempt from specified provisions.', guidance: 'For state-entity clients, apply exemption register; document statutory basis.' },
  ]
  for (const c of dpdpaControls) {
    await db.control.upsert({
      where: { id: `dpdpa-${c.ref}` },
      update: { description: c.description, guidance: c.guidance, category: c.category, frameworkId: dpdpa.id, title: c.title, ref: c.ref },
      create: { id: `dpdpa-${c.ref}`, ...c, frameworkId: dpdpa.id },
    })
  }
  console.log('  ✓ DPDPA 2023 controls:', dpdpaControls.length)

  // ---- Control Assignments for Acme (sample statuses) ----
  const allControls = await db.control.findMany({ select: { id: true, frameworkId: true } })
  const isoCtlIds = allControls.filter(c => c.frameworkId === iso.id).map(c => c.id)
  const soc2CtlIds = allControls.filter(c => c.frameworkId === soc2.id).map(c => c.id)
  const gdprCtlIds = allControls.filter(c => c.frameworkId === gdpr.id).map(c => c.id)
  const dpdpaCtlIds = allControls.filter(c => c.frameworkId === dpdpa.id).map(c => c.id)

  const statuses = ['compliant', 'implemented', 'in_progress', 'not_started', 'non_compliant']
  let idx = 0
  for (const ctlId of [...isoCtlIds, ...soc2CtlIds, ...gdprCtlIds, ...dpdpaCtlIds]) {
    const status = statuses[idx % statuses.length]
    await db.controlAssignment.upsert({
      where: { tenantId_controlId: { tenantId: tenant.id, controlId: ctlId } },
      update: { status },
      create: { tenantId: tenant.id, controlId: ctlId, status, owner: ['Sarah Mitchell', 'Mark Lee', 'Priya Sharma', 'Tom Reyes'][idx % 4] },
    })
    idx++
  }
  console.log('  ✓ Control assignments for Acme:', idx)

  // ---- Sample Evidence ----
  const sampleEvidence = [
    { title: 'Information Security Policy v3.2', description: 'Approved ISMS policy document signed by CISO.', type: 'file', fileName: 'IS-Policy-v3.2.pdf', mimeType: 'application/pdf', fileSize: 482103, controlId: 'iso-A.5.1', tags: 'policy,isms', status: 'approved' },
    { title: 'Q3 Security Awareness Training Records', description: 'Training completion report from LMS for Q3.', type: 'file', fileName: 'training-report-q3.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileSize: 156872, controlId: 'iso-A.6.3', tags: 'training,awareness', status: 'approved' },
    { title: 'Privileged Access Management Dashboard', description: 'Live PAM tool dashboard showing JIT elevation requests.', type: 'link', fileUrl: 'https://pam.acme.com/dashboard', linkTitle: 'PAM Console', controlId: 'iso-A.8.2', tags: 'access,pam', status: 'active' },
    { title: 'Vulnerability Scan Report — Week 38', description: 'Tenable weekly vulnerability scan export.', type: 'file', fileName: 'tenable-w38.pdf', mimeType: 'application/pdf', fileSize: 923481, controlId: 'iso-A.8.8', tags: 'vuln,scan', status: 'active' },
    { title: 'Backup Restore Test — Sept 2024', description: 'Quarterly restore test results.', type: 'file', fileName: 'restore-test-sept2024.pdf', mimeType: 'application/pdf', fileSize: 234120, controlId: 'iso-A.8.13', tags: 'backup,dr', status: 'approved' },
    { title: 'SIEM Alerting Runbook', description: 'Internal SOC runbook for SIEM alert triage.', type: 'link', fileUrl: 'https://wiki.acme.com/soc/siem-runbook', linkTitle: 'SOC Wiki — SIEM Runbook', controlId: 'iso-A.8.16', tags: 'siem,soc', status: 'active' },
    { title: 'Code Review Policy', description: 'Peer review policy enforced via GitHub branch protection.', type: 'file', fileName: 'code-review-policy.pdf', mimeType: 'application/pdf', fileSize: 89234, controlId: 'soc2-CC8.1', tags: 'development,review', status: 'approved' },
    { title: 'Privacy Policy (Public)', description: 'Customer-facing privacy policy.', type: 'link', fileUrl: 'https://acme.com/privacy', linkTitle: 'acme.com/privacy', controlId: 'gdpr-Art.13', tags: 'privacy,policy', status: 'active' },
    { title: 'ROPA Workbook', description: 'Records of Processing Activities maintained in shared workbook.', type: 'file', fileName: 'ropa-2024.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileSize: 412300, controlId: 'gdpr-Art.30', tags: 'ropa,gdpr', status: 'active' },
    { title: 'DPDPA Consent Manager Integration Spec', description: 'Architecture spec for Consent Manager API integration (DPDPA S.7).', type: 'file', fileName: 'consent-manager-spec.pdf', mimeType: 'application/pdf', fileSize: 187320, controlId: 'dpdpa-S.7', tags: 'dpdpa,consent', status: 'approved' },
    { title: 'India Privacy Notice (DPDPA-compliant)', description: 'Customer-facing privacy notice drafted per DPDPA S.5 notice requirements.', type: 'link', fileUrl: 'https://acme.com/india-privacy', linkTitle: 'acme.com/india-privacy', controlId: 'dpdpa-S.5', tags: 'dpdpa,notice', status: 'active' },
  ]
  for (const e of sampleEvidence) {
    await db.evidence.create({
      data: { ...e, tenantId: tenant.id, uploadedById: complianceOfficer.id },
    })
  }
  console.log('  ✓ Sample evidence:', sampleEvidence.length)

  // ---- Sample Vulnerabilities ----
  const vulns = [
    { title: 'Apache Log4j vulnerable to RCE', description: 'Log4Shell (CVE-2021-44228) detected on app servers.', severity: 'critical', status: 'open', cvss: 10.0, cve: 'CVE-2021-44228', asset: 'app-prod-01', assignedTo: 'Tom Reyes' },
    { title: 'Outdated TLS 1.0 on load balancer', description: 'TLS 1.0 still enabled on public load balancer.', severity: 'medium', status: 'in_progress', cvss: 5.3, asset: 'lb-edge-01', assignedTo: 'Tom Reyes' },
    { title: 'SQL injection in search API', description: 'Parameterized queries not used on /api/search.', severity: 'high', status: 'resolved', cvss: 8.6, asset: 'api-gateway', assignedTo: 'Tom Reyes' },
    { title: 'Default credentials on dev database', description: 'root/root still set on dev MySQL.', severity: 'high', status: 'open', cvss: 9.1, asset: 'db-dev-01', assignedTo: 'Tom Reyes' },
    { title: 'Missing security headers', description: 'X-Frame-Options and CSP missing on marketing site.', severity: 'low', status: 'closed', cvss: 3.7, asset: 'marketing-site' },
    { title: 'Open S3 bucket with PII', description: 'Bucket acme-uploads publicly readable.', severity: 'critical', status: 'resolved', cvss: 9.8, asset: 's3-acme-uploads', assignedTo: 'Tom Reyes' },
  ]
  for (const v of vulns) {
    await db.vulnerability.create({ data: { ...v, tenantId: tenant.id } })
  }
  console.log('  ✓ Sample vulnerabilities:', vulns.length)

  // ---- Sample Risks ----
  const risks = [
    { title: 'Ransomware attack on production systems', description: 'Risk of ransomware encrypting core production databases.', category: 'cyber', likelihood: 3, impact: 5, treatment: 'mitigate', owner: 'Sarah Mitchell', status: 'treating' },
    { title: 'Insider data exfiltration', description: 'Risk of privileged user exfiltrating customer data.', category: 'cyber', likelihood: 2, impact: 5, treatment: 'mitigate', owner: 'Sarah Mitchell', status: 'monitored' },
    { title: 'GDPR non-compliance fine', description: 'Risk of regulatory fine for GDPR violation.', category: 'compliance', likelihood: 2, impact: 5, treatment: 'mitigate', owner: 'Mark Lee', status: 'treating' },
    { title: 'Third-party supplier breach', description: 'Risk of supplier breach impacting our data.', category: 'operational', likelihood: 3, impact: 4, treatment: 'transfer', owner: 'Mark Lee', status: 'monitored' },
    { title: 'Cloud service outage', description: 'Risk of multi-hour cloud outage affecting availability.', category: 'operational', likelihood: 2, impact: 4, treatment: 'accept', owner: 'Sarah Mitchell', status: 'identified' },
    { title: 'Phishing of finance team', description: 'Risk of BEC attack on finance.', category: 'cyber', likelihood: 4, impact: 4, treatment: 'mitigate', owner: 'Sarah Mitchell', status: 'treating' },
    { title: 'Key talent departure', description: 'Risk of single point of failure from key engineer leaving.', category: 'strategic', likelihood: 3, impact: 3, treatment: 'mitigate', owner: 'Sarah Mitchell', status: 'monitored' },
    { title: 'PCI audit failure', description: 'Risk of failing annual PCI assessment.', category: 'compliance', likelihood: 2, impact: 4, treatment: 'mitigate', owner: 'Mark Lee', status: 'treating' },
  ]
  for (const r of risks) {
    await db.risk.create({ data: { ...r, tenantId: tenant.id, inherentScore: r.likelihood * r.impact, residualScore: Math.max(1, Math.round((r.likelihood * r.impact) * 0.5)) } })
  }
  console.log('  ✓ Sample risks:', risks.length)

  // ---- Sample Policies ----
  const policies = [
    { title: 'Information Security Policy', category: 'access_control', content: 'This policy establishes the framework for protecting information assets...', version: '3.2', status: 'published', owner: 'Sarah Mitchell', approvedBy: 'Sarah Mitchell' },
    { title: 'Acceptable Use Policy', category: 'access_control', content: 'Defines acceptable use of company systems and data...', version: '2.1', status: 'published', owner: 'Mark Lee', approvedBy: 'Sarah Mitchell' },
    { title: 'Data Classification Policy', category: 'data_protection', content: 'Classifies data into Public, Internal, Confidential, Restricted...', version: '1.5', status: 'published', owner: 'Mark Lee', approvedBy: 'Sarah Mitchell' },
    { title: 'Incident Response Plan', category: 'incident', content: 'Outlines procedures for detecting, responding to, and recovering from security incidents...', version: '4.0', status: 'published', owner: 'Sarah Mitchell', approvedBy: 'Sarah Mitchell' },
    { title: 'Vendor Risk Management Policy', category: 'access_control', content: 'Defines requirements for third-party vendor security assessment...', version: '1.2', status: 'draft', owner: 'Mark Lee' },
    { title: 'Remote Work Security Policy', category: 'access_control', content: 'Defines security requirements for remote workers...', version: '2.0', status: 'published', owner: 'Sarah Mitchell', approvedBy: 'Sarah Mitchell' },
  ]
  for (const p of policies) {
    await db.policy.create({ data: { ...p, tenantId: tenant.id, approvedAt: p.status === 'published' ? new Date() : null, effectiveAt: p.status === 'published' ? new Date() : null, reviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } })
  }
  console.log('  ✓ Sample policies:', policies.length)

  // ---- Sample Audits ----
  const audit = await db.audit.create({
    data: {
      tenantId: tenant.id,
      title: 'ISO 27001 Internal Audit 2024',
      type: 'internal',
      frameworkId: iso.id,
      status: 'in_progress',
      lead: 'Priya Sharma',
      scope: 'All ISO 27001 controls in Annex A',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      tasks: {
        create: [
          { title: 'Review ISMS policy documentation', status: 'done', assigneeId: auditor.id, order: 1 },
          { title: 'Interview CISO on risk management', status: 'in_progress', assigneeId: auditor.id, order: 2 },
          { title: 'Sample access reviews for 5 systems', status: 'todo', assigneeId: auditor.id, order: 3, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
          { title: 'Verify backup restore test evidence', status: 'todo', assigneeId: auditor.id, order: 4, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
          { title: 'Walk-through of physical security at HQ', status: 'todo', assigneeId: auditor.id, order: 5, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          { title: 'Compile audit findings report', status: 'todo', assigneeId: auditor.id, order: 6, dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000) },
        ],
      },
    },
  })
  console.log('  ✓ Sample audit with 6 tasks')

  // ---- Sample Checklist ----
  const checklist = await db.checklist.create({
    data: {
      tenantId: tenant.id,
      frameworkId: iso.id,
      title: 'ISO 27001 Readiness Self-Assessment',
      description: 'Self-assessment checklist to verify readiness for ISO 27001 certification audit.',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { question: 'Is your Information Security Policy approved by management?', hint: 'Refer to A.5.1', type: 'yes_no', order: 1 },
          { question: 'Are information security roles and responsibilities documented?', hint: 'Refer to A.5.2', type: 'yes_no', order: 2 },
          { question: 'Do you conduct background checks on new hires?', hint: 'Refer to A.6.1', type: 'yes_no', order: 3 },
          { question: 'Is security awareness training delivered annually?', hint: 'Refer to A.6.3', type: 'yes_no', order: 4 },
          { question: 'Are data centers protected with multi-factor physical access?', hint: 'Refer to A.7.1', type: 'yes_no', order: 5 },
          { question: 'Is MFA enforced for all remote access?', hint: 'Refer to A.8.5', type: 'yes_no', order: 6 },
          { question: 'Are vulnerability scans run at least weekly?', hint: 'Refer to A.8.8', type: 'yes_no', order: 7 },
          { question: 'Are backups tested for restore quarterly?', hint: 'Refer to A.8.13', type: 'yes_no', order: 8 },
          { question: 'Rate your overall ISMS maturity (1-5).', hint: '1 = ad-hoc, 5 = optimized', type: 'rating', order: 9 },
          { question: 'Describe your top 3 security improvement initiatives.', hint: 'Free text', type: 'text', order: 10 },
        ],
      },
    },
  })
  console.log('  ✓ Sample checklist with 10 items')

  // ---- Globex Health Systems: HIPAA Checklist ----
  const globexHipaaChecklist = await db.checklist.create({
    data: {
      tenantId: tenant2.id,
      frameworkId: hipaa.id,
      title: 'HIPAA Security Rule Compliance Assessment',
      description: 'Assess compliance with HIPAA Security Rule requirements for electronic protected health information (ePHI).',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      items: {
        create: [
          { question: 'Have you conducted a Security Risk Assessment (SRA) in the past 12 months?', hint: 'HIPAA 45 CFR §164.308(a)(1)(ii)(A)', type: 'yes_no', order: 1 },
          { question: 'Are policies and procedures for safeguarding ePHI documented and reviewed annually?', hint: 'HIPAA 45 CFR §164.316(a)', type: 'yes_no', order: 2 },
          { question: 'Is access to ePHI limited to authorized workforce members via role-based access controls?', hint: 'HIPAA 45 CFR §164.312(a)(1)', type: 'yes_no', order: 3 },
          { question: 'Are all transmissions of ePHI encrypted in transit (TLS 1.2+)?', hint: 'HIPAA 45 CFR §164.312(e)(1)', type: 'yes_no', order: 4 },
          { question: 'Is ePHI encrypted at rest using AES-256 or equivalent?', hint: 'HIPAA 45 CFR §164.312(a)(2)(iv)', type: 'yes_no', order: 5 },
          { question: 'Are audit logs maintained for all systems containing ePHI?', hint: 'HIPAA 45 CFR §164.312(b)', type: 'yes_no', order: 6 },
          { question: 'Do you have a Business Associate Agreement (BAA) with all vendors handling ePHI?', hint: 'HIPAA 45 CFR §164.502(e)', type: 'yes_no', order: 7 },
          { question: 'Is workforce security awareness training completed annually with documented attendance?', hint: 'HIPAA 45 CFR §164.308(a)(5)', type: 'yes_no', order: 8 },
          { question: 'Rate the maturity of your incident response plan (1-5).', hint: '1 = no plan, 5 = tested & optimized', type: 'rating', order: 9 },
          { question: 'Describe your process for managing security incidents involving ePHI.', hint: 'Free text — include detection, reporting, and mitigation steps', type: 'text', order: 10 },
        ],
      },
    },
  })
  console.log('  ✓ Globex HIPAA checklist with 10 items')

  // ---- Sample Clients (tenant-scoped under Acme) ----
  const sampleClients = [
    { name: 'Northwind Trading Co.', country: 'United States', state: 'California', city: 'San Francisco' },
    { name: 'Contoso Pharmaceuticals', country: 'United Kingdom', state: 'England', city: 'London' },
    { name: 'Fabrikam FinServe Pvt Ltd', country: 'India', state: 'Karnataka', city: 'Bengaluru' },
  ]
  const clientRecords: { id: string; name: string }[] = []
  for (const c of sampleClients) {
    // upsert by tenantId + name (no natural unique key besides id); use findFirst
    // to make this section idempotent across re-seeds.
    const existing = await db.client.findFirst({ where: { tenantId: tenant.id, name: c.name } })
    if (existing) {
      clientRecords.push(existing)
    } else {
      const created = await db.client.create({ data: { ...c, tenantId: tenant.id } })
      clientRecords.push(created)
    }
  }
  console.log('  ✓ Sample clients:', clientRecords.length)

  // ---- Sample Certificates (mix of frameworks + urgency states) ----
  // Date helpers — relative to "now" so the dashboard "Expiring Soon" widget
  // always has something to show across the 0-30 / 31-60 / >60d buckets.
  const DAYS = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)
  const [northwind, contoso, fabrikam] = clientRecords

  const sampleCertificates = [
    {
      clientId: northwind.id,
      complianceFramework: 'ISO 27001',
      certificationVendor: 'BSI',
      auditingPartner: 'KPMG',
      certificateNumber: 'IS-2024-NW-001',
      registrationDate: DAYS(-400),
      certificationDate: DAYS(-365),
      nextAuditDate: DAYS(20),         // ≤30d → red (danger) on dashboard
      firstReminderDate: DAYS(-15),
      secondAuditDate: DAYS(15),
      secondReminderDate: DAYS(-5),
      recertificationValidity: DAYS(0),
      nearestUpcomingDate: DAYS(15),
      alertMessage: 'Stage 2 audit scheduled — evidence pack due in 5 days',
      status: 'Active',
      emailRecipients: 'compliance@northwind.example, auditor@kpmg.example',
      notes: 'Scope: US production environment + DR site. Surveillance audit #1.',
      certificateLink: 'https://example.com/certs/northwind-iso27001-2024.pdf',
      priceInr: 1850000,
      priceUsd: 22300,
    },
    {
      clientId: northwind.id,
      complianceFramework: 'SOC 2 Type II',
      certificationVendor: 'AICPA',
      auditingPartner: 'EY',
      certificateNumber: 'SOC2-NW-2024-002',
      registrationDate: DAYS(-300),
      certificationDate: DAYS(-280),
      nextAuditDate: DAYS(85),         // >60d → green (success) on dashboard
      firstReminderDate: DAYS(30),
      secondAuditDate: DAYS(80),
      secondReminderDate: DAYS(45),
      recertificationValidity: DAYS(85),
      nearestUpcomingDate: DAYS(45),   // ≤60d → amber (warning) on dashboard
      alertMessage: null,
      status: 'Active',
      emailRecipients: 'soc2@northwind.example, audit@ey.example',
      notes: 'Trust Services Criteria: Security, Availability, Confidentiality.',
      certificateLink: 'https://example.com/certs/northwind-soc2-2024.pdf',
      priceInr: 2400000,
      priceUsd: 28900,
    },
    {
      clientId: contoso.id,
      complianceFramework: 'ISO 27001',
      certificationVendor: 'DNV',
      auditingPartner: 'BDO',
      certificateNumber: 'IS-2023-CT-014',
      registrationDate: DAYS(-700),
      certificationDate: DAYS(-680),
      nextAuditDate: DAYS(-12),        // overdue → red (danger) on dashboard
      firstReminderDate: DAYS(-60),
      secondAuditDate: DAYS(-30),
      secondReminderDate: DAYS(-45),
      recertificationValidity: DAYS(-12),
      nearestUpcomingDate: DAYS(-12),
      alertMessage: 'Recertification audit overdue — escalate to CISO',
      status: 'Active',
      emailRecipients: 'iso27001@contoso.example, audit@bdo.example',
      notes: 'Three-year certificate expires soon. Recertification scope being finalised.',
      certificateLink: 'https://example.com/certs/contoso-iso27001-2023.pdf',
      priceInr: 3120000,
      priceUsd: 37500,
    },
    {
      clientId: contoso.id,
      complianceFramework: 'GDPR',
      certificationVendor: '—',
      auditingPartner: 'DPO Office',
      certificateNumber: 'GDPR-CT-2024-DPIA-007',
      registrationDate: DAYS(-180),
      certificationDate: DAYS(-160),
      nextAuditDate: DAYS(120),
      firstReminderDate: DAYS(75),
      secondAuditDate: DAYS(110),
      secondReminderDate: DAYS(90),
      recertificationValidity: DAYS(365),
      nearestUpcomingDate: DAYS(75),   // >60d → green on dashboard
      alertMessage: null,
      status: 'Active',
      emailRecipients: 'dpo@contoso.example',
      notes: 'Annual DPIA review for the EU customer data processing register.',
      certificateLink: null,
      priceInr: 450000,
      priceUsd: 5400,
    },
    {
      clientId: fabrikam.id,
      complianceFramework: 'PCI DSS',
      certificationVendor: 'PCI SSC',
      auditingPartner: 'PwC',
      certificateNumber: 'PCI-FAB-2024-Q4-003',
      registrationDate: DAYS(-90),
      certificationDate: DAYS(-75),
      nextAuditDate: DAYS(288),
      firstReminderDate: DAYS(240),
      secondAuditDate: DAYS(280),
      secondReminderDate: DAYS(255),
      recertificationValidity: DAYS(290),
      nearestUpcomingDate: DAYS(240),
      alertMessage: null,
      status: 'Active',
      emailRecipients: 'pci@fabrikam.example, qsa@pwc.example',
      notes: 'QSA-led assessment for cardholder data environment (CDE).',
      certificateLink: 'https://example.com/certs/fabrikam-pci-2024.pdf',
      priceInr: 980000,
      priceUsd: 11800,
    },
    {
      clientId: fabrikam.id,
      complianceFramework: 'ISO 27017',
      certificationVendor: 'TUV Nord',
      auditingPartner: 'Deloitte',
      certificateNumber: 'IS-27017-FAB-2024-005',
      registrationDate: DAYS(-220),
      certificationDate: DAYS(-200),
      nextAuditDate: DAYS(50),         // ≤60d → amber (warning) on dashboard
      firstReminderDate: DAYS(15),
      secondAuditDate: DAYS(40),
      secondReminderDate: DAYS(25),
      recertificationValidity: DAYS(165),
      nearestUpcomingDate: DAYS(50),
      alertMessage: 'Cloud security controls Annex A.15 evidence collection in progress',
      status: 'Active',
      emailRecipients: 'cloud-security@fabrikam.example',
      notes: 'Cloud security extension to ISO 27001 — joint audit with parent ISO 27001 cert.',
      certificateLink: 'https://example.com/certs/fabrikam-iso27017-2024.pdf',
      priceInr: 720000,
      priceUsd: 8650,
    },
  ]

  const certificateRecords: { id: string; clientId: string; emailRecipients: string | null }[] = []
  for (const cert of sampleCertificates) {
    // Idempotency: match on tenantId + clientId + certificateNumber (when set)
    const existing = cert.certificateNumber
      ? await db.certificate.findFirst({
          where: { tenantId: tenant.id, clientId: cert.clientId, certificateNumber: cert.certificateNumber },
        })
      : null
    if (existing) {
      certificateRecords.push({ id: existing.id, clientId: existing.clientId, emailRecipients: existing.emailRecipients })
    } else {
      const created = await db.certificate.create({
        data: {
          ...cert,
          tenantId: tenant.id,
          createdById: complianceOfficer.id,
          alertMessage: cert.alertMessage ?? null,
          certificateLink: cert.certificateLink ?? null,
          notes: cert.notes ?? null,
          emailRecipients: cert.emailRecipients ?? null,
          certificationVendor: cert.certificationVendor || null,
          auditingPartner: cert.auditingPartner || null,
          certificateNumber: cert.certificateNumber || null,
          priceInr: cert.priceInr ?? null,
          priceUsd: cert.priceUsd ?? null,
        },
      })
      certificateRecords.push({ id: created.id, clientId: created.clientId, emailRecipients: created.emailRecipients })
    }
  }
  console.log('  ✓ Sample certificates:', certificateRecords.length)

  // ---- Sample Reminder Logs (one manual log per certificate that has recipients) ----
  // Demonstrates the ReminderLog table and gives the "Reminder History" panel
  // in CertificateDetailsDialog something to render on first login.
  for (const cert of certificateRecords) {
    const existing = await db.reminderLog.findFirst({ where: { certificateId: cert.id } })
    if (existing) continue
    const hasRecipients = cert.emailRecipients && cert.emailRecipients.trim().length > 0
    await db.reminderLog.create({
      data: {
        certificateId: cert.id,
        reminderType: 'manual',
        recipients: cert.emailRecipients,
        status: hasRecipients ? 'sent' : 'failed',
        errorMessage: hasRecipients ? null : 'No valid email recipients configured for this certificate',
        sentAt: DAYS(-7),
      },
    })
  }
  console.log('  ✓ Sample reminder logs (1 per certificate)')

  // ---- Sample Project (ISO 27001 implementation with Gantt-style tasks) ----
  // Demonstrates the Work Tracker / Gantt view with a realistic ISO 27001
  // implementation project across multiple phases.
  const existingProject = await db.project.findFirst({ where: { tenantId: tenant.id, title: 'ISO 27001:2022 Implementation — Acme Corp' } })
  let projectRecord = existingProject
  if (!projectRecord) {
    projectRecord = await db.project.create({
      data: {
        tenantId: tenant.id,
        title: 'ISO 27001:2022 Implementation — Acme Corp',
        type: 'iso_27001',
        clientName: 'Acme Corporation',
        lead: 'Sarah Mitchell',
        startDate: DAYS(-14),
        endDate: DAYS(120),
        status: 'in_progress',
        notes: 'Full ISMS implementation leading to ISO 27001:2022 certification.',
        createdById: complianceOfficer.id,
      },
    })

    const projectTasks = [
      // Phase 1: Project Initiation
      { phase: 'Project Initiation', title: 'Kickoff Meeting', description: 'Define scope, objectives, stakeholders', owner: 'CISO / Project Manager', ownerName: 'Sarah Mitchell', startDate: DAYS(-14), endDate: DAYS(-14), deliverables: 'Project Charter', progress: 100, order: 1 },
      { phase: 'Project Initiation', title: 'Define ISMS Scope', description: 'Document the boundaries of the ISMS', owner: 'ISMS Team', ownerName: 'Mark Lee', startDate: DAYS(-13), endDate: DAYS(2), deliverables: 'ISMS Scope Document', progress: 100, order: 2 },
      { phase: 'Project Initiation', title: 'Stakeholder Identification', description: 'Identify all interested parties', owner: 'ISMS Team', ownerName: 'Mark Lee', startDate: DAYS(-10), endDate: DAYS(-5), deliverables: 'Stakeholder Register', progress: 100, order: 3 },

      // Phase 2: Gap Assessment
      { phase: 'Gap Assessment', title: 'Current State Assessment', description: 'Assess current security posture against ISO 27001', owner: 'ISMS Team', ownerName: 'Priya Sharma', startDate: DAYS(-3), endDate: DAYS(10), deliverables: 'Gap Assessment Report', progress: 75, order: 4 },
      { phase: 'Gap Assessment', title: 'Risk Assessment Methodology', description: 'Define the risk assessment approach', owner: 'CISO', ownerName: 'Sarah Mitchell', startDate: DAYS(5), endDate: DAYS(12), deliverables: 'Risk Assessment Methodology', progress: 50, order: 5 },

      // Phase 3: Planning
      { phase: 'Planning', title: 'Risk Treatment Plan', description: 'Document risk treatment decisions', owner: 'ISMS Team', ownerName: 'Mark Lee', startDate: DAYS(15), endDate: DAYS(30), deliverables: 'Risk Treatment Plan (RTP)', progress: 25, order: 6 },
      { phase: 'Planning', title: 'Statement of Applicability', description: 'Document applicable controls from Annex A', owner: 'ISMS Team', ownerName: 'Mark Lee', startDate: DAYS(20), endDate: DAYS(35), deliverables: 'Statement of Applicability (SoA)', progress: 10, order: 7 },

      // Phase 4: Risk Management
      { phase: 'Risk Management', title: 'Asset Identification', description: 'Identify and classify information assets', owner: 'IT Team', ownerName: 'Tom Reyes', startDate: DAYS(25), endDate: DAYS(45), deliverables: 'Asset Register', progress: 0, order: 8 },
      { phase: 'Risk Management', title: 'Risk Assessment Workshop', description: 'Conduct risk assessment with stakeholders', owner: 'ISMS Team', ownerName: 'Priya Sharma', startDate: DAYS(40), endDate: DAYS(50), deliverables: 'Risk Register', progress: 0, order: 9 },

      // Phase 5: Documentation
      { phase: 'Documentation', title: 'ISMS Policy Drafting', description: 'Draft high-level ISMS policies', owner: 'Compliance', ownerName: 'Mark Lee', startDate: DAYS(45), endDate: DAYS(70), deliverables: 'ISMS Policy Set', progress: 0, order: 10 },
      { phase: 'Documentation', title: 'Procedures & Work Instructions', description: 'Draft operational procedures', owner: 'IT Team', ownerName: 'Tom Reyes', startDate: DAYS(55), endDate: DAYS(85), deliverables: 'Procedure Documents', progress: 0, order: 11 },

      // Phase 6: Implementation
      { phase: 'Implementation', title: 'Control Implementation', description: 'Implement the selected controls', owner: 'IT Team', ownerName: 'Tom Reyes', startDate: DAYS(70), endDate: DAYS(105), deliverables: 'Implemented Controls', progress: 0, order: 12 },
      { phase: 'Implementation', title: 'Security Awareness Training', description: 'Train all staff on ISMS policies', owner: 'HR + Security', ownerName: 'Sarah Mitchell', startDate: DAYS(85), endDate: DAYS(100), deliverables: 'Training Records', progress: 0, order: 13 },

      // Phase 7: Internal Audit
      { phase: 'Internal Audit', title: 'Internal Audit Execution', description: 'Conduct internal ISMS audit', owner: 'Audit Team', ownerName: 'Priya Sharma', startDate: DAYS(100), endDate: DAYS(115), deliverables: 'Internal Audit Report', progress: 0, order: 14 },
      { phase: 'Internal Audit', title: 'Management Review', description: 'Present audit findings to management', owner: 'CISO', ownerName: 'Sarah Mitchell', startDate: DAYS(115), endDate: DAYS(120), deliverables: 'Management Review Minutes', progress: 0, order: 15 },
    ]

    for (const t of projectTasks) {
      const days = Math.max(1, Math.ceil((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24)))
      await db.projectTask.create({
        data: { ...t, projectId: projectRecord.id, days },
      })
    }
  }
  console.log('  ✓ Sample project (ISO 27001 implementation) with 15 tasks across 7 phases')

  // ---- Notifications ----
  await db.notification.createMany({
    data: [
      { tenantId: tenant.id, userId: tenantAdmin.id, title: 'Audit due soon', message: 'ISO 27001 internal audit ends in 14 days.', type: 'warning' },
      { tenantId: tenant.id, userId: complianceOfficer.id, title: 'Evidence review needed', message: '3 evidence items awaiting approval.', type: 'info' },
      { tenantId: tenant.id, userId: tenantAdmin.id, title: 'Critical vulnerability open', message: 'Log4Shell remains unresolved on app-prod-01.', type: 'error' },
    ],
  })
  console.log('  ✓ Sample notifications (3)')

  console.log('\n✅ Seed complete.')
  console.log('   Super Admin: superadmin@isecurify.com / Admin@123')
  console.log('   Tenant Admin: sarah.mitchell@acme.com / Tenant@123')
  console.log('   Compliance: mark.lee@acme.com / Tenant@123')
  console.log('   Auditor: priya.sharma@acme.com / Tenant@123')
  console.log('   Employee: tom.reyes@acme.com / Tenant@123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
