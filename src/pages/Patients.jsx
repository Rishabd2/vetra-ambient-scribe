import { useState } from 'react'
import { Card, Avatar } from '../ui.jsx'
import { fmtTime, fmtDay } from '../data.js'
import Invoice from './Invoice.jsx'

// Patients — clinical patient cards derived from visits, plus the legacy
// phone-keyed call-memory table underneath.

export default function Patients({ store }) {
  const visits = store.visits || []
  const [openId, setOpenId] = useState(null)

  // One card per unique patient; attach that patient's visits (newest first).
  const patients = []
  const seen = {}
  for (const v of visits) {
    const pid = v.patient.id
    if (!seen[pid]) {
      seen[pid] = { ...v.patient, visits: [] }
      patients.push(seen[pid])
    }
    seen[pid].visits.push(v)
  }
  patients.forEach((p) => p.visits.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt)))

  const open = patients.find((p) => p.id === openId)

  return (
    <div className="space-y-6 fade-up">
      {open ? (
        <PatientDetail patient={open} store={store} onBack={() => setOpenId(null)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((p) => (
            <PatientTile key={p.id} p={p} onClick={() => setOpenId(p.id)} />
          ))}
        </div>
      )}

      <MemoryTable store={store} />
    </div>
  )
}

function PatientTile({ p, onClick }) {
  const last = p.visits[0]
  return (
    <button onClick={onClick} className="text-left">
      <Card className="p-4 hover:border-pine/30 transition-colors h-full">
        <div className="flex items-center gap-3 mb-3">
          <Avatar species={p.species} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{p.name}</span>
              {p.isNew && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pine text-white">NEW</span>}
            </div>
            <div className="text-[12px] text-sage truncate">{p.breed} · {p.age} · {p.sex}</div>
          </div>
        </div>
        <div className="text-[12px] text-sage space-y-1">
          <div>Owner: <span className="text-ink">{p.owner.name}</span></div>
          <div>{p.visits.length} visit{p.visits.length !== 1 ? 's' : ''} · last {fmtDay(last.startedAt)}</div>
          {p.problems.length > 0 && <div className="text-amber-700 truncate">⚠ {p.problems[0]}</div>}
        </div>
      </Card>
    </button>
  )
}

function PatientDetail({ patient, store, onBack }) {
  const [tab, setTab] = useState('overview')
  const tabs = ['overview', 'notes', 'invoices', 'follow-ups']

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-pine hover:underline">← All patients</button>

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar species={patient.species} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-xl">{patient.name}</h2>
              {patient.isNew && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-pine text-white">NEW PATIENT</span>}
            </div>
            <div className="text-sm text-sage mt-0.5">{patient.breed} · {patient.age} · {patient.sex} · {patient.weight}</div>
            <div className="text-sm text-sage">Owner: {patient.owner.name} · {patient.owner.phone}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          <ChipList title="Active problems" items={patient.problems} empty="None recorded" tone="amber" />
          <ChipList title="Medications" items={patient.medications} empty="None" />
          <ChipList title="Allergies" items={patient.allergies} empty="NKA" />
        </div>
      </Card>

      <div className="inline-flex rounded-lg border border-line overflow-hidden text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 capitalize border-l first:border-l-0 border-line ${tab === t ? 'bg-pine-light text-pine font-medium' : 'text-sage'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && <VisitHistory patient={patient} store={store} />}
      {tab === 'notes' && <VisitHistory patient={patient} store={store} notesOnly />}
      {tab === 'invoices' && (
        <div className="space-y-4">
          {patient.visits.map((v) => (
            <Invoice key={v.id} visit={v} store={store} />
          ))}
        </div>
      )}
      {tab === 'follow-ups' && <PatientFollowups patient={patient} store={store} />}
    </div>
  )
}

function VisitHistory({ patient, store, notesOnly }) {
  return (
    <div className="space-y-3">
      {patient.visits.map((v) => (
        <Card key={v.id} className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{v.visitType}</div>
              <div className="text-[12px] text-sage">{v.doctor} · {fmtDay(v.startedAt)} {fmtTime(v.startedAt)}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill status={v.status} />
              <button
                onClick={() => { store.selectVisit(v.id); store.setView('notes') }}
                className="text-sm text-pine hover:underline"
              >
                Open note →
              </button>
            </div>
          </div>
          {notesOnly && v.soap && <p className="text-[13px] text-sage mt-2 leading-relaxed">{v.soap.summary}</p>}
        </Card>
      ))}
    </div>
  )
}

function PatientFollowups({ patient, store }) {
  const items = patient.visits.flatMap((v) => (v.followups || []).map((f) => ({ ...f, visitId: v.id })))
  if (items.length === 0) return <Card className="p-6 text-sage text-sm text-center">No follow-ups.</Card>
  return (
    <Card className="divide-y divide-line">
      {items.map((f) => (
        <label key={f.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
          <input type="checkbox" checked={f.done} onChange={() => store.toggleFollowup(f.visitId, f.id)} className="accent-pine" />
          <div className="flex-1 min-w-0">
            <div className={`text-sm ${f.done ? 'line-through text-sage' : 'text-ink'}`}>{f.label}</div>
            <div className="text-[11px] text-sage">{f.owner} · due {f.due} · {f.channel}</div>
          </div>
        </label>
      ))}
    </Card>
  )
}

function ChipList({ title, items, empty, tone }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-sage mb-1.5">{title}</div>
      {items.length === 0 ? (
        <span className="text-[12px] text-sage/70">{empty}</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => (
            <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${tone === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-cream text-ink border-line'}`}>{it}</span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }) {
  if (status === 'live') return <span className="text-[10px] font-mono text-pine inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-pine live-dot" />LIVE</span>
  if (status === 'reviewed') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pine-light text-pine border border-pine/20">Reviewed</span>
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Draft</span>
}

function MemoryTable({ store }) {
  const rows = store.memoryRows || []
  if (rows.length === 0) return null
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage px-1 mb-2">Call memory (phone-keyed)</div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left border-b border-line">
                <Th>Patient</Th><Th>Phone</Th><Th className="w-2/5">Last call summary</Th><Th className="text-right">Last touched</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={`${r.phone}-${r.pet}-${r.updatedAt}`} className="hover:bg-cream transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar species={r.species} />
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[150px]">{r.pet}</div>
                        <div className="text-[12px] text-sage truncate max-w-[190px]">{r.caller} · {r.breed}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-[12px] text-sage whitespace-nowrap">{r.phone}</td>
                  <td className="px-5 py-3 text-[12.5px] text-sage"><div className="line-clamp-2">{r.lastSummary}</div></td>
                  <td className="px-5 py-3 text-right font-mono text-[11px] text-sage">{fmtDay(r.updatedAt)} {fmtTime(r.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Th({ children, className = '' }) {
  return <th className={`px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-sage font-medium ${className}`}>{children}</th>
}
