import { useEffect, useRef, useState } from 'react'

const BOOK_URL = 'https://cal.com/laksh-007/15min'
const PHONE_TEL = '+917971442158'
const PHONE_DISPLAY = '+91 79714 42158'

const FLOW = [
  { n: '001', title: 'The call is answered. Every time.', body: 'A pet owner calls at 3 AM, lunch rush, or a Sunday. Priya picks up on the first ring — no hold music, no voicemail, no lost booking.' },
  { n: '002', title: 'Symptoms in, urgency out.', body: 'Structured intake: pet, age, symptom, duration, severity, red-flag screen. Emergencies are recognized in seconds, not after a callback queue.' },
  { n: '003', title: 'Honest about capacity.', body: 'If your clinic can’t take the case tonight, the caller hears it straight — and is told exactly where they’re being redirected.' },
  { n: '004', title: 'The call travels with its context.', body: 'Owner, pet, symptoms, history, urgency — everything transfers to the larger clinic’s agent. The owner never repeats themselves.', highlight: true },
  { n: '005', title: 'The ER picks up mid-story.', body: '“I have your information from the transfer.” The receiving agent confirms, checks live availability, and schedules treatment on the spot.' },
  { n: '006', title: 'Follow-ups fire themselves.', body: 'Confirmation, directions, pre-arrival instructions, reminders, post-treatment check-ins — SMS, WhatsApp and email, zero staff input.' },
  { n: '007', title: 'It remembers.', body: 'Every call writes to a shared memory keyed by phone number. When the owner calls back next month, Priya already knows Buddy.' },
]

const ic = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICONS = {
  phone: <svg viewBox="0 0 24 24" className="w-5 h-5" {...ic}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>,
  handoff: <svg viewBox="0 0 24 24" className="w-5 h-5" {...ic}><path d="M4 7h13M14 4l3 3-3 3M20 17H7M10 14l-3 3 3 3" /></svg>,
  calendar: <svg viewBox="0 0 24 24" className="w-5 h-5" {...ic}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4M9 14h2v2H9z" /></svg>,
  loop: <svg viewBox="0 0 24 24" className="w-5 h-5" {...ic}><path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4" /></svg>,
  memory: <svg viewBox="0 0 24 24" className="w-5 h-5" {...ic}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /></svg>,
  revenue: <svg viewBox="0 0 24 24" className="w-5 h-5" {...ic}><path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6" /></svg>,
}

const FEATURES = [
  { icon: ICONS.phone, title: '24/7 voice front desk', body: 'Answers, triages and books while your team treats patients — or sleeps.' },
  { icon: ICONS.handoff, title: 'Warm emergency handoff', body: 'Small clinic to specialty ER with full context. The only seamless transfer in vet care.' },
  { icon: ICONS.calendar, title: 'Calendar-native booking', body: 'Live availability checks and slot booking on your real calendar, mid-call.' },
  { icon: ICONS.loop, title: 'Automated follow-ups', body: 'SMS, WhatsApp & email sequences for every booking, transfer and treatment.' },
  { icon: ICONS.memory, title: 'Shared patient memory', body: 'Returning callers get recognized. Context persists across calls, clinics and agents.' },
  { icon: ICONS.revenue, title: 'Revenue you can see', body: 'Every call tagged captured, at-risk or missed — in dollars, not vibes.' },
]

