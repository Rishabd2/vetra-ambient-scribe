import { Card, SectionLabel, Avatar } from '../ui.jsx'
import { fmtTime, fmtDay } from '../data.js'

export default function Patients({ store }) {
  const rows = store.memoryRows || []
  const isLive = store.ringgSync?.state === 'connected'

  return (
    <div className="space-y-4 fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-sage max-w-2xl leading-relaxed">
          Every call writes to the shared memory layer, keyed by phone number. When a known number calls back —
          either clinic, either agent — Priya opens with full context and the owner never repeats themselves.
        </p>
        <div className="font-mono text-[11px] text-sage flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-pine live-dot" />
          {isLive ? 'Synced · vetra_RinggMirror memory' : 'Synced · demo patient memory'}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead>
            <tr className="text-left border-b border-line">
              <Th>Patient</Th>
              <Th>Phone</Th>
              <Th className="w-2/5">Last call summary</Th>
              <Th>Open follow-ups</Th>
              <Th className="text-right">Last touched</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={`${r.phone}-${r.pet}-${r.updatedAt}`} className="hover:bg-cream transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.pet} species={r.species} />
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[170px]">{r.pet}</div>
                      <div className="text-[12px] text-sage truncate max-w-[210px]">{r.caller} · {r.breed}{r.age ? ` · ${r.age}` : ''}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-[12px] text-sage whitespace-nowrap">{r.phone}</td>
                <td className="px-5 py-4 text-[12.5px] text-sage leading-relaxed"><div className="line-clamp-2 break-words">{r.lastSummary}</div></td>
                <td className="px-5 py-4">
                  {r.openFollowups === '—' ? (
                    <span className="text-sage">—</span>
                  ) : (
                    <span className={`inline-flex max-w-[260px] whitespace-normal break-words px-2.5 py-1 rounded-full border text-[11px] font-medium ${
                      r.openFollowups.startsWith('URGENT')
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-pine-light text-pine border-pine/20'
                    }`}>
                      {r.openFollowups}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="font-mono text-[11px] text-sage">{fmtDay(r.updatedAt)} {fmtTime(r.updatedAt)}</div>
                  <div className="font-mono text-[10px] text-sage/60 mt-0.5">{r.lastAgent}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {rows.length === 0 && (
          <div className="px-5 py-10 text-center text-sage text-sm">
            No live patient memory rows have been returned from Ringg yet.
          </div>
        )}
      </Card>
    </div>
  )
}

function Th({ children, className = '' }) {
  return (
    <th className={`px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage font-medium ${className}`}>{children}</th>
  )
}
