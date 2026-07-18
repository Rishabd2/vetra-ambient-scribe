import { useState } from 'react'
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

  const filtered = (tab === 'all' ? calls : calls.filter((c) => c.status === tab)).slice().sort(
    (a, b) => new Date(b.receivedAt) - new Date(a.receivedAt),
  )

  return (
    <div className="space-y-4 fade-up">
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
                    {c.source === 'ringg' && (
                      <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                        c.live
                          ? 'border-pine/30 bg-pine-light text-pine'
                          : 'border-line bg-cream text-sage'
                      }`}>
                        {c.live ? 'live now' : c.callState || 'ringg'}
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

function Th({ children, className = '' }) {
  return (
    <th className={`px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage font-medium ${className}`}>{children}</th>
  )
}
