import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface InvoiceData {
  billId: string
  customerEmail: string
  customerName?: string
  address?: string
  phone?: string
  physician?: string
  storeName?: string
  items: Array<{
    name: string
    batch: string
    form?: string
    qtyPerPack?: string
    quantity: number
    price: number
    description?: string
  }>
  subtotal: number
  gst: number
  total: number
  date?: Date
}

// Configure email transporter
const createTransporter = () => {
  // Use environment variables for email configuration
  const emailConfig = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  }

  // If no credentials, use test account (for development)
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn("Email credentials not configured. Using fallback mode.")
    return null
  }

  return nodemailer.createTransport(emailConfig)
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter()
    
    if (!transporter) {
      console.warn("Email service not configured. Skipping email send.")
      return false
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const date = data.date || new Date()
  const formattedDate = date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const storeName = data.storeName || "Your Pharmacy"

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice</title>

<style>
  * { box-sizing: border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #ffffff;
    padding: 20px;
    color: #111;
  }

  .invoice {
    max-width: 900px;
    margin: auto;
    border: 2px solid #000;
    padding: 20px;
  }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
  }

  .header h1 {
    font-size: 28px;
    color: #111;
    margin: 0;
  }

  .subhead {
    font-size: 12px;
    color: #555;
    margin-top: 4px;
  }

  /* Info Table */
  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
  }

  .info-table td {
    border: 1px solid #000;
    padding: 8px;
    font-size: 14px;
  }

  .label {
    font-weight: bold;
    width: 25%;
  }

  /* Items Table */
  .items {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
    font-size: 14px;
  }

  .items th,
  .items td {
    border: 1px solid #000;
    padding: 10px;
    text-align: left;
    vertical-align: top;
  }

  .items th {
    background: #f1f1f1;
    text-transform: uppercase;
    font-size: 13px;
  }

  .items td.right,
  .items th.right {
    text-align: right;
  }

  .desc {
    color: #444;
    font-size: 12px;
  }

  /* Bottom Section */
  .bottom {
    display: flex;
    margin-top: 15px;
  }

  .comments {
    flex: 2;
    border: 1px solid #000;
    padding: 10px;
    font-size: 14px;
    min-height: 120px;
  }

  .totals {
    flex: 1;
    margin-left: 10px;
    border: 1px solid #000;
  }

  .totals div {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid #000;
    font-size: 14px;
  }

  .totals .total {
    font-weight: bold;
    font-size: 16px;
  }

  /* Notes */
  .notes {
    margin-top: 15px;
    border: 1px solid #000;
    padding: 10px;
    font-size: 14px;
    min-height: 120px;
  }

  @media print {
    body { padding: 0; }
    .invoice { border: none; }
  }
</style>
</head>

<body>
<div class="invoice">

  <!-- Header -->
  <div class="header">
    <div>
      <h1>${storeName}</h1>
      <div class="subhead">Powered by Aushadhi 360 (software)</div>
    </div>
    <div class="subhead">
      Invoice Date: ${formattedDate}<br/>
      Invoice No: ${data.billId}
    </div>
  </div>

  <!-- Info -->
  <table class="info-table">
    <tr>
      <td class="label">Store</td>
      <td>${data.storeName || "Your Pharmacy"}</td>
      <td class="label">Email</td>
      <td>${data.customerEmail || "-"}</td>
    </tr>
    <tr>
      <td class="label">Address</td>
      <td>${data.address || "-"}</td>
      <td class="label">Phone</td>
      <td>${data.phone || "-"}</td>
    </tr>
    <tr>
      <td class="label">Physician</td>
      <td>${data.physician || "-"}</td>
      <td class="label">Payment Due</td>
      <td>${formattedDate}</td>
    </tr>
  </table>

  <!-- Items -->
  <table class="items">
    <thead>
      <tr>
        <th>Medicine</th>
        <th>Batch</th>
        <th>Form</th>
        <th>Qty/Pack</th>
        <th class="right">Qty</th>
        <th class="right">Price</th>
        <th class="right">Amount</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map(item => `
        <tr>
          <td>${item.name}</td>
          <td>${item.batch}</td>
          <td>${item.form || "-"}</td>
          <td>${item.qtyPerPack || "-"}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">₹${item.price.toFixed(2)}</td>
          <td class="right">₹${(item.price * item.quantity).toFixed(2)}</td>
          <td class="desc">${item.description || "Medicine sale"}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <!-- Bottom -->
  <div class="bottom">
    <div class="comments">
      <strong>Comments, Notes, and Special Instructions:</strong><br/><br/>
      Medicines once sold will not be returned.<br/>
      Please consult physician before use.
    </div>

    <div class="totals">
      <div>
        <span>SUBTOTAL</span>
        <span>₹${data.subtotal.toFixed(2)}</span>
      </div>
      <div>
        <span>GST (18%)</span>
        <span>₹${data.gst.toFixed(2)}</span>
      </div>
      <div class="total">
        <span>TOTAL</span>
        <span>₹${data.total.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <!-- Notes -->
  <div class="notes">
    <strong>Notes:</strong><br/><br/>
    - This is a system generated invoice.<br/>
    - Keep for your medical records.<br/>
    - Thank you for choosing ${storeName}.<br/>
    - Powered by Aushadhi 360 (software).
  </div>

</div>
</body>
</html>
`;
}

export async function sendInvoiceEmail(data: InvoiceData): Promise<boolean> {
  const html = generateInvoiceHTML(data)
  const text = `
Invoice #${data.billId}
${data.storeName || "Aushadhi 360"}

Date: ${data.date || new Date()}
Customer: ${data.customerEmail}

Items:
${data.items.map((item) => `- ${item.name} (Batch: ${item.batch}${item.form ? `, Form: ${item.form}` : ""}${item.qtyPerPack ? `, Qty/Pack: ${item.qtyPerPack}` : ""}) x${item.quantity} @ ₹${item.price} = ₹${(item.quantity * item.price).toFixed(2)} | ${item.description || "Medicine sale"}`).join("\n")}

Subtotal: ₹${data.subtotal.toFixed(2)}
GST (18%): ₹${data.gst.toFixed(2)}
Total: ₹${data.total.toFixed(2)}

Thank you for your purchase!
  `.trim()

  const subject = `Invoice #${data.billId} - ${data.storeName || "Aushadhi 360"}`
  const customerSent = await sendEmail({
    to: data.customerEmail,
    subject,
    html,
    text,
  })

  const supportEmail = process.env.SUPPORT_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER
  if (supportEmail) {
    await sendEmail({
      to: supportEmail,
      subject: `${subject} (copy)` ,
      html,
      text,
    })
  }

  return customerSent
}
