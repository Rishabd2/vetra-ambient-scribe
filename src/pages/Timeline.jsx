import { useMemo } from 'react'
import { Card } from '../ui.jsx'

// Clinic Timeline — one chronological event stream across the whole clinic.
// Proves workflow continuity: call → patient → SOAP → follow-up → invoice.
// Events are DERIVED from the same store data every other page uses (no new
// dataset), so the timeline stays consistent with the rest of the dashboard.

const KIND = {
  call:     { label: 'Call',      dot: 'bg-slate-400' },
  live:     { label: 'Live call', dot: 'bg-pine' },
  soap:     { label: 'SOAP note', dot: 'bg-pine' },
  approved: { label: 'Approved',  dot: 'bg-pine' },
  followup: { label: 'Follow-up', dot: 'bg-amber-400' },
  invoice:  { label: 'Invoice',   dot: 'bg-ink' },
  booked:   { label: 'Appointment', dot: 'bg-slate-400' },
}

export default function Timeline({ store }) {
  const events = useMemo(() => buildEvents(store), [store])

  return (
    <div className="fade-up max-w-3xl">
      <p className="text-sm text-sage mb-5">
        Every clinic event in one stream — how each call becomes a documented, billed, followed-up record.
      </p>
      <Card className="p-5">
        <ol className="relative border-l border-line ml-2">
          {events.map((e, i) => {
            const k = KIND[e.kind] || KIND.call
            return (
              <li key={i} className="ml-5 pb-5 last:pb-0 relative">
                <span className={`absolute -left-[1.42rem] top-1 w-2.5 h-2.5 rounded-full ${k.dot} ${e.kind === 'live' ? 'live-dot' : ''} ring-2 ring-cream`} />
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-sage">{k.label}</span>
                  {e.tag && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cream border border-line text-sage">{e.tag}</span>}
                  <span className="text-[11px] text-sage/70 ml-auto font-mono">{e.when}</span>
                </div>
                <div className="text-sm text-ink mt-0.5">{e.title}</div>
                {e.detail && <div className="text-[12.5px] text-sage mt-0.5">{e.detail}</div>}
              </li>
            )
          })}
          {events.length === 0 && <li className="ml-5 text-sage text-sm">No events yet.</li>}
        </ol>
      </Card>
    </div>
  )
}

function buildEvents(store) {
  const out = []
  const t = (iso) => (iso ? new Date(iso) : new Date())

  ;(store.visits || []).forEach((v) => {
    const who = `${v.patient?.name || 'Patient'} · ${v.patient?.owner?.name || ''}`.trim()
    if (v.status === 'live') {
      out.push({ kind: 'live', at: t(v.startedAt), title: `Live visit — ${who}`, detail: v.visitType, tag: 'in progress' })
    } else {
      out.push({ kind: 'soap', at: t(v.startedAt), title: `SOAP note drafted — ${who}`, detail: v.visitType, tag: 'Draft' })
      if (v.status === 'reviewed') {
        out.push({ kind: 'approved', at: t(v.reviewedAt || v.startedAt), title: `SOAP approved — ${who}`, detail: `by ${v.reviewedBy || 'Dr. Martinez'}`, tag: 'Reviewed' })
      }
      ;(v.followups || []).forEach((f) =>
        out.push({ kind: 'followup', at: t(v.startedAt), title: f.label, detail: `${who} · ${f.owner} · due ${f.due}`, tag: f.done ? 'Done' : 'Scheduled' }),
      )
      if (v.invoice) {
        const total = (v.invoice.lines || []).reduce((s, l) => s + l.qty * l.price, 0) * (1 + (v.invoice.taxRate || 0))
        out.push({ kind: 'invoice', at: t(v.startedAt), title: `Invoice ${v.invoice.status === 'finalized' ? 'finalized' : 'drafted'} — ${who}`, detail: `$${total.toFixed(2)}`, tag: v.invoice.status === 'finalized' ? 'Finalized' : 'Draft' })
      }
    }
  })

  ;(store.calls || []).slice(0, 12).forEach((c) => {
    out.push({
      kind: c.live ? 'live' : c.booked ? 'booked' : 'call',
      at: t(c.receivedAt),
      title: c.live ? `Live call — ${c.pet.name} · ${c.caller.name}` : `Call — ${c.pet.name} · ${c.caller.name}`,
      detail: c.booked ? `Booked ${c.booked.kind} · ${c.booked.date} ${c.booked.time}` : c.reason,
      tag: c.live ? 'live' : c.status === 'reviewed' ? 'Reviewed' : 'Needs action',
    })
  })

  return out
    .sort((a, b) => b.at - a.at)
    .map((e) => ({ ...e, when: e.at.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) }))
    .slice(0, 40)
}
