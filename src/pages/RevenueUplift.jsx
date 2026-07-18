import { useMemo, useState } from 'react'

const BOOK_URL = 'https://cal.com/laksh-007/15min'

const SETTINGS = [
  { key: 'monthlyCalls', label: 'Monthly inbound calls', min: 50, max: 600, step: 10, suffix: ' calls/mo' },
  { key: 'missedRate', label: '% of calls currently missed', min: 5, max: 70, step: 1, suffix: '%' },
  { key: 'completionRate', label: 'AI call completion rate', min: 40, max: 95, step: 1, suffix: '%' },
  { key: 'bookingRate', label: '% of AI-handled calls that book', min: 5, max: 60, step: 1, suffix: '%' },
  { key: 'averageValue', label: 'Average visit / case value', min: 100, max: 1400, step: 25, prefix: '$' },
]

const DEFAULTS = {
  monthlyCalls: 150,
  missedRate: 30,
  completionRate: 75,
  bookingRate: 25,
  averageValue: 400,
}

export default function RevenueUplift({ onBack, onDashboard }) {
  const [inputs, setInputs] = useState(DEFAULTS)
  const results = useMemo(() => calculate(inputs), [inputs])

  const setValue = (key, value) => {
    setInputs((current) => ({ ...current, [key]: Number(value) }))
  }

  return (
    <main className="min-h-screen bg-cream text-ink" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button onClick={onBack} className="flex items-center gap-3 text-left" aria-label="Back to Vetra">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine text-cream">
              <Logo className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-none tracking-tight">Vetra</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-sage">Revenue model</span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onDashboard}
              className="hidden rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-pine/40 hover:text-pine sm:inline-flex"
            >
              Dashboard
            </button>
            <a
              href={BOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine-dark"
            >
              Book a call
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-12">
        <div className="min-w-0">
          <div className="mb-6">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pine">Missed-call revenue uplift</div>
            <h1 className="mt-3 max-w-2xl text-[34px] font-medium leading-[1.04] tracking-tight sm:text-[54px]">
              Show a clinic what Vetra{' '}
              <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic', fontWeight: 400 }}>
                can recover.
              </span>
            </h1>
          </div>

          <div className="rounded-3xl border border-line bg-white p-5 shadow-sm sm:p-8">
            <div className="space-y-7">
              {SETTINGS.map((setting) => (
                <SliderRow
                  key={setting.key}
                  setting={setting}
                  value={inputs[setting.key]}
                  onChange={(value) => setValue(setting.key, value)}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="relative overflow-hidden rounded-3xl bg-pine p-5 text-white shadow-[0_24px_80px_-32px_rgba(14,92,67,0.5)] sm:p-8 lg:self-start lg:sticky lg:top-28">
          <Logo className="pointer-events-none absolute -right-12 -bottom-14 h-60 w-60 text-white/[0.06]" />
          <div className="relative mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-pine-light">Estimated impact</div>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-pine-light/70">Based on recovered missed calls, completion rate, booking rate, and average case value.</p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-mono text-[10px] text-pine-light">
              <span className="h-1.5 w-1.5 rounded-full bg-pine-light animate-pulse" /> Live model
            </span>
          </div>

          <div className="relative divide-y divide-white/10">
            <Metric title="Calls missed per month" body="Unanswered calls after hours, busy periods, or overwhelmed staff" value={results.missedCalls} />
            <Metric title="Calls handled by AI" body="Missed calls Priya answers and engages" value={results.handledByAI} />
            <Metric title="Additional visits booked" body="New bookings from AI-recovered calls" value={`+${results.jobsBooked}`} accent />
            <Metric title="Additional monthly revenue" body="Based on your booking rate and average case value" value={formatCompactMoney(results.monthlyRevenue)} accent />
          </div>

          <div className="relative mt-5 flex items-center justify-between gap-4 rounded-2xl bg-white/10 px-5 py-4">
            <div>
              <div className="text-[14px] font-semibold">Additional annual revenue</div>
              <div className="text-[11px] text-pine-light/60">Projected over 12 months</div>
            </div>
            <div className="text-4xl font-semibold leading-none tabular text-cream sm:text-[44px]">{formatCompactMoney(results.annualRevenue)}</div>
          </div>

          <p className="relative mt-6 text-[12.5px] leading-relaxed text-pine-light/70">
            A simple estimate based on your inputs. Actual results vary by clinic hours, service mix, and demand.{' '}
            <a href={BOOK_URL} target="_blank" rel="noreferrer" className="text-cream underline underline-offset-4 hover:text-white">
              Book a call
            </a>{' '}
            for a clinic-specific projection.
          </p>
        </aside>
      </section>
    </main>
  )
}

function SliderRow({ setting, value, onChange }) {
  const percent = ((value - setting.min) / (setting.max - setting.min)) * 100
  return (
    <label className="block">
      <span className="mb-2.5 flex items-baseline justify-between gap-5">
        <span className="text-[14px] text-sage sm:text-[15px]">{setting.label}</span>
        <span className="shrink-0 text-[15px] font-semibold tabular text-pine sm:text-[17px]">
          {formatInputValue(value, setting)}
        </span>
      </span>
      <input
        type="range"
        min={setting.min}
        max={setting.max}
        step={setting.step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="revenue-slider"
        style={{
          background: `linear-gradient(90deg, #0e5c43 0%, #0e5c43 ${percent}%, #e8e6e0 ${percent}%, #e8e6e0 100%)`,
        }}
      />
    </label>
  )
}

function Metric({ title, body, value, accent = false }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-5 py-4 first:pt-0">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold leading-snug">{title}</div>
        {body && <p className="mt-1 max-w-xs text-[12px] leading-snug text-pine-light/60">{body}</p>}
      </div>
      <div className={`self-center text-right text-2xl font-semibold tabular ${accent ? 'text-cream' : 'text-white'}`}>
        {value}
      </div>
    </div>
  )
}

function calculate(inputs) {
  const missedCalls = Math.round(inputs.monthlyCalls * (inputs.missedRate / 100))
  const handledByAI = Math.round(missedCalls * (inputs.completionRate / 100))
  const jobsBooked = Math.round(handledByAI * (inputs.bookingRate / 100))
  const monthlyRevenue = jobsBooked * inputs.averageValue
  return {
    missedCalls,
    handledByAI,
    jobsBooked,
    monthlyRevenue,
    annualRevenue: monthlyRevenue * 12,
  }
}

function formatInputValue(value, setting) {
  if (setting.prefix) return `${setting.prefix}${value.toLocaleString('en-US')}`
  return `${value.toLocaleString('en-US')}${setting.suffix || ''}`
}

function formatCompactMoney(value) {
  if (value >= 1000) {
    const rounded = value / 1000
    return `$${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}k`
  }
  return `$${value.toLocaleString('en-US')}`
}

function Logo({ className = '' }) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Vetra">
      <path d="M26 34c5-12 16-20 30-20 15 0 26 9 30 21 2 7 1 13-3 17l-7 5" />
      <path d="M26 34c-8 4-13 13-13 22 0 14 11 25 25 25 4 0 8-1 11-3" />
      <path d="M44 30c5 6 7 14 6 22" />
      <path d="M46 81c-1-13 8-24 20-24 4 0 8 1 11 4l6-7 2 11c2 4 3 8 2 12" />
    </svg>
  )
}

function ArrowRight({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}
