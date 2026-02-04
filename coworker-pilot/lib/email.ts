import { Resend } from "resend";
import {
  getVerificationEmailHtml,
  getVerificationEmailText,
  getVerificationEmailSubject,
} from "./email-templates";

// Environment configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS;
const SKIP_EMAIL_IN_DEV = process.env.SKIP_EMAIL_IN_DEV === "true";

// Lazy-initialized Resend client
let resendClient: Resend | null = null;

/**
 * Error thrown when email service is not configured
 */
export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

/**
 * Error thrown when email sending fails
 */
export class EmailSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailSendError";
  }
}

/**
 * Get or initialize the Resend client
 */
function getResendClient(): Resend {
  if (!RESEND_API_KEY) {
    throw new EmailConfigError("RESEND_API_KEY environment variable is not set");
  }

  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }

  return resendClient;
}

/**
 * Get the configured from address
 */
function getFromAddress(): string {
  if (!EMAIL_FROM_ADDRESS) {
    throw new EmailConfigError(
      "EMAIL_FROM_ADDRESS environment variable is not set"
    );
  }
  return EMAIL_FROM_ADDRESS;
}

/**
 * Send a verification code email
 *
 * @param to - Recipient email address
 * @param code - 6-digit verification code
 * @param expiresInMinutes - Code expiry time in minutes
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  expiresInMinutes: number
): Promise<void> {
  // In development, optionally skip sending and log instead
  if (SKIP_EMAIL_IN_DEV && process.env.NODE_ENV === "development") {
    console.log(`[EMAIL] Skipped (dev mode) - Verification code for ${to}: ${code}`);
    return;
  }

  const resend = getResendClient();
  const from = getFromAddress();

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: getVerificationEmailSubject(),
      html: getVerificationEmailHtml({ code, expiresInMinutes }),
      text: getVerificationEmailText({ code, expiresInMinutes }),
    });

    if (error) {
      console.error("[EMAIL] Resend API error:", error);
      throw new EmailSendError(error.message);
    }

    console.log(`[EMAIL] Verification email sent to ${to}`);
  } catch (err) {
    // Re-throw our custom errors
    if (err instanceof EmailConfigError || err instanceof EmailSendError) {
      throw err;
    }

    // Wrap unexpected errors
    console.error("[EMAIL] Unexpected error sending email:", err);
    throw new EmailSendError(
      err instanceof Error ? err.message : "Failed to send email"
    );
  }
}
