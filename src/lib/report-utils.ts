/**
 * report-utils.ts
 * PDF report via window.print() (no deps) + document manifest download
 */

import { formatAmount } from '@/lib/utils'
import type { Lead } from '@/types/lead'

// ── Field config ───────────────────────────────────────────────────────────────

export type ReportField =
  | 'customer_info'
  | 'loan_details'
  | 'lead_status'
  | 'workflow_summary'
  | 'cibil'
  | 'assigned_agent'
  | 'notes'
  | 'documents_summary'

export const REPORT_FIELDS: { id: ReportField; label: string; description: string }[] = [
  { id: 'customer_info',    label: 'Customer Info',      description: 'Name, phone, email, district' },
  { id: 'loan_details',     label: 'Loan Details',        description: 'Type, requested, eligible, bank' },
  { id: 'lead_status',      label: 'Lead Status',         description: 'Status, stage, progress' },
  { id: 'workflow_summary', label: 'Workflow Summary',    description: 'All 6 steps with status' },
  { id: 'cibil',            label: 'CIBIL Score',         description: 'Score, source, verified status' },
  { id: 'assigned_agent',   label: 'Assigned Agent',      description: 'Agent, team leader, assignee' },
  { id: 'notes',            label: 'Notes',               description: 'Latest 5 notes' },
  { id: 'documents_summary','label': 'Documents Summary', description: 'Checklist with status' },
]

// ── HTML generator ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  completed:   '#16a34a',
  in_progress: '#2563eb',
  pending:     '#6b7280',
  rejected:    '#D91B24',
  on_hold:     '#d97706',
  verified:    '#16a34a',
  uploaded:    '#2563eb',
}

function badge(text: string, color = '#6b7280') {
  return `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:999px;padding:1px 8px;font-size:10px;font-weight:700">${text}</span>`
}

function section(title: string, content: string) {
  return `
    <div style="margin-bottom:24px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#888;border-bottom:1px solid #E0E0E0;padding-bottom:5px;margin-bottom:12px">${title}</div>
      ${content}
    </div>`
}

