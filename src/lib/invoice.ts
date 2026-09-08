import { brand } from "./brand";
import { formatPKR } from "./utils";

export type InvoiceLine = {
  name: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceDoc = {
  docTitle?: string;
  docNo: string;
  docType: "ONLINE_ORDER" | "POS_SALE" | "INVOICE";
  issuedAt: string | Date;
  branchName: string;
  branchCity?: string | null;
  branchAddress?: string | null;
  branchPhone?: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  fulfillment?: string | null;
  address?: string | null;
  paymentMethod?: string | null;
  channel?: string | null;
  tillNo?: string | null;
  cashierName?: string | null;
  status?: string | null;
  notes?: string | null;
  lines: InvoiceLine[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  voided?: boolean;
};

function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function when(d: string | Date) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function invoiceTypeLabel(doc: InvoiceDoc) {
  if (doc.voided) return "VOIDED SALE";
  if (doc.docType === "POS_SALE") return "CUSTOMER RECEIPT";
  if (doc.docType === "ONLINE_ORDER") return "ORDER SLIP";
  return "TAX INVOICE / SLIP";
}

/** Printable A5 / 80mm-friendly HTML for customer slips. */
export function buildInvoiceHtml(doc: InvoiceDoc) {
  const title = doc.docTitle || invoiceTypeLabel(doc);
  const linesHtml = doc.lines
    .map(
      (l) => `<tr>
      <td>
        <div class="item">${esc(l.name)}</div>
        ${l.sku ? `<div class="muted">${esc(l.sku)}</div>` : ""}
        <div class="muted">${l.quantity} × ${esc(formatPKR(l.unitPrice))}</div>
      </td>
      <td class="num">${esc(formatPKR(l.lineTotal))}</td>
    </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)} · ${esc(doc.docNo)}</title>
  <style>
    @page { margin: 10mm; size: A5; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #1a1410;
      background: #fff;
      font-size: 12px;
      line-height: 1.4;
    }
    .sheet { max-width: 420px; margin: 0 auto; padding: 16px 14px 24px; }
    .brand { display: flex; gap: 12px; align-items: center; border-bottom: 2px solid #5C4033; padding-bottom: 12px; }
    .brand img { width: 52px; height: 52px; object-fit: cover; border-radius: 8px; }
    .brand h1 { margin: 0; font-size: 20px; letter-spacing: 0.04em; color: #5C4033; }
    .brand .tag { color: #7A5F10; font-size: 11px; font-weight: 600; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin: 14px 0; }
    .meta div { border-bottom: 1px dotted #d8d0c4; padding-bottom: 4px; }
    .label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #7a6a5c; }
    .strong { font-weight: 700; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #7a6a5c; border-bottom: 1px solid #5C4033; padding: 6px 0; }
    th.num, td.num { text-align: right; }
    td { padding: 8px 0; border-bottom: 1px solid #eee8df; vertical-align: top; }
    .item { font-weight: 600; }
    .muted { color: #7a6a5c; font-size: 11px; }
    .totals { margin-top: 12px; border-top: 2px solid #5C4033; padding-top: 8px; }
    .totals row, .tot-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand { font-size: 16px; font-weight: 800; color: #5C4033; margin-top: 6px; }
    .footer { margin-top: 18px; text-align: center; color: #7a6a5c; font-size: 11px; border-top: 1px dashed #d8d0c4; padding-top: 12px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #F3EFE6; color: #5C4033; font-weight: 700; font-size: 10px; letter-spacing: 0.04em; }
    .void { color: #a11; font-weight: 800; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .noprint { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="brand">
      <img src="${esc(brand.logo)}" alt="${esc(brand.shortName)}" onerror="this.style.display='none'" />
      <div>
        <h1>${esc(brand.name)}</h1>
        <div class="tag">${esc(brand.slogan)}</div>
        <div class="muted">${esc(brand.legalName)}</div>
      </div>
    </div>

    <p style="margin:12px 0 4px"><span class="badge">${esc(title)}</span>
      ${doc.voided ? '<span class="void"> · VOID</span>' : ""}</p>
    <p class="strong" style="margin:0">${esc(doc.docNo)}</p>
    <p class="muted" style="margin:2px 0 0">${esc(when(doc.issuedAt))}</p>

    <div class="meta">
      <div>
        <span class="label">Branch</span>
        <span class="strong">${esc(doc.branchName)}</span>
        ${doc.branchCity ? `<div class="muted">${esc(doc.branchCity)}</div>` : ""}
        ${doc.branchAddress ? `<div class="muted">${esc(doc.branchAddress)}</div>` : ""}
        ${doc.branchPhone ? `<div class="muted">${esc(doc.branchPhone)}</div>` : ""}
      </div>
      <div>
        <span class="label">Customer</span>
        <span class="strong">${esc(doc.customerName)}</span>
        <div class="muted">${esc(doc.customerPhone)}</div>
        ${doc.customerEmail ? `<div class="muted">${esc(doc.customerEmail)}</div>` : ""}
      </div>
      ${
        doc.fulfillment
          ? `<div><span class="label">Fulfillment</span><span class="strong">${esc(
              doc.fulfillment === "DELIVERY" ? "Delivery" : "Pickup"
            )}</span>
            ${doc.address ? `<div class="muted">${esc(doc.address)}</div>` : ""}
          </div>`
          : ""
      }
      <div>
        <span class="label">Payment</span>
        <span class="strong">${esc(doc.paymentMethod || (doc.docType === "ONLINE_ORDER" ? "Pay at counter / COD" : "—"))}</span>
        ${doc.tillNo ? `<div class="muted">Till ${esc(doc.tillNo)}</div>` : ""}
        ${doc.cashierName ? `<div class="muted">Cashier ${esc(doc.cashierName)}</div>` : ""}
        ${doc.channel ? `<div class="muted">${esc(doc.channel)}</div>` : ""}
        ${doc.status ? `<div class="muted">Status ${esc(doc.status)}</div>` : ""}
      </div>
    </div>

    <table>
      <thead><tr><th>Item</th><th class="num">Amount</th></tr></thead>
      <tbody>${linesHtml}</tbody>
    </table>

    <div class="totals">
      <div class="tot-row"><span>Subtotal</span><span>${esc(formatPKR(doc.subtotal))}</span></div>
      ${
        doc.discount
          ? `<div class="tot-row"><span>Discount</span><span>-${esc(formatPKR(doc.discount))}</span></div>`
          : ""
      }
      <div class="tot-row"><span>Tax / GST</span><span>${esc(formatPKR(doc.tax || 0))}</span></div>
      <div class="tot-row grand"><span>Total</span><span>${esc(formatPKR(doc.total))}</span></div>
    </div>

    ${doc.notes ? `<p class="muted" style="margin-top:12px"><strong>Notes:</strong> ${esc(doc.notes)}</p>` : ""}

    <div class="footer">
      <div>Thank you for choosing ${esc(brand.shortName)} — ${esc(brand.slogan)}</div>
      <div>${esc(brand.phone)} · ${esc(brand.email)}</div>
      <div>${esc(brand.instagramUrl.replace("https://www.", ""))}</div>
      <div style="margin-top:8px">This is a computer-generated customer slip. Keep for your records.</div>
    </div>
  </div>
  <script>window.onload = function(){ window.focus(); window.print(); }</script>
</body>
</html>`;
}

export function openInvoicePrint(doc: InvoiceDoc) {
  if (typeof window === "undefined") return;
  const html = buildInvoiceHtml(doc);
  const w = window.open("", "_blank", "noopener,noreferrer,width=480,height=720");
  if (!w) {
    // Fallback: download HTML if popup blocked
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.docNo}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function saleToInvoice(sale: {
  saleNo: string;
  total: number;
  subtotal?: number;
  tax?: number;
  paymentMethod?: string;
  tillNo?: string | null;
  channel?: string | null;
  voided?: boolean;
  createdAt?: string | Date;
  branch?: { name: string; city?: string; address?: string; phone?: string | null } | null;
  cashier?: { name: string } | null;
  customer?: { name: string; phone: string; email?: string | null } | null;
  lines: {
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: { name: string; sku?: string };
  }[];
}): InvoiceDoc {
  return {
    docNo: sale.saleNo,
    docType: "POS_SALE",
    issuedAt: sale.createdAt || new Date(),
    branchName: sale.branch?.name || "Rezist",
    branchCity: sale.branch?.city,
    branchAddress: sale.branch?.address,
    branchPhone: sale.branch?.phone,
    customerName: sale.customer?.name || "Walk-in guest",
    customerPhone: sale.customer?.phone || "—",
    customerEmail: sale.customer?.email,
    paymentMethod: sale.paymentMethod || "CASH",
    channel: sale.channel || "POS",
    tillNo: sale.tillNo,
    cashierName: sale.cashier?.name,
    lines: sale.lines.map((l) => ({
      name: l.product.name,
      sku: l.product.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    })),
    subtotal: sale.subtotal ?? sale.total,
    tax: sale.tax || 0,
    total: sale.total,
    voided: !!sale.voided,
  };
}

export function orderToInvoice(order: {
  orderNo: string;
  total: number;
  subtotal?: number;
  fulfillment?: string;
  address?: string | null;
  status?: string;
  notes?: string | null;
  createdAt?: string | Date;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  branch?: { name: string; city?: string; address?: string; phone?: string | null } | null;
  lines: {
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    product: { name: string; sku?: string };
  }[];
}): InvoiceDoc {
  return {
    docNo: order.orderNo,
    docType: "ONLINE_ORDER",
    issuedAt: order.createdAt || new Date(),
    branchName: order.branch?.name || "Rezist",
    branchCity: order.branch?.city,
    branchAddress: order.branch?.address,
    branchPhone: order.branch?.phone,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    fulfillment: order.fulfillment,
    address: order.address,
    paymentMethod: "Pay at counter / COD",
    channel: "WEB",
    status: order.status,
    notes: order.notes,
    lines: order.lines.map((l) => ({
      name: l.product.name,
      sku: l.product.sku,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
    })),
    subtotal: order.subtotal ?? order.total,
    tax: 0,
    total: order.total,
  };
}
