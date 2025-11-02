/**
 * SMS Service - Twilio Integration
 * Multi-tier survey fallback: SMS link after AI call fails
 * Phase 11 Week 3
 */

import twilio from 'twilio';
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('sms-service');

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export class SMSService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor(config: SMSConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
  }

  /**
   * Send survey link via SMS
   * Third tier in survey chain (after in-widget and AI call)
   */
  async sendSurveyLink(
    toNumber: string,
    surveyUrl: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const message = await this.client.messages.create({
        body: `Hi! We'd love your quick feedback about our AI assistant. Please rate your experience: ${surveyUrl}`,
        from: this.fromNumber,
        to: toNumber,
      });

      logger.info('SMS survey sent', { toNumber, messageSid: message.sid });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      logger.error('Failed to send SMS survey', { toNumber, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send verification code for end user phone verification
   * Phase 11 Week 1 - End user identity
   */
  async sendVerificationCode(
    toNumber: string,
    code: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const message = await this.client.messages.create({
        body: `Your verification code is: ${code}. This code expires in 10 minutes.`,
        from: this.fromNumber,
        to: toNumber,
      });

      logger.info('Verification code sent', { toNumber, messageSid: message.sid });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      logger.error('Failed to send verification code', { toNumber, error });
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
    toNumber: string,
    meetingUrl: string,
    sessionId: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const message = await this.client.messages.create({
        body: `New escalation requires human assistance. Join meeting: ${meetingUrl} (Session: ${sessionId.substring(0, 8)})`,
        from: this.fromNumber,
        to: toNumber,
      });

      logger.info('Escalation notification sent', {
        toNumber,
        messageSid: message.sid,
        sessionId
      });

      return {
        success: true,
        messageSid: message.sid,
      };
    } catch (error) {
      logger.error('Failed to send escalation notification', { toNumber, sessionId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create SMS service from environment variables
 */
export function createSMSService(): SMSService {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Missing Twilio configuration. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
  }

  return new SMSService({
    accountSid,
    authToken,
    fromNumber,
  });
}