const PLATFORM_SECTIONS = [
  {
    n: '01',
    title: 'Problem',
    kicker: 'Problem applicability',
    body: 'Vetra is built around one real clinic workflow: calls that hit voicemail, arrive after close, or land while the front desk is tied up.',
    points: ['Existing vet-clinic phone workflow', 'Specific owner, pet, reason and urgency intake', 'Voice-first because pet owners call when care feels urgent'],
  },
  {
    n: '02',
    title: 'Platform',
    kicker: 'Ringg usage',
    body: 'Priya runs as a Ringg voice assistant with clinic knowledge, custom variables, analysis fields and tool logs feeding the live dashboard.',
    points: ['Ringg inbound assistant for live intake', 'Custom variables and custom analysis', 'Live calls, transcripts and booking logs synced'],
  },
  {
    n: '03',
    title: 'Workflow',
    kicker: 'Agent quality',
    body: 'The agent handles the full front-desk loop: answer, identify the case, triage risk, book or escalate, then leave staff with a clean next action.',
    points: ['Appointment, emergency and confused-caller paths', 'Human fallback for clinical judgment', 'Clean exit with summary, action item and follow-up'],
  },
  {
    n: '04',
    title: 'Scale',
    kicker: 'Scale-up plan',
    body: 'The first metric is recovered demand: more calls answered, more cases booked, fewer abandoned voicemails, and less front-desk interruption.',
    points: ['30-day missed-call recovery baseline', 'PIMS and calendar write-back next', 'Clinic memory compounds across repeat callers'],
  },
]

function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); o.disconnect() }
    }, { threshold })
    o.observe(el)
    return () => o.disconnect()
  }, [threshold])
  return [ref, vis]
}

function Reveal({ children, delay = 0, className = '' }) {
  const [ref, vis] = useInView()
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
         className={`reveal ${vis ? 'reveal-in' : ''} ${className}`}>
      {children}
    </div>
  )
}

/* ---------- Logo ---------- */
function Logo({ className = 'w-8 h-8' }) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none"
         stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Vetra">
      <path d="M26 34c5-12 16-20 30-20 15 0 26 9 30 21 2 7 1 13-3 17l-7 5" />
      <path d="M26 34c-8 4-13 13-13 22 0 14 11 25 25 25 4 0 8-1 11-3" />
      <path d="M44 30c5 6 7 14 6 22" />
      <path d="M46 81c-1-13 8-24 20-24 4 0 8 1 11 4l6-7 2 11c2 4 3 8 2 12" />
    </svg>
  )
}

/* ---------- Floating pill nav ---------- */
function PillNav({ onEnter }) {
  const [open, setOpen] = useState(false)
  const openRevenue = (event) => {
    event?.preventDefault()
    document.getElementById('revenue-calc')?.scrollIntoView({ behavior: 'smooth' })
    setOpen(false)
  }
  return (
    <header className="flex justify-center px-3 pt-4 sm:px-4 sm:pt-6">
      <nav className="relative flex w-full max-w-[900px] items-center rounded-full border border-line bg-white/95 backdrop-blur py-2 pl-2 pr-2 shadow-sm">
        <a href="#" className="shrink-0 pl-1.5 flex items-center gap-2" aria-label="Vetra home">
          <span className="w-8 h-8 rounded-full bg-pine flex items-center justify-center text-cream">
            <Logo className="w-5 h-5" />
          </span>
          <span className="font-semibold tracking-tight">Vetra</span>
        </a>

        <div className="hidden items-center gap-5 pl-5 text-[14px] md:flex">
          <a href="#flow" className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-sage transition-colors whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-pine" /> How it works
          </a>
          <a href="#product" className="font-medium text-ink hover:text-sage transition-colors whitespace-nowrap">Product</a>
          <a href="/revenue" onClick={openRevenue} className="font-medium text-ink hover:text-sage transition-colors whitespace-nowrap">Revenue</a>
          <button onClick={onEnter} className="font-medium text-ink hover:text-sage transition-colors whitespace-nowrap">Live demo</button>
          <a href={BOOK_URL} target="_blank" rel="noreferrer" className="font-medium text-pine inline-flex items-center gap-1.5 whitespace-nowrap">
            Get a quote <Chevron className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button onClick={onEnter} aria-label="Open dashboard"
                  className="hidden md:inline-flex p-2 text-sage hover:text-ink transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <a href={BOOK_URL} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-2 rounded-full bg-pine py-1.5 pl-4 pr-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 sm:text-[14px] whitespace-nowrap">
            <span className="hidden sm:inline">Book a demo</span>
            <span className="sm:hidden">Demo</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
              <ArrowRight className="w-4 h-4" />
            </span>
          </a>
          <button className="inline-flex md:hidden p-2 text-ink" aria-label="Menu"
                  onClick={() => setOpen((v) => !v)}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>

        {open && (
          <div className="absolute left-2 right-2 top-full z-20 mt-2 rounded-2xl border border-line bg-white p-3 shadow-lg md:hidden">
            <a href="#flow" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink hover:bg-cream">How it works</a>
            <a href="#product" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink hover:bg-cream">Product</a>
            <a href="/revenue" onClick={openRevenue} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-ink hover:bg-cream">Revenue calculator</a>
            <button onClick={() => { setOpen(false); onEnter() }} className="flex w-full items-center gap-1.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium text-ink hover:bg-cream">Live demo</button>
            <a href={BOOK_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[14px] font-medium text-pine hover:bg-cream">Get a quote</a>
          </div>
        )}
      </nav>
    </header>
  )
}

function Chevron({ className = '' }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}
function ArrowRight({ className = '' }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
}
function Phone({ className = '' }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg>
}

/* ---------- Dashboard preview cards (Vetra context) ---------- */

function Gauge({ value, color = '#0e5c43', showLabels = false, min, max }) {
  const TICKS = 40
  const activeCount = Math.round((value / 100) * TICKS)
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 220 }}>
      <svg viewBox="0 0 200 120" className="block w-full">
        {Array.from({ length: TICKS }, (_, i) => {
          const angle = Math.PI + (i / (TICKS - 1)) * Math.PI
          const c = Math.cos(angle), s = Math.sin(angle)
          return (
            <line key={i} x1={100 + 70 * c} y1={100 + 70 * s} x2={100 + 80 * c} y2={100 + 80 * s}
              stroke={i < activeCount ? color : '#d4d4d8'} strokeWidth={2.5} strokeLinecap="round" />
          )
        })}
        <text x={100} y={105} textAnchor="middle" fontSize={22} fontWeight={600} fill="#16201b">{value}%</text>
      </svg>
      {showLabels && (
        <div className="flex justify-between text-[11px] text-sage -mt-1">
          <span>{min}</span><span>{max}</span>
        </div>
      )}
    </div>
  )
}

