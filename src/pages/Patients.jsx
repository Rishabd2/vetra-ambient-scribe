import { useState } from 'react'
import { Card, Avatar, Button } from '../ui.jsx'
import { MOCK_PATIENTS } from '../mock/visits.js'

// Patients — full client & patient directory. Grid of cards; each opens a
// detail drawer (stat tiles, owner, preventive care, appointments, case
// history, recent calls, documents).

const STATUS_LABEL = {
  'checked-in': 'Checked-in',
  scheduling: 'Scheduling',
  doctor: 'Doctor',
  'follow-up': 'Follow-up',
  seen: 'Seen',
}

export default function Patients() {
  const [openId, setOpenId] = useState(null)
  const [query, setQuery] = useState('')

  const patients = MOCK_PATIENTS
  const q = query.trim().toLowerCase()
  const filtered = q
    ? patients.filter((p) => `${p.name} ${p.owner} ${p.breed} ${p.species}`.toLowerCase().includes(q))
    : patients

  const open = patients.find((p) => p.id === openId)

  return (
    <div className="space-y-5 fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Patients</h2>
          <p className="text-sm text-sage">Client &amp; patient directory</p>
        </div>
        <div className="relative w-full sm:w-72">
          <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, owner, or breed"
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-pine/50"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((p) => (
          <PatientCard key={p.id} p={p} onClick={() => setOpenId(p.id)} />
        ))}
      </div>
      {filtered.length === 0 && <Card className="p-10 text-center text-sage text-sm">No patients match “{query}”.</Card>}

      {open && <PatientDrawer patient={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function PatientCard({ p, onClick }) {
  return (
    <button onClick={onClick} className="text-left group">
      <Card className="p-4 hover:border-pine/30 hover:shadow-sm transition-all h-full">
        <div className="flex items-center gap-3">
          <Avatar species={p.species} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{p.name}</div>
            <div className="text-[12px] text-sage truncate">{p.breed}</div>
          </div>
          <span className="text-sage/50 group-hover:text-pine transition-colors">›</span>
        </div>

        <div className="mt-3 space-y-2 text-[12.5px]">
          <div className="flex items-center gap-1.5 text-sage">
            <UserIcon /> <span className="truncate">{p.owner}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sage">{p.age} · {p.weight}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream border border-line text-sage">{p.species}</span>
          </div>
        </div>

        <div className="mt-3 text-[12px] px-2.5 py-1.5 rounded-lg bg-cream/70 border border-line/70 truncate">
          <span className="text-sage">{STATUS_LABEL[p.status] || 'Status'}:</span> <span className="text-ink">{p.statusText}</span>
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-sage/80">
          <CalIcon /> Last visit: {p.lastVisit}
        </div>
      </Card>
    </button>
  )
}

function PatientDrawer({ patient: p, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/25" onClick={onClose} />
      <div className="relative w-full max-w-md bg-cream h-full overflow-y-auto shadow-xl fade-up">
        {/* Header */}
        <div className="sticky top-0 bg-cream/95 backdrop-blur border-b border-line px-5 py-4 flex items-start gap-3">
          <Avatar species={p.species} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <div className="text-sm text-sage">{p.breed} · {p.species}</div>
          </div>
          <button onClick={onClose} className="text-sage hover:text-ink text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<CalIcon />} value={p.age.replace(' years', 'y').replace(' year', 'y')} label="Age" />
            <Stat icon={<WeightIcon />} value={p.weight} label="Weight" />
            <Stat icon={<StethIcon />} value={p.visits} label="Visits" />
          </div>

          {/* Owner */}
          <div className="flex items-center gap-3 rounded-xl bg-white border border-line px-4 py-3">
            <UserIcon />
            <div>
              <div className="font-medium">{p.owner}</div>
              <div className="text-[12px] text-sage">{p.phone}</div>
            </div>
          </div>

          {/* Preventive care */}
          {p.preventive && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium text-sm">⚠ Upcoming Preventive Care</div>
              <div className="text-[13px] text-sage mt-1">· {p.preventive}</div>
            </div>
          )}

          {/* Appointments */}
          {p.appointments.length > 0 && (
            <Section icon={<CalIcon />} title="Appointments" count={p.appointments.length}>
              {p.appointments.map((a, i) => (
                <div key={i} className="rounded-xl border border-line bg-white border-l-2 border-l-pine px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{a.label}</div>
                    <div className="text-[12px] text-sage">{a.when} · {a.doctor}</div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-pine-light text-pine border border-pine/20 shrink-0">{a.status}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Case history */}
          {p.caseHistory.length > 0 && (
            <Section icon={<ClockIcon />} title="Case History">
              {p.caseHistory.map((c, i) => (
                <div key={i} className="rounded-xl border border-line bg-white px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm">{c.label}</div>
                    <div className="text-[12px] text-sage">{c.date} · {c.doctor}</div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cream border border-line text-sage shrink-0">{c.tag}</span>
                </div>
              ))}
            </Section>
          )}

          {/* Recent calls */}
          {p.calls.length > 0 && (
            <Section icon={<PhoneIcon />} title="Recent Calls" count={p.calls.length}>
              {p.calls.map((c, i) => (
                <div key={i} className="rounded-xl border border-line bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{c.who}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-cream border border-line text-sage">{c.tag}</span>
                  </div>
                  <p className="text-[12.5px] text-sage mt-1 leading-relaxed">{c.text}</p>
                  <div className="text-[11px] text-sage/70 mt-1">{c.when}</div>
                </div>
              ))}
            </Section>
          )}

          {/* Documents */}
          {p.documents.length > 0 && (
            <Section icon={<DocIcon />} title="Documents">
              {p.documents.map((d, i) => (
                <button key={i} className="w-full text-left rounded-xl border border-line bg-white hover:border-pine/40 px-4 py-3 flex items-center gap-2 text-sm">
                  <DocIcon /> {d}
                </button>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div className="rounded-xl bg-white border border-line px-3 py-3 text-center">
      <div className="flex justify-center text-sage mb-1">{icon}</div>
      <div className="font-semibold">{value}</div>
      <div className="text-[11px] text-sage">{label}</div>
    </div>
  )
}

function Section({ icon, title, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sage">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
        {count != null && <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-cream border border-line text-sage">{count}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

const iw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const UserIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 text-sage" {...iw}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3-5.5 7-5.5s7 2.2 7 5.5" /></svg>
const CalIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4" {...iw}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
const WeightIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4" {...iw}><path d="M12 3a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3zM6 6h12l2 14H4z" /></svg>
const StethIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4" {...iw}><path d="M6 3v6a4 4 0 0 0 8 0V3M10 15v1a5 5 0 0 0 10 0v-2" /><circle cx="20" cy="12" r="2" /></svg>
const ClockIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4" {...iw}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
const PhoneIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4" {...iw}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
const DocIcon = () => <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" {...iw}><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v5h5" /></svg>
