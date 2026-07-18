import { Card, SectionLabel } from '../ui.jsx'
import { AGENTS, CLINICS } from '../data.js'

const JOURNEY = [
  { n: '01', title: 'Owner calls the clinic', body: 'Any hour — Priya answers on the first ring. No hold music, no voicemail.' },
  { n: '02', title: 'Symptoms collected, urgency scored', body: 'Structured intake: pet, age, symptom, duration, severity, red-flag screen.' },
  { n: '03', title: 'Beyond capacity? Caller informed', body: 'If the clinic can’t handle the case, Priya says so and explains the redirect.' },
  { n: '04', title: 'Call + context transferred', body: 'Owner name, pet details, symptoms, history and urgency move with the call.' },
  { n: '05', title: 'ER agent picks up mid-story', body: '“I have your information from the transfer.” Nothing is repeated.' },
  { n: '06', title: 'Availability confirmed, visit scheduled', body: 'Live calendar check, slot booked, treatment scheduled on the spot.' },
  { n: '07', title: 'Automated follow-ups', body: 'Confirmation, directions, pre-arrival instructions, reminders, post-treatment check-ins — SMS, WhatsApp & email.' },
]

export default function Agents({ store }) {
  return (
    <div className="space-y-6 fade-up">
      {/* Agent cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {AGENTS.map((a) => (
          <Card key={a.id} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>{CLINICS[a.clinic].name}</SectionLabel>
                <h3 className="text-lg font-semibold tracking-tight mt-1.5">{a.name}</h3>
                <div className="text-[13px] text-sage mt-0.5">{a.role}</div>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-pine bg-pine-light px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-pine live-dot" /> live
              </span>
            </div>
            <p className="text-[13px] text-sage leading-relaxed mt-4">{a.description}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.tools.map((t) => (
                <span key={t} className="font-mono text-[10.5px] bg-cream border border-line px-2 py-1 rounded-md text-sage">{t}()</span>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-line flex items-center justify-between font-mono text-[11px] text-sage">
              <span>{a.number}</span>
              <span title={a.id}>ringg · {a.ringgName}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Shared memory note */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-pine-light flex items-center justify-center text-lg shrink-0">⇄</div>
        <div className="flex-1">
          <div className="text-sm font-medium">Shared memory layer connects both agents</div>
          <div className="text-[12.5px] text-sage mt-0.5">
            Every call upserts caller, pet and case context keyed by phone number. Escalations trigger the emergency agent
            with mapped handoff variables — <span className="font-mono text-[11px]">owner_name, pet_name, reported_symptom</span>.
          </div>
        </div>
        <button onClick={() => store.setView('patients')} className="text-pine text-sm hover:underline shrink-0">View memory →</button>
      </Card>

      {/* Journey */}
      <div>
        <SectionLabel>How a call flows through Vetra</SectionLabel>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {JOURNEY.map((s, i) => (
            <div key={s.n} className={`rounded-2xl border p-4 ${i === 3 ? 'border-pine/30 bg-pine-light/50' : 'border-line bg-white'}`}>
              <div className="font-mono text-[10px] text-pine">Nº {s.n}</div>
              <div className="text-[12.5px] font-medium mt-1.5 leading-snug">{s.title}</div>
              <p className="text-[11px] text-sage mt-1.5 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