function CallsAnsweredCard() {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 min-h-[280px]">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-pine">Calls answered</span>
        <span className="text-sage">last 24h</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[28px] font-semibold leading-none tabular">147</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-pine-light px-2 py-0.5 text-[11px] font-medium text-pine">
          <TrendUp className="w-3 h-3" /> +22 (18%)
        </span>
      </div>
      <p className="mt-1 text-[11px] text-sage">Compared to yesterday</p>
      <p className="mt-4 text-center text-[12px] text-sage">First-ring pickup rate</p>
      <Gauge value={100} color="#0e5c43" showLabels min="0:00" max="0:01" />
      <div className="mt-auto pt-4">
        <Pill active="Answered" inactive="Missed" />
      </div>
    </div>
  )
}

function HandoffCard() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-5 min-h-[280px]">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-pine">Live handoff</span>
        <span className="font-mono text-[10px] text-sage uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-pine animate-pulse" /> 3:18 AM
        </span>
      </div>
      <div className="space-y-2 text-[12px]">
        <Row label="Pet" value="Buddy · Dog" />
        <Row label="Symptom" value="Limping, no weight bearing" />
        <Row label="Urgency" value={<span className="text-red-600 font-medium">Emergency</span>} />
        <Row label="From" value="Maple St. Vet" />
        <Row label="To" value="Northside ER" />
      </div>
      <div className="mt-auto flex items-center gap-3 pt-1">
        <button className="rounded-lg bg-pine px-4 py-1.5 text-[12px] font-medium text-white">Transfer with context</button>
        <button className="text-[12px] text-sage underline underline-offset-2">View transcript</button>
      </div>
    </div>
  )
}

