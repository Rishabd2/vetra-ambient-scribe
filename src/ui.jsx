export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-line rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

export function SectionLabel({ children }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-sage">{children}</div>
  )
}

const URGENCY = {
  emergency: { label: 'Emergency', cls: 'bg-red-50 text-red-700 border-red-200' },
  urgent: { label: 'Urgent', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  routine: { label: 'Routine', cls: 'bg-pine-light text-pine border-pine/20' },
}

export function UrgencyBadge({ level }) {
  const u = URGENCY[level] || URGENCY.routine
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${u.cls}`}>
      {level === 'emergency' && <span className="w-1.5 h-1.5 rounded-full bg-red-600 live-dot" />}
      {u.label}
    </span>
  )
}

const STATUS = {
  needs_action: { label: 'Needs action', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  unreviewed: { label: 'Unreviewed', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  reviewed: { label: 'Reviewed', cls: 'bg-pine-light text-pine border-pine/20' },
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.unreviewed
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${s.cls}`}>{s.label}</span>
}

export function Avatar({ species }) {
  const emoji = species === 'Cat' ? '🐈' : species === 'Dog' ? '🐕' : '🐾'
  return (
    <div className="w-9 h-9 rounded-full bg-pine-light border border-pine/15 flex items-center justify-center text-base shrink-0">
      {emoji}
    </div>
  )
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-full font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-pine text-white hover:bg-pine-dark px-4 py-2',
    secondary: 'bg-white border border-line text-ink hover:border-pine/40 hover:text-pine px-4 py-2',
    ghost: 'text-pine hover:bg-pine-light px-3 py-1.5',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function ChannelIcon({ channel }) {
  const map = { SMS: '💬', WhatsApp: '🟢', Email: '✉️', Phone: '☎' }
  return <span className="text-xs">{map[channel] || '💬'}</span>
}
