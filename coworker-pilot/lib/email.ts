import { Resend } from "resend";
import {
  getVerificationEmailHtml,
  getVerificationEmailText,
  getVerificationEmailSubject,
  getWelcomeEmailHtml,
  getWelcomeEmailText,
  getWelcomeEmailSubject,
  getFeedbackNotificationEmailHtml,
  getFeedbackNotificationEmailText,
  getFeedbackNotificationEmailSubject,
  getFeedbackReceiptEmailHtml,
  getFeedbackReceiptEmailText,
  getFeedbackReceiptEmailSubject,
  getFirstWorkspaceEmailHtml,
  getFirstWorkspaceEmailText,
  getFirstWorkspaceEmailSubject,
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

/**
 * Send a welcome email after insider preview sign-up
 *
 * @param to - Recipient email address
 * @param name - User's full name
 * @param downloadUrl - URL to the download page
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  downloadUrl: string
): Promise<void> {
  // In development, optionally skip sending and log instead
  if (SKIP_EMAIL_IN_DEV && process.env.NODE_ENV === "development") {
    console.log(`[EMAIL] Skipped (dev mode) - Welcome email for ${to}`);
    return;
  }

  const resend = getResendClient();
  const from = getFromAddress();

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: getWelcomeEmailSubject(name),
      html: getWelcomeEmailHtml({ name, downloadUrl }),
      text: getWelcomeEmailText({ name, downloadUrl }),
    });

    if (error) {
      console.error("[EMAIL] Resend API error:", error);
      throw new EmailSendError(error.message);
    }

    console.log(`[EMAIL] Welcome email sent to ${to}`);
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

/**
 * Send a feedback notification email to an admin
 */
export async function sendFeedbackNotificationEmail(params: {
  to: string;
  type: string;
  message: string;
  userEmail?: string | null;
  canContact: boolean;
  includeScreenshot: boolean;
  createdAt: string;
}): Promise<void> {
  if (SKIP_EMAIL_IN_DEV && process.env.NODE_ENV === "development") {
    console.log(
      `[EMAIL] Skipped (dev mode) - Feedback notification to ${params.to}`
    );
    return;
  }

  const resend = getResendClient();
  const from = getFromAddress();

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: getFeedbackNotificationEmailSubject(),
      html: getFeedbackNotificationEmailHtml(params),
      text: getFeedbackNotificationEmailText(params),
    });

    if (error) {
      console.error("[EMAIL] Resend API error:", error);
      throw new EmailSendError(error.message);
    }

    console.log(`[EMAIL] Feedback notification sent to ${params.to}`);
  } catch (err) {
    if (err instanceof EmailConfigError || err instanceof EmailSendError) {
      throw err;
    }

    console.error("[EMAIL] Unexpected error sending email:", err);
    throw new EmailSendError(
      err instanceof Error ? err.message : "Failed to send email"
    );
  }
}

/**
 * Send a feedback receipt email to the submitting user
 */
export async function sendFeedbackReceiptEmail(params: {
  to: string;
  type: string;
  message: string;
  canContact: boolean;
  includeScreenshot: boolean;
  createdAt: string;
}): Promise<void> {
  if (SKIP_EMAIL_IN_DEV && process.env.NODE_ENV === "development") {
    console.log(
      `[EMAIL] Skipped (dev mode) - Feedback receipt to ${params.to}`
    );
    return;
  }

  const resend = getResendClient();
  const from = getFromAddress();

  try {
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: getFeedbackReceiptEmailSubject(),
      html: getFeedbackReceiptEmailHtml(params),
      text: getFeedbackReceiptEmailText(params),
    });

    if (error) {
      console.error("[EMAIL] Resend API error:", error);
      throw new EmailSendError(error.message);
    }

    console.log(`[EMAIL] Feedback receipt sent to ${params.to}`);
  } catch (err) {
    if (err instanceof EmailConfigError || err instanceof EmailSendError) {
      throw err;
    }

    console.error("[EMAIL] Unexpected error sending email:", err);
    throw new EmailSendError(
      err instanceof Error ? err.message : "Failed to send email"
    );
  }
}

/**
 * Send a first-workspace welcome email with onboarding guidance
 *
 * @param to - Recipient email address
 * @param name - User's display name
 * @param workspaceName - Name of the workspace they created
 */
export async function sendFirstWorkspaceEmail(
  to: string,
  name: string,
  workspaceName: string
): Promise<void> {
  if (SKIP_EMAIL_IN_DEV && process.env.NODE_ENV === "development") {
    console.log(
      `[EMAIL] Skipped (dev mode) - First workspace email for ${to}`
    );
    return;
  }

  const resend = getResendClient();
  const from = getFromAddress();

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: getFirstWorkspaceEmailSubject(workspaceName),
      html: getFirstWorkspaceEmailHtml({ name, workspaceName }),
      text: getFirstWorkspaceEmailText({ name, workspaceName }),
    });

    if (error) {
      console.error("[EMAIL] Resend API error:", error);
      throw new EmailSendError(error.message);
    }

    console.log(`[EMAIL] First workspace email sent to ${to}`);
  } catch (err) {
    if (err instanceof EmailConfigError || err instanceof EmailSendError) {
      throw err;
    }

    console.error("[EMAIL] Unexpected error sending email:", err);
    throw new EmailSendError(
      err instanceof Error ? err.message : "Failed to send email"
    );
  }
}
