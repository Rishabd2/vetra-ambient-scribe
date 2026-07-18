import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Button, Avatar } from '../ui.jsx'

// Doctor Notes — the ambient-visit centerpiece.
// Left: Cases & Calls + Live Call Transcripts. Right: streaming transcript
// (live) that transforms into a SOAP note on call-end, plus in-call Q&A.

export default function DoctorNotes({ store }) {
  const { visits, selectedVisitId } = store
  const visit = useMemo(
    () => visits.find((v) => v.id === selectedVisitId) || visits[0],
    [visits, selectedVisitId],
  )

  const live = visits.filter((v) => v.status === 'live')
  const cases = visits.filter((v) => v.status !== 'live')

  return (
    <div className="flex gap-5 fade-up">
      {/* Left column */}
      <div className="w-80 shrink-0 space-y-5">
        {cases.length > 0 && (
          <ListSection label="Cases & Calls">
            {cases.map((v) => (
              <VisitRow key={v.id} v={v} active={v.id === visit?.id} onClick={() => store.selectVisit(v.id)} />
            ))}
          </ListSection>
        )}
        {live.length > 0 && (
          <ListSection label="Live Call Transcripts">
            {live.map((v) => (
              <VisitRow key={v.id} v={v} active={v.id === visit?.id} onClick={() => store.selectVisit(v.id)} live />
            ))}
          </ListSection>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0">
        {visit ? <VisitPanel key={visit.id} visit={visit} store={store} /> : (
          <Card className="p-10 text-center text-sage">Select a case to view its note.</Card>
        )}
      </div>
    </div>
  )
}

function ListSection({ label, children }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage px-1 mb-2">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function VisitRow({ v, active, onClick, live }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors ${
        active ? 'border-pine/40 bg-pine-light' : 'border-line bg-white hover:border-pine/25'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm truncate">{v.patient.name}</span>
        {live ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-pine">
            <span className="w-1.5 h-1.5 rounded-full bg-pine live-dot" /> LIVE
          </span>
        ) : (
          <NoteBadge status={v.status} />
        )}
      </div>
      <div className="text-[12px] text-sage truncate">{v.visitType}</div>
      <div className="text-[11px] text-sage/70 mt-0.5">
        {v.doctor} · {fmtShort(v.startedAt)}
      </div>
    </button>
  )
}

function NoteBadge({ status }) {
  if (status === 'reviewed')
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-pine-light text-pine border border-pine/20">Reviewed</span>
  return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Draft</span>
}

