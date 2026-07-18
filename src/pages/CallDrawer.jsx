import { UrgencyBadge, StatusBadge, Button, SectionLabel } from '../ui.jsx'
import { fmtTime, fmtDay, fmtDur, AGENTS, CLINICS } from '../data.js'
import { ActionList } from './ActionsPopup.jsx'

export default function CallDrawer({ call, calls, onClose, onBook, onToggleAction, onAddAction, onMarkReviewed, onOpenCall }) {
  const agent = AGENTS.find((a) => a.id === call.agentId)
  const linked = call.handoffTo
    ? calls.find((c) => c.id === call.handoffTo)
    : call.handoffFrom
      ? calls.find((c) => c.id === call.handoffFrom)
      : null
  const openActions = (call.nextActions || []).filter((a) => !a.done)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <div className="relative w-full sm:w-[560px] bg-white h-full shadow-2xl drawer-in flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-line">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-semibold tracking-tight break-words min-w-0">{call.pet.name}</h2>
                <UrgencyBadge level={call.urgency} />
                <StatusBadge status={call.status} />
              </div>
              <div className="text-sm text-sage mt-1 break-words">
                {call.caller.name} · {call.caller.phone}
              </div>
              <div className="font-mono text-[11px] text-sage mt-1.5 break-words">
                {fmtDay(call.receivedAt)} {fmtTime(call.receivedAt)} · {fmtDur(call.duration)} · {agent?.name} · {CLINICS[call.clinic].short}
                {call.real && <span className="ml-2 text-pine">● live Ringg call</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-sage hover:text-ink text-lg leading-none p-1 shrink-0">✕</button>
          </div>

          {/* Pet facts */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[call.pet.species, call.pet.breed, call.pet.age].filter(Boolean).map((f) => (
              <span key={f} className="max-w-full px-2.5 py-1 rounded-full bg-cream border border-line text-[11.5px] text-sage break-words">{f}</span>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Handoff banner */}
          {linked && (
            <button
              onClick={() => onOpenCall(linked.id)}
              className="w-full text-left rounded-2xl border border-pine/25 bg-pine-light/50 px-4 py-3 hover:bg-pine-light transition-colors"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-pine">
                {call.handoffTo ? 'Escalated to' : 'Warm handoff from'}
              </div>
              <div className="text-sm font-medium mt-0.5">
                {CLINICS[linked.clinic].name} <span className="text-sage font-normal">· {fmtTime(linked.receivedAt)} · view linked call →</span>
              </div>
              {call.handoffContext && (
                <div className="mt-2 font-mono text-[11px] text-sage space-y-0.5">
                  {Object.entries(call.handoffContext).map(([k, v]) => (
                    <div key={k}><span className="text-pine">{k}</span> = “{v}”</div>
                  ))}
                </div>
              )}
            </button>
          )}

          {/* Summary */}
          <section>
            <SectionLabel>AI summary</SectionLabel>
            <p className="text-[13.5px] leading-relaxed mt-2 break-words">{call.summary}</p>
          </section>

          {/* Next actions */}
          <section>
            <SectionLabel>Next actions</SectionLabel>
            <div className="mt-2">
              <ActionList
                call={call}
                onToggle={(actionId) => onToggleAction(call.id, actionId)}
                onAdd={(label, type) => onAddAction(call.id, label, type)}
                onBookAction={onBook}
              />
            </div>
          </section>

          {/* Booked confirmation */}
          {call.booked && (
            <section className="rounded-2xl border border-pine/25 bg-pine-light/50 px-4 py-3">
              <div className="font-mono text-[10px] uppercase tracking-wider text-pine">Appointment on calendar</div>
              <div className="text-sm font-medium mt-1 break-words">
                {call.booked.kind} — {new Date(call.booked.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {call.booked.time}
              </div>
            </section>
          )}

          {/* Transcript */}
          <section>
            <SectionLabel>Transcript</SectionLabel>
            <div className="mt-3 space-y-3">
              {call.transcript.map(([role, text], i) => (
                <div key={i} className={`flex ${role === 'agent' ? '' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
                    role === 'agent'
                      ? 'bg-cream border border-line rounded-tl-sm'
                      : 'bg-pine text-white rounded-tr-sm'
                  }`}>
                    <div className={`font-mono text-[9.5px] uppercase tracking-wider mb-1 ${role === 'agent' ? 'text-pine' : 'text-pine-light/80'}`}>
                      {role === 'agent' ? agent?.name || 'Agent' : call.caller.name}
                    </div>
                    {text}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-line flex flex-wrap items-center gap-2.5 bg-white">
          {!call.booked && (
            <Button onClick={onBook}>▦ Book appointment</Button>
          )}
          {call.status !== 'reviewed' && (
            <Button variant="secondary" onClick={() => onMarkReviewed(call.id)}>Mark reviewed</Button>
          )}
          {openActions.length > 0 && (
            <span className="ml-auto font-mono text-[11px] text-amber-700">{openActions.length} action{openActions.length > 1 ? 's' : ''} open</span>
          )}
        </div>
      </div>
    </div>
  )
}
