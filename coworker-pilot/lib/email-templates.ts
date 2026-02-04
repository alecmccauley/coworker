/**
 * Email templates for Coworker authentication
 *
 * Uses inline styles for email client compatibility.
 * Brand colors:
 * - Background: #FAF8F5 (Warm Cream)
 * - Card: #FDFCFA (Soft Cream)
 * - Text: #2D2A26 (Warm Charcoal)
 * - Border: #EBE8E3 (Warm Gray)
 * - Accent: #C4725C (Terracotta)
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
  <title>Your Coworker verification code</title>
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
                Coworker
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
                This email was sent by Coworker
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
Your Coworker verification code

Enter this code to sign in to your account:

${code}

This code will expire in ${expiresInMinutes} minutes.

If you didn't request this code, you can safely ignore this email.

—
Coworker
`.trim();
}

/**
 * Get the email subject for verification emails
 */
export function getVerificationEmailSubject(): string {
  return "Your Coworker verification code";
}