function VisitPanel({ visit, store }) {
  const isLive = visit.status === 'live'
  // Traditional staged SOAP workflow. Live calls default to the transcript;
  // completed visits default to the Summary stage.
  const [stage, setStage] = useState(isLive ? 'transcript' : 'summary')
  const [generating, setGenerating] = useState(false)

  // Live transcript streaming: reveal one line every 1.5s. Component is keyed
  // by visit.id, so initial state is correct per visit — the effect only drives
  // the live interval.
  const [revealed, setRevealed] = useState(isLive ? 3 : visit.transcript.length)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!isLive) return
    const t = setInterval(() => {
      setRevealed((n) => {
        if (n >= visit.transcript.length) {
          clearInterval(t)
          return n
        }
        return n + 1
      })
    }, 1500)
    return () => clearInterval(t)
  }, [isLive, visit.transcript.length])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [revealed, visit.qa])

  const endCall = () => {
    setGenerating(true)
    setTimeout(() => {
      store.endVisit(visit.id)
      setGenerating(false)
      setStage('summary')
    }, 1200)
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-line flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Avatar species={visit.patient.species} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg truncate">{visit.patient.name}</h2>
              <span className="text-sage text-sm truncate">({visit.patient.owner.name})</span>
              {isLive ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-pine">
                  <span className="w-2 h-2 rounded-full bg-pine live-dot" /> LIVE
                </span>
              ) : (
                <NoteBadge status={visit.status} />
              )}
            </div>
            <div className="text-[12.5px] text-sage mt-0.5">
              {visit.patient.breed}, {visit.patient.age}, {visit.patient.sex}, {visit.patient.weight}
            </div>
            <div className="text-[12px] text-sage/80 mt-0.5">
              {visit.visitType} · {visit.doctor} · {fmtDate(visit.startedAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLive ? (
            <Button variant="primary" onClick={endCall}>End call</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => window.print()}>PDF</Button>
              {visit.status !== 'reviewed' && (
                <Button variant="primary" onClick={() => store.approveNote(visit.id)}>Approve</Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Approval banner (completed visits) */}
      {!isLive && (
        <div className={`px-5 py-2.5 flex items-center gap-2 text-[12px] border-b border-line ${
          visit.status === 'reviewed' ? 'bg-pine-light/50 text-pine' : 'bg-amber-50 text-amber-800'
        }`}>
          {visit.status === 'reviewed' ? (
            <>
              <CheckIcon /> Approved by {visit.reviewedBy || 'Dr. Martinez'} · {fmtStamp(visit.reviewedAt)}
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              AI draft — every section below needs vet review before this record is finalized.
            </>
          )}
        </div>
      )}

      {/* Stage navigation */}
      <div className="px-5 pt-4 border-b border-line">
        <div className="flex gap-1 overflow-x-auto pb-px -mb-px">
          {STAGES.map((s) => {
            const disabled = isLive && s.id !== 'transcript'
            return (
              <button
                key={s.id}
                onClick={() => !disabled && setStage(s.id)}
                disabled={disabled}
                className={`px-3.5 py-2 text-[13px] whitespace-nowrap border-b-2 transition-colors ${
                  stage === s.id
                    ? 'border-pine text-pine font-medium'
                    : 'border-transparent text-sage hover:text-ink'
                } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {generating ? (
          <GeneratingShimmer />
        ) : stage === 'transcript' ? (
          <TranscriptView
            transcript={visit.transcript}
            revealed={revealed}
            scrollRef={scrollRef}
            qa={visit.qa}
            isLive={isLive}
            onAsk={(q) => {
              store.askQuestion(visit.id, q)
              setTimeout(() => store.resolveAnswer(visit.id), 900)
            }}
          />
        ) : (
          <StageView stage={stage} visit={visit} store={store} />
        )}
      </div>
    </Card>
  )
}

function TranscriptView({ transcript, revealed, scrollRef, qa, isLive, onAsk }) {
  const [q, setQ] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!q.trim()) return
    onAsk(q.trim())
    setQ('')
  }
  return (
    <div>
      <div ref={scrollRef} className="max-h-[52vh] overflow-y-auto space-y-3 pr-1">
        {transcript.slice(0, revealed).map(([who, text], i) => (
          <div key={i} className="flex gap-2.5">
            <span className={`font-mono text-[10px] mt-1 shrink-0 w-12 ${who === 'DR' ? 'text-pine' : 'text-sage'}`}>
              {who === 'DR' ? 'DR' : 'OWNER'}
            </span>
            <p className={`text-sm leading-relaxed ${who === 'DR' ? 'text-ink' : 'text-sage'}`}>{text}</p>
          </div>
        ))}
        {isLive && revealed < transcript.length && (
          <div className="flex gap-1.5 pl-14 items-center text-sage">
            <Dot /> <Dot d="150" /> <Dot d="300" />
          </div>
        )}

        {/* Q&A thread */}
        {qa && qa.length > 0 && (
          <div className="mt-4 pt-4 border-t border-line space-y-3">
            {qa.map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-end">
                  <div className="bg-pine text-white text-sm rounded-2xl rounded-br-sm px-3.5 py-2 max-w-[80%]">{item.q}</div>
                </div>
                <div className="flex justify-start">
                  {item.a === null ? (
                    <div className="bg-cream border border-line rounded-2xl rounded-bl-sm px-3.5 py-2 flex gap-1.5 items-center">
                      <Dot /> <Dot d="150" /> <Dot d="300" />
                    </div>
                  ) : (
                    <div className="bg-cream border border-line text-sm text-ink rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[80%] leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLive && (
        <form onSubmit={submit} className="mt-4 flex gap-2 border-t border-line pt-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask about this patient…  (e.g. last weight? vaccines due?)"
            className="flex-1 rounded-full border border-line px-4 py-2 text-sm focus:outline-none focus:border-pine/50"
          />
          <Button variant="primary" type="submit">Ask</Button>
        </form>
      )}
    </div>
  )
}

const STAGES = [
  { id: 'summary', label: 'Summary' },
  { id: 'subjective', label: 'Subjective' },
  { id: 'objective', label: 'Objective' },
  { id: 'assessment', label: 'Assessment' },
  { id: 'plan', label: 'Plan' },
  { id: 'discharge', label: 'Discharge & Follow-ups' },
  { id: 'charges', label: 'Charges' },
  { id: 'transcript', label: 'Transcript' },
]

function StageView({ stage, visit, store }) {
  const soap = visit.soap
  const editable = visit.status === 'draft'
  if (!soap && stage !== 'charges' && stage !== 'discharge') {
    return <div className="text-sage text-sm py-8 text-center">No note generated yet.</div>
  }

  const genTag = (
    <div className="text-[11px] font-mono text-sage/70 flex items-center justify-between gap-2 mb-4">
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" /></svg>
        {visit.authored === 'vet' ? 'Vet-recorded · draft' : 'AI-generated from transcript · draft'}
      </span>
      {editable && <span className="text-pine">editable</span>}
    </div>
  )

  const save = (section, value) => store.updateSoap(visit.id, section, value)

  if (stage === 'summary') {
    return (
      <div>
        {genTag}
        <EditableText
          value={soap.summary}
          editable={editable}
          onSave={(v) => save('summary', v)}
          placeholder="Clinical summary…"
        />
      </div>
    )
  }
  if (stage === 'subjective') return <StageBody tag={genTag}><EditableList items={soap.subjective} editable={editable} onSave={(v) => save('subjective', v)} /></StageBody>
  if (stage === 'objective') return <StageBody tag={genTag}><EditableList items={soap.objective} editable={editable} onSave={(v) => save('objective', v)} /></StageBody>
  if (stage === 'assessment') return <StageBody tag={genTag}><EditableList items={soap.assessment} editable={editable} onSave={(v) => save('assessment', v)} /></StageBody>
  if (stage === 'plan') return <StageBody tag={genTag}><EditableList items={soap.plan} editable={editable} onSave={(v) => save('plan', v)} ordered /></StageBody>
  if (stage === 'discharge') return <DischargeView visit={visit} tag={genTag} />
  if (stage === 'charges') return <ChargesView visit={visit} tag={genTag} />
  return null
}

// Click-to-edit paragraph. Draft only; shows Save/Cancel while editing.
function EditableText({ value, editable, onSave, placeholder }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')
  if (!editable) return <p className="text-sm leading-relaxed text-ink">{value}</p>
  if (!editing) {
    return (
      <div className="group relative">
        <p className="text-sm leading-relaxed text-ink">{value || <span className="text-sage/60">{placeholder}</span>}</p>
        <button onClick={() => { setDraft(value || ''); setEditing(true) }} className="mt-2 text-[12px] text-pine hover:underline">Edit</button>
      </div>
    )
  }
  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-pine/40 px-3 py-2 text-sm focus:outline-none focus:border-pine"
      />
      <div className="mt-2 flex gap-2">
        <Button variant="primary" onClick={() => { onSave(draft.trim()); setEditing(false) }}>Save</Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  )
}

// Click-to-edit bullet list. One item per line while editing.
function EditableList({ items, editable, onSave, ordered }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState((items || []).join('\n'))
  if (!editable) return <Bullets items={items} ordered={ordered} />
  if (!editing) {
    return (
      <div>
        <Bullets items={items} ordered={ordered} />
        <button onClick={() => { setDraft((items || []).join('\n')); setEditing(true) }} className="mt-2 text-[12px] text-pine hover:underline">Edit</button>
      </div>
    )
  }
  return (
    <div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={Math.max(4, (items || []).length + 1)}
        placeholder="One item per line"
        className="w-full rounded-lg border border-pine/40 px-3 py-2 text-sm font-mono focus:outline-none focus:border-pine"
      />
      <div className="mt-2 flex gap-2">
        <Button variant="primary" onClick={() => { onSave(draft.split('\n').map((s) => s.trim()).filter(Boolean)); setEditing(false) }}>Save</Button>
        <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  )
}

function StageBody({ tag, children }) {
  return <div>{tag}{children}</div>
}

function DischargeView({ visit, tag }) {
  const followups = visit.followups || []
  const soap = visit.soap
  return (
    <div>
      {tag}
      <Section title="Discharge instructions">
        {soap?.plan?.length ? <Bullets items={soap.plan} /> : <Empty>No plan items to summarize.</Empty>}
      </Section>
      <div className="mt-6">
        <Section title="Follow-up tasks">
          {followups.length ? (
            <div className="space-y-2">
              {followups.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm text-ink truncate">{f.label}</div>
                    <div className="text-[11.5px] text-sage">{f.owner} · due {f.due} · {f.channel}</div>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">Draft</span>
                </div>
              ))}
            </div>
          ) : <Empty>No follow-ups generated.</Empty>}
        </Section>
      </div>
    </div>
  )
}

function ChargesView({ visit, tag }) {
  const inv = visit.invoice
  if (!inv) return <Empty>No charges derived yet.</Empty>
  const subtotal = inv.lines.reduce((s, l) => s + l.qty * l.price, 0)
  const tax = subtotal * (inv.taxRate || 0)
  const total = subtotal + tax
  return (
    <div>
      {tag}
      <div className="rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-line bg-cream/50">
              <Th>Item</Th><Th>From</Th><Th className="text-right">Qty</Th><Th className="text-right">Price</Th><Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {inv.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5">
                  <div className="text-ink">{l.desc}</div>
                  <div className="font-mono text-[10.5px] text-sage/70">{l.code}</div>
                </td>
                <td className="px-4 py-2.5"><SourceTag src={l.source} /></td>
                <td className="px-4 py-2.5 text-right font-mono text-[12.5px]">{l.qty}</td>
                <td className="px-4 py-2.5 text-right font-mono text-[12.5px]">${l.price.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-[12.5px]">${(l.qty * l.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-line space-y-1 text-sm bg-cream/30">
          <Row label="Subtotal" value={subtotal} />
          <Row label={`Tax (${Math.round((inv.taxRate || 0) * 100)}%)`} value={tax} />
          <Row label="Total" value={total} bold />
        </div>
      </div>
      <p className="text-[11.5px] text-sage mt-2">Draft invoice — every line derives from the SOAP note above and requires vet approval before it is finalized.</p>
    </div>
  )
}

function SourceTag({ src }) {
  return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-pine-light/60 text-pine border border-pine/15">from {src}</span>
}

function Row({ label, value, bold }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-ink pt-1 border-t border-line' : 'text-sage'}`}>
      <span>{label}</span>
      <span className="font-mono">${value.toFixed(2)}</span>
    </div>
  )
}

function Th({ children, className = '' }) {
  return <th className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-sage font-medium ${className}`}>{children}</th>
}

function Empty({ children }) {
  return <div className="text-sage text-sm py-6 text-center">{children}</div>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function fmtStamp(iso) {
  if (!iso) return 'just now'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-ink mb-2">{title}</h3>
      {children}
    </div>
  )
}

function Bullets({ items, ordered }) {
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <Tag className={`space-y-1.5 text-sm text-ink ${ordered ? 'list-decimal' : 'list-disc'} pl-5`}>
      {items.map((it, i) => (
        <li key={i} className="leading-relaxed">{it}</li>
      ))}
    </Tag>
  )
}

function GeneratingShimmer() {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2 text-pine text-sm font-medium">
        <span className="w-2 h-2 rounded-full bg-pine live-dot" /> Generating note…
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 bg-cream rounded w-1/3 animate-pulse" />
          <div className="h-3 bg-cream rounded w-full animate-pulse" />
          <div className="h-3 bg-cream rounded w-4/5 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function Dot({ d = '0' }) {
  return <span className="w-1.5 h-1.5 rounded-full bg-sage/60 animate-pulse" style={{ animationDelay: `${d}ms` }} />
}

function fmtShort(iso) {
  const dt = new Date(iso)
  return dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
