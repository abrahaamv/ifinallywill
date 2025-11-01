/**
 * Email Service - SendGrid Integration
 * Multi-tier survey fallback: Email link after SMS fails
 * Phase 11 Week 3
 */

import sendgrid from '@sendgrid/mail';

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor(config: EmailConfig) {
    sendgrid.setApiKey(config.apiKey);
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName || 'AI Assistant Platform';
  }

  /**
   * Send survey link via email
   * Fourth tier in survey chain (after in-widget, AI call, SMS)
   */
  async sendSurveyLink(
    toEmail: string,
    surveyUrl: string,
    sessionId: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const [response] = await sendgrid.send({
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Quick Feedback - Your Recent AI Assistant Conversation',
        text: `Hi! We'd love your quick feedback about your recent conversation with our AI assistant. Please take a moment to rate your experience: ${surveyUrl}`,
        html: this._generateSurveyEmailHTML(surveyUrl, sessionId),
      });

      console.log(`Email survey sent to ${toEmail}, ID: ${response.headers['x-message-id']}`);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error) {
      console.error(`Failed to send email survey to ${toEmail}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send verification email for end user email verification
   * Phase 11 Week 1 - End user identity
   */
  async sendVerificationEmail(
    toEmail: string,
    verificationUrl: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const [response] = await sendgrid.send({
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: 'Verify Your Email Address',
        text: `Please verify your email address by clicking this link: ${verificationUrl}. This link expires in 24 hours.`,
        html: this._generateVerificationEmailHTML(verificationUrl),
      });

      console.log(`Verification email sent to ${toEmail}, ID: ${response.headers['x-message-id']}`);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error) {
      console.error(`Failed to send verification email to ${toEmail}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send escalation notification to human agent
   * Phase 11 Week 4 - Human escalation
   */
  async sendEscalationNotification(
    toEmail: string,
    meetingUrl: string,
    sessionId: string,
    problemDescription?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const [response] = await sendgrid.send({
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName,
        },
        subject: `New Escalation Requires Human Assistance - ${sessionId.substring(0, 8)}`,
        text: `A customer conversation requires human assistance. Join meeting: ${meetingUrl}${problemDescription ? `\n\nProblem: ${problemDescription}` : ''}`,
        html: this._generateEscalationEmailHTML(meetingUrl, sessionId, problemDescription),
      });

      console.log(`Escalation email sent to ${toEmail}, ID: ${response.headers['x-message-id']}`);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error) {
      console.error(`Failed to send escalation email to ${toEmail}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate HTML for survey email
   */
  private _generateSurveyEmailHTML(surveyUrl: string, sessionId: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quick Feedback Request</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #4f46e5; margin-top: 0;">How was your experience?</h2>
    <p style="font-size: 16px; margin-bottom: 20px;">
      We'd love your quick feedback about your recent conversation with our AI assistant.
    </p>
    <a href="${surveyUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
      Take 1-Minute Survey
    </a>
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Your feedback helps us improve our service. This survey takes less than 1 minute.
    </p>
  </div>
  <div style="font-size: 12px; color: #9ca3af; text-align: center;">
    <p>Session ID: ${sessionId.substring(0, 8)}... | ${this.fromName}</p>
    <p>If you have questions, please reply to this email.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for verification email
   */
  private _generateVerificationEmailHTML(verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #4f46e5; margin-top: 0;">Verify Your Email Address</h2>
    <p style="font-size: 16px; margin-bottom: 20px;">
      Please verify your email address to continue using our AI assistant.
    </p>
    <a href="${verificationUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
      Verify Email Address
    </a>
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      This link expires in 24 hours. If you didn't request this verification, please ignore this email.
    </p>
  </div>
  <div style="font-size: 12px; color: #9ca3af; text-align: center;">
    <p>${this.fromName} | Secure Email Verification</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML for escalation email
   */
  private _generateEscalationEmailHTML(
    meetingUrl: string,
    sessionId: string,
    problemDescription?: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Escalation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="color: #dc2626; margin-top: 0;">🚨 New Escalation Requires Human Assistance</h2>
    <p style="font-size: 16px; margin-bottom: 10px;">
      <strong>Session ID:</strong> ${sessionId}
    </p>
    ${problemDescription ? `<p style="font-size: 16px; margin-bottom: 20px;"><strong>Problem:</strong> ${problemDescription}</p>` : ''}
    <a href="${meetingUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0;">
      Join Meeting Now
    </a>
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      A customer conversation requires human intervention. Please join the meeting to assist.
    </p>
  </div>
  <div style="font-size: 12px; color: #9ca3af; text-align: center;">
    <p>${this.fromName} | Escalation System</p>
  </div>
</body>
</html>
    `.trim();
  }
}

/**
 * Create email service from environment variables
 */
export function createEmailService(): EmailService {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const fromName = process.env.SENDGRID_FROM_NAME;

  if (!apiKey || !fromEmail) {
    throw new Error('Missing SendGrid configuration. Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL');
  }

  return new EmailService({
    apiKey,
    fromEmail,
    fromName,
  });
}
