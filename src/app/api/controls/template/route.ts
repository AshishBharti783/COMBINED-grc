import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

// GET /api/controls/template?framework=ISO27001|SOC2|GDPR|HIPAA|PCI_DSS|NIST_CSF|generic
// Returns a CSV template with the right headers + example rows for the requested framework.
// The user downloads this, fills it in, and re-uploads via the existing /api/controls/import route.
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const framework = (searchParams.get('framework') || 'generic').toUpperCase()

  // CSV header row — matches the fields accepted by /api/controls/import
  const headers = ['ref', 'title', 'description', 'category', 'guidance', 'order']

  // Example rows tailored to each framework's control style
  const examples: Record<string, string[][]> = {
    ISO27001: [
      ['5.1', 'Policies for information security', 'Management direction and support for information security in accordance with business requirements and relevant laws and regulations.', 'Organizational', 'Define, approve, publish, and communicate an information security policy.', '1'],
      ['5.2', 'Information security roles and responsibilities', 'All information security responsibilities should be defined and allocated.', 'Organizational', 'Allocate responsibilities for information security risks to defined roles.', '2'],
      ['A.5.12', 'Classification of information', 'Information should be classified according to its information security needs.', 'Asset Management', 'Develop and implement an information classification scheme.', '3'],
      ['A.5.15', 'Access control', 'Access to information and other associated assets should be restricted.', 'Access Control', 'Establish rules for access to systems and data.', '4'],
      ['A.8.1', 'User endpoint devices', 'Information stored on, processed by, or accessible via user endpoint devices should be protected.', 'Asset Management', 'Document and implement controls for endpoint devices.', '5'],
      ['A.8.16', 'Monitoring activities', 'Networks, systems, and applications should be monitored for anomalous behavior.', 'Operations Security', 'Define what needs to be monitored and the frequency of reviews.', '6'],
    ],
    SOC2: [
      ['CC1.1', 'Control Environment - Integrity and Ethical Values', 'The entity demonstrates commitment to integrity and ethical values.', 'Control Environment', 'Establish tone at the top and a code of conduct.', '1'],
      ['CC1.2', 'Board Independence', 'The board of directors demonstrates independence from management.', 'Control Environment', 'Ensure board oversight of the system of internal control.', '2'],
      ['CC2.1', 'Internal Communication', 'The entity obtains or generates and uses relevant, quality information.', 'Communication', 'Establish communication channels for internal control matters.', '3'],
      ['CC3.1', 'Risk Identification', 'The entity specifies objectives with sufficient clarity.', 'Risk Assessment', 'Define business and reporting objectives.', '4'],
      ['CC4.1', 'Monitoring Activities', 'The entity selects, develops, and performs ongoing evaluations.', 'Monitoring', 'Establish ongoing evaluations to ascertain whether controls are present and functioning.', '5'],
      ['CC6.1', 'Logical and Physical Access Controls', 'The entity implements logical access security software, infrastructure, and architectures.', 'Access', 'Restrict logical and physical access to information assets.', '6'],
    ],
    GDPR: [
      ['Art.5', 'Principles relating to processing of personal data', 'Personal data shall be processed lawfully, fairly, and in a transparent manner.', 'Data Processing', 'Document the lawful basis for each processing activity.', '1'],
      ['Art.6', 'Lawfulness of processing', 'Processing shall be lawful only if at least one of the legal bases applies.', 'Data Processing', 'Identify and record the legal basis for processing.', '2'],
      ['Art.7', 'Conditions for consent', 'Conditions for consent must be satisfied.', 'Data Subject Rights', 'Implement mechanisms to obtain and record consent.', '3'],
      ['Art.9', 'Processing of special categories of personal data', 'Processing of special categories of personal data is prohibited unless exceptions apply.', 'Data Processing', 'Identify and protect special category data.', '4'],
      ['Art.12', 'Transparent information', 'The controller shall provide information on processing in a concise, transparent, and easily accessible form.', 'Transparency', 'Prepare privacy notices in plain language.', '5'],
      ['Art.15', 'Right of access by the data subject', 'The data subject shall have the right to obtain confirmation of processing.', 'Data Subject Rights', 'Establish a process for handling access requests.', '6'],
    ],
    HIPAA: [
      ['164.308(a)(1)', 'Security Management Process', 'Implement policies and procedures to prevent, detect, contain, and correct security violations.', 'Administrative Safeguards', 'Conduct an accurate and thorough risk analysis.', '1'],
      ['164.308(a)(3)', 'Workforce Security', 'Implement policies and procedures to ensure all workforce members have appropriate access.', 'Administrative Safeguards', 'Define workforce clearance and access levels.', '2'],
      ['164.308(a)(4)', 'Information Access Management', 'Implement policies and procedures for authorizing access to ePHI.', 'Administrative Safeguards', 'Establish access provisioning and de-provisioning procedures.', '3'],
      ['164.310(a)(1)', 'Facility Access Controls', 'Implement policies and procedures to limit physical access to electronic information systems.', 'Physical Safeguards', 'Define facility access controls and visitor management.', '4'],
      ['164.312(a)(1)', 'Access Control', 'Implement technical policies and procedures for electronic information systems.', 'Technical Safeguards', 'Implement unique user identification and emergency access.', '5'],
      ['164.312(b)', 'Audit Controls', 'Implement hardware, software, and procedural mechanisms that record and examine activity.', 'Technical Safeguards', 'Establish audit logging and review procedures.', '6'],
    ],
    PCI_DSS: [
      ['1.1.1', 'Security policy and operational procedures', 'Establish, document, and maintain security policies and procedures for protecting cardholder data.', 'Network Security', 'Maintain a current network diagram and firewall configuration standards.', '1'],
      ['2.1', 'Change vendor defaults', 'Always change vendor-supplied defaults and remove or disable unnecessary default accounts.', 'Configuration', 'Document hardening standards for each system component.', '2'],
      ['3.1', 'Minimize storage of cardholder data', 'Keep cardholder data storage to a minimum.', 'Data Protection', 'Define data retention and disposal procedures.', '3'],
      ['4.1', 'Encrypt transmission of cardholder data', 'Transmit cardholder data over open, public networks using strong cryptography.', 'Encryption', 'Use TLS 1.2+ for all cardholder data transmission.', '4'],
      ['5.1', 'Deploy anti-malware solutions', 'Deploy anti-virus software on all systems commonly affected by malware.', 'Malware Protection', 'Ensure anti-virus is actively running and signatures are current.', '5'],
      ['6.1', 'Establish secure systems and applications', 'Establish a process to identify security vulnerabilities and rank them by risk.', 'Application Security', 'Define a vulnerability management process and remediation SLAs.', '6'],
    ],
    NIST_CSF: [
      ['GV.OC-01', 'Organizational Context - Mission', 'The organizational mission is understood and informs cybersecurity needs.', 'Govern', 'Document the organizational mission and how cybersecurity supports it.', '1'],
      ['GV.RM-01', 'Risk Management Strategy', 'Risk management objectives are established and agreed to by stakeholders.', 'Govern', 'Define the risk management strategy and risk appetite.', '2'],
      ['ID.AM-01', 'Asset Inventory', 'Inventories of hardware managed by the organization are maintained.', 'Identify', 'Maintain a complete hardware asset inventory.', '3'],
      ['ID.RA-01', 'Risk Assessment', 'Vulnerabilities in assets are identified and documented.', 'Identify', 'Conduct regular vulnerability assessments.', '4'],
      ['PR.AC-01', 'Identity and Credential Management', 'Identities and credentials are issued, managed, verified, revoked, and audited.', 'Protect', 'Implement an identity and access management lifecycle.', '5'],
      ['DE.CM-01', 'Continuous Monitoring', 'Networks and network communications are monitored to detect cybersecurity events.', 'Detect', 'Deploy network monitoring tools and define alert thresholds.', '6'],
    ],
    generic: [
      ['CTRL-001', 'Example Control Title', 'A brief description of what this control requires.', 'Security', 'Implementation guidance for the control.', '1'],
      ['CTRL-002', 'Another Control', 'Description of the second example control.', 'Access Control', 'How to implement this control in practice.', '2'],
      ['CTRL-003', 'Third Example', 'Description of the third example control.', 'Operations', 'Practical steps to meet this control.', '3'],
    ],
  }

  const rows = examples[framework] || examples.generic

  // Build CSV with proper escaping
  function csvEscape(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return '"' + val.replace(/"/g, '""') + '"'
    }
    return val
  }

  const csvLines = [
    headers.join(','),
    ...rows.map(r => r.map(csvEscape).join(',')),
  ]
  const csv = csvLines.join('\n')

  const filename = `${framework.toLowerCase().replace(/[^a-z0-9]/g, '_')}_controls_template.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