function RevenueCard() {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 min-h-[280px]">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium text-pine">Revenue captured</span>
        <span className="text-sage">today</span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[28px] font-semibold leading-none tabular">$1,174</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          $180 missed
        </span>
      </div>
      <p className="mt-1 text-[11px] text-sage">11 booked · 1 escalated</p>
      <div className="mt-5">
        <Gauge value={86} color="#0e5c43" />
      </div>
      <div className="mt-auto pt-4">
        <Pill active="Captured" inactive="At risk" />
      </div>
    </div>
  )
}

function Pill({ active, inactive }) {
  return (
    <div className="flex rounded-full bg-cream p-1 text-[12px] font-medium">
      <button className="flex-1 rounded-full bg-white px-3 py-1.5 text-ink shadow-sm">{active}</button>
      <button className="flex-1 rounded-full px-3 py-1.5 text-sage">{inactive}</button>
    </div>
  )
}
function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sage">{label}</span><span className="text-ink">{value}</span>
    </div>
  )
}
function TrendUp({ className = '' }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="14 7 21 7 21 14" /></svg>
}

function DashboardPreview() {
  return (
    <div className="px-3 sm:px-4">
      <div className="mx-auto w-full max-w-[920px] rounded-3xl bg-cream/85 backdrop-blur p-4 sm:p-6 border border-line/60">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <CallsAnsweredCard />
          <HandoffCard />
          <RevenueCard />
        </div>
      </div>
    </div>
  )
}

