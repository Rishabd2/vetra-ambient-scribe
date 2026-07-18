import { useState, useEffect, useRef } from 'react'
import { Card, SectionLabel, UrgencyBadge, StatusBadge, Avatar } from '../ui.jsx'
import { fmtTime, fmtDay, fmtDur, fmtMoney } from '../data.js'

const TABS = [
  { id: 'needs_action', label: 'Needs action' },
  { id: 'unreviewed', label: 'Unreviewed' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'all', label: 'All' },
]

export default function Calls({ store }) {
  const [tab, setTab] = useState('needs_action')
  const { calls } = store

  const liveCalls = calls.filter((c) => c.live)

  const filtered = (tab === 'all' ? calls : calls.filter((c) => c.status === tab)).slice().sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt),
  )

  return (
    <div className="space-y-4 fade-up">
      {liveCalls.map((c) => (
        <LiveTranscript key={c.id} call={c} onOpen={() => store.openCall(c.id)} store={store} />
      ))}

      <div className="flex items-center gap-1.5">
        {TABS.map((t) => {
          const n = t.id === 'all' ? calls.length : calls.filter((c) => c.status === t.id).length
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                tab === t.id ? 'bg-ink text-cream font-medium' : 'bg-white border border-line text-sage hover:text-ink'
              }`}
            >
              {t.label} <span className="font-mono text-[11px] opacity-60 ml-1">{n}</span>
            </button>
          )
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead>
            <tr className="text-left border-b border-line">
              <Th>Urgency</Th>
              <Th>Caller & pet</Th>
              <Th>Reason</Th>
              <Th className="w-2/5">Summary</Th>
              <Th className="text-right">Received</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => store.openCall(c.id)} className="hover:bg-cream cursor-pointer transition-colors">
                <td className="px-5 py-4 align-top">
                  <UrgencyBadge level={c.urgency} />
                  {(c.handoffTo || c.handoffFrom) && (
                    <div className="mt-1.5 font-mono text-[10px] text-pine">{c.handoffTo ? '→ handed off' : '← received handoff'}</div>
                  )}
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={c.pet.name} species={c.pet.species} />
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[150px]">{c.pet.name}</div>
                      <div className="text-[12px] text-sage truncate max-w-[150px]">{c.caller.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 align-top">
                  <div className="text-[13px] max-w-[220px] break-words">{c.reason}</div>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    {c.source === 'vapi' && (
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                        c.live
                          ? 'border-pine/30 bg-pine-light text-pine'
                          : 'border-line bg-cream text-sage'
                      }`}>
                        {c.live ? 'live now' : c.callState || 'vapi'}
                      </span>
                    )}
                    <StatusBadge status={c.status} />
                    <ActionChip call={c} onClick={(e) => { e.stopPropagation(); store.openActions(c.id) }} />
                  </div>
                </td>
                <td className="px-5 py-4 align-top text-[12.5px] text-sage leading-relaxed">
                  <div className="line-clamp-2 break-words">{c.summary}</div>
                  {c.booked && (
                    <div className="mt-1.5 font-mono text-[11px] text-pine">
                      ✓ Booked · {new Date(c.booked.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {c.booked.time}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 align-top text-right">
                  <div className="font-mono text-[11px] text-sage">{fmtDay(c.receivedAt)}</div>
                  <div className="font-mono text-[11px] text-sage">{fmtTime(c.receivedAt)}</div>
                  <div className="font-mono text-[10px] text-sage/70 mt-1">{fmtDur(c.duration)}</div>
                  {c.coverage === 'at_risk' && c.estValue > 0 && (
                    <div className="font-mono text-[10px] text-amber-700 mt-1">{fmtMoney(c.estValue)} at risk</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && <div className="px-5 py-10 text-center text-sage text-sm">Nothing here — queue is clear.</div>}
      </Card>
    </div>
  )
}

function ActionChip({ call, onClick }) {
  const open = (call.nextActions || []).filter((a) => !a.done).length
  if (open === 0) return null
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 text-[11px] font-medium hover:bg-amber-100 transition-colors"
      title="View & manage action items"
    >
      ⚡ {open} action{open > 1 ? 's' : ''}
    </button>
  )
}

function LiveTranscript({ call, onOpen, store }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState(null)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef(null)
  const turns = call.transcript || []

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [turns.length])

  const ask = async (e) => {
    e.preventDefault()
    const message = q.trim()
    if (!message || sending) return
    setSending(true)
    setStatus(null)
    try {
      const r = await fetch('/api/vapi-say', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: call.vapiId || call.id, message }),
      }).then((x) => x.json())
      if (r.ok) {
        setStatus({ ok: true, text: `Sent to Haley — she’ll ask this on the call.` })
        setQ('')
        // On the scripted demo call, show Haley voicing the request live.
        if (r.demo && store?.injectLiveTurn) {
          store.injectLiveTurn(call.id, [['agent', phraseAsAsk(message)]])
        }
      } else {
        setStatus({ ok: false, text: r.error || 'Could not reach the live call.' })
      }
    } catch {
      setStatus({ ok: false, text: 'Network error reaching the call.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className="overflow-hidden border-pine/40 ring-1 ring-pine/10">
      <div className="px-5 py-3 border-b border-line flex items-center justify-between gap-3 bg-pine-light/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-pine live-dot shrink-0" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-pine shrink-0">Live call</span>
          <span className="text-sm font-medium truncate">
            {call.pet.name !== 'Pet' ? `${call.pet.name} · ` : ''}{call.caller.name} · {call.caller.phone}
          </span>
        </div>
        <button onClick={onOpen} className="text-[12px] text-pine hover:underline shrink-0">Open →</button>
      </div>

      <div ref={scrollRef} className="px-5 py-4 space-y-2.5 max-h-72 overflow-y-auto">
        {turns.length === 0 && <div className="text-sm text-sage">Connecting… waiting for the first words.</div>}
        {turns.map(([role, text], i) => (
          <div key={i} className="flex gap-2.5 fade-up">
            <span className={`font-mono text-[10px] mt-1 w-12 shrink-0 ${role === 'agent' ? 'text-pine' : 'text-sage'}`}>
              {role === 'agent' ? 'HALEY' : 'CALLER'}
            </span>
            <p className={`text-[13px] leading-relaxed ${role === 'agent' ? 'text-ink' : 'text-sage'}`}>{text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={ask} className="px-5 py-3 border-t border-line flex gap-2 bg-white">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tell Haley what to ask… (e.g. ask for vaccination records)"
          className="flex-1 rounded-full border border-line px-4 py-2 text-sm focus:outline-none focus:border-pine/50"
        />
        <button type="submit" disabled={sending} className="rounded-full bg-pine text-white px-4 py-2 text-sm font-medium hover:bg-pine-dark disabled:opacity-50">
          {sending ? 'Sending…' : 'Ask live'}
        </button>
      </form>
      {status && (
        <div className={`px-5 pb-3 text-[12px] ${status.ok ? 'text-pine' : 'text-amber-700'}`}>{status.text}</div>
      )}
    </Card>
  )
}

function phraseAsAsk(message) {
  let m = message.trim().replace(/^(can you |could you |please )?(ask|check|find out|get|confirm)\s+(for |about |if |whether )?/i, '')
  m = m.replace(/^(the|their|his|her|your)\s+/i, '')
  return `Of course — let me confirm that. Can you tell me about ${m.replace(/[.?!]+$/, '')}?`
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage font-medium ${className}`}>{children}</th>
  )
}
