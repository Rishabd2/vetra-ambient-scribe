import { useEffect, useMemo, useState } from 'react'
import { fetchCalSlots } from '../calLive.js'
import { Button, SectionLabel } from '../ui.jsx'

export default function BookingModal({ call, appointments, onClose, onConfirm }) {
  const [kind, setKind] = useState(defaultKind(call))
  const [ownerName, setOwnerName] = useState(call.caller.name === 'Unknown caller' ? '' : call.caller.name)
  const [phone, setPhone] = useState(call.caller.phone === 'Unknown number' ? '' : call.caller.phone)
  const [email, setEmail] = useState('')
  const [date, setDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [slotState, setSlotState] = useState({ status: 'loading', days: [], slotsByDate: {}, timeZone: '' })
  const [submitState, setSubmitState] = useState({ status: 'idle', message: '' })

  const taken = useMemo(
    () => new Set(appointments.filter((a) => a.date === date).map((a) => a.time)),
    [appointments, date],
  )
  const slotsForDate = useMemo(
    () => (slotState.slotsByDate?.[date] || []).filter((slot) => !taken.has(slot.time)),
    [date, slotState.slotsByDate, taken],
  )

  useEffect(() => {
    let cancelled = false

    fetchCalSlots({ days: 10 })
      .then((payload) => {
        if (cancelled) return
        const days = payload.days || []
        const slotsByDate = payload.slotsByDate || {}
        const firstBookableDay = days.find((day) => (slotsByDate[day] || []).length > 0) || days[0] || ''
        setSlotState({
          status: payload.connected ? 'ready' : 'offline',
          message: payload.message || '',
          days,
          slotsByDate,
          timeZone: payload.timeZone || '',
          eventType: payload.eventType || {},
        })
        setDate((current) => (days.includes(current) ? current : firstBookableDay))
        setSelectedSlot(null)
      })
      .catch((error) => {
        if (cancelled) return
        setSlotState({
          status: 'error',
          message: error.message || 'Unable to load Cal.com slots.',
          days: [],
          slotsByDate: {},
          timeZone: '',
        })
      })

    return () => { cancelled = true }
  }, [])

  const handleDateChange = (nextDate) => {
    setDate(nextDate)
    setSelectedSlot(null)
  }

  const handleConfirm = async () => {
    if (!selectedSlot || submitState.status === 'submitting') return
    setSubmitState({ status: 'submitting', message: '' })
    try {
      await onConfirm({
        call,
        date: selectedSlot.date,
        time: selectedSlot.time,
        start: selectedSlot.start,
        timeZone: slotState.timeZone,
        kind,
        ownerName,
        phone,
        email,
      })
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error.message || 'Unable to create Cal.com booking.',
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl fade-up overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-line">
          <SectionLabel>Book appointment</SectionLabel>
          <div className="text-lg font-semibold tracking-tight mt-1 break-words">
            {call.pet.name} <span className="text-sage font-normal text-base">· {call.caller.name}{call.pet.breed ? ` · ${call.pet.breed}` : ''}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-sage">
            {slotState.timeZone ? `Cal.com · ${slotState.timeZone}` : 'Cal.com'}
          </div>
        </div>

        <div className="px-5 sm:px-7 py-5 space-y-5 overflow-y-auto flex-1">
          {/* Visit type */}
          <div>
            <div className="text-[12px] text-sage mb-1.5">Visit type</div>
            <input
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-pine/50 bg-cream/40"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] text-sage mb-1.5">Owner name</div>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-pine/50 bg-cream/40"
              />
            </div>
            <div>
              <div className="text-[12px] text-sage mb-1.5">Phone</div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-pine/50 bg-cream/40"
              />
            </div>
          </div>

          <div>
            <div className="text-[12px] text-sage mb-1.5">Email <span className="text-sage/60">(optional)</span></div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full border border-line rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-pine/50 bg-cream/40"
            />
          </div>

          {/* Day strip */}
          <div>
            <div className="text-[12px] text-sage mb-1.5">Date</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {slotState.status === 'loading' && (
                <div className="text-[12px] text-sage py-2">Loading Cal.com availability...</div>
              )}
              {slotState.days.map((iso) => {
                const d = new Date(iso + 'T00:00:00')
                const active = iso === date
                const hasSlots = (slotState.slotsByDate?.[iso] || []).length > 0
                return (
                  <button
                    key={iso}
                    onClick={() => handleDateChange(iso)}
                    className={`shrink-0 w-[64px] rounded-xl border px-2 py-2 text-center transition-colors ${
                      active ? 'border-pine bg-pine text-white' : 'border-line bg-white hover:border-pine/40'
                    }`}
                  >
                    <div className={`font-mono text-[9.5px] uppercase ${active ? 'text-pine-light' : 'text-sage'}`}>
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-sm font-semibold tabular">{d.getDate()}</div>
                    <div className={`font-mono text-[9.5px] ${active ? 'text-pine-light' : 'text-sage'}`}>
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div className={`mt-1 mx-auto w-1.5 h-1.5 rounded-full ${hasSlots ? active ? 'bg-pine-light' : 'bg-pine' : 'bg-slate-200'}`} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Slot grid */}
          <div>
            <div className="text-[12px] text-sage mb-1.5">
              Available slots <span className="font-mono text-[10px]">· synced with Cal.com</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {slotsForDate.map((slot) => {
                const active = slot.id === selectedSlot?.id
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border px-2 py-2 font-mono text-[12px] tabular transition-colors ${
                      active
                        ? 'border-pine bg-pine text-white'
                        : 'border-line bg-white hover:border-pine/50'
                    }`}
                  >
                    {slot.time}
                  </button>
                )
              })}
            </div>
            {slotState.status === 'error' && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {slotState.message}
              </div>
            )}
            {slotState.status !== 'loading' && slotState.status !== 'error' && date && slotsForDate.length === 0 && (
              <div className="mt-3 rounded-xl border border-line bg-cream/50 px-3 py-2 text-[12px] text-sage">
                No Cal.com slots are open for this date.
              </div>
            )}
            {submitState.status === 'error' && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {submitState.message}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-cream/40">
          <div className="text-[12px] text-sage">
            Cal.com will create the visit; Vetra queues the call follow-ups.
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button disabled={!selectedSlot || submitState.status === 'submitting'} onClick={handleConfirm}>
              {submitState.status === 'submitting' ? 'Booking...' : 'Confirm booking'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function defaultKind(call) {
  if (call.urgency === 'emergency') return 'Emergency intake'
  if (call.urgency === 'urgent') return 'Same-day urgent visit'
  return 'Wellness visit'
}
