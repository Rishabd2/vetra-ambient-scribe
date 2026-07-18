import { useState } from 'react'
import { Button, SectionLabel, UrgencyBadge } from '../ui.jsx'

const TYPES = [
  { id: 'book', label: 'Book' },
  { id: 'callback', label: 'Callback' },
  { id: 'message', label: 'Message' },
  { id: 'review', label: 'Review' },
]

export function ActionList({ call, onToggle, onAdd, onBookAction }) {
  const [text, setText] = useState('')
  const [type, setType] = useState('callback')

  const submit = () => {
    const label = text.trim()
    if (!label) return
    onAdd(label, type)
    setText('')
  }

  return (
    <div>
      <div className="space-y-1.5">
        {(call.nextActions || []).map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${
              a.done ? 'border-line bg-cream/40' : 'border-line bg-white hover:border-pine/30'
            }`}
          >
            <input
              type="checkbox"
              checked={a.done}
              onChange={() => onToggle(a.id)}
              className="accent-pine w-4 h-4 cursor-pointer shrink-0"
            />
            <span className={`text-sm flex-1 ${a.done ? 'line-through text-sage' : ''}`}>{a.label}</span>
            {a.type === 'book' && !a.done && !call.booked && onBookAction ? (
              <button
                onClick={onBookAction}
                className="font-mono text-[10px] uppercase tracking-wider bg-pine text-white px-2.5 py-1 rounded-full hover:bg-pine-dark transition-colors shrink-0"
              >
                Book now →
              </button>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-wider text-sage shrink-0">{a.type}</span>
            )}
          </div>
        ))}
        {(call.nextActions || []).length === 0 && (
          <div className="px-3.5 py-4 rounded-xl border border-dashed border-line text-center text-sm text-sage">
            No action items — add one below.
          </div>
        )}
      </div>

      {/* Add new */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Add an action item…"
          className="flex-1 min-w-[180px] border border-line rounded-xl px-3.5 py-2.5 text-sm bg-cream/40 focus:outline-none focus:border-pine/50 focus:bg-white transition-colors"
        />
        <div className="flex rounded-xl border border-line overflow-hidden shrink-0">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`px-2 py-2.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                type === t.id ? 'bg-ink text-cream' : 'bg-white text-sage hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button onClick={submit} disabled={!text.trim()} className="shrink-0">Add</Button>
      </div>
    </div>
  )
}

export default function ActionsPopup({ call, onClose, onToggle, onAdd, onBook, onOpenCall }) {
  const open = (call.nextActions || []).filter((a) => !a.done).length
  const done = (call.nextActions || []).filter((a) => a.done).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl fade-up overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 sm:px-7 pt-6 pb-4 border-b border-line flex items-start justify-between">
          <div>
            <SectionLabel>Next actions</SectionLabel>
            <div className="flex items-center gap-2.5 mt-1.5">
              <span className="text-lg font-semibold tracking-tight">{call.pet.name}</span>
              <span className="text-sm text-sage">· {call.caller.name}</span>
              <UrgencyBadge level={call.urgency} />
            </div>
            <div className="text-[12px] text-sage mt-0.5">{call.reason}</div>
          </div>
          <button onClick={onClose} className="text-sage hover:text-ink text-lg leading-none p-1">✕</button>
        </div>

        <div className="px-5 sm:px-7 py-5 overflow-y-auto flex-1">
          <ActionList call={call} onToggle={onToggle} onAdd={onAdd} onBookAction={onBook} />
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-cream/40">
          <span className="font-mono text-[11px] text-sage">
            {done} done · <span className={open > 0 ? 'text-amber-700' : 'text-pine'}>{open} open</span>
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { onClose(); onOpenCall(call.id) }}>View transcript</Button>
            <Button variant="secondary" onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