/* ---------- Animated waveform background (replaces video) ---------- */
function WaveformBackdrop() {
  // 60 bars pulsing — feels like a live call visualizer
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* radial gradient base */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(120% 90% at 50% 10%, #0e5c43 0%, #0a4633 45%, #062418 100%)'
      }} />
      {/* faint logo watermark */}
      <Logo className="absolute -right-20 -top-20 w-[520px] h-[520px] text-white/[0.04]" />
      <Logo className="absolute -left-24 bottom-10 w-[380px] h-[380px] text-white/[0.03]" />
      {/* waveform bars */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center gap-[3px] px-6 opacity-50">
        {Array.from({ length: 70 }).map((_, i) => (
          <span key={i} className="block w-[3px] rounded-full bg-pine-light/60"
                style={{
                  height: `${20 + Math.sin(i * 0.6) * 30 + Math.cos(i * 0.21) * 24 + 30}px`,
                  animation: `wave 2.4s ease-in-out ${i * 60}ms infinite alternate`
                }} />
        ))}
      </div>
      {/* subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '48px 48px'
      }} />
      {/* vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/40" />
      <style>{`@keyframes wave { from { transform: scaleY(0.4); } to { transform: scaleY(1.4); } }`}</style>
    </div>
  )
}

/* ---------- Revenue calculator (Vetra theme, inline) ---------- */
function fmtK(n) {
  if (n >= 1000) {
    const r = n / 1000
    return `$${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)}k`
  }
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function CalcSlider({ label, value, onChange, min, max, step, display }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5 gap-4">
        <span className="text-[14px] text-sage">{label}</span>
        <span className="shrink-0 text-[15px] font-semibold text-pine tabular">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="vetra-range w-full"
        style={{ background: `linear-gradient(90deg, #0e5c43 ${pct}%, #e3e8e4 ${pct}%)` }}
      />
    </div>
  )
}

function RevenueCalculator() {
  const [calls, setCalls] = useState(150)
  const [missedPct, setMissedPct] = useState(30)
  const [completion, setCompletion] = useState(75)
  const [bookPct, setBookPct] = useState(25)
  const [value, setValue] = useState(400)

  const missed = Math.round(calls * (missedPct / 100))
  const handled = Math.round(missed * (completion / 100))
  const visits = Math.round(handled * (bookPct / 100))
  const monthly = visits * value
  const annual = monthly * 12

  const OUT = [
    { label: 'Calls missed per month', sub: 'Unanswered calls after hours, busy periods, or overwhelmed staff', val: missed },
    { label: 'Calls handled by AI', sub: 'Missed calls Priya answers and engages', val: handled },
    { label: 'Additional visits booked', sub: 'New bookings from AI-recovered calls', val: `+${visits}`, accent: true },
    { label: 'Additional monthly revenue', sub: 'Based on your booking rate and average case value', val: fmtK(monthly), accent: true },
  ]

  return (
    <section id="revenue-calc" className="max-w-5xl mx-auto px-6 pt-24 pb-4 scroll-mt-24">
      <style>{`
        .vetra-range { -webkit-appearance:none; appearance:none; height:6px; border-radius:9999px; outline:none; cursor:pointer; }
        .vetra-range::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; width:20px; height:20px; border-radius:9999px; background:#0e5c43; border:3px solid #fff; box-shadow:0 1px 5px rgba(14,92,67,.4); cursor:pointer; transition:transform .15s; }
        .vetra-range::-webkit-slider-thumb:hover { transform:scale(1.14); }
        .vetra-range::-moz-range-thumb { width:20px; height:20px; border-radius:9999px; background:#0e5c43; border:3px solid #fff; box-shadow:0 1px 5px rgba(14,92,67,.4); cursor:pointer; }
      `}</style>
      <Reveal>
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pine mb-3">Missed-call revenue uplift</div>
        <h2 className="text-3xl md:text-5xl font-medium tracking-tight max-w-2xl leading-[1.05]">
          Show a clinic what Vetra{' '}
          <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 400 }}>can recover.</span>
        </h2>
      </Reveal>

      <Reveal delay={80}>
        <div className="mt-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-5">
          {/* Inputs */}
          <div className="bg-white border border-line rounded-3xl p-7 md:p-8 space-y-7">
            <CalcSlider label="Monthly inbound calls" value={calls} onChange={setCalls} min={20} max={1000} step={10} display={`${calls.toLocaleString('en-US')} calls/mo`} />
            <CalcSlider label="% of calls currently missed" value={missedPct} onChange={setMissedPct} min={0} max={80} step={1} display={`${missedPct}%`} />
            <CalcSlider label="AI call completion rate" value={completion} onChange={setCompletion} min={40} max={100} step={1} display={`${completion}%`} />
            <CalcSlider label="% of AI-handled calls that book" value={bookPct} onChange={setBookPct} min={5} max={70} step={1} display={`${bookPct}%`} />
            <CalcSlider label="Average visit / case value" value={value} onChange={setValue} min={50} max={2000} step={25} display={`$${value.toLocaleString('en-US')}`} />
          </div>

          {/* Outputs */}
          <div className="relative overflow-hidden bg-pine text-white rounded-3xl p-7 md:p-8 lg:self-start">
            <Logo className="absolute -right-12 -bottom-14 w-60 h-60 text-white/[0.06] pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pine-light">Estimated impact</div>
                <p className="mt-2 max-w-xs text-[12.5px] leading-relaxed text-pine-light/70">Based on recovered missed calls, completion rate, booking rate, and average case value.</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-mono text-[10px] text-pine-light">
                <span className="w-1.5 h-1.5 rounded-full bg-pine-light animate-pulse" /> Live model
              </span>
            </div>

            <div className="relative mt-6 divide-y divide-white/10">
              {OUT.map((o) => (
                <div key={o.label} className="grid grid-cols-[1fr_auto] gap-4 py-4 first:pt-0">
                  <div className="min-w-0">
                    <div className="text-[15px] font-semibold leading-snug">{o.label}</div>
                    <div className="text-[12px] text-pine-light/60 leading-snug mt-1">{o.sub}</div>
                  </div>
                  <div className={`self-center text-right text-2xl font-semibold tabular ${o.accent ? 'text-cream' : 'text-white'}`}>{o.val}</div>
                </div>
              ))}
            </div>

            <div className="relative mt-5 rounded-2xl bg-white/10 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[14px] font-semibold">Additional annual revenue</div>
                <div className="text-[11px] text-pine-light/60">Projected over 12 months</div>
              </div>
              <div className="text-4xl font-semibold tabular text-cream leading-none">{fmtK(annual)}</div>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={120}>
        <p className="mt-5 text-[12.5px] text-sage max-w-2xl leading-relaxed">
          A simple estimate based on your inputs. Actual results vary by clinic hours, service mix, and demand.{' '}
          <a href={BOOK_URL} target="_blank" rel="noreferrer" className="text-pine underline underline-offset-2 hover:text-pine-dark">Book a call</a>{' '}
          for a clinic-specific projection.
        </p>
      </Reveal>
    </section>
  )
}

