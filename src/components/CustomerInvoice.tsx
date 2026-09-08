"use client";

import type { ReactNode } from "react";
import { brand } from "@/lib/brand";
import { formatPKR } from "@/lib/utils";
import {
  type InvoiceDoc,
  invoiceTypeLabel,
  openInvoicePrint,
} from "@/lib/invoice";

export function CustomerInvoice({
  doc,
  actions,
}: {
  doc: InvoiceDoc;
  actions?: ReactNode;
}) {
  const issued =
    typeof doc.issuedAt === "string" ? new Date(doc.issuedAt) : doc.issuedAt;

  return (
    <article className="inv-slip" aria-label={`${invoiceTypeLabel(doc)} ${doc.docNo}`}>
      <header className="inv-slip-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt="" width={48} height={48} />
        <div>
          <p className="inv-eyebrow">{invoiceTypeLabel(doc)}</p>
          <h2>{brand.name}</h2>
          <p className="muted">{brand.slogan}</p>
        </div>
      </header>

      <div className="inv-slip-head">
        <div>
          <strong className="inv-docno">{doc.docNo}</strong>
          <p className="muted">{issued.toLocaleString("en-PK")}</p>
          {doc.voided ? <p className="error">VOIDED</p> : null}
        </div>
        <div className="inv-slip-party">
          <p>
            <span className="inv-label">Branch</span>
            {doc.branchName}
            {doc.branchCity ? ` · ${doc.branchCity}` : ""}
          </p>
          <p>
            <span className="inv-label">Customer</span>
            {doc.customerName} · {doc.customerPhone}
          </p>
          {doc.fulfillment ? (
            <p>
              <span className="inv-label">Mode</span>
              {doc.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}
              {doc.address ? ` — ${doc.address}` : ""}
            </p>
          ) : null}
          <p>
            <span className="inv-label">Payment</span>
            {doc.paymentMethod || "—"}
            {doc.tillNo ? ` · ${doc.tillNo}` : ""}
          </p>
        </div>
      </div>

      <table className="inv-slip-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={`${l.name}-${i}`}>
              <td>
                {l.name}
                {l.sku ? <small className="muted"> · {l.sku}</small> : null}
              </td>
              <td>{l.quantity}</td>
              <td>{formatPKR(l.unitPrice)}</td>
              <td>{formatPKR(l.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="inv-slip-totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatPKR(doc.subtotal)}</dd>
        </div>
        {(doc.tax || 0) > 0 ? (
          <div>
            <dt>Tax</dt>
            <dd>{formatPKR(doc.tax || 0)}</dd>
          </div>
        ) : (
          <div>
            <dt>Tax / GST</dt>
            <dd>{formatPKR(0)}</dd>
          </div>
        )}
        <div className="inv-grand">
          <dt>Total</dt>
          <dd>{formatPKR(doc.total)}</dd>
        </div>
      </dl>

      <footer className="inv-slip-foot">
        <p>
          {brand.phone} · {brand.email}
        </p>
        <p className="muted">Computer-generated customer slip · Keep for your records</p>
      </footer>

      <div className="inv-slip-actions hero-cta">
        <button type="button" className="btn" onClick={() => openInvoicePrint(doc)}>
          Print / save PDF
        </button>
        {actions}
      </div>
    </article>
  );
}
