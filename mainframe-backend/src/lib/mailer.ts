import nodemailer from 'nodemailer';

export function createMailTransport() {
  const port = parseInt(process.env.SMTP_PORT || '465');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.spacemail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

// ── Welcome email (sent after POS provisioning with full credentials) ─────────
export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
  businessName: string;
  companyCode: string;
  ownerEmail: string;
  ownerPassword: string;
}): Promise<void> {
  if (!isSmtpConfigured()) return;
  const { to, firstName, businessName, companyCode, ownerEmail, ownerPassword } = opts;
  const loginUrl = 'https://pos.truedesk.co.uk';
  const transport = createMailTransport();

  await transport.sendMail({
    from: 'TrueDesk <hello@truedesk.co.uk>',
    to,
    subject: 'Welcome to TrueDesk POS — Your account is ready',
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to TrueDesk</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#111;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">TrueDesk POS</h1>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Point of Sale &amp; Repair Management</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:16px;color:#111;font-weight:600;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Your TrueDesk POS account for <strong style="color:#111;">${businessName}</strong> is ready to use.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:24px;margin-bottom:28px;">
            <tr><td>
              <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Your Login Details</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;width:130px;">Company Code</td>
                  <td style="padding:4px 0;font-size:13px;color:#111;font-weight:600;">${companyCode}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;">Email</td>
                  <td style="padding:4px 0;font-size:13px;color:#111;font-weight:600;">${ownerEmail}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;">Password</td>
                  <td style="padding:4px 0;font-size:13px;color:#111;font-weight:600;font-family:monospace;">${ownerPassword}</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">⚠️ Please change your password after your first login.</p>
          <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr><td style="background:#111;border-radius:8px;">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;">
                Log in to TrueDesk POS →
              </a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Questions? Contact us at <a href="mailto:support@truedesk.co.uk" style="color:#111;">support@truedesk.co.uk</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">TrueDesk · <a href="https://truedesk.co.uk" style="color:#6b7280;">truedesk.co.uk</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });
}

// ── Onboarding email (sent when admin creates a new client profile) ────────────
export async function sendOnboardingEmail(opts: {
  to: string;
  firstName: string;
  businessName: string;
  companyCode: string;
  plan: string;
  monthlyPrice: number;
  onboardingUrl: string;
}): Promise<void> {
  if (!isSmtpConfigured()) return;
  const { to, firstName, businessName, companyCode, plan, monthlyPrice, onboardingUrl } = opts;
  const transport = createMailTransport();

  const planLabel =
    plan === 'STARTER' ? 'Starter' :
    plan === 'PROFESSIONAL' ? 'Professional' :
    plan === 'BUSINESS' ? 'Business' :
    plan === 'ENTERPRISE' ? 'Enterprise' : 'Custom';

  await transport.sendMail({
    from: 'TrueDesk <hello@truedesk.co.uk>',
    to,
    subject: `Complete your TrueDesk POS setup — ${businessName}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Complete Your TrueDesk Setup</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <tr><td style="background:#111;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">TrueDesk POS</h1>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:13px;">Point of Sale &amp; Repair Management</p>
        </td></tr>

        <tr><td style="padding:40px;">
          <p style="margin:0 0 8px;font-size:16px;color:#111;font-weight:600;">Hi ${firstName},</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            We've reserved your TrueDesk POS account for <strong style="color:#111;">${businessName}</strong>.
            To get started, please take 2 minutes to fill in your business details and confirm your subscription.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin-bottom:24px;">
            <tr><td>
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Your Account Details</p>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;width:140px;">Company Code</td>
                  <td style="padding:4px 0;font-size:13px;color:#111;font-weight:700;font-family:monospace;">${companyCode}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;font-size:13px;color:#6b7280;">Plan</td>
                  <td style="padding:4px 0;font-size:13px;color:#111;font-weight:600;">${planLabel} — £${monthlyPrice}/month</td>
                </tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
            Click the button below to complete your setup. You'll be asked to:
          </p>
          <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#6b7280;line-height:2;">
            <li>Enter your business address and VAT number</li>
            <li>Confirm your monthly subscription</li>
            <li>Accept our Terms &amp; Conditions</li>
          </ul>

          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="background:#007AFF;border-radius:10px;">
              <a href="${onboardingUrl}" style="display:inline-block;padding:16px 36px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">
                Complete Your Setup →
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
            ⏱ This link expires in <strong>7 days</strong>.
          </p>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Questions? Reply to this email or contact
            <a href="mailto:support@truedesk.co.uk" style="color:#111;">support@truedesk.co.uk</a>
          </p>
        </td></tr>

        <tr><td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            TrueDesk · <a href="https://truedesk.co.uk" style="color:#6b7280;">truedesk.co.uk</a>
          </p>
          <p style="margin:6px 0 0;font-size:11px;color:#d1d5db;">
            If you didn't request this, please ignore this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`,
  });
}
