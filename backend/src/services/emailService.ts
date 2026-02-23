import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  if (!config.SMTP_HOST || !config.SMTP_USER) {
    // Dev mode: log emails to console
    logger.warn('SMTP not configured — emails will be logged to console only');
    transporter = nodemailer.createTransport({
      jsonTransport: true,
    } as nodemailer.TransportOptions);
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });

  return transporter;
}

async function sendEmail(opts: EmailOptions): Promise<void> {
  const t = getTransporter();
  const from = config.FROM_EMAIL || `"${config.APP_NAME}" <noreply@chatbotbuilder.app>`;

  try {
    const info = await t.sendMail({ from, ...opts });

    if (config.NODE_ENV !== 'production') {
      logger.info('Email sent (dev)', {
        to: opts.to,
        subject: opts.subject,
        preview: nodemailer.getTestMessageUrl(info) || 'no preview',
      });
    } else {
      logger.info('Email sent', { to: opts.to, subject: opts.subject, messageId: info.messageId });
    }
  } catch (error) {
    logger.error('Failed to send email', { to: opts.to, subject: opts.subject, error });
    // Don't throw — email failures shouldn't break the request
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 600px; margin: 0 auto; background: #fff;
`;

const btnStyle = `
  display: inline-block; background: #6366f1; color: #fff;
  padding: 12px 28px; border-radius: 8px; text-decoration: none;
  font-weight: 600; font-size: 15px; margin: 16px 0;
`;

function emailLayout(body: string, preheader = ''): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="background:#f8fafc; padding: 40px 16px;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <div style="${baseStyle}">
    <div style="padding: 32px 40px;">
      <div style="margin-bottom: 28px;">
        <span style="font-size: 20px; font-weight: 800; color: #6366f1;">🤖 ChatBot Builder</span>
      </div>
      ${body}
    </div>
    <div style="border-top: 1px solid #e5e7eb; padding: 20px 40px; color: #9ca3af; font-size: 12px;">
      <p>ChatBot Builder · support@chatbotbuilder.app</p>
      <p>You received this because you have an account with us.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string,
  frontendUrl: string
): Promise<void> {
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  await sendEmail({
    to: email,
    subject: 'Reset your ChatBot Builder password',
    text: `Hi ${name},\n\nYou requested a password reset. Click this link to reset it:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.\n\n— ChatBot Builder Team`,
    html: emailLayout(`
      <h2 style="color: #111; font-size: 22px; margin-bottom: 8px;">Reset your password</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">Hi ${name}, you requested a password reset. Click the button below to choose a new password.</p>
      <a href="${resetUrl}" style="${btnStyle}">Reset Password</a>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">
        This link expires in <strong>1 hour</strong>. If you didn't request a reset, you can safely ignore this email.
      </p>
      <p style="color: #9ca3af; font-size: 12px;">Or copy this URL: ${resetUrl}</p>
    `, 'Reset your ChatBot Builder password'),
  });
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  orgName: string,
  frontendUrl: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Welcome to ChatBot Builder, ${name}! 🤖`,
    text: `Hi ${name},\n\nWelcome to ChatBot Builder! Your account for ${orgName} is ready.\n\nGet started: ${frontendUrl}/dashboard\n\n— ChatBot Builder Team`,
    html: emailLayout(`
      <h2 style="color: #111; font-size: 22px; margin-bottom: 8px;">Welcome to ChatBot Builder! 👋</h2>
      <p style="color: #6b7280; margin-bottom: 8px;">Hi <strong>${name}</strong>, your account for <strong>${orgName}</strong> is all set up.</p>
      <p style="color: #6b7280; margin-bottom: 24px;">You have a 14-day free trial — no credit card needed.</p>
      <a href="${frontendUrl}/dashboard" style="${btnStyle}">Go to Dashboard →</a>
      <div style="margin-top: 32px; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <p style="font-weight: 600; color: #374151; margin-bottom: 12px;">Getting started in 3 steps:</p>
        <p style="color: #6b7280; margin: 6px 0;">1️⃣ Create your first chatbot</p>
        <p style="color: #6b7280; margin: 6px 0;">2️⃣ Customize the widget appearance</p>
        <p style="color: #6b7280; margin: 6px 0;">3️⃣ Embed it on your website</p>
      </div>
    `, `Welcome, ${name}! Your ChatBot Builder account is ready.`),
  });
}

export async function sendTrialEndingEmail(
  email: string,
  name: string,
  daysLeft: number,
  frontendUrl: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Your ChatBot Builder trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    text: `Hi ${name},\n\nYour free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Upgrade now to keep your chatbots running:\n\n${frontendUrl}/dashboard/billing\n\n— ChatBot Builder Team`,
    html: emailLayout(`
      <h2 style="color: #111; font-size: 22px; margin-bottom: 8px;">Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">Hi ${name}, your free trial is almost over. Upgrade now to keep your chatbots running and continue capturing leads.</p>
      <a href="${frontendUrl}/dashboard/billing" style="${btnStyle}">Upgrade Now →</a>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 24px;">Plans start at just $29/month. Cancel anytime.</p>
    `, `Your trial ends in ${daysLeft} days — upgrade to keep going`),
  });
}

export async function sendInvoiceReceiptEmail(
  email: string,
  name: string,
  amount: number,
  currency: string,
  invoiceUrl: string | null
): Promise<void> {
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);

  await sendEmail({
    to: email,
    subject: `Receipt for your ChatBot Builder subscription — ${formatted}`,
    text: `Hi ${name},\n\nThank you for your payment of ${formatted}.\n${invoiceUrl ? `View invoice: ${invoiceUrl}` : ''}\n\n— ChatBot Builder Team`,
    html: emailLayout(`
      <h2 style="color: #111; font-size: 22px; margin-bottom: 8px;">Payment confirmed ✅</h2>
      <p style="color: #6b7280; margin-bottom: 24px;">Hi ${name}, thank you! Your payment of <strong>${formatted}</strong> was processed successfully.</p>
      ${invoiceUrl ? `<a href="${invoiceUrl}" style="${btnStyle}">Download Invoice</a>` : ''}
      <p style="color: #9ca3af; font-size: 13px; margin-top: 16px;">Thank you for using ChatBot Builder!</p>
    `, `Receipt: ${formatted} payment received`),
  });
}
