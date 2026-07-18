import { useEffect, useMemo, useRef, useState } from 'react'
import { AGENTS, MEMORY_ROWS, SEED_CALLS, SEED_APPOINTMENTS, SEED_FOLLOWUPS, NOW } from './data.js'
import {
  RINGG_AGENT_LABEL,
  RINGG_POLL_MS,
  appointmentsFromCalls,
  fetchRinggCalls,
  followupsFromCalls,
  getDashboardDate,
  memoryRowsFromCalls,
  mergeRinggCalls,
} from './ringgLive.js'
import { createCalBooking } from './calLive.js'
import Overview from './pages/Overview.jsx'
import Calls from './pages/Calls.jsx'
import CalendarPage from './pages/Calendar.jsx'
import FollowUps from './pages/FollowUps.jsx'
import Patients from './pages/Patients.jsx'
import Agents from './pages/Agents.jsx'
import CallDrawer from './pages/CallDrawer.jsx'
import BookingModal from './pages/BookingModal.jsx'
import Landing2 from './pages/Landing2.jsx'
import ActionsPopup from './pages/ActionsPopup.jsx'
import RevenueUplift from './pages/RevenueUplift.jsx'

const ni = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const NAV = [
  { id: 'overview', label: 'Overview', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" {...ni}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg> },
  { id: 'calls', label: 'Calls', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" {...ni}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" /></svg> },
  { id: 'calendar', label: 'Calendar', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" {...ni}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg> },
  { id: 'followups', label: 'Follow-ups', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" {...ni}><path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4" /></svg> },
  { id: 'patients', label: 'Patients', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" {...ni}><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 11.5a3 3 0 1 0-1-5.8M21 20c0-2.6-1.6-4.6-4-5.2" /></svg> },
  { id: 'agents', label: 'Agents', icon: <svg viewBox="0 0 24 24" className="w-4 h-4" {...ni}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3" /></svg> },
]

export default function App() {
  const [view, setView] = useState(() => getInitialView())
  const [calls, setCalls] = useState(SEED_CALLS)
  const [appointments, setAppointments] = useState(SEED_APPOINTMENTS)
  const [followups, setFollowups] = useState(SEED_FOLLOWUPS)
  const [memoryRows, setMemoryRows] = useState(MEMORY_ROWS)
  const [dashboardDate, setDashboardDate] = useState(NOW.toISOString().slice(0, 10))
  const [openCallId, setOpenCallId] = useState(null)
  const [bookingCallId, setBookingCallId] = useState(null)
  const [actionsCallId, setActionsCallId] = useState(null)
  const [toast, setToast] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [ringgSync, setRinggSync] = useState({ state: 'syncing', message: `Connecting to ${RINGG_AGENT_LABEL}` })

  // Latest calls for the poll loop to merge against (the effect runs once, so a
  // ref avoids a stale closure without re-subscribing the interval every render).
  const callsRef = useRef(calls)
  useEffect(() => { callsRef.current = calls }, [calls])
  // First successful Ringg connect replaces the seed data wholesale; later polls
  // merge so user edits to live calls survive. Without this, seed/other-agent
  // calls (which never match a live executionId) would linger after connecting.
  const connectedRef = useRef(false)

  const openCall = useMemo(() => calls.find((c) => c.id === openCallId), [calls, openCallId])
  const bookingCall = useMemo(() => calls.find((c) => c.id === bookingCallId), [calls, bookingCallId])
  const actionsCall = useMemo(() => calls.find((c) => c.id === actionsCallId), [calls, actionsCallId])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const updateCalls = (updater) => {
    setCalls((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater
      callsRef.current = next
      return next
    })
  }

  useEffect(() => {
    const handlePop = () => setView(getInitialView())
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer

    const sync = async ({ quiet = false } = {}) => {
      try {
        const payload = await fetchRinggCalls()
        if (cancelled) return

        if (payload.connected) {
          const liveCalls = payload.calls || []
          // Merge live executions onto current state so a booking/review the user
          // just made on screen survives the next 8s poll (mergeCall keeps booked,
          // reviewed status, and user-touched action items). Derive the dependent
          // collections from the merged calls — not the raw payload — so locally
          // confirmed bookings still appear on the calendar and follow-up queue.
          const base = connectedRef.current ? callsRef.current : []
          connectedRef.current = true
          const merged = mergeRinggCalls(base, liveCalls)
          callsRef.current = merged
          setCalls(merged)
          setAppointments(mergeAppointments(SEED_APPOINTMENTS, appointmentsFromCalls(merged)))
          setFollowups(followupsFromCalls(merged))
          setMemoryRows(memoryRowsFromCalls(merged))
          setDashboardDate(payload.dashboardDate || getDashboardDate(merged))
          const agentName = payload.agent?.name || RINGG_AGENT_LABEL
          setRinggSync({
            state: 'connected',
            message: `${agentName} live · ${liveCalls.length} calls synced`,
          })
        } else {
          setRinggSync({ state: 'demo', message: payload.message || 'Demo data · Ringg API key missing' })
        }
      } catch {
        if (!cancelled && !quiet) {
          setRinggSync({ state: 'demo', message: 'Demo data · Ringg sync unavailable locally' })
        }
      }
    }

    sync()
    timer = window.setInterval(() => sync({ quiet: true }), RINGG_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const toggleAction = (callId, actionId) => {
    updateCalls((cs) =>
      cs.map((c) => {
        if (c.id !== callId) return c
        const nextActions = (c.nextActions || []).map((a) => (a.id === actionId ? { ...a, done: !a.done } : a))
        const hasOpenActions = nextActions.some((a) => !a.done)
        return {
          ...c,
          nextActions,
          status: hasOpenActions ? 'needs_action' : 'reviewed',
          coverage: hasOpenActions && c.coverage === 'covered' ? 'at_risk' : c.coverage,
          reviewedAt: hasOpenActions ? null : new Date().toISOString(),
        }
      }),
    )
  }

  const addAction = (callId, label, type) => {
    updateCalls((cs) =>
      cs.map((c) =>
        c.id === callId
          ? {
              ...c,
              status: 'needs_action',
              coverage: c.coverage === 'covered' ? 'at_risk' : c.coverage,
              reviewedAt: null,
              nextActions: [...(c.nextActions || []), { id: 'a-' + c.id + '-' + ((c.nextActions || []).length + 1), label, type, done: false }],
            }
          : c,
      ),
    )
    showToast('Action item added')
  }

  const markReviewed = (callId) => {
    updateCalls((cs) => cs.map((c) => (
      c.id === callId
        ? {
            ...c,
            status: 'reviewed',
            coverage: c.coverage === 'at_risk' ? 'covered' : c.coverage,
            reviewedAt: new Date().toISOString(),
            nextActions: (c.nextActions || []).map((action) => ({ ...action, done: true })),
          }
        : c
    )))
    showToast('Call marked as reviewed')
  }

  const confirmBooking = async ({ call, date, time, start, timeZone, kind, ownerName, phone, email }) => {
    const result = await createCalBooking({ call, start, date, time, timeZone, kind, ownerName, phone, email })
    const booking = result.booking || {}
    const bookedDate = booking.date || date
    const bookedTime = booking.time || time
    const apptId = booking.uid || 'ap-' + call.id + '-' + bookedTime.replace(':', '')
    setAppointments((as) => [
      ...as,
      {
        id: apptId,
        date: bookedDate,
        time: bookedTime,
        dur: booking.duration || 30,
        pet: call.pet.name,
        owner: ownerName || call.caller.name,
        kind,
        source: 'agent',
        callId: call.id,
        calBookingUid: booking.uid,
      },
    ])
    updateCalls((cs) =>
      cs.map((c) =>
        c.id === call.id
          ? {
              ...c,
              booked: { date: bookedDate, time: bookedTime, kind, calBookingUid: booking.uid },
              status: 'reviewed',
              coverage: 'covered',
              reviewedAt: new Date().toISOString(),
              nextActions: (c.nextActions || []).map((a) => (a.type === 'book' ? { ...a, done: true } : a)),
            }
          : c,
      ),
    )
    const dayBefore = new Date(bookedDate + 'T' + bookedTime + ':00')
    dayBefore.setDate(dayBefore.getDate() - 1)
    setFollowups((fs) => [
      {
        id: 'fu-' + apptId,
        petOwner: `${call.caller.name} · ${call.pet.name}`,
        callId: call.id,
        steps: [
          { channel: 'SMS', label: `Cal.com booking confirmation - ${fmtDateLong(bookedDate)}, ${fmtClock(bookedTime)}`, at: NOW.toISOString(), status: 'sent' },
          { channel: 'WhatsApp', label: 'Clinic directions + what to bring', at: NOW.toISOString(), status: 'sent' },
          { channel: 'SMS', label: 'Reminder (24h before)', at: dayBefore.toISOString(), status: 'scheduled' },
          { channel: 'SMS', label: 'Post-visit check-in', at: bookedDate + 'T19:00:00', status: 'scheduled' },
        ],
      },
      ...fs,
    ])
    setBookingCallId(null)
    showToast(`Booked ${call.pet.name} in Cal.com · ${fmtDateLong(bookedDate)} ${fmtClock(bookedTime)}`)
  }

  const navigate = (nextView, path = '/') => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setView(nextView)
  }

  const openLanding = () => navigate('landing', '/')
  const openDashboard = () => navigate('overview', '/')

  const store = {
    calls, appointments, followups, memoryRows, dashboardDate, ringgSync,
    openCall: (id) => setOpenCallId(id),
    startBooking: (id) => setBookingCallId(id),
    openActions: (id) => setActionsCallId(id),
    toggleAction, addAction, markReviewed, setView,
  }

  if (view === 'landing') {
    return <Landing2 onEnter={openDashboard} />
  }

  if (view === 'revenue') {
    return <RevenueUplift onBack={openLanding} onDashboard={openDashboard} />
  }

  return (
    <div className="min-h-screen flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-ink/25 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar */}
      <aside
        className={`w-56 shrink-0 border-r border-line bg-white flex flex-col fixed inset-y-0 z-40 transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button onClick={openLanding} className="px-5 pt-6 pb-5 flex items-center gap-2.5 text-left" title="Back to site">
          <div className="w-8 h-8 rounded-lg bg-pine flex items-center justify-center">
            <svg viewBox="0 0 96 96" className="w-6 h-6" fill="none" stroke="#faf9f6" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M26 34c5-12 16-20 30-20 15 0 26 9 30 21 2 7 1 13-3 17l-7 5" />
              <path d="M26 34c-8 4-13 13-13 22 0 14 11 25 25 25 4 0 8-1 11-3" />
              <path d="M44 30c5 6 7 14 6 22" />
              <path d="M46 81c-1-13 8-24 20-24 4 0 8 1 11 4l6-7 2 11c2 4 3 8 2 12" />
            </svg>
          </div>
          <div>
            <div className="font-semibold tracking-tight leading-none">Vetra</div>
            <div className="text-[10px] text-sage font-mono mt-0.5 tracking-wide">FRONT DESK AI</div>
          </div>
        </button>
        <nav className="px-3 space-y-0.5 flex-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => { setView(n.id); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${
                view === n.id ? 'bg-pine-light text-pine font-medium' : 'text-sage hover:text-ink hover:bg-cream'
              }`}
            >
              <span className="w-4 flex items-center justify-center shrink-0">{n.icon}</span>
              {n.label}
              {n.id === 'calls' && (
                <span className="ml-auto font-mono text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                  {calls.filter((c) => c.status === 'needs_action').length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-pine text-white flex items-center justify-center text-xs font-semibold">DB</div>
            <div className="min-w-0">
              <div className="text-sm font-medium leading-tight truncate">Debra B.</div>
              <div className="text-[11px] text-sage">Practice Manager</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-56 min-w-0">
        <header className="sticky top-0 z-20 bg-cream/85 backdrop-blur border-b border-line">
          <div className="px-4 sm:px-8 py-4 max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden -ml-1 p-1.5 text-sage hover:text-ink shrink-0"
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight capitalize">{NAV.find((n) => n.id === view)?.label}</h1>
              <div className="text-[12px] text-sage truncate">Maple Street Vet Clinic · {formatDashboardDate(dashboardDate)}</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-sage shrink-0">
            <span className={`w-2 h-2 rounded-full ${ringgSync.state === 'connected' ? 'bg-pine live-dot' : 'bg-amber-400'}`} />
            {AGENTS.length} agents live
            <span className="text-sage/50">·</span>
            {ringgSync.state === 'connected' ? ringgSync.message : 'Demo'}
          </div>
          </div>
        </header>

        <div className="px-4 sm:px-8 py-6 max-w-7xl mx-auto">
          {view === 'overview' && <Overview store={store} />}
          {view === 'calls' && <Calls store={store} />}
          {view === 'calendar' && <CalendarPage store={store} />}
          {view === 'followups' && <FollowUps store={store} />}
          {view === 'patients' && <Patients store={store} />}
          {view === 'agents' && <Agents store={store} />}
        </div>
      </main>

      {openCall && (
        <CallDrawer
          call={openCall}
          calls={calls}
          onClose={() => setOpenCallId(null)}
          onBook={() => setBookingCallId(openCall.id)}
          onToggleAction={toggleAction}
          onAddAction={addAction}
          onMarkReviewed={markReviewed}
          onOpenCall={setOpenCallId}
        />
      )}

      {actionsCall && !openCall && !bookingCall && (
        <ActionsPopup
          call={actionsCall}
          onClose={() => setActionsCallId(null)}
          onToggle={(actionId) => toggleAction(actionsCall.id, actionId)}
          onAdd={(label, type) => addAction(actionsCall.id, label, type)}
          onBook={() => { setActionsCallId(null); setBookingCallId(actionsCall.id) }}
          onOpenCall={(id) => { setActionsCallId(null); setOpenCallId(id) }}
        />
      )}

      {bookingCall && (
        <BookingModal
          call={bookingCall}
          appointments={appointments}
          onClose={() => setBookingCallId(null)}
          onConfirm={confirmBooking}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 fade-up">
          <div className="bg-ink text-cream text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2">
            <span className="text-pine-light">✓</span> {toast}
          </div>
        </div>
      )}
    </div>
  )
}

function fmtDateLong(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function fmtClock(time) {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDashboardDate(date) {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInitialView() {
  if (typeof window === 'undefined') return 'landing'
  const params = new URLSearchParams(window.location.search)
  if (window.location.pathname === '/revenue' || window.location.hash === '#revenue' || params.get('page') === 'revenue') {
    return 'revenue'
  }
  return 'landing'
}

function mergeAppointments(sampleAppointments, liveAppointments) {
  const seen = new Set()
  return [...liveAppointments, ...sampleAppointments].filter((appointment) => {
    const key = appointment.calBookingUid ||
      appointment.id ||
      `${appointment.date}-${appointment.time}-${appointment.pet}-${appointment.owner}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
