/**
 * Email templates for Coworkers
 *
 * Uses inline styles for email client compatibility.
 * Brand colors:
 * - Background: #FAF8F5 (Warm Cream)
 * - Card: #FDFCFA (Soft Cream)
 * - Text: #2D2A26 (Warm Charcoal)
 * - Border: #EBE8E3 (Warm Gray)
 * - Accent: #C4725C (Terracotta)
 * - Muted: #5C5A57 (Muted Text)
 * - Subtle: #8A8885 (Subtle Text)
 */

interface VerificationEmailParams {
  code: string;
  expiresInMinutes: number;
}

/**
 * Generate HTML email for verification code
 */
export function getVerificationEmailHtml({
  code,
  expiresInMinutes,
}: VerificationEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Coworkers verification code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5;">
    <tr>
      <td style="padding: 48px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 480px; margin: 0 auto; background-color: #FDFCFA; border: 1px solid #EBE8E3; border-radius: 12px;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; color: #2D2A26; letter-spacing: -0.5px;">
                Coworkers
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <h2 style="margin: 0 0 12px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 500; color: #2D2A26;">
                Your verification code
              </h2>
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #5C5A57;">
                Enter this code to sign in to your account. It will expire in ${expiresInMinutes} minutes.
              </p>
            </td>
          </tr>

          <!-- Code Display -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <div style="display: inline-block; background-color: #FAF8F5; border: 2px solid #EBE8E3; border-radius: 8px; padding: 20px 32px;">
                <span style="font-family: 'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace; font-size: 36px; font-weight: 600; letter-spacing: 8px; color: #2D2A26;">
                  ${code}
                </span>
              </div>
            </td>
          </tr>

          <!-- Security Note -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #8A8885;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #EBE8E3; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8885;">
                This email was sent by Coworkers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate plain text email for verification code
 */
export function getVerificationEmailText({
  code,
  expiresInMinutes,
}: VerificationEmailParams): string {
  return `
Your Coworkers verification code

Enter this code to sign in to your account:

${code}

This code will expire in ${expiresInMinutes} minutes.

If you didn't request this code, you can safely ignore this email.

—
Coworkers
`.trim();
}

/**
 * Get the email subject for verification emails
 */
export function getVerificationEmailSubject(): string {
  return "Your Coworkers verification code";
}

/* ──────────────────────────────────────────────
   Welcome Email
   ────────────────────────────────────────────── */

interface WelcomeEmailParams {
  name: string;
  downloadUrl: string;
}

/**
 * Get the email subject for welcome emails
 */
export function getWelcomeEmailSubject(name: string): string {
  const firstName = name.split(" ")[0];
  return `Welcome to Coworkers, ${firstName}`;
}

/**
 * Generate HTML email for welcome / insider preview onboarding
 */
export function getWelcomeEmailHtml({
  name,
  downloadUrl,
}: WelcomeEmailParams): string {
  const firstName = name.split(" ")[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Coworkers</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5;">
    <tr>
      <td style="padding: 48px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #FDFCFA; border: 1px solid #EBE8E3; border-radius: 12px;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; color: #2D2A26; letter-spacing: -0.5px;">
                Coworkers
              </h1>
            </td>
          </tr>

          <!-- Hero Greeting -->
          <tr>
            <td style="padding: 0 40px 16px 40px; text-align: center;">
              <h2 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 500; color: #2D2A26; letter-spacing: -0.5px;">
                hello, ${firstName}.
              </h2>
            </td>
          </tr>

          <!-- Welcome Copy -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #5C5A57;">
                You're part of the insider preview now. That means you're one of the first people to experience Coworkers — and your experience will shape what it becomes.
              </p>
            </td>
          </tr>

          <!-- Insider Preview Reminders -->
          <tr>
            <td style="padding: 0 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px; border-left: 3px solid #C4725C;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">
                      Mac only — for now
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #5C5A57;">
                      Windows &amp; Linux are coming March 2026.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px; border-left: 3px solid #C4725C;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">
                      Beta software
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #5C5A57;">
                      Bugs are expected. Let us know via File &gt; Send Feedback.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px; border-left: 3px solid #C4725C;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">
                      Unlimited AI access
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #5C5A57;">
                      Full access on a trust basis — no credit cap. We just ask that you avoid high-intensity automated workloads.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feedback Encouragement -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #5C5A57;">
                We genuinely want to hear from you — what works, what doesn't, what could be better, what you love. All of it helps us build something great.
              </p>
            </td>
          </tr>

          <!-- Download CTA -->
          <tr>
            <td style="padding: 0 40px 12px 40px; text-align: center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 50px; background-color: #C4725C;">
                    <a href="${downloadUrl}" style="display: inline-block; padding: 16px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 50px;">
                      Download Coworkers
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #8A8885;">
                or visit <a href="${downloadUrl}" style="color: #C4725C; text-decoration: underline;">${downloadUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #EBE8E3; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8885;">
                This email was sent by Coworkers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate plain text email for welcome / insider preview onboarding
 */
export function getWelcomeEmailText({
  name,
  downloadUrl,
}: WelcomeEmailParams): string {
  const firstName = name.split(" ")[0];

  return `
Welcome to Coworkers, ${firstName}

You're part of the insider preview now. That means you're one of the first people to experience Coworkers — and your experience will shape what it becomes.

A few things to know:

Mac only — for now
Windows & Linux are coming March 2026.

Beta software
Bugs are expected. Let us know via File > Send Feedback.

Unlimited AI access
Full access on a trust basis — no credit cap. We just ask that you avoid high-intensity automated workloads.

We genuinely want to hear from you — what works, what doesn't, what could be better, what you love. All of it helps us build something great.

Download Coworkers: ${downloadUrl}

—
Coworkers
`.trim();
}

/* ──────────────────────────────────────────────
   Feedback Notification Email
   ────────────────────────────────────────────── */

interface FeedbackNotificationParams {
  type: string;
  message: string;
  userEmail?: string | null;
  canContact: boolean;
  includeScreenshot: boolean;
  createdAt: string;
}

export function getFeedbackNotificationEmailSubject(): string {
  return "New Coworkers feedback submitted";
}

export function getFeedbackNotificationEmailHtml({
  type,
  message,
  userEmail,
  canContact,
  includeScreenshot,
  createdAt,
}: FeedbackNotificationParams): string {
  const contactLabel = canContact ? "Yes" : "No";
  const userLabel = userEmail ? userEmail : "Anonymous";
  const screenshotLabel = includeScreenshot ? "Included" : "Not included";
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New feedback submitted</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5;">
    <tr>
      <td style="padding: 40px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #FDFCFA; border: 1px solid #EBE8E3; border-radius: 12px;">
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 500; color: #2D2A26;">
                New feedback submitted
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #5C5A57;">
                ${createdAt}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px; font-size: 14px; color: #2D2A26;">
                    <p style="margin: 0 0 6px 0;"><strong>Type:</strong> ${type}</p>
                    <p style="margin: 0 0 6px 0;"><strong>User:</strong> ${userLabel}</p>
                    <p style="margin: 0 0 6px 0;"><strong>Contact allowed:</strong> ${contactLabel}</p>
                    <p style="margin: 0;"><strong>Screenshot:</strong> ${screenshotLabel}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">Message</p>
              <div style="white-space: pre-wrap; background-color: #FAF8F5; border: 1px solid #EBE8E3; border-radius: 8px; padding: 16px; font-size: 14px; color: #2D2A26;">
                ${escapedMessage}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #EBE8E3; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8885;">
                This email was sent by Coworkers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function getFeedbackNotificationEmailText({
  type,
  message,
  userEmail,
  canContact,
  includeScreenshot,
  createdAt,
}: FeedbackNotificationParams): string {
  return `
New feedback submitted

Date: ${createdAt}
Type: ${type}
User: ${userEmail ?? "Anonymous"}
Contact allowed: ${canContact ? "Yes" : "No"}
Screenshot: ${includeScreenshot ? "Included" : "Not included"}

Message:
${message}

—
Coworkers
`.trim();
}

/* ──────────────────────────────────────────────
   Feedback Receipt Email
   ────────────────────────────────────────────── */

interface FeedbackReceiptParams {
  type: string;
  message: string;
  canContact: boolean;
  includeScreenshot: boolean;
  createdAt: string;
}

export function getFeedbackReceiptEmailSubject(): string {
  return "We received your feedback";
}

export function getFeedbackReceiptEmailHtml({
  type,
  message,
  canContact,
  includeScreenshot,
  createdAt,
}: FeedbackReceiptParams): string {
  const contactLabel = canContact ? "Yes" : "No";
  const screenshotLabel = includeScreenshot ? "Included" : "Not included";
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We received your feedback</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5;">
    <tr>
      <td style="padding: 40px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 0 auto; background-color: #FDFCFA; border: 1px solid #EBE8E3; border-radius: 12px;">
          <tr>
            <td style="padding: 32px 32px 12px 32px;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 500; color: #2D2A26;">
                We received your feedback
              </h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #5C5A57;">
                ${createdAt}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #5C5A57;">
                Thanks for taking the time to share this. We review every submission.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px;">
                <tr>
                  <td style="padding: 16px 20px; font-size: 14px; color: #2D2A26;">
                    <p style="margin: 0 0 6px 0;"><strong>Type:</strong> ${type}</p>
                    <p style="margin: 0 0 6px 0;"><strong>Contact allowed:</strong> ${contactLabel}</p>
                    <p style="margin: 0;"><strong>Screenshot:</strong> ${screenshotLabel}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px 32px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">Your message</p>
              <div style="white-space: pre-wrap; background-color: #FAF8F5; border: 1px solid #EBE8E3; border-radius: 8px; padding: 16px; font-size: 14px; color: #2D2A26;">
                ${escapedMessage}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #EBE8E3; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8885;">
                This email was sent by Coworkers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function getFeedbackReceiptEmailText({
  type,
  message,
  canContact,
  includeScreenshot,
  createdAt,
}: FeedbackReceiptParams): string {
  return `
We received your feedback

Date: ${createdAt}
Type: ${type}
Contact allowed: ${canContact ? "Yes" : "No"}
Screenshot: ${includeScreenshot ? "Included" : "Not included"}

Your message:
${message}

Thanks for helping us improve Coworkers.

—
Coworkers
`.trim();
}

/* ──────────────────────────────────────────────
   First Workspace Email
   ────────────────────────────────────────────── */

interface FirstWorkspaceEmailParams {
  name: string;
  workspaceName: string;
}

/**
 * Get the email subject for first-workspace emails
 */
export function getFirstWorkspaceEmailSubject(workspaceName: string): string {
  return `Your workspace "${workspaceName}" is ready`;
}

/**
 * Generate HTML email for first-workspace onboarding
 */
export function getFirstWorkspaceEmailHtml({
  name,
  workspaceName,
}: FirstWorkspaceEmailParams): string {
  const firstName = name.split(" ")[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your workspace is ready</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5;">
    <tr>
      <td style="padding: 48px 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #FDFCFA; border: 1px solid #EBE8E3; border-radius: 12px;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 500; color: #2D2A26; letter-spacing: -0.5px;">
                Coworkers
              </h1>
            </td>
          </tr>

          <!-- Hero Greeting -->
          <tr>
            <td style="padding: 0 40px 16px 40px; text-align: center;">
              <h2 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 36px; font-weight: 500; color: #2D2A26; letter-spacing: -0.5px;">
                your first workspace.
              </h2>
            </td>
          </tr>

          <!-- Intro Copy -->
          <tr>
            <td style="padding: 0 40px 32px 40px; text-align: center;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #5C5A57;">
                Nice work, ${firstName} — you just created <strong style="color: #2D2A26;">${workspaceName}</strong>. Here's a quick guide to help you make the most of it.
              </p>
            </td>
          </tr>

          <!-- Callout 1: Set up your first co-worker -->
          <tr>
            <td style="padding: 0 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px; border-left: 3px solid #C4725C;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">
                      Set up your first co-worker
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #5C5A57;">
                      Co-workers are AI teammates with specific roles — a writer, a researcher, a strategist, whatever you need. Open the sidebar and click <strong style="color: #2D2A26;">New Co-worker</strong> to create one. You can start from a template or build one from scratch.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Callout 2: Add knowledge sources -->
          <tr>
            <td style="padding: 0 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px; border-left: 3px solid #C4725C;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">
                      Add knowledge sources
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #5C5A57;">
                      Sources give your co-workers context — documents, notes, links, or files that inform their responses. Add them at the workspace level for everyone, or scope them to a specific channel. You can drag and drop files directly into the app.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Callout 3: Start a conversation -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #FAF8F5; border-radius: 8px; border-left: 3px solid #C4725C;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #2D2A26;">
                      Start a conversation
                    </p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #5C5A57;">
                      Channels organize your work by topic or project. Create a channel, start a thread, and mention a co-worker by name to bring them into the conversation. They'll remember context from earlier in the thread, so the discussion gets smarter over time.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Closing Copy -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #5C5A57;">
                We're building Coworkers based on real feedback from people like you. If something feels off or you have an idea, let us know via <strong style="color: #2D2A26;">File &gt; Send Feedback</strong> in the app.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #EBE8E3; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8A8885;">
                This email was sent by Coworkers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Generate plain text email for first-workspace onboarding
 */
export function getFirstWorkspaceEmailText({
  name,
  workspaceName,
}: FirstWorkspaceEmailParams): string {
  const firstName = name.split(" ")[0];

  return `
Your first workspace

Nice work, ${firstName} — you just created "${workspaceName}". Here's a quick guide to help you make the most of it.

Set up your first co-worker
Co-workers are AI teammates with specific roles — a writer, a researcher, a strategist, whatever you need. Open the sidebar and click "New Co-worker" to create one. You can start from a template or build one from scratch.

Add knowledge sources
Sources give your co-workers context — documents, notes, links, or files that inform their responses. Add them at the workspace level for everyone, or scope them to a specific channel. You can drag and drop files directly into the app.

Start a conversation
Channels organize your work by topic or project. Create a channel, start a thread, and mention a co-worker by name to bring them into the conversation. They'll remember context from earlier in the thread, so the discussion gets smarter over time.

We're building Coworkers based on real feedback from people like you. If something feels off or you have an idea, let us know via File > Send Feedback in the app.

—
Coworkers
`.trim();
}