function grid(...items: string[]) {
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${items.join('')}</div>`
}

function field(label: string, value: string | number | null | undefined) {
  if (!value && value !== 0) return ''
  return `<div><div style="font-size:10px;color:#888;text-transform:uppercase;margin-bottom:2px">${label}</div><div style="font-size:13px;font-weight:600;color:#171717">${value}</div></div>`
}

function amountField(label: string, val: number | null | undefined) {
  if (!val && val !== 0) return ''
  return `<div><div style="font-size:10px;color:#888;text-transform:uppercase;margin-bottom:2px">${label}</div><div style="font-size:13px;font-weight:700;color:#D91B24">${formatAmount(val)}</div></div>`
}

export function generateReportHTML(lead: Lead, fields: ReportField[]): string {
  const has = (f: ReportField) => fields.includes(f)
  const now = new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const sections: string[] = []

  // Customer Info
  if (has('customer_info')) {
    sections.push(section('Customer Information', grid(
      field('Full Name', lead.name),
      field('Phone', lead.phone),
      field('Email', lead.email),
      field('District', lead.district),
      field('Lead Code', lead.leadCode ?? '—'),
      field('Lead ID', lead.id),
    )))
  }

  // Loan Details
  if (has('loan_details')) {
    sections.push(section('Loan Details', grid(
      field('Loan Type', lead.loanType),
      amountField('Requested Amount', lead.amount),
      field('Bank', lead.bank),
      field('Category', lead.loanCategory ?? '—'),
    )))
  }

  // Lead Status
  if (has('lead_status')) {
    sections.push(section('Lead Status', grid(
      field('Status', lead.status),
      field('Pipeline Stage', lead.adminStatus),
      field('Progress', `${lead.progress}%`),
      field('Stage', lead.stage),
      field('Created', lead.createdAt),
    )))
  }

  // Workflow Summary
  if (has('workflow_summary')) {
    const steps = lead.workflowSteps.map((s) => {
      const color = STATUS_COLORS[s.status] ?? '#6b7280'
      const lastEntry = [...s.history].reverse()[0]
      return `
        <tr>
          <td style="padding:6px 8px;font-size:12px;font-weight:600;color:#171717">${s.stepName}</td>
          <td style="padding:6px 8px">${badge(s.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), color)}</td>
          <td style="padding:6px 8px;font-size:11px;color:#555">${lastEntry?.remarks || '—'}</td>
        </tr>`
    }).join('')

    sections.push(section('Workflow Summary', `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:6px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Step</th>
          <th style="padding:6px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Status</th>
          <th style="padding:6px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Last Remark</th>
        </tr></thead>
        <tbody>${steps}</tbody>
      </table>`))
  }

  // CIBIL
  if (has('cibil')) {
    const score = lead.cibilScore ?? lead.cibil
    const scoreColor = score >= 750 ? '#16a34a' : score >= 650 ? '#d97706' : '#D91B24'
    sections.push(section('CIBIL Score', grid(
      `<div><div style="font-size:10px;color:#888;text-transform:uppercase;margin-bottom:2px">CIBIL Score</div><div style="font-size:22px;font-weight:900;color:${scoreColor}">${score || '—'}</div></div>`,
      field('Source', lead.cibilSource?.toUpperCase() ?? 'Not fetched'),
      field('Verified', lead.cibilVerified ? '✓ Verified' : 'Not verified'),
      field('Updated', lead.cibilUpdatedAt ?? '—'),
    )))
  }

  // Assigned Agent
  if (has('assigned_agent')) {
    sections.push(section('Agent Information', grid(
      field('Agent', lead.agent),
      field('Team Leader', lead.teamLeader),
      field('Assigned To', lead.assignedUser ?? 'Unassigned'),
      field('Source', lead.source),
      field('Source Code', lead.sourceCode),
    )))
  }

  // Notes
  if (has('notes') && lead.notes.length) {
    const noteRows = lead.notes.slice(-5).reverse().map((n) =>
      `<tr>
        <td style="padding:5px 8px;font-size:11px;color:#555">${n.time}</td>
        <td style="padding:5px 8px;font-size:11px;color:#171717">${n.author}</td>
        <td style="padding:5px 8px;font-size:11px;color:#171717">${n.text}</td>
      </tr>`
    ).join('')
    sections.push(section('Notes (Latest 5)', `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:5px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase;white-space:nowrap">Time</th>
          <th style="padding:5px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Author</th>
          <th style="padding:5px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Note</th>
        </tr></thead>
        <tbody>${noteRows}</tbody>
      </table>`))
  }

  // Documents Summary
  if (has('documents_summary') && lead.checklist.length) {
    const docRows = lead.checklist.map((c) => {
      const color = STATUS_COLORS[c.status] ?? '#6b7280'
      return `<tr>
        <td style="padding:5px 8px;font-size:12px;color:#171717">${c.name}</td>
        <td style="padding:5px 8px">${badge(c.status, color)}</td>
        <td style="padding:5px 8px;font-size:11px;color:#555">${c.uploadedAt ?? '—'}</td>
        <td style="padding:5px 8px;font-size:11px;color:#D91B24">${c.rejectedReason ?? ''}</td>
      </tr>`
    }).join('')
    sections.push(section('Documents Checklist', `
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:5px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Document</th>
          <th style="padding:5px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Status</th>
          <th style="padding:5px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Uploaded</th>
          <th style="padding:5px 8px;text-align:left;font-size:10px;color:#888;text-transform:uppercase">Note</th>
        </tr></thead>
        <tbody>${docRows}</tbody>
      </table>`))
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Lead Report — ${lead.id}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 32px; color: #171717; background: #fff; font-size: 13px; line-height: 1.5; }
  @media print {
    body { padding: 16px; }
    .no-print { display: none !important; }
    @page { margin: 1.5cm; }
  }
</style>
</head>
<body>
  <!-- Print button -->
  <div class="no-print" style="margin-bottom:20px">
    <button onclick="window.print()" style="background:#D91B24;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:13px;font-weight:700;cursor:pointer">
      Print / Save as PDF
    </button>
    <button onclick="window.close()" style="margin-left:8px;background:#f5f5f5;color:#555;border:1px solid #E0E0E0;border-radius:8px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer">
      Close
    </button>
  </div>

  <!-- Header -->
  <div style="border-bottom:2px solid #D91B24;padding-bottom:16px;margin-bottom:24px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#D91B24">FinServe OS · Lead Report</div>
        <h1 style="font-size:22px;font-weight:900;margin:4px 0 0;color:#171717">${lead.name}</h1>
        <div style="font-size:12px;color:#888;margin-top:2px">${lead.id} ${lead.leadCode ? `· ${lead.leadCode}` : ''} · ${lead.loanType}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:#888">Generated</div>
        <div style="font-size:12px;font-weight:600;color:#171717">${now}</div>
        <div style="margin-top:6px">${badge(lead.status, '#D91B24')}</div>
      </div>
    </div>
  </div>

  ${sections.join('')}

  <!-- Footer -->
  <div style="border-top:1px solid #E0E0E0;padding-top:12px;margin-top:24px;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
    <span>FinServe OS · Confidential · For internal use only</span>
    <span>${lead.id} · ${now}</span>
  </div>
</body>
</html>`
}

// ── Print PDF ──────────────────────────────────────────────────────────────────

export function printLeadReport(lead: Lead, fields: ReportField[]) {
  const html = generateReportHTML(lead, fields)
  const w = window.open('', '_blank', 'width=900,height=720')
  if (!w) { alert('Allow pop-ups to generate PDF'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  // small delay lets styles render before print dialog opens
  setTimeout(() => w.print(), 600)
}

// ── Document manifest CSV download ────────────────────────────────────────────

export function downloadDocumentManifest(lead: Lead) {
  const header = 'Document Name,Status,Uploaded At,File Size (KB),Rejected Reason\n'
  const rows = lead.checklist.map((c) => [
    `"${c.name}"`,
    c.status,
    c.uploadedAt ? `"${c.uploadedAt}"` : '',
    c.fileSize ? String(Math.round(c.fileSize / 1024)) : '',
    c.rejectedReason ? `"${c.rejectedReason}"` : '',
  ].join(',')).join('\n')

  const csv = header + rows
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Lead_${lead.id}_Documents.csv`
  a.click()
  URL.revokeObjectURL(url)
}
