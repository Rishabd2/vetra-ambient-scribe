import { useMemo, useState } from 'react'
import { Card } from '../ui.jsx'

const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i) // 8:00-17:00
const DAY_MS = 86400000

export default function CalendarPage({ store }) {
  const { appointments, dashboardDate } = store
  const todayISO = dashboardDate || new Date().toISOString().slice(0, 10)
  // Week shown = the week containing todayISO, shifted by weekOffset. Deriving from
  // todayISO (instead of syncing state in an effect) means a live date change snaps
  // the view back to "this week" without a cascading render.
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = useMemo(
    () => new Date(startOfWeek(todayISO).getTime() + weekOffset * 7 * DAY_MS),
    [todayISO, weekOffset],
  )

  const days = useMemo(
    () => Array.from({ length: 6 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)), // Mon–Sat
    [weekStart],
  )

  const byDate = useMemo(() => {
    const m = {}
    appointments.forEach((a) => { (m[a.date] ||= []).push(a) })
    return m
  }, [appointments])

  const move = (dir) => setWeekOffset((o) => o + dir)
  const [selected, setSelected] = useState(null)
  const [formAppt, setFormAppt] = useState(null) // null=closed, {}=new, {...}=edit
  const label = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[5].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const agentCount = appointments.filter((a) => a.source === 'agent').length

  return (
    <div className="space-y-4 fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => move(-1)} className="w-8 h-8 rounded-full border border-line bg-white hover:border-pine/40 text-sage">←</button>
          <div className="font-medium tabular">{label}</div>
          <button onClick={() => move(1)} className="w-8 h-8 rounded-full border border-line bg-white hover:border-pine/40 text-sage">→</button>
          <button onClick={() => setWeekOffset(0)} className="text-[12px] text-pine hover:underline ml-1">Today</button>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono text-[11px] text-sage">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-pine mr-1.5 align-middle" />AI booked ({agentCount})
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-300 ml-4 mr-1.5 align-middle" />Staff booked
          </div>
          <button
            onClick={() => setFormAppt({ date: todayISO })}
            className="rounded-full bg-pine text-white px-4 py-1.5 text-sm font-medium hover:bg-pine-dark"
          >
            + Add appointment
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <div className="grid min-w-[820px]" style={{ gridTemplateColumns: '60px repeat(6, minmax(120px, 1fr))' }}>
          {/* Day headers */}
          <div className="border-b border-line" />
          {days.map((d) => {
            const isToday = toISO(d) === todayISO
            return (
              <div key={d} className={`border-b border-l border-line px-3 py-2.5 text-center ${isToday ? 'bg-pine-light/40' : ''}`}>
                <div className="font-mono text-[10px] uppercase tracking-wider text-sage">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-base font-semibold tabular ${isToday ? 'text-pine' : ''}`}>{d.getDate()}</div>
              </div>
            )
          })}

          {/* Hour rows */}
          {HOURS.map((h) => (
            <Row key={h} hour={h} days={days} byDate={byDate} onSelect={setSelected} todayISO={todayISO} />
          ))}
        </div>
        </div>
        {appointments.length === 0 && (
          <div className="border-t border-line px-5 py-8 text-center text-sm text-sage">
            No appointments scheduled for this week yet.
          </div>
        )}
      </Card>

      {selected && (
        <ApptPopup
          appt={selected}
          onClose={() => setSelected(null)}
          onOpenCall={selected.callId ? () => { store.openCall(selected.callId); setSelected(null) } : null}
        />
      )}
    </div>
  )
}

function ApptPopup({ appt, onClose, onOpenCall }) {
  const isAgent = appt.source === 'agent'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <Card className="relative w-full max-w-sm p-5 fade-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-lg">{appt.pet}</div>
            <div className="text-sm text-sage">{appt.kind}</div>
          </div>
          <button onClick={onClose} className="text-sage hover:text-ink text-xl leading-none">✕</button>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <Field label="When" value={`${fmtLong(appt.date)} · ${fmtClock(appt.time)}`} />
          {appt.owner && <Field label="Owner" value={appt.owner} />}
          {appt.dur && <Field label="Duration" value={`${appt.dur} min`} />}
          <Field label="Booked by" value={isAgent ? 'Vetra agent' : 'Staff'} />
        </div>
        {onOpenCall && (
          <button onClick={onOpenCall} className="mt-4 w-full rounded-full bg-pine text-white py-2 text-sm font-medium hover:bg-pine-dark">
            Open source call →
          </button>
        )}
      </Card>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-sage">{label}</span>
      <span className="text-ink text-right">{value}</span>
    </div>
  )
}

function fmtLong(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
function fmtClock(time) {
  const [h, m] = String(time).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`
}

function Row({ hour, days, byDate, onSelect, todayISO }) {
  return (
    <>
      <div className="border-b border-line px-2 py-1 text-right font-mono text-[10px] text-sage min-h-[5.75rem] pt-1.5">
        {hour}:00
      </div>
      {days.map((d) => {
        const iso = toISO(d)
        const isToday = iso === todayISO
        const appts = (byDate[iso] || []).filter((a) => parseInt(a.time.split(':')[0], 10) === hour)
        return (
          <div key={iso} className={`border-b border-l border-line min-h-[5.75rem] relative px-1 py-1 ${isToday ? 'bg-pine-light/20' : ''}`}>
            {appts.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a)}
                className={`w-full min-w-0 text-left rounded-lg px-2 py-1 mb-1 transition-opacity hover:opacity-85 cursor-pointer overflow-hidden ${
                  a.source === 'agent' ? 'bg-pine text-white' : 'bg-slate-200 text-ink'
                }`}
              >
                <div className="font-mono text-[9.5px] opacity-80 tabular">{a.time}</div>
                <div className="text-[11px] font-medium truncate leading-tight min-w-0">{a.pet} · {a.kind}</div>
              </button>
            ))}
          </div>
        )
      })}
    </>
  )
}

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeek(isoDate) {
  const date = parseISODate(isoDate)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function parseISODate(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}
