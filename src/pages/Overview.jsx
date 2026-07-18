import { Card, SectionLabel, UrgencyBadge, Avatar, Button } from '../ui.jsx'
import { fmtMoney, fmtTime, fmtDay } from '../data.js'

const MAX_QUEUE = 3
const MAX_APPTS = 5

export default function Overview({ store }) {
  const { calls, appointments, dashboardDate } = store

  const covered = calls.filter((c) => c.coverage === 'covered').reduce((s, c) => s + c.estValue, 0)
  const atRisk = calls.filter((c) => c.coverage === 'at_risk').reduce((s, c) => s + c.estValue, 0)
  const missed = calls.filter((c) => c.coverage === 'missed').reduce((s, c) => s + c.estValue, 0)
  const total = covered + atRisk + missed
  const pct = (value) => (total > 0 ? Math.round((value / total) * 100) : 0)
  const width = (value) => `${total > 0 ? (value / total) * 100 : 0}%`

  const needsAction = calls
    .filter((c) => c.status === 'needs_action')
    .sort((a, b) => ({ emergency: 0, urgent: 1, routine: 2 }[a.urgency] - { emergency: 0, urgent: 1, routine: 2 }[b.urgency]))

  const todayAppts = appointments.filter((a) => a.date === dashboardDate).sort((a, b) => a.time.localeCompare(b.time))
  const booked = calls.filter((c) => c.booked).length
  const escalated = calls.filter((c) => c.handoffTo || c.urgency === 'emergency').length
  const latestEmergency = calls.find((c) => c.urgency === 'emergency')

  return (
    <div className="space-y-6 fade-up">
      {/* KPI tiles — the numbers that matter, one per tile */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Captured · 24h" value={fmtMoney(covered)} sub={`${pct(covered)}% of demand`} dot="bg-pine" tone="text-ink" />
          <Kpi label="At risk" value={fmtMoney(atRisk)} sub="needs action now" dot="bg-amber-400" tone="text-amber-700" />
          <Kpi label="Missed" value={fmtMoney(missed)} sub={`${pct(missed)}% slipped`} dot="bg-red-400" tone="text-red-700" />
          <Kpi label="Calls handled" value={calls.length} sub={`${booked} booked · ${escalated} escalated`} dot="bg-pine" tone="text-ink" />
        </div>
        {/* one subtle proportion bar — captured / at-risk / missed */}
        {total > 0 && (
          <div className="mt-4 h-1.5 rounded-full overflow-hidden flex bg-line" title={`Captured ${fmtMoney(covered)} · At risk ${fmtMoney(atRisk)} · Missed ${fmtMoney(missed)}`}>
            <div className="bg-pine" style={{ width: width(covered) }} />
            <div className="bg-amber-400" style={{ width: width(atRisk) }} />
            <div className="bg-red-400" style={{ width: width(missed) }} />
          </div>
        )}
      </div>

      {/* Work area — what needs you, and what's on today */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Needs action queue */}
        <Card className="lg:col-span-3 p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <SectionLabel>Needs action</SectionLabel>
              <div className="text-sm text-sage mt-1">{needsAction.length} calls waiting on your team</div>
            </div>
            <Button variant="ghost" onClick={() => store.setView('calls')}>View all →</Button>
          </div>
          <div className="divide-y divide-line">
            {needsAction.slice(0, MAX_QUEUE).map((c) => {
              const open = (c.nextActions || []).filter((a) => !a.done)
              return (
                <div
                  key={c.id}
                  onClick={() => store.openCall(c.id)}
                  className="px-5 py-3.5 hover:bg-cream transition-colors flex items-center gap-3.5 cursor-pointer"
                >
                  <Avatar name={c.pet.name} species={c.pet.species} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{c.pet.name}</span>
                      <span className="text-[12px] text-sage truncate">· {c.caller.name}</span>
                      <UrgencyBadge level={c.urgency} />
                    </div>
                    <div className="text-[12.5px] text-sage truncate mt-1">{c.reason}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {open.length > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); store.openActions(c.id) }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 text-[11px] font-medium hover:bg-amber-100 transition-colors"
                        title="View & manage action items"
                      >
                        ⚡ {open.length} action{open.length > 1 ? 's' : ''}
                      </button>
                    )}
                    {c.estValue > 0 && <div className="font-mono text-[11px] text-amber-700 mt-1">{fmtMoney(c.estValue)} at risk</div>}
                  </div>
                </div>
              )
            })}
            {needsAction.length === 0 && (
              <div className="px-5 py-10 text-center text-sage text-sm">
                Queue is clear — nothing waiting on your team.
              </div>
            )}
            {needsAction.length > MAX_QUEUE && (
              <button onClick={() => store.setView('calls')} className="w-full px-5 py-2.5 text-[12px] text-pine hover:bg-cream transition-colors text-left">
                + {needsAction.length - MAX_QUEUE} more in Calls →
              </button>
            )}
          </div>
        </Card>

        {/* Today's schedule */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <div>
              <SectionLabel>Today’s calendar</SectionLabel>
              <div className="text-sm text-sage mt-1">{todayAppts.length} appointments</div>
            </div>
            <Button variant="ghost" onClick={() => store.setView('calendar')}>Open →</Button>
          </div>
          <div className="px-5 pb-5 space-y-2">
            {todayAppts.slice(0, MAX_APPTS).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-line bg-cream/50">
                <div className="font-mono text-[12px] text-pine font-medium w-12 tabular">{a.time}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{a.pet} <span className="text-sage font-normal">· {a.owner}</span></div>
                  <div className="text-[12px] text-sage truncate">{a.kind}</div>
                </div>
                {a.source === 'agent' && (
                  <span className="text-[10px] font-mono bg-pine-light text-pine px-1.5 py-0.5 rounded-full shrink-0">AI</span>
                )}
              </div>
            ))}
            {todayAppts.length > MAX_APPTS && (
              <button onClick={() => store.setView('calendar')} className="w-full pt-1 text-[12px] text-pine hover:underline text-left">
                + {todayAppts.length - MAX_APPTS} more →
              </button>
            )}
            {todayAppts.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-cream/40 px-4 py-8 text-center text-sm text-sage">
                No appointments booked for today yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Emergency handoff — compact banner, not a wall */}
      {latestEmergency && (
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SectionLabel>Latest emergency handoff</SectionLabel>
                <span className="font-mono text-[11px] text-sage">{fmtDay(latestEmergency.receivedAt)} {fmtTime(latestEmergency.receivedAt)}</span>
              </div>
              <div className="text-sm font-medium mt-1.5">{latestEmergency.pet.name} <span className="text-sage font-normal">· {latestEmergency.caller.name}</span></div>
              <p className="text-[12.5px] text-sage leading-relaxed mt-1 line-clamp-2">{latestEmergency.summary}</p>
              <div className="mt-2.5 flex items-center gap-1.5 font-mono text-[10px] text-sage flex-wrap">
                <Step>Answered</Step><Sep /><Step>context saved</Step><Sep /><Step>{latestEmergency.referral?.sent ? 'referral sent' : 'team queued'}</Step>
              </div>
            </div>
            <Button variant="ghost" onClick={() => store.openCall(latestEmergency.id)} className="shrink-0">View →</Button>
          </div>
        </Card>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, dot, tone = 'text-ink' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5">
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sage">{label}</div>
      </div>
      <div className={`mt-2 text-2xl font-semibold tabular tracking-tight ${tone}`}>{value}</div>
      <div className="text-[11px] text-sage mt-0.5 truncate">{sub}</div>
    </Card>
  )
}

function Step({ children }) {
  return <span className="text-pine">{children}</span>
}
function Sep() {
  return <span className="text-sage/50">→</span>
}
