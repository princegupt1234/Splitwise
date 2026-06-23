const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const BASE = () => process.env.FRONTEND_URL || 'http://localhost:3000';

// Resolve smtp.gmail.com to IPv4 and create transporter
const getTransporter = async () => {
  const addresses = await dns.resolve4('smtp.gmail.com');
  return nodemailer.createTransport({
    host: addresses[0],
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false, servername: 'smtp.gmail.com' },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
};

const send = async (to, subject, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email skipped: SMTP not configured');
    return;
  }
  try {
    const transporter = await getTransporter();
    await transporter.sendMail({
      from: `"FlatSplit" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
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
      You're receiving this because you're a FlatSplit member. <a href="${BASE()}" style="color:#6574f3;">Open App</a>
    </div>
  </div>`;

exports.sendOTP = (toEmail, { name, otp }) =>
  send(toEmail, `Your FlatSplit password reset OTP`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Password Reset</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;">Hi <strong style="color:#fff">${name}</strong>, use the OTP below to reset your password. It expires in <strong style="color:#fff">10 minutes</strong>.</p>
      <div style="background:rgba(101,116,243,0.12);border:1px solid rgba(101,116,243,0.25);border-radius:12px;padding:24px 20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#8196f8;">Your OTP</p>
        <p style="margin:8px 0 0;font-size:40px;font-weight:800;color:#fff;letter-spacing:12px;">${otp}</p>
      </div>
      <p style="color:#4a4d5e;font-size:12px;margin:0;">If you didn't request this, ignore this email. Your password won't change.</p>`));

exports.sendExpenseAdded = (toEmail, { memberName, addedBy, expenseTitle, amount, groupName }) =>
  send(toEmail, `New expense in ${groupName}`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">New Expense Added</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;">Hi <strong style="color:#fff">${memberName}</strong>, <strong style="color:#fff">${addedBy}</strong> added a new expense in <strong style="color:#fff">${groupName}</strong>.</p>
      <div style="background:rgba(101,116,243,0.12);border:1px solid rgba(101,116,243,0.25);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:13px;color:#8196f8;">${expenseTitle}</p>
        <p style="margin:6px 0 0;font-size:28px;font-weight:700;color:#fff;">&#8377;${amount}</p>
      </div>
      <a href="${BASE()}/expenses" style="display:inline-block;background:linear-gradient(135deg,#4f56e8,#6574f3);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Expenses</a>`));

exports.sendSettlementRequest = (toEmail, { senderName, amount, groupName }) =>
  send(toEmail, `Payment request from ${senderName}`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Payment Request</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;"><strong style="color:#fff">${senderName}</strong> sent you a payment request in <strong style="color:#fff">${groupName}</strong>.</p>
      <div style="background:rgba(101,116,243,0.12);border:1px solid rgba(101,116,243,0.25);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#8196f8;">Amount Requested</p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#fff;">&#8377;${amount}</p>
      </div>
      <a href="${BASE()}/settlements" style="display:inline-block;background:linear-gradient(135deg,#4f56e8,#6574f3);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Review Request</a>`));

exports.sendSettlementApproved = (toEmail, { receiverName, amount, groupName }) =>
  send(toEmail, `Payment confirmed by ${receiverName}`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Payment Approved!</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;"><strong style="color:#fff">${receiverName}</strong> confirmed your payment of <strong style="color:#10b981">&#8377;${amount}</strong> in <strong style="color:#fff">${groupName}</strong>.</p>
      <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;font-size:28px;">&#10003;</p>
        <p style="margin:6px 0 0;font-size:16px;font-weight:700;color:#10b981;">&#8377;${amount} Settled</p>
      </div>
      <a href="${BASE()}/settlements" style="display:inline-block;background:linear-gradient(135deg,#059669,#10b981);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Settlements</a>`));

exports.sendSettlementRejected = (toEmail, { receiverName, amount, groupName, reason }) =>
  send(toEmail, `Payment request rejected`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Payment Rejected</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;"><strong style="color:#fff">${receiverName}</strong> rejected your payment request of <strong style="color:#ef4444">&#8377;${amount}</strong> in <strong style="color:#fff">${groupName}</strong>.</p>
      ${reason ? `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px 16px;margin-bottom:20px;"><p style="margin:0;font-size:13px;color:#f87171;">Reason: ${reason}</p></div>` : ''}
      <a href="${BASE()}/settlements" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Settlements</a>`));

exports.sendMonthlyReport = (toEmail, { userName, groupName, month, year, totalExpense, myPaid, myShare, myBalance, categoryWise, memberWise }) => {
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  const catRows = (categoryWise || []).map((c) =>
    `<tr><td style="padding:8px 12px;color:#a0a3b1;font-size:13px;">${c.category}</td><td style="padding:8px 12px;color:#fff;font-weight:600;text-align:right;">&#8377;${c.total}</td></tr>`
  ).join('');
  const memRows = (memberWise || []).map((m) =>
    `<tr><td style="padding:8px 12px;color:#a0a3b1;font-size:13px;">${m.name}</td><td style="padding:8px 12px;color:#10b981;font-weight:600;text-align:right;">&#8377;${m.paid}</td><td style="padding:8px 12px;color:#f59e0b;font-weight:600;text-align:right;">&#8377;${m.share}</td></tr>`
  ).join('');
  return send(toEmail, `${monthName} ${year} Report - ${groupName}`,
    wrap(`<h2 style="margin:0 0 4px;color:#fff;">Monthly Summary</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;font-size:13px;">${monthName} ${year} - ${groupName}</p>
      <p style="color:#a0a3b1;margin:0 0 16px;">Hi <strong style="color:#fff">${userName}</strong>, here's your expense summary for last month.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
        <div style="background:rgba(101,116,243,0.12);border:1px solid rgba(101,116,243,0.2);border-radius:10px;padding:14px;text-align:center;"><p style="margin:0;font-size:11px;color:#8196f8;">Total Expenses</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#fff;">&#8377;${totalExpense}</p></div>
        <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:14px;text-align:center;"><p style="margin:0;font-size:11px;color:#6ee7b7;">You Paid</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#10b981;">&#8377;${myPaid}</p></div>
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px;text-align:center;"><p style="margin:0;font-size:11px;color:#fcd34d;">Your Share</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#f59e0b;">&#8377;${myShare}</p></div>
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:14px;text-align:center;"><p style="margin:0;font-size:11px;color:#fca5a5;">Net Balance</p><p style="margin:4px 0 0;font-size:22px;font-weight:700;color:${myBalance >= 0 ? '#10b981' : '#ef4444'}">${myBalance >= 0 ? '+' : ''}&#8377;${myBalance}</p></div>
      </div>
      ${catRows ? `<p style="color:#fff;font-weight:600;margin:0 0 8px;font-size:13px;">By Category</p><table width="100%" style="border-collapse:collapse;margin-bottom:20px;background:rgba(255,255,255,0.03);border-radius:10px;overflow:hidden;">${catRows}</table>` : ''}
      ${memRows ? `<p style="color:#fff;font-weight:600;margin:0 0 8px;font-size:13px;">Members</p><table width="100%" style="border-collapse:collapse;margin-bottom:20px;background:rgba(255,255,255,0.03);border-radius:10px;overflow:hidden;"><tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><th style="padding:8px 12px;color:#4a4d5e;font-size:11px;text-align:left;">Member</th><th style="padding:8px 12px;color:#4a4d5e;font-size:11px;text-align:right;">Paid</th><th style="padding:8px 12px;color:#4a4d5e;font-size:11px;text-align:right;">Share</th></tr>${memRows}</table>` : ''}
      <a href="${BASE()}/reports" style="display:inline-block;background:linear-gradient(135deg,#4f56e8,#6574f3);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Full Report</a>`));
};

exports.sendBudgetAlert = (toEmail, { userName, groupName, category, spent, limit }) =>
  send(toEmail, `Budget alert - ${category} in ${groupName}`,
    wrap(`<h2 style="margin:0 0 12px;color:#fff;">Budget Exceeded!</h2>
      <p style="color:#a0a3b1;margin:0 0 20px;">Hi <strong style="color:#fff">${userName}</strong>, the <strong style="color:#f59e0b">${category}</strong> budget in <strong style="color:#fff">${groupName}</strong> has been exceeded.</p>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:16px 20px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span style="color:#a0a3b1;font-size:13px;">Spent</span><span style="color:#f59e0b;font-weight:700;">&#8377;${spent}</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#a0a3b1;font-size:13px;">Budget Limit</span><span style="color:#fff;font-weight:700;">&#8377;${limit}</span>
        </div>
      </div>
      <a href="${BASE()}/reports" style="display:inline-block;background:linear-gradient(135deg,#d97706,#f59e0b);color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Reports</a>`));
