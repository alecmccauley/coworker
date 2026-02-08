# Coworkers Privacy Policy

**Effective Date:** February 8, 2026
**Last Updated:** February 8, 2026

---

## Our Approach to Privacy

Coworkers is built on a local-first architecture. Your workspace data—co-workers, channels, threads, conversations, and files—lives on your device, not on our servers. We collect only what we need to authenticate you, deliver AI capabilities, and improve the product. This policy explains exactly what that means.

---

## 1. Who We Are

Coworkers is operated by MyCo Works Inc. ("Coworkers," "we," "us," or "our"). When you use the Coworkers desktop application or visit our website, this Privacy Policy applies to the personal information we collect and process.

If you have questions about this policy, contact us at **privacy@myco.works**.

---

## 2. Information We Collect

### 2.1 Account Information

When you create a Coworkers account, we collect:

- **Email address** — used for authentication, account recovery, and essential communications.
- **Name** (optional) — used to personalize your experience within the app.
- **Insider access code** (if applicable) — used to validate preview program eligibility.

We use passwordless authentication. We do not collect or store passwords.

### 2.2 Workspace Data (Local to Your Device)

Your workspace is a folder on your computer. It contains your co-workers, conversations, threads, channels, knowledge sources, and files. **This data is stored locally on your device and is not transmitted to our servers** except as described below in Section 2.3.

You control your workspace data entirely. You can move, copy, back up, or delete your `.cowork` workspace folder at any time.

### 2.3 Data Sent to Cloud Services

Certain features require communication with our cloud services:

- **Authentication requests** — your email address and verification codes are sent to our API to sign you in.
- **AI chat messages** — when you send a message to a co-worker, the message content and relevant conversation context are transmitted to our API, which routes them to a third-party AI model provider for processing. We do not permanently store the content of your AI conversations on our servers.
- **Workspace context sent with messages** — to provide relevant responses, the app may include workspace context (such as co-worker role definitions, knowledge source excerpts, and recent conversation history) alongside your messages. This context is assembled locally on your device and sent only when you initiate a conversation.
- **Co-worker template data** — when you create a co-worker from a template, the app fetches template definitions from our API.
- **Feedback submissions** — if you choose to submit feedback through the app, your message and optional screenshot are sent to our servers. You control whether to include your identity or submit anonymously.

### 2.4 Automatically Collected Information

When you use Coworkers, we may automatically collect:

- **Device and app information** — operating system, app version, and architecture (for update delivery and compatibility).
- **Update checks** — the app periodically checks our servers for available updates. These requests include your current app version.
- **Authentication tokens** — JWT tokens are stored securely in your operating system's keychain (macOS Keychain, Windows Credential Manager, or equivalent). These are used to authenticate API requests and are never transmitted to third parties.

### 2.5 Information We Do Not Collect

- We do not collect passwords (we use passwordless authentication).
- We do not collect payment or financial information directly (payments are processed by our third-party payment processor).
- We do not scan, index, or access files on your device outside of your explicitly opened workspace.
- We do not use cookies or tracking technologies in the desktop application.
- We do not collect location data.

---

## 3. How We Use Your Information

We use your information for the following purposes:

| Purpose | Data Used |
|---------|-----------|
| **Account authentication** | Email address, verification codes |
| **Delivering AI capabilities** | Message content, conversation context, co-worker configuration |
| **App updates and compatibility** | App version, operating system |
| **Product improvement** | Aggregated, anonymized usage patterns; voluntary feedback submissions |
| **Essential communications** | Email address (account-related notices, security alerts) |
| **Insider preview management** | Email address, insider code |

We do not use your data for advertising. We do not sell your personal information. We do not use your workspace content to train AI models.

---

## 4. Third-Party AI Providers

To power your co-workers, we route AI requests through third-party model providers. When you send a message, the content of that message and relevant context are transmitted to one or more AI providers for processing.

**What we send to AI providers:**

- The content of your message
- Relevant conversation history for the current thread
- Co-worker system prompts and role definitions
- Workspace context your co-worker needs to respond helpfully

**What AI providers may vary, but currently include:**

- OpenAI
- Anthropic
- Other providers as we expand model support

Each provider processes your data according to their own privacy policies and data processing agreements. We select providers who commit to not using API-submitted data for model training. We encourage you to review the privacy policies of these providers.

We do not control how third-party AI providers process data once it is transmitted. We work to ensure our agreements with these providers include appropriate data protection commitments.

---

## 5. Data Storage and Security

### 5.1 Local Data

Your workspace data is stored on your local device in a `.cowork` folder. We do not have access to this data. Security of local data depends on the security of your device and operating system.

### 5.2 Cloud Data

Account information (email, name) and authentication data are stored in a PostgreSQL database hosted with our infrastructure provider. We use industry-standard security measures including encrypted connections (TLS), secure token management (JWT with short-lived access tokens and rotating refresh tokens), and access controls.

### 5.3 Authentication Security

- Authentication tokens are stored in your operating system's secure storage (e.g., macOS Keychain).
- Access tokens are short-lived; refresh tokens enable seamless re-authentication.
- Verification codes expire after a limited time and limited number of attempts.

### 5.4 Feedback Data

Feedback submissions (including optional screenshots) are stored on our servers and accessible only to authorized administrators.

---

## 6. Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| **Account information** | Retained while your account is active; deleted upon account deletion request |
| **Authentication codes** | Deleted after use or expiration (minutes) |
| **Authentication tokens** | Access tokens expire in 15 minutes; refresh tokens expire in 7 days |
| **AI conversation content** | Not permanently stored on our servers; transmitted transiently for processing |
| **Workspace data** | Stored locally on your device; retained until you delete it |
| **Feedback submissions** | Retained for product improvement; deleted upon request |
| **Insider activation records** | Retained for program management; deleted upon request |

---

## 7. Your Rights

Depending on your jurisdiction, you may have the following rights regarding your personal information:

- **Access** — request a copy of the personal information we hold about you.
- **Correction** — request correction of inaccurate personal information.
- **Deletion** — request deletion of your account and associated personal information.
- **Data portability** — your workspace data is already portable as a local folder on your device.
- **Withdrawal of consent** — where processing is based on consent, you may withdraw it at any time.
- **Objection** — object to certain processing of your personal information.

To exercise any of these rights, contact us at **privacy@myco.works**. We will respond within 30 days (or as required by applicable law).

---

## 8. Children's Privacy

Coworkers is not intended for use by individuals under the age of 16. We do not knowingly collect personal information from children. If we learn that we have collected personal information from a child under 16, we will take steps to delete that information promptly.

---

## 9. International Data Transfers

Our servers and infrastructure providers may be located in jurisdictions outside your country of residence, including Canada and the United States. By using Coworkers, you consent to the transfer of your information to these jurisdictions, which may have different data protection laws than your own.

Where required by applicable law, we use appropriate safeguards (such as standard contractual clauses) for international data transfers.

---

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. When we make material changes, we will notify you through the application or by email. The "Last Updated" date at the top of this policy indicates when the most recent changes were made.

Your continued use of Coworkers after changes take effect constitutes your acceptance of the revised policy.

---

## 11. Contact Us

If you have questions, concerns, or requests related to this Privacy Policy:

**Email:** privacy@myco.works

---

*This policy is written in plain language because we believe you deserve to understand how your data is handled—clearly and without legal gymnastics.*
