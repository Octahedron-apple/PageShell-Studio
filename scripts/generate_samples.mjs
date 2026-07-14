// Generates sample binary files for PageShell Studio's public/samples/ directory
// Run: nix-shell -p nodejs --run "node scripts/generate_samples.mjs"

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/samples');
mkdirSync(OUT, { recursive: true });

// ── 1. financial_data.xlsx ──────────────────────────────────────────────────
console.log('Generating financial_data.xlsx...');

const wb = XLSX.utils.book_new();

// Summary sheet
const summaryData = [
  ['Company', 'Acme Corp'],
  ['Fiscal Year', '2024'],
  ['Currency', 'USD'],
  [],
  ['Quarter', 'Revenue', 'Expenses', 'Net Profit', 'Profit Margin'],
  ['Q1', 84800, 61200, 23600, '27.8%'],
  ['Q2', 124900, 89300, 35600, '28.5%'],
  ['Q3', 99300, 72100, 27200, '27.4%'],
  ['Q4', 172400, 121600, 50800, '29.5%'],
  [],
  ['Annual Total', 481400, 344200, 137200, '28.5%'],
];
const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

// Monthly breakdown sheet
const monthlyData = [
  ['Month', 'Revenue', 'Expenses', 'Net Profit', 'Department', 'Region'],
  ['January',  12400, 9100, 3300, 'Sales', 'North'],
  ['February', 15300, 10800, 4500, 'Sales', 'North'],
  ['March',    11800, 8700, 3100, 'Marketing', 'South'],
  ['April',    18200, 12900, 5300, 'Sales', 'East'],
  ['May',      21000, 14800, 6200, 'Engineering', 'West'],
  ['June',     19500, 13900, 5600, 'Sales', 'North'],
  ['July',     16800, 12100, 4700, 'Marketing', 'East'],
  ['August',   14900, 10800, 4100, 'Sales', 'South'],
  ['September',17300, 12400, 4900, 'Engineering', 'West'],
  ['October',  25600, 17900, 7700, 'Sales', 'North'],
  ['November', 28300, 19800, 8500, 'Sales', 'East'],
  ['December', 31200, 21800, 9400, 'All Depts',  'Global'],
];
const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyData);
XLSX.utils.book_append_sheet(wb, monthlySheet, 'Monthly Breakdown');

// Employee performance sheet
const empData = [
  ['Employee ID', 'Name', 'Department', 'Quota', 'Achieved', 'Attainment %'],
  ['E001', 'Alice Johnson', 'Sales',       150000, 178200, '118.8%'],
  ['E002', 'Bob Martinez',  'Sales',       150000, 142600, '95.1%'],
  ['E003', 'Carol Lee',     'Engineering', 120000, 134900, '112.4%'],
  ['E004', 'David Kim',     'Marketing',   100000, 98300,  '98.3%'],
  ['E005', 'Eva Patel',     'Sales',       150000, 165700, '110.5%'],
];
const empSheet = XLSX.utils.aoa_to_sheet(empData);
XLSX.utils.book_append_sheet(wb, empSheet, 'Employee Performance');

const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync(join(OUT, 'financial_data.xlsx'), xlsxBuffer);
console.log('✅ financial_data.xlsx written');

// ── 2. company_policy.docx ──────────────────────────────────────────────────
console.log('Generating company_policy.docx...');

const policyText = `ACME CORP — EMPLOYEE HANDBOOK & COMPANY POLICY
Effective Date: January 1, 2024
Last Revised: October 15, 2024

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 1 — CODE OF CONDUCT

1.1 Professionalism
All employees are expected to maintain a high standard of professionalism in all
interactions with colleagues, clients, and vendors. This includes respectful
communication, punctuality, and adherence to deadlines.

1.2 Conflict of Interest
Employees must disclose any personal or financial interests that could conflict with
the interests of Acme Corp. No employee may engage in outside employment that
directly competes with company operations.

1.3 Confidentiality
All proprietary information, client data, trade secrets, and internal communications
must be kept strictly confidential. Unauthorized disclosure may result in immediate
termination and legal action.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 2 — REMOTE WORK POLICY

2.1 Eligibility
Full-time employees who have completed a minimum of 90 days of employment may
be eligible for remote work arrangements, subject to manager approval.

2.2 Equipment & Security
Remote employees are responsible for maintaining a secure and professional work
environment. All company-issued devices must use full-disk encryption and connect
to corporate systems via the approved VPN client.

2.3 Availability
Remote employees must be reachable during core business hours (9 AM – 5 PM in
their local time zone) and must attend all scheduled video calls with camera enabled.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 3 — LEAVE & BENEFITS

3.1 Paid Time Off
Full-time employees accrue 1.25 days of PTO per month (15 days per year). PTO
balances roll over up to a maximum of 30 days. Employees with more than 30 days
of accrued PTO will have excess hours forfeited at year-end.

3.2 Sick Leave
Employees receive 10 days of paid sick leave per calendar year. Sick leave does not
roll over and cannot be converted to cash at separation.

3.3 Parental Leave
Primary caregivers are eligible for 16 weeks of fully paid parental leave. Secondary
caregivers are eligible for 4 weeks. Leave must be taken within 12 months of the
qualifying event (birth, adoption, or foster placement).

3.4 Health Benefits
Acme Corp covers 80% of employee health insurance premiums and 50% of dependent
premiums. Dental and vision plans are available on a voluntary basis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 4 — PERFORMANCE REVIEWS

4.1 Review Cycle
Formal performance reviews are conducted annually in December, with a mid-year
check-in in June. Managers provide written feedback and employees may submit a
self-evaluation.

4.2 Compensation Adjustments
Merit-based salary increases are tied to annual performance ratings:
  - Exceeds Expectations:   5% – 8% increase
  - Meets Expectations:     2% – 4% increase
  - Needs Improvement:      0% (performance improvement plan initiated)

4.3 Promotion Criteria
Promotions are based on performance, tenure, demonstrated skill growth, and
business need. Employees eligible for promotion must be nominated by their manager
and reviewed by the HR committee.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION 5 — ACCEPTABLE USE OF TECHNOLOGY

5.1 Company Devices
Company-issued devices may be used for limited personal activities provided they do
not interfere with work responsibilities, violate security policies, or consume
excessive bandwidth.

5.2 AI & Automation Tools
Employees may use approved AI productivity tools. Any AI-generated content submitted
as deliverables must be reviewed and verified by the responsible employee. Employees
remain fully accountable for AI-assisted outputs.

5.3 Data Privacy
Customer data may not be entered into third-party AI services or external cloud
tools unless those services have been reviewed and approved by the IT Security team.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Acknowledgment: Employees must sign and return the acknowledgment form within
their first week of employment. Failure to do so may delay access to company systems.

Questions? Contact hr@acmecorp.example.com
`;

// Build minimal valid DOCX (a ZIP with required XML parts)
const zip = new JSZip();

zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

const paras = policyText.split('\n').map(line => {
  const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<w:p><w:r><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
}).join('\n');

zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
${paras}
  </w:body>
</w:document>`);

zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

const docxBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(join(OUT, 'company_policy.docx'), docxBuffer);
console.log('✅ company_policy.docx written');

console.log('\nAll sample files generated in public/samples/');
