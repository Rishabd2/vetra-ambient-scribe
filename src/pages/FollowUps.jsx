import { Card, SectionLabel, ChannelIcon } from '../ui.jsx'
import { fmtTime, fmtDay } from '../data.js'

export default function FollowUps({ store }) {
  const { followups } = store
  const sent = followups.flatMap((f) => f.steps).filter((s) => s.status === 'sent').length
  const scheduled = followups.flatMap((f) => f.steps).filter((s) => s.status === 'scheduled').length

  // Visit-derived to-dos (generated from each SOAP Plan).
  const visitTasks = (store.visits || []).flatMap((v) =>
    (v.followups || []).map((f) => ({ ...f, visitId: v.id, pet: v.patient.name, owner_: v.patient.owner.name })),
  )
  const openTasks = visitTasks.filter((t) => !t.done).length

  return (
    <div className="space-y-6 fade-up">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-sage">
        <span><span className="font-semibold text-ink tabular">{openTasks}</span> open visit tasks</span>
        <span><span className="font-semibold text-ink tabular">{sent}</span> messages sent</span>
        <span><span className="font-semibold text-ink tabular">{scheduled}</span> scheduled</span>
      </div>

      {/* Visit-derived to-dos */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage px-1 mb-2">From today&apos;s visits</div>
        <Card className="divide-y divide-line">
          {visitTasks.length === 0 && <div className="px-5 py-8 text-center text-sage text-sm">No visit follow-ups yet.</div>}
          {visitTasks.map((t) => (
            <label key={t.id} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-cream transition-colors">
              <input type="checkbox" checked={t.done} onChange={() => store.toggleFollowup(t.visitId, t.id)} className="accent-pine w-4 h-4" />
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${t.done ? 'line-through text-sage' : 'text-ink'}`}>{t.label}</div>
                <div className="text-[11px] text-sage">{t.pet} · {t.owner} · due {t.due}</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-sage shrink-0">
                <ChannelIcon channel={t.channel} /> {t.channel}
              </span>
            </label>
          ))}
        </Card>
      </div>

      {/* Automated messaging sequences (existing) */}
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage px-1 mb-2">Automated messaging sequences</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {followups.map((f) => (
          <Card key={f.id} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <SectionLabel>Sequence</SectionLabel>
                <button
                  onClick={() => f.callId && store.openCall(f.callId)}
                  className="block text-left text-sm font-medium mt-1 hover:text-pine transition-colors break-words"
                >
                  {f.petOwner} →
                </button>
              </div>
              <span className="font-mono text-[10px] text-sage shrink-0">
                {f.steps.filter((s) => s.status === 'sent').length}/{f.steps.length} sent
              </span>
            </div>
            <div className="space-y-0">
              {f.steps.map((s, i) => (
                <div key={i} className="flex gap-3">
                  {/* timeline */}
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      s.status === 'sent' ? 'bg-pine' : 'border-2 border-line bg-white'
                    }`} />
                    {i < f.steps.length - 1 && <div className="w-px flex-1 bg-line" />}
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <ChannelIcon channel={s.channel} />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-sage">{s.channel}</span>
                      <span className={`font-mono text-[10px] ${s.status === 'sent' ? 'text-pine' : 'text-sage/60'}`}>
                        {s.status === 'sent' ? '✓ sent' : 'scheduled'} · {fmtDay(s.at)} {fmtTime(s.at)}
                      </span>
                    </div>
                    <div className="text-[13px] mt-0.5 leading-snug break-words">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
        {followups.length === 0 && (
          <Card className="md:col-span-2 px-5 py-10 text-center text-sage text-sm">
            No automated messaging sequences yet.
          </Card>
        )}
      </div>
      </div>
    </div>
  )
}
