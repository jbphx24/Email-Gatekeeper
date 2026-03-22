import { Resend } from "resend";
import { logger } from "./logger";

const resend = new Resend(process.env.RESEND_API_KEY);
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL ?? "";

export async function sendAccessNotification(email: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY is not set — skipping email notification");
    return;
  }

  if (!NOTIFICATION_EMAIL) {
    logger.warn("NOTIFICATION_EMAIL is not set — skipping email notification");
    return;
  }

  const accessedAt = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "full",
    timeStyle: "short",
  });

  const { error } = await resend.emails.send({
    from: "Email Gate <onboarding@resend.dev>",
    to: [NOTIFICATION_EMAIL],
    subject: `Site Access: ${email}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px; color: #0b1d3a;">Site Access Notification</h2>
        <p style="margin: 0 0 8px; color: #444;">Someone just accessed the protected site.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 10px 12px; background: #f5f5f5; color: #666; width: 90px; border-radius: 4px 0 0 0;">Email</td>
            <td style="padding: 10px 12px; background: #fafafa; color: #111; font-weight: 600;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; background: #f5f5f5; color: #666; border-radius: 0 0 0 4px;">Time</td>
            <td style="padding: 10px 12px; background: #fafafa; color: #111;">${accessedAt} CT</td>
          </tr>
        </table>
        <p style="margin: 0; font-size: 12px; color: #999;">This notification was sent automatically by the Email Gate.</p>
      </div>
    `,
    text: `Site Access Notification\n\nEmail: ${email}\nTime: ${accessedAt} CT\n\nThis notification was sent automatically by the Email Gate.`,
  });

  if (error) {
    logger.error({ error }, "Failed to send access notification email");
  } else {
    logger.info({ to: NOTIFICATION_EMAIL, visitor: email }, "Access notification sent");
  }
}
