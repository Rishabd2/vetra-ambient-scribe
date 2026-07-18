import { useMemo } from 'react'
import { Card } from '../ui.jsx'

// Analytics — defensible operational metrics only (no invented revenue or
// clinical-outcome claims). Everything is COUNTED from the live store data.

export default function Analytics({ store }) {
  const m = useMemo(() => compute(store), [store])

  return (
    <div className="space-y-5 fade-up">
      <p className="text-sm text-sage">Operational metrics for the current session — counts derived from live call and visit data.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric value={m.callsHandled} label="Calls handled" sub={`${m.live} live now`} />
        <Metric value={m.booked} label="Appointments booked" sub="from calls" />
        <Metric value={m.escalations} label="Escalations" sub="urgent / emergency" />
        <Metric value={m.notesDrafted} label="Notes drafted" sub={`${m.notesApproved} approved`} />
        <Metric value={m.reviewRate} label="Review rate" sub="notes approved" />
        <Metric value={m.followupsDone + '/' + m.followupsTotal} label="Follow-ups done" sub="across visits" />
        <Metric value={m.invoicesDraft} label="Invoices drafted" sub={`${m.invoicesFinal} finalized`} />
        <Metric value={m.needsAction} label="Needs action" sub="open queue" />
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-3">Call outcomes</h3>
        <div className="space-y-2.5">
          <Bar label="Booked" value={m.booked} total={m.callsHandled} tone="bg-pine" />
          <Bar label="Reviewed / resolved" value={m.reviewed} total={m.callsHandled} tone="bg-slate-400" />
          <Bar label="Needs action" value={m.needsAction} total={m.callsHandled} tone="bg-amber-400" />
        </div>
        <p className="text-[11.5px] text-sage mt-4">
          Metrics reflect the current dashboard session and are intended to demonstrate the workflow, not to make clinical or financial claims.
        </p>
      </Card>
    </div>
  )
}

function compute(store) {
  const calls = store.calls || []
  const visits = store.visits || []
  const callsHandled = calls.length
  const live = calls.filter((c) => c.live).length
  const booked = calls.filter((c) => c.booked).length
  const escalations = calls.filter((c) => c.urgency === 'urgent' || c.urgency === 'emergency').length
  const reviewed = calls.filter((c) => c.status === 'reviewed').length
  const needsAction = calls.filter((c) => c.status === 'needs_action').length
  const notesDrafted = visits.filter((v) => v.status !== 'live').length
  const notesApproved = visits.filter((v) => v.status === 'reviewed').length
  const followupsTotal = visits.reduce((s, v) => s + (v.followups?.length || 0), 0)
  const followupsDone = visits.reduce((s, v) => s + (v.followups?.filter((f) => f.done).length || 0), 0)
  const invoicesDraft = visits.filter((v) => v.invoice && v.invoice.status !== 'finalized').length
  const invoicesFinal = visits.filter((v) => v.invoice && v.invoice.status === 'finalized').length
  const reviewRate = notesDrafted ? `${Math.round((notesApproved / notesDrafted) * 100)}%` : '—'
  return { callsHandled, live, booked, escalations, reviewed, needsAction, notesDrafted, notesApproved, followupsTotal, followupsDone, invoicesDraft, invoicesFinal, reviewRate }
}

function Metric({ value, label, sub }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-semibold tabular">{value}</div>
      <div className="text-[12.5px] text-ink mt-0.5">{label}</div>
      <div className="text-[11px] text-sage mt-0.5">{sub}</div>
    </Card>
  )
}

function Bar({ label, value, total, tone }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-[12.5px] mb-1">
        <span className="text-ink">{label}</span>
        <span className="text-sage font-mono">{value} · {pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-cream overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
