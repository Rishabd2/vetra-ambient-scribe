import { useState } from 'react'
import { Card, Avatar, Button } from '../ui.jsx'
import { MOCK_PATIENTS } from '../mock/visits.js'
import Invoice from './Invoice.jsx'

// Patients — master-detail workspace. Left: searchable patient rail (real
// callers from completed calls merge ahead of the mock roster). Right: a wide
// patient record with identity, history, and the ambient-visit SOAP + invoice.

const STATUS_LABEL = {
  'checked-in': 'Checked-in',
  scheduling: 'Scheduling',
  doctor: 'Doctor',
  'follow-up': 'Follow-up',
  seen: 'Seen',
}

export default function Patients({ store }) {
  const [openId, setOpenId] = useState(null)
  const [query, setQuery] = useState('')

  // Real patients from completed calls (fromCall visits) merge ahead of the
  // mock roster so new callers show up as patient cards. Dedupe by patient id
  // (unnamed callers collapse to one 'unknown' card rather than many dupes).
  const realVisits = (store?.visits || []).filter((v) => v.fromCall)
  const realSeen = new Set()
  const realPatients = realVisits
    .filter((v) => {
      const id = v.patient.id
      if (realSeen.has(id)) return false
      realSeen.add(id)
      return true
    })
    .map((v) => ({
    id: v.patient.id,
    name: v.patient.name,
    species: v.patient.species || '—',
    breed: v.patient.breed || 'New patient',
    age: v.patient.age || '—',
    weight: v.patient.weight || '—',
    owner: v.patient.owner.name,
    phone: v.patient.owner.phone || '—',
    status: 'follow-up',
    statusText: v.visitType,
    lastVisit: (v.startedAt || '').slice(0, 10),
    visits: 1,
    preventive: v.patient.isNew ? 'New patient — establish baseline wellness plan' : '',
    appointments: [],
    caseHistory: [{ label: v.visitType, date: (v.startedAt || '').slice(0, 10), doctor: 'Dr. Martinez', tag: 'From call' }],
    calls: [],
    documents: [],
  }))
  const mockFiltered = MOCK_PATIENTS.filter((m) => !realPatients.some((r) => r.id === m.id))
  const patients = [...realPatients, ...mockFiltered]

  const q = query.trim().toLowerCase()
  const filtered = q
    ? patients.filter((p) => `${p.name} ${p.owner} ${p.breed} ${p.species}`.toLowerCase().includes(q))
    : patients

  const open = patients.find((p) => p.id === openId) || filtered[0]
  const openVisit = open ? (store?.visits || []).find((v) => v.patient.id === open.id) : null

  return (
    <div className="flex gap-5 fade-up h-[calc(100vh-8.5rem)]">
      {/* Left rail */}
      <div className="w-[320px] shrink-0 flex flex-col">
        <div className="relative mb-3">
          <svg viewBox="0 0 24 24" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" strokeLinecap="round" /></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, owner, breed"
            className="w-full rounded-xl border border-line bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-pine/50"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.map((p) => (
            <PatientRow key={p.id} p={p} active={p.id === open?.id} onClick={() => setOpenId(p.id)} />
          ))}
          {filtered.length === 0 && <div className="text-center text-sage text-sm py-10">No patients match “{query}”.</div>}
        </div>
      </div>

      {/* Right detail workspace */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {open ? <PatientDetail key={open.id} patient={open} visit={openVisit} store={store} /> : (
          <Card className="p-10 text-center text-sage">Select a patient.</Card>
        )}
      </div>
    </div>
  )
}

function PatientRow({ p, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        active ? 'border-pine/40 bg-pine-light' : 'border-line bg-white hover:border-pine/25'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Avatar species={p.species} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{p.name}</div>
          <div className="text-[12px] text-sage truncate">{p.breed} · {p.owner}</div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cream border border-line text-sage shrink-0">{p.species}</span>
      </div>
      <div className="mt-2 text-[11.5px] text-sage truncate">{STATUS_LABEL[p.status] || 'Status'}: <span className="text-ink">{p.statusText}</span></div>
    </button>
  )
}

function PatientDetail({ patient: p, visit, store }) {
  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-line flex items-start gap-3">
        <Avatar species={p.species} />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold">{p.name}</h2>
          <div className="text-sm text-sage">{p.breed} · {p.species} · {p.owner}</div>
        </div>
      </div>

      <div className="p-5 grid lg:grid-cols-2 gap-6">
        {/* Left detail column */}
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Stat icon={<CalIcon />} value={String(p.age).replace(' years', 'y').replace(' year', 'y')} label="Age" />
            <Stat icon={<WeightIcon />} value={p.weight} label="Weight" />
            <Stat icon={<StethIcon />} value={p.visits} label="Visits" />
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-white border border-line px-4 py-3">
            <UserIcon />
            <div>
              <div className="font-medium">{p.owner}</div>
              <div className="text-[12px] text-sage">{p.phone}</div>
            </div>
          </div>

          {p.preventive && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium text-sm">⚠ Upcoming Preventive Care</div>
              <div className="text-[13px] text-sage mt-1">· {p.preventive}</div>
            </div>
          )}

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

        {/* Right clinical column: SOAP + invoice from the ambient visit */}
        <div className="space-y-6">
          {visit ? <VisitWorkflow visit={visit} store={store} /> : (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sage text-sm">
              No ambient visit on record for {p.name}. New calls and recorded notes will appear here.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function VisitWorkflow({ visit, store }) {
  const soap = visit.soap
  const noteReviewed = visit.status === 'reviewed'
  return (
    <div className="space-y-4">
      {soap && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sage"><DocIcon /></span>
              <h3 className="font-semibold">SOAP Note</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${noteReviewed ? 'bg-pine-light text-pine border-pine/20' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                {noteReviewed ? 'Reviewed' : 'Draft'}
              </span>
            </div>
            {store && (
              <button onClick={() => { store.selectVisit(visit.id); store.setView('notes') }} className="text-[12px] text-pine hover:underline shrink-0">
                Open in Doctor Notes →
              </button>
            )}
          </div>
          <div className="rounded-xl border border-line bg-white px-4 py-3 space-y-3 text-[13px]">
            <p className="text-ink leading-relaxed">{soap.summary}</p>
            <SoapBlock label="Assessment" items={soap.assessment} />
            <SoapBlock label="Plan" items={soap.plan} />
          </div>
          {store && !noteReviewed && (
            <div className="mt-2 flex justify-end">
              <Button variant="primary" onClick={() => store.approveNote(visit.id)}>Approve note</Button>
            </div>
          )}
        </div>
      )}

      {visit.invoice && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sage">$</span>
            <h3 className="font-semibold">Invoice</h3>
          </div>
          <Invoice visit={visit} store={store} />
        </div>
      )}
    </div>
  )
}

function SoapBlock({ label, items }) {
  if (!items?.length) return null
  return (
    <div>
      <div className="font-medium text-ink mb-1">{label}</div>
      <ul className="list-disc pl-5 space-y-0.5 text-sage">
        {items.map((it, i) => <li key={i} className="leading-relaxed">{it}</li>)}
      </ul>
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
