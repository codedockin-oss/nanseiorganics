const PDFDocument = require('pdfkit');

function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];

    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const green = '#0f2218';
    const gold  = '#c9a84c';
    const gray  = '#6b7280';

    /* ── HEADER ── */
    doc.rect(0, 0, doc.page.width, 80).fill(green);
    doc.fillColor('#fff')
       .font('Helvetica-Bold').fontSize(22)
       .text(process.env.STORE_NAME || 'Nansai Organics', 50, 28);
    doc.font('Helvetica').fontSize(9).fillColor('rgba(255,255,255,0.55)')
       .text('INVOICE', 50, 56);

    /* ── GOLD DIVIDER ── */
    doc.moveTo(50, 100).lineTo(545, 100)
       .strokeColor(gold).lineWidth(2).stroke();

    /* ── ORDER META ── */
    let y = 118;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(gray)
       .text('ORDER ID',   50,  y)
       .text('INVOICE NO', 220, y)
       .text('DATE',       420, y);

    doc.font('Helvetica-Bold').fontSize(10).fillColor(green)
       .text(order.orderNumber   || String(order._id),                50,  y + 14)
       .text(order.invoiceNumber || '-',                              220, y + 14)
       .text(new Date(order.createdAt).toLocaleDateString('en-IN'),   420, y + 14);

    /* ── DIVIDER ── */
    y += 38;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();

    /* ── CUSTOMER NAME ── */
    y += 16;
    const addr         = order.shippingAddress || {};
    const customerName = addr.fullName || order.user?.name || 'Customer';

    doc.font('Helvetica-Bold').fontSize(9).fillColor(gray).text('CUSTOMER NAME', 50, y);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(green).text(customerName, 50, y + 14);

    /* ── DIVIDER ── */
    y += 42;
    doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').lineWidth(1).stroke();

    /* ── PRODUCTS TABLE ── */
    y += 16;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(gray).text('PRODUCTS', 50, y);
    y += 16;

    // Header row
    doc.rect(50, y, 495, 24).fill(green);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#fff')
       .text('Product',  60,  y + 8)
       .text('Qty',      330, y + 8)
       .text('Price',    385, y + 8)
       .text('Subtotal', 460, y + 8);
    y += 24;

    // Item rows
    const items = order.items || [];
    items.forEach((item, i) => {
      doc.rect(50, y, 495, 22).fill(i % 2 === 0 ? '#fff' : '#f9fafb');
      const price    = item.price    || 0;
      const qty      = item.quantity || 1;
      const subtotal = price * qty;
      doc.font('Helvetica').fontSize(9).fillColor('#111827')
         .text(item.name || item.productName || 'Product', 60,  y + 7, { width: 260 })
         .text(String(qty),                                 330, y + 7)
         .text(`Rs.${price.toFixed(2)}`,                   385, y + 7)
         .text(`Rs.${subtotal.toFixed(2)}`,                460, y + 7);
      y += 22;
    });

    // Table border
    doc.rect(50, y - (items.length * 22) - 24, 495, (items.length * 22) + 24)
       .strokeColor('#e5e7eb').lineWidth(1).stroke();

    /* ── TOTAL ── */
    y += 12;
    doc.rect(370, y, 175, 30).fill(green);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#fff')
       .text('TOTAL',                                      380, y + 9)
       .text(`Rs.${(order.totalPrice || 0).toFixed(2)}`,  455, y + 9);

    /* ── PAYMENT STATUS ── */
    y += 50;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(gray).text('PAYMENT STATUS', 50, y);

    const isPaid      = order.isPaid || order.paymentInfo?.status === 'completed';
    const statusLabel = isPaid ? 'Paid' : 'Pending';
    const statusColor = isPaid ? '#16a34a' : '#d97706';

    doc.font('Helvetica-Bold').fontSize(11).fillColor(statusColor)
       .text(statusLabel, 50, y + 14);

    /* ── FOOTER ── */
    const footerY = doc.page.height - 50;
    doc.moveTo(50, footerY).lineTo(545, footerY)
       .strokeColor('#e5e7eb').lineWidth(1).stroke();
    doc.font('Helvetica').fontSize(8).fillColor(gray)
       .text(
         `${process.env.STORE_NAME || 'Nansai Organics'} — Thank you for your order!`,
         50, footerY + 12,
         { align: 'center', width: 495 }
       );

    doc.end();
  });
}

module.exports = generateInvoicePDF;
