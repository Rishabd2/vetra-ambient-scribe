import { Card, Button } from '../ui.jsx'

// Invoice — auto-derived from the visit's SOAP note. Each line carries a
// `source` tag showing which SOAP section it came from. Draft → Finalized.

export default function Invoice({ visit, store }) {
  const inv = visit.invoice
  if (!inv) return null

  const subtotal = inv.lines.reduce((s, l) => s + l.qty * l.price, 0)
  const tax = subtotal * (inv.taxRate || 0)
  const total = subtotal + tax
  const finalized = inv.status === 'finalized'

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b border-line flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{visit.patient.name} · {visit.visitType}</div>
          <div className="text-[12px] text-sage">{visit.patient.owner.name} · {fmtDate(visit.startedAt)}</div>
        </div>
        {finalized ? (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-pine-light text-pine border border-pine/20 font-medium">Finalized</span>
        ) : (
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">Draft</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left border-b border-line">
              <Th>Description</Th><Th>Code</Th><Th>Source</Th><Th className="text-center">Qty</Th><Th className="text-right">Price</Th><Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {inv.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5">{l.desc}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-sage">{l.code}</td>
                <td className="px-4 py-2.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cream border border-line text-sage">from {l.source}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {finalized ? l.qty : (
                    <input
                      type="number" min="0" value={l.qty}
                      onChange={(e) => store.updateInvoiceLine(visit.id, l.id, { qty: Number(e.target.value) })}
                      className="w-14 text-center rounded border border-line px-1 py-0.5"
                    />
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {finalized ? `$${l.price}` : (
                    <span className="inline-flex items-center">$
                      <input
                        type="number" min="0" value={l.price}
                        onChange={(e) => store.updateInvoiceLine(visit.id, l.id, { price: Number(e.target.value) })}
                        className="w-16 text-right rounded border border-line px-1 py-0.5"
                      />
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">${(l.qty * l.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-line flex justify-end">
        <div className="w-56 space-y-1 text-sm">
          <Row label="Subtotal" value={subtotal} />
          <Row label={`Tax (${Math.round((inv.taxRate || 0) * 100)}%)`} value={tax} />
          <div className="flex justify-between font-semibold text-base pt-1 border-t border-line">
            <span>Total</span><span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!finalized && (
        <div className="px-4 pb-4 flex justify-end">
          <Button variant="primary" onClick={() => store.approveInvoice(visit.id)}>Approve &amp; Finalize</Button>
        </div>
      )}
    </Card>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sage">
      <span>{label}</span><span>${value.toFixed(2)}</span>
    </div>
  )
}

function Th({ children, className = '' }) {
  return <th className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-sage font-medium ${className}`}>{children}</th>
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
