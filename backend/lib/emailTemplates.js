function getOrderConfirmationEmail(order) {
  const customerName = order.customer_name || order.customers?.name || 'Valued Customer';
  const items = Array.isArray(order.items) ? order.items : [];
  const total = Number(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateStr = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  const itemsHtml = items.map(item => {
    const name = item.name || item.product_name || 'Item';
    const qty = item.quantity || item.qty || 1;
    const price = Number(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `<tr>
      <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.04);color:#E8E6E2;font-size:14px;">${name}</td>
      <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.04);color:#9A9A9A;text-align:center;font-size:13px;">x${qty}</td>
      <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.04);color:#F2F0EC;text-align:right;font-weight:600;font-size:14px;">$${price}</td>
    </tr>`;
  }).join('');

  return {
    subject: `Your Order #${order.id} is Confirmed — Forge Dominance`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#020202;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F2F0EC;">
<div style="max-width:620px;margin:0 auto;padding:40px 16px;">

<!-- HEADER -->
<div style="text-align:center;padding:32px 0 28px;">
  <div style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#D4500A;font-weight:600;">Forge Dominance</div>
  <h1 style="margin:12px 0 0;font-size:28px;font-weight:700;color:#F2F0EC;letter-spacing:-0.5px;">Order Confirmed</h1>
</div>

<!-- MAIN CARD -->
<div style="background:#0A0A0A;border:1px solid rgba(212,80,10,.2);border-radius:12px;overflow:hidden;">

  <!-- EMBER ACCENT BAR -->
  <div style="height:3px;background:linear-gradient(90deg,transparent,#D4500A,#F06020,#D4500A,transparent);"></div>

  <!-- BODY -->
  <div style="padding:36px 32px;">
    <p style="color:#C8C6C2;line-height:1.75;margin:0 0 24px;font-size:15px;">Dear <strong style="color:#F2F0EC;">${customerName}</strong>,</p>
    <p style="color:#C8C6C2;line-height:1.75;margin:0 0 28px;font-size:15px;">Your order has been reviewed and confirmed by our team. Our master bladesmiths are preparing your handcrafted blade with precision and care.</p>

    <!-- ORDER INFO -->
    <div style="background:#111;border:1px solid rgba(255,255,255,.04);border-radius:8px;padding:20px 24px;margin:0 0 28px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#9A9A9A;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Order ID</td>
          <td style="padding:6px 0;color:#F2F0EC;text-align:right;font-size:15px;font-weight:700;">#${order.id}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#9A9A9A;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Date</td>
          <td style="padding:6px 0;color:#F2F0EC;text-align:right;font-size:14px;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#9A9A9A;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Status</td>
          <td style="padding:6px 0;text-align:right;"><span style="display:inline-block;padding:3px 10px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:20px;color:#10B981;font-size:12px;font-weight:600;letter-spacing:0.5px;">CONFIRMED</span></td>
        </tr>
      </table>
    </div>

    <!-- ITEMS TABLE -->
    ${items.length ? `
    <div style="margin:0 0 28px;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#D4500A;margin-bottom:12px;font-weight:600;">Your Blades</div>
      <table style="width:100%;border-collapse:collapse;background:#0D0D0D;border:1px solid rgba(255,255,255,.04);border-radius:8px;overflow:hidden;">
        ${itemsHtml}
        <tr style="background:rgba(212,80,10,.04);">
          <td colspan="2" style="padding:16px 20px;color:#F2F0EC;font-weight:700;font-size:14px;">Total</td>
          <td style="padding:16px 20px;color:#D4500A;text-align:right;font-weight:700;font-size:16px;">$${total}</td>
        </tr>
      </table>
    </div>` : ''}

    <!-- NEXT STEPS -->
    <div style="background:rgba(212,80,10,.04);border-left:3px solid #D4500A;border-radius:0 8px 8px 0;padding:18px 22px;margin:0 0 28px;">
      <div style="font-size:13px;font-weight:700;color:#F2F0EC;margin-bottom:8px;">What Happens Next</div>
      <p style="color:#9A9A9A;font-size:13px;line-height:1.7;margin:0;">Our team will contact you within 2 hours to confirm specifications and delivery timeline. Your blade enters production once confirmed — estimated build time is 6-10 weeks.</p>
    </div>

    <p style="color:#C8C6C2;line-height:1.75;margin:0;font-size:14px;">Questions? Reply to this email or reach us on WhatsApp anytime.</p>
  </div>
</div>

<!-- FOOTER -->
<div style="text-align:center;padding:28px 0 8px;">
  <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#444;">Forge Dominance</div>
  <p style="color:#555;font-size:12px;margin:8px 0 0;line-height:1.6;">Premium Handcrafted Hunting Knives<br/>Built to last a lifetime. Backed by one.</p>
</div>

</div>
</body></html>`
  };
}

function getCommissionConfirmationEmail(commission) {
  return {
    subject: `Commission Confirmed - #${commission.id} | Forge Dominance`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#050505;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#F2F0EC">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">
<div style="background:#0B0B0B;border:1px solid rgba(212,80,10,.28);border-radius:16px;overflow:hidden">
<div style="padding:28px 30px;background:linear-gradient(135deg,#D4500A,#9A3A07)">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.85)">Forge Dominance</div>
<h1 style="margin:10px 0 0;font-size:24px;color:#fff">Commission Confirmed</h1>
</div>
<div style="padding:28px 30px">
<p style="color:#ccc;line-height:1.7;margin:0 0 20px">Dear ${commission.full_name || 'Valued Customer'},</p>
<p style="color:#ccc;line-height:1.7;margin:0 0 20px">Your custom knife commission has been reviewed and accepted. We are excited to bring your vision to life.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0">
<tr><td style="padding:8px 12px;color:#9A9A9A;font-size:13px">Commission ID</td><td style="padding:8px 12px;color:#F2F0EC;text-align:right"><strong>#${commission.id}</strong></td></tr>
<tr><td style="padding:8px 12px;color:#9A9A9A;font-size:13px">Budget</td><td style="padding:8px 12px;color:#F2F0EC;text-align:right">$${commission.budget || 'TBD'}</td></tr>
<tr><td style="padding:8px 12px;color:#9A9A9A;font-size:13px">Status</td><td style="padding:8px 12px;color:#10B981;text-align:right">Confirmed</td></tr>
</table>
<p style="color:#ccc;line-height:1.7;margin:20px 0">Our team will reach out within 24-48 hours to discuss blade specs, handle material, finish, and timeline.</p>
<p style="color:#ccc;line-height:1.7;margin:20px 0">Thank you for choosing Bladesmith for your custom commission.</p>
</div>
<div style="padding:18px 30px;border-top:1px solid rgba(255,255,255,.06);color:#777;font-size:12px;text-align:center">
<p style="margin:0">Bladesmith - Premium Handcrafted Hunting Knives</p>
</div>
</div>
</div>
</body></html>`
  };
}

module.exports = { getOrderConfirmationEmail, getCommissionConfirmationEmail };
