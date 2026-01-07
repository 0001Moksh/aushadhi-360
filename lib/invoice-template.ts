export interface InvoiceItem {
  name: string
  batch: string
  form?: string
  qtyPerPack?: string
  quantity: number
  price: number
  description?: string
}

export interface InvoicePayload {
  billId?: string
  items: InvoiceItem[]
  subtotal: number
  gst: number
  total: number
  customerEmail?: string
  customerPhone?: string
  itemCount?: number
  storeName?: string
  storePhone?: string
  storeAddress?: string
  invoiceDate?: Date
}

export type InvoiceLayout = "detailed" | "compact" | "minimal"

export interface InvoiceTemplateOptions {
  layout?: InvoiceLayout
  columns?: string[]
}

const defaultColumns = ["name", "batch", "form", "qtyPerPack", "quantity", "price", "amount", "description"]
const defaultLayout: InvoiceLayout = "detailed"

export function buildInvoiceHtml(payload: InvoicePayload, options?: InvoiceTemplateOptions): string {
  const layout = options?.layout || defaultLayout
  const columns = options?.columns?.length ? options.columns : defaultColumns
  const invoiceDate = payload.invoiceDate || new Date()
  const formattedDate = invoiceDate.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const invoiceNumber = payload.billId || `INV-${invoiceDate.getTime()}`
  const headerStoreName = payload.storeName || "Your Pharmacy"
  const headerStorePhone = payload.storePhone || ""
  const headerStoreAddress = payload.storeAddress || ""

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Invoice - ${headerStoreName}</title>

  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Roboto, Arial, sans-serif;
      background: #f7f9fc;
      padding: 30px;
      color: #1f2937;
    }

    .invoice {
      max-width: 900px;
      margin: auto;
      background: #ffffff;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      border: 1px solid #e5e7eb;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 12px;
      gap: 12px;
    }

    .brand {
      font-size: 26px;
      font-weight: 700;
      color: #111827;
    }

    .brand span {
      font-size: 13px;
      font-weight: 500;
      display: block;
      color: #6b7280;
      margin-top: 4px;
    }

    .contact {
      text-align: right;
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }

    .invoice-badge {
      background: #2563eb;
      color: white;
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
    }

    /* Info */
    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      font-size: 14px;
      gap: 12px;
      flex-wrap: wrap;
    }

    .info div p {
      margin: 4px 0;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      font-size: 14px;
    }

    thead th {
      text-align: left;
      padding: 12px;
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      border-bottom: 2px solid #e5e7eb;
    }

    tbody td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .right { text-align: right; }
    .muted { color: #6b7280; font-size: 12px; }

    /* Totals */
    .totals {
      margin-top: 24px;
      display: flex;
      justify-content: flex-end;
    }

    .totals-box {
      width: 320px;
      font-size: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
    }

    .totals-box div {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
      background: #fff;
    }

    .totals-box div:last-child { border-bottom: none; }

    .totals-box .grand {
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
      border-top: 2px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 8px;
      background: #f8fafc;
    }

    /* Notes */
    .notes {
      margin-top: 24px;
      padding: 16px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      color: #475569;
      font-size: 13px;
    }

    /* Footer */
    .footer {
      margin-top: 28px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }

    @media print {
      body { padding: 0; background: #fff; }
      .invoice { box-shadow: none; border: 1px solid #e5e7eb; border-radius: 0; }
      @page { size: A4; margin: 12mm; }
    }
  </style>
</head>

<body>
  <div class="invoice">

    <!-- Header -->
    <div class="header">
      <div class="brand">
        ${headerStoreName}
        <span>Powered by Aushadhi 360 (software)</span>
      </div>
      <div class="contact">
        <div class="invoice-badge" style="float:right; margin-bottom:8px;">INVOICE</div>
        ${headerStorePhone ? `<div><strong>Phone:</strong> ${headerStorePhone}</div>` : ""}
        ${headerStoreAddress ? `<div><strong>Address:</strong> ${headerStoreAddress}</div>` : ""}
      </div>
    </div>

    <!-- Info -->
    <div class="info">
      <div>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
      </div>
      <div>
        ${payload.customerEmail ? `<p><strong>Customer:</strong> ${payload.customerEmail}</p>` : `<p><strong>Customer:</strong> Walk-in</p>`}
        ${layout !== "minimal" ? `<p class="muted">This is a system generated invoice.</p>` : ""}
      </div>
    </div>

    <!-- Table -->
    <table>
      <thead>
        <tr>
          ${columns.includes("name") ? "<th>Medicine</th>" : ""}
          ${columns.includes("batch") && layout !== "minimal" ? "<th>Batch</th>" : ""}
          ${columns.includes("form") && layout !== "minimal" ? "<th>Form</th>" : ""}
          ${columns.includes("qtyPerPack") && layout === "detailed" ? "<th class=\"right\">Qty/Pack</th>" : ""}
          ${columns.includes("quantity") ? "<th class=\"right\">Qty</th>" : ""}
          ${columns.includes("price") ? "<th class=\"right\">Price</th>" : ""}
          ${columns.includes("amount") ? "<th class=\"right\">Amount</th>" : ""}
          ${columns.includes("description") && layout !== "minimal" ? "<th>Description</th>" : ""}
        </tr>
      </thead>
      <tbody>
        ${payload.items.map((item: InvoiceItem) => `
          <tr>
            ${columns.includes("name") ? `<td>${item.name}</td>` : ""}
            ${columns.includes("batch") && layout !== "minimal" ? `<td>${item.batch}</td>` : ""}
            ${columns.includes("form") && layout !== "minimal" ? `<td>${item.form || "-"}</td>` : ""}
            ${columns.includes("qtyPerPack") && layout === "detailed" ? `<td class=\"right\">${item.qtyPerPack || "-"}</td>` : ""}
            ${columns.includes("quantity") ? `<td class=\"right\">${item.quantity}</td>` : ""}
            ${columns.includes("price") ? `<td class=\"right\">₹${item.price.toFixed(2)}</td>` : ""}
            ${columns.includes("amount") ? `<td class=\"right\">₹${(item.price * item.quantity).toFixed(2)}</td>` : ""}
            ${columns.includes("description") && layout !== "minimal" ? `<td>${item.description || "Medicine sale"}</td>` : ""}
          </tr>
        `).join("")}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div>
          <span>Subtotal</span>
          <span>₹${payload.subtotal.toFixed(2)}</span>
        </div>
        <div>
          <span>GST (18%)</span>
          <span>₹${payload.gst.toFixed(2)}</span>
        </div>
        <div class="grand">
          <span>Total</span>
          <span>₹${payload.total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notes">
      <strong>Notes & Guidance</strong><br/>
      • Medicines once sold will not be returned.<br/>
      • Please consult physician before use.<br/>
      • For support, contact your pharmacist.<br/>
      ${headerStorePhone ? `• Store Phone: ${headerStorePhone}<br/>` : ""}
      ${headerStoreAddress ? `• Address: ${headerStoreAddress}` : ""}
    </div>
 
    <!-- Footer -->
    <div class="footer">
      Thank you for choosing ${headerStoreName}<br />
    </div>
  </div>
</body>
</html>
    `
}
