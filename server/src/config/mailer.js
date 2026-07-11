const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendMail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"SyncSpace" <noreply@syncspace.io>',
    to,
    subject,
    html,
  });
  return info;
};

const emailTemplates = {
  verifyEmail: (name, link) => ({
    subject: 'Verify your SyncSpace email',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#6366f1">Welcome to SyncSpace, ${name}!</h2>
      <p>Please verify your email address to get started.</p>
      <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Verify Email</a>
      <p style="color:#666;font-size:14px">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
    </div>`,
  }),

  resetPassword: (name, link) => ({
    subject: 'Reset your SyncSpace password',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#6366f1">Password Reset Request</h2>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a>
      <p style="color:#666;font-size:14px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>`,
  }),

  roomInvitation: (name, roomName, inviterName, link) => ({
    subject: `You're invited to join "${roomName}" on SyncSpace`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto">
      <h2 style="color:#6366f1">Room Invitation</h2>
      <p>Hi ${name}, <strong>${inviterName}</strong> has invited you to collaborate in <strong>${roomName}</strong>.</p>
      <a href="${link}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0">Join Room</a>
      <p style="color:#666;font-size:14px">This invitation expires in 7 days.</p>
    </div>`,
  }),
};

module.exports = { sendMail, emailTemplates };