/* ---------- Page ---------- */
export default function Landing2({ onEnter }) {
  return (
    <main className="min-h-screen w-full bg-cream p-3 sm:p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <section className="relative h-[calc(100vh-24px)] min-h-[760px] w-full overflow-hidden rounded-2xl bg-pine sm:h-[calc(100vh-32px)] sm:rounded-3xl">
        <WaveformBackdrop />

        <div className="relative z-10">
          <PillNav onEnter={onEnter} />

          <div className="flex flex-col items-center px-4 pb-8 pt-10 text-center sm:pb-12 sm:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur px-4 py-1.5 text-[13px] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-pine animate-pulse" />
              Voice AI front desk · live for veterinary clinics
            </span>

            <h1 className="mt-5 max-w-4xl text-white sm:mt-6"
                style={{ fontSize: 'clamp(36px, 7.5vw, 68px)', lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.02em' }}>
              Every missed call is a{' '}
              <span style={{ fontFamily: "'Instrument Serif', 'Georgia', serif", fontStyle: 'italic', fontWeight: 400 }}>
                patient
              </span>
              <br />
              someone else treats.
            </h1>

            <p className="mt-4 max-w-xl px-2 text-pine-light sm:mt-6" style={{ fontSize: 'clamp(13px, 3.5vw, 16px)' }}>
              Vetra answers, triages, books, transfers with full context — and follows up so nothing falls through.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={BOOK_URL} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-3 rounded-full bg-cream py-2 pl-6 pr-2 text-[14px] font-medium text-pine sm:py-2.5 sm:pl-7">
                Book a 15-min demo
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pine text-white sm:h-7 sm:w-7">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </a>
              <a href={`tel:${PHONE_TEL}`}
                 className="inline-flex items-center gap-2 rounded-full border border-white/30 py-2 px-5 text-[14px] font-medium text-white transition-colors hover:bg-white/10 sm:py-2.5">
                <Phone className="w-4 h-4 text-pine-light" />
                Call Priya now
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]">
              <a href={`tel:${PHONE_TEL}`} className="font-mono text-pine-light hover:text-white transition-colors">{PHONE_DISPLAY}</a>
              <button onClick={() => document.getElementById('revenue-calc')?.scrollIntoView({ behavior: 'smooth' })}
                      className="font-medium text-pine-light hover:text-white transition-colors underline underline-offset-4">
                Estimate revenue →
              </button>
              <button onClick={onEnter}
                      className="font-medium text-pine-light hover:text-white transition-colors underline underline-offset-4">
                Open live dashboard →
              </button>
            </div>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* ===== Lower segment (cream) ===== */}

      {/* Revenue calculator (top of lower segment) */}
      <RevenueCalculator />

      {/* Flow */}
      <section id="flow" className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pine mb-3">How it works</div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight max-w-2xl leading-[1.05]">
            One call, two clinics,{' '}
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 400 }}>zero</span>{' '}
            dropped context.
          </h2>
        </Reveal>
        <div className="mt-12 space-y-0">
          {FLOW.map((s, i) => (
            <Reveal key={s.n} delay={Math.min(i * 60, 240)}>
              <div className={`grid md:grid-cols-[120px_1fr_1.4fr] gap-4 md:gap-8 py-7 ${
                s.highlight
                  ? 'bg-pine text-cream -mx-6 px-6 rounded-2xl'
                  : 'border-t border-line'
              }`}>
                <div className={`font-mono text-sm ${s.highlight ? 'text-pine-light' : 'text-pine'}`}>Nº {s.n}</div>
                <div className="text-lg font-medium tracking-tight leading-snug">{s.title}</div>
                <p className={`text-[15px] leading-relaxed ${s.highlight ? 'text-pine-light/90' : 'text-sage'}`}>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Product */}
      <section id="product" className="max-w-5xl mx-auto px-6 pb-20">
        <Reveal>
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pine mb-3">Platform</div>
          <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-[1.05]">
            Built as a platform,{' '}
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 400 }}>not a script.</span>
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-sage">
            Each layer maps to the live demo: a real clinic phone problem, a Ringg-powered assistant, a working front-desk flow and a measurable path to scale.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {PLATFORM_SECTIONS.map((section, i) => (
            <Reveal key={section.title} delay={(i % 2) * 90}>
              <div className="lift h-full rounded-2xl border border-line bg-white p-6 hover:border-pine/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-pine">{section.kicker}</div>
                    <h3 className="mt-2 text-2xl font-medium tracking-tight">{section.title}</h3>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine-light font-mono text-[12px] text-pine">
                    {section.n}
                  </span>
                </div>
                <p className="mt-4 text-[14px] leading-relaxed text-sage">{section.body}</p>
                <ul className="mt-5 space-y-2.5">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-[13.5px] leading-snug text-ink">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {FEATURES.slice(0, 3).map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <div className="h-full rounded-2xl border border-line bg-pine-light/45 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-pine">{f.icon}</div>
                  <div className="font-medium tracking-tight">{f.title}</div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-sage">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Integration strip */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <Reveal>
          <div className="border border-line rounded-2xl bg-white px-8 py-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 font-mono text-[12px] text-sage">
            <span className="uppercase tracking-[0.15em] text-[10px]">Runs on</span>
            <span>Ringg voice assistant</span><span>·</span>
            <span>Twilio telephony</span><span>·</span>
            <span>cal.com scheduling</span><span>·</span>
            <span>WhatsApp & SMS</span>
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-pine text-white p-10 md:p-16 text-center">
            <Logo className="absolute -right-10 -bottom-16 w-72 h-72 text-white/[0.06] pointer-events-none" />
            <h2 className="text-3xl md:text-5xl font-medium tracking-tight leading-[1.05]">
              Hear it answer your{' '}
              <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 400 }}>clinic’s phone.</span>
            </h2>
            <p className="mt-4 text-pine-light/90 max-w-md mx-auto">
              15 minutes. We’ll call your number live, triage a case, and book it on a real calendar.
              Or call Priya right now and hear it yourself.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href={BOOK_URL} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-3 rounded-full bg-cream py-2.5 pl-7 pr-2 text-[14px] font-medium text-pine">
                Book a 15-min demo
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pine text-white">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </a>
              <a href={`tel:${PHONE_TEL}`}
                 className="inline-flex items-center gap-2 rounded-full border border-white/30 py-2.5 px-6 text-[14px] font-medium text-white transition-colors hover:bg-white/10">
                <Phone className="w-4 h-4 text-pine-light" />
                Call {PHONE_DISPLAY}
              </a>
              <button onClick={onEnter}
                      className="text-[14px] font-medium text-pine-light hover:text-white transition-colors underline underline-offset-4">
                Open the dashboard →
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-[13px] text-sage">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-pine flex items-center justify-center text-cream">
              <Logo className="w-4 h-4" />
            </span>
            <span className="font-medium text-ink">Vetra</span>
            <span className="font-mono text-[11px] ml-2">FRONT DESK AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href={`tel:${PHONE_TEL}`} className="hover:text-ink transition-colors font-mono text-[12px] flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />{PHONE_DISPLAY}
            </a>
            <a href={BOOK_URL} target="_blank" rel="noreferrer" className="hover:text-ink transition-colors">Book a demo</a>
            <button onClick={onEnter} className="hover:text-ink transition-colors">Live dashboard</button>
            <a href="https://github.com/lakshraj07" target="_blank" rel="noreferrer" className="hover:text-ink transition-colors flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg>
              lakshraj07
            </a>
            <span className="font-mono text-[11px]">© 2026 Vetra</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
