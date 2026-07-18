import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, UrgencyBadge, StatusBadge, Avatar } from '../ui.jsx'
import { fmtTime, fmtDay, fmtDur } from '../data.js'

// Inbox — persistent master-detail command center.
// Left: searchable/filterable call rail (live pinned first). Right: the
// selected call as a wide, inline workspace (no dimming overlay).

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'needs_action', label: 'Needs action' },
  { id: 'unreviewed', label: 'Unreviewed' },
  { id: 'reviewed', label: 'Reviewed' },
]

// Sort weight: live first, then needs action, unreviewed, reviewed.
const RANK = { needs_action: 1, unreviewed: 2, reviewed: 3 }

export default function Calls({ store }) {
  const { calls, selectedCallId } = store
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  const sorted = useMemo(() => {
    const query = q.trim().toLowerCase()
    return calls
      .filter((c) => filter === 'all' || c.status === filter)
      .filter((c) => !query || `${c.pet.name} ${c.caller.name} ${c.caller.phone} ${c.reason}`.toLowerCase().includes(query))
      .slice()
      .sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1
        const r = (RANK[a.status] || 9) - (RANK[b.status] || 9)
        if (r !== 0) return r
        return new Date(b.receivedAt) - new Date(a.receivedAt)
      })
  }, [calls, filter, q])

  // Auto-select the first call if nothing selected or the selection dropped out.
  const selected = calls.find((c) => c.id === selectedCallId) || sorted[0]
  useEffect(() => {
    if (selected && selected.id !== selectedCallId) store.selectCall(selected.id)
  }, [selected, selectedCallId, store])

  return (
    <div className="flex gap-5 fade-up h-[calc(100vh-8.5rem)]">
      {/* Left rail */}
      <div className="w-[340px] shrink-0 flex flex-col">
        <div className="space-y-2 mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search caller, pet, phone, reason…"
            className="w-full rounded-full border border-line px-4 py-2 text-sm focus:outline-none focus:border-pine/50"
          />
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => {
              const n = f.id === 'all' ? calls.length : calls.filter((c) => c.status === f.id).length
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-[12px] transition-colors ${
                    filter === f.id ? 'bg-ink text-cream font-medium' : 'bg-white border border-line text-sage hover:text-ink'
                  }`}
                >
                  {f.label} <span className="font-mono text-[10px] opacity-60">{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sorted.map((c) => (
            <CallRow key={c.id} call={c} active={c.id === selected?.id} onClick={() => store.selectCall(c.id)} />
          ))}
          {sorted.length === 0 && <div className="text-center text-sage text-sm py-10">No calls match.</div>}
        </div>
      </div>

      {/* Right detail */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {selected ? <CallDetail key={selected.id} call={selected} store={store} /> : (
          <Card className="p-10 text-center text-sage">Select a call to view details.</Card>
        )}
      </div>
    </div>
  )
}

function CallRow({ call, active, onClick }) {
  const openActions = (call.nextActions || []).filter((a) => !a.done).length
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        active ? 'border-pine/40 bg-pine-light' : 'border-line bg-white hover:border-pine/25'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={call.pet.name} species={call.pet.species} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm truncate">{call.pet.name}</span>
            {call.live && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-pine shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-pine live-dot" /> LIVE
              </span>
            )}
          </div>
          <div className="text-[12px] text-sage truncate">{call.caller.name}</div>
        </div>
      </div>
      <div className="mt-2 text-[12px] text-ink/80 line-clamp-1">{call.reason}</div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        <UrgencyBadge level={call.urgency} />
        <StatusBadge status={call.status} />
        {openActions > 0 && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700">
            ⚡ {openActions}
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] text-sage/70">{fmtTime(call.receivedAt)}</span>
      </div>
    </button>
  )
}

function CallDetail({ call, store }) {
  const isLive = call.live
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-line flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar name={call.pet.name} species={call.pet.species} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-lg">{call.pet.name}</h2>
              <UrgencyBadge level={call.urgency} />
              <StatusBadge status={call.status} />
              {isLive && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-pine">
                  <span className="w-2 h-2 rounded-full bg-pine live-dot" /> LIVE
                </span>
              )}
            </div>
            <div className="text-[13px] text-sage mt-0.5">{call.caller.name} · {call.caller.phone}</div>
            <div className="font-mono text-[11px] text-sage/80 mt-1">
              {fmtDay(call.receivedAt)} {fmtTime(call.receivedAt)} · {fmtDur(call.duration)} · {call.agentName || 'Haley'}
              {call.source === 'vapi' && <span className="ml-2 text-pine">● Vapi</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!call.booked && <button onClick={() => store.startBooking(call.id)} className="rounded-full bg-pine text-white px-4 py-2 text-sm font-medium hover:bg-pine-dark">▦ Book</button>}
          {call.status !== 'reviewed' && <button onClick={() => store.markReviewed(call.id)} className="rounded-full border border-line px-4 py-2 text-sm text-ink hover:border-pine/40">Mark reviewed</button>}
          {!isLive && (
            <button
              onClick={() => { if (confirm(`Delete this call from ${call.caller.name}? This can't be undone.`)) store.deleteCall(call.id) }}
              className="rounded-full border border-red-200 text-red-600 px-3 py-2 text-sm hover:bg-red-50"
              title="Delete call"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Pet facts */}
      {(call.pet.species || call.pet.breed || call.pet.age) && (
        <div className="px-5 pt-4 flex flex-wrap gap-2">
          {[call.pet.species, call.pet.breed, call.pet.age].filter(Boolean).map((f) => (
            <span key={f} className="px-2.5 py-1 rounded-full bg-cream border border-line text-[11.5px] text-sage">{f}</span>
          ))}
        </div>
      )}

      <div className="p-5 space-y-6">
        {isLive && <LiveAsk call={call} store={store} />}

        {/* Summary */}
        <section>
          <SectionLabel>AI summary</SectionLabel>
          <p className="text-[13.5px] leading-relaxed mt-2">{call.summary}</p>
        </section>

        {/* Booked */}
        {call.booked && (
          <section className="rounded-2xl border border-pine/25 bg-pine-light/50 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-pine">Appointment on calendar</div>
            <div className="text-sm font-medium mt-1">
              {call.booked.kind} — {new Date(call.booked.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {call.booked.time}
            </div>
          </section>
        )}

        {/* Next actions */}
        {(call.nextActions || []).length > 0 && (
          <section>
            <SectionLabel>Next actions</SectionLabel>
            <div className="mt-2 space-y-1.5">
              {call.nextActions.map((a) => (
                <label key={a.id} className="flex items-center gap-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={a.done} onChange={() => store.toggleAction(call.id, a.id)} className="accent-pine" />
                  <span className={a.done ? 'line-through text-sage' : 'text-ink'}>{a.label}</span>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* Transcript */}
        <section>
          <SectionLabel>Transcript</SectionLabel>
          <div className="mt-3 space-y-3">
            {(call.transcript || []).length === 0 && <p className="text-sage text-sm">No transcript captured.</p>}
            {(call.transcript || []).map(([role, text], i) => {
              const agent = role === 'agent' || role === 'DR'
              return (
                <div key={i} className={`flex ${agent ? '' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    agent ? 'bg-cream border border-line rounded-tl-sm' : 'bg-pine text-white rounded-tr-sm'
                  }`}>
                    <div className={`font-mono text-[9.5px] uppercase tracking-wider mb-1 ${agent ? 'text-pine' : 'text-pine-light/80'}`}>
                      {agent ? (call.agentName || 'Haley') : call.caller.name}
                    </div>
                    {text}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </Card>
  )
}

function LiveAsk({ call, store }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const turns = call.transcript || []
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight }, [turns.length])

  const ask = async (e) => {
    e.preventDefault()
    const message = q.trim()
    if (!message || sending) return
    setSending(true); setStatus(null)
    try {
      const r = await fetch('/api/vapi-say', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: call.vapiId || call.id, message }),
      }).then((x) => x.json())
      if (r.ok) {
        setStatus({ ok: true, text: 'Sent to Haley — she’ll ask this on the call.' })
        setQ('')
        if (r.demo && store?.injectLiveTurn) store.injectLiveTurn(call.id, [['agent', phraseAsAsk(message)]])
      } else setStatus({ ok: false, text: r.error || 'Could not reach the live call.' })
    } catch { setStatus({ ok: false, text: 'Network error reaching the call.' }) }
    finally { setSending(false) }
  }

  return (
    <section className="rounded-2xl border border-pine/30 bg-pine-light/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-pine live-dot" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-pine">Ask on the live call</span>
      </div>
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. ask for vaccination records"
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm focus:outline-none focus:border-pine/50"
        />
        <button type="submit" disabled={sending} className="rounded-full bg-pine text-white px-4 py-2 text-sm font-medium hover:bg-pine-dark disabled:opacity-50">
          {sending ? 'Sending…' : 'Ask live'}
        </button>
      </form>
      {status && <div className={`mt-2 text-[12px] ${status.ok ? 'text-pine' : 'text-amber-700'}`}>{status.text}</div>}
    </section>
  )
}

function phraseAsAsk(message) {
  let m = message.trim().replace(/^(can you |could you |please )?(ask|check|find out|get|confirm)\s+(for |about |if |whether )?/i, '')
  m = m.replace(/^(the|their|his|her|your)\s+/i, '')
  return `Of course — let me confirm that. Can you tell me about ${m.replace(/[.?!]+$/, '')}?`
}

function SectionLabel({ children }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage">{children}</div>
}
