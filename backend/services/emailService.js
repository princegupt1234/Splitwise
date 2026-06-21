const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE = process.env.FRONTEND_URL || 'http://localhost:3000';

const send = async (to, subject, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return; // skip if not configured
  try {
    await transporter.sendMail({
      from: `"FlatSplit" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

const wrap = (body) => `
  <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;background:#0f1117;color:#e8eaf0;border-radius:16px;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#4f56e8,#6574f3);padding:24px 28px;">
      <span style="font-size:22px;font-weight:700;color:#fff;">FlatSplit</span>
    </div>
    <div style="padding:28px;">${body}</div>
    <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.07);font-size:11px;color:#4a4d5e;">
      You're receiving this because you're a FlatSplit member. <a href="${BASE}" style="color:#6574f3;">Open App</a>
    </div>
  </div>`;

exports.sendSettlementRequest = (toEmail, { senderName, amount, groupName }) =>
  send(toEmail, `💸 Payment request from ${senderName}`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Payment Request</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;"><strong style="color:#fff">${senderName}</strong> sent you a payment request in <strong style="color:#fff">${groupName}</strong>.</p>
      <div style="background:rgba(101,116,243,0.12);border:1px solid rgba(101,116,243,0.25);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#8196f8;">Amount Requested</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#fff;">₹${amount}</p>
      </div>
      <a href="${BASE}/settlements" style="display:inline-block;background:linear-gradient(135deg,#4f56e8,#6574f3);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Review Request →</a>`));

exports.sendSettlementApproved = (toEmail, { receiverName, amount, groupName }) =>
  send(toEmail, `✅ Payment confirmed by ${receiverName}`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Payment Approved!</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;"><strong style="color:#fff">${receiverName}</strong> confirmed your payment of <strong style="color:#10b981">₹${amount}</strong> in <strong style="color:#fff">${groupName}</strong>.</p>
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:28px;">✅</p>
        <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#10b981;">₹${amount} Settled</p>
      </div>
      <a href="${BASE}/settlements" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Settlements →</a>`));

exports.sendSettlementRejected = (toEmail, { receiverName, amount, groupName, reason }) =>
  send(toEmail, `❌ Payment request rejected`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Payment Rejected</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;"><strong style="color:#fff">${receiverName}</strong> rejected your payment request of <strong style="color:#ef4444">₹${amount}</strong> in <strong style="color:#fff">${groupName}</strong>.</p>
      ${reason ? `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px 16px;margin-bottom:20px;"><p style="margin:0;font-size:13px;color:#f87171;">Reason: ${reason}</p></div>` : ''}
      <a href="${BASE}/settlements" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Settlements →</a>`));

exports.sendBudgetAlert = (toEmail, { userName, groupName, category, spent, limit }) =>
  send(toEmail, `⚠️ Budget alert — ${category} in ${groupName}`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Budget Exceeded!</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;">Hi <strong style="color:#fff">${userName}</strong>, the <strong style="color:#f59e0b">${category}</strong> budget in <strong style="color:#fff">${groupName}</strong> has been exceeded.</p>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#a0a3b1;font-size:13px;">Spent</span><span style="color:#f59e0b;font-weight:700;">₹${spent}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#a0a3b1;font-size:13px;">Budget Limit</span><span style="color:#fff;font-weight:700;">₹${limit}</span>
        </div>
      </div>
      <a href="${BASE}/reports" style="display:inline-block;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Reports →</a>`));
