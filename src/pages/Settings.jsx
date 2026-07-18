import { Card } from '../ui.jsx'

// Settings — clinic + integration status. Read-only status surface for the
// demo: shows the live Haley/Vapi/Cal/Supabase wiring at a glance.
export default function Settings({ store }) {
  const connected = store?.vapiSync?.state === 'connected'
  const syncMsg = store?.vapiSync?.message || 'Demo data'

  return (
    <div className="space-y-5 fade-up max-w-3xl">
      <Card className="p-5">
        <h2 className="font-semibold text-lg mb-1">Clinic</h2>
        <p className="text-sm text-sage mb-4">Urbana Paws Clinic · Dr. Martinez</p>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Item label="Clinic name" value="Urbana Paws Clinic" />
          <Item label="Timezone" value="America/Chicago (Central)" />
          <Item label="Hours" value="Mon–Fri 8:00–18:00 · Sat 9:00–15:00" />
          <Item label="Mode" value={connected ? 'Live' : 'Demo'} tone={connected ? 'pine' : 'amber'} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-lg mb-4">Integrations</h2>
        <div className="space-y-3">
          <Integration
            name="Haley — Voice assistant (Vapi)"
            detail="+1 (779) 771-3524 · scheduling & intake"
            status={connected ? 'Connected' : 'Demo'}
            ok={connected}
            sub={syncMsg}
          />
          <Integration name="Cal.com — Scheduling" detail="Live slot lookup & booking" status="Connected" ok sub="30-min event type · Central time" />
          <Integration name="Supabase — Patient memory" detail="Persistent patient records across calls" status="Connected" ok sub="vetra_patient_memory" />
          <Integration name="Vercel — Hosting" detail="cv-vetra.vercel.app" status="Deployed" ok sub="Production" />
        </div>
      </Card>

      <p className="text-[12px] text-sage">
        Status reflects the running dashboard. Live indicators turn green when the Vapi sync is connected; otherwise the app runs on demo data with the same workflow.
      </p>
    </div>
  )
}

function Item({ label, value, tone }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line/60 pb-2">
      <span className="text-sage">{label}</span>
      <span className={`text-right ${tone === 'pine' ? 'text-pine font-medium' : tone === 'amber' ? 'text-amber-700 font-medium' : 'text-ink'}`}>{value}</span>
    </div>
  )
}

function Integration({ name, detail, status, ok, sub }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-white px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-sm">{name}</div>
        <div className="text-[12px] text-sage">{detail}</div>
        {sub && <div className="text-[11px] text-sage/70 font-mono mt-0.5 truncate">{sub}</div>}
      </div>
      <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium shrink-0 ${ok ? 'text-pine' : 'text-amber-700'}`}>
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-pine live-dot' : 'bg-amber-400'}`} />
        {status}
      </span>
    </div>
  )
}
