/**
 * Survey Scheduler Service
 * Manages multi-tier survey automation with Redis-based job scheduling
 * Phase 11 Week 3
 *
 * Survey Chain:
 * 1. In-widget modal (immediate)
 * 2. AI call (5 min delay if refused)
 * 3. SMS link (if AI call unanswered)
 * 4. Email link (if SMS undelivered/unopened)
 */

import type { Redis } from 'ioredis';
import { createEmailService, EmailService } from './email';
import { createSMSService, SMSService } from './sms';

interface SurveyJob {
  id: string;
  sessionId: string;
  resolutionId: string;
  endUserId: string;
  endUserPhone?: string;
  endUserEmail?: string;
  currentTier: 'in_widget' | 'ai_call' | 'sms_link' | 'email_link';
  scheduledAt: number; // Unix timestamp
  attempts: number;
  maxAttempts: number;
}

export class SurveyScheduler {
  private redis: Redis;
  private smsService: SMSService;
  private emailService: EmailService;
  private surveyBaseUrl: string;
  private isRunning = false;

  // Survey tier delays (minutes)
  private readonly DELAYS = {
    ai_call: 5, // Wait 5 minutes after in-widget refusal
    sms_link: 30, // Wait 30 minutes after AI call no-answer
    email_link: 120, // Wait 2 hours after SMS undelivered
  };

  constructor(redis: Redis, surveyBaseUrl: string) {
    this.redis = redis;
    this.smsService = createSMSService();
    this.emailService = createEmailService();
    this.surveyBaseUrl = surveyBaseUrl;
  }

  /**
   * Schedule AI call survey
   * Called when user clicks "Later" on in-widget feedback
   */
  async scheduleAICall(
    sessionId: string,
    resolutionId: string,
    endUserId: string,
    endUserPhone: string,
    endUserEmail?: string
  ): Promise<void> {
    const jobId = `survey-ai-${sessionId}`;
    const scheduledAt = Date.now() + this.DELAYS.ai_call * 60 * 1000;

    const job: SurveyJob = {
      id: jobId,
      sessionId,
      resolutionId,
      endUserId,
      endUserPhone,
      endUserEmail,
      currentTier: 'ai_call',
      scheduledAt,
      attempts: 0,
      maxAttempts: 1, // One attempt for AI call
    };

    await this.redis.zadd(
      'survey:scheduled',
      scheduledAt,
      JSON.stringify(job)
    );

    console.log(`Scheduled AI call survey for session ${sessionId} at ${new Date(scheduledAt).toISOString()}`);
  }

  /**
   * Schedule SMS fallback
   * Called when AI call goes unanswered
   */
  async scheduleSMS(
    sessionId: string,
    resolutionId: string,
    endUserId: string,
    endUserPhone: string,
    endUserEmail?: string
  ): Promise<void> {
    const jobId = `survey-sms-${sessionId}`;
    const scheduledAt = Date.now() + this.DELAYS.sms_link * 60 * 1000;

    const job: SurveyJob = {
      id: jobId,
      sessionId,
      resolutionId,
      endUserId,
      endUserPhone,
      endUserEmail,
      currentTier: 'sms_link',
      scheduledAt,
      attempts: 0,
      maxAttempts: 2, // Retry once if failed
    };

    await this.redis.zadd(
      'survey:scheduled',
      scheduledAt,
      JSON.stringify(job)
    );

    console.log(`Scheduled SMS survey for session ${sessionId} at ${new Date(scheduledAt).toISOString()}`);
  }

  /**
   * Schedule email fallback
   * Called when SMS undelivered or unopened after 2 hours
   */
  async scheduleEmail(
    sessionId: string,
    resolutionId: string,
    endUserId: string,
    endUserEmail: string
  ): Promise<void> {
    const jobId = `survey-email-${sessionId}`;
    const scheduledAt = Date.now() + this.DELAYS.email_link * 60 * 1000;

    const job: SurveyJob = {
      id: jobId,
      sessionId,
      resolutionId,
      endUserId,
      endUserEmail,
      currentTier: 'email_link',
      scheduledAt,
      attempts: 0,
      maxAttempts: 1, // One attempt for email
    };

    await this.redis.zadd(
      'survey:scheduled',
      scheduledAt,
      JSON.stringify(job)
    );

    console.log(`Scheduled email survey for session ${sessionId} at ${new Date(scheduledAt).toISOString()}`);
  }

  /**
   * Start the scheduler worker
   * Processes jobs every 30 seconds
   */
  start(): void {
    if (this.isRunning) {
      console.log('Survey scheduler already running');
      return;
    }

    this.isRunning = true;
    console.log('Survey scheduler started');

    this._processLoop();
  }

  /**
   * Stop the scheduler worker
   */
  stop(): void {
    this.isRunning = false;
    console.log('Survey scheduler stopped');
  }

  /**
   * Main processing loop
   */
  private async _processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this._processJobs();
      } catch (error) {
        console.error('Survey scheduler error:', error);
      }

      // Wait 30 seconds before next iteration
      await new Promise((resolve) => setTimeout(resolve, 30000));
    }
  }

  /**
   * Process due jobs
   */
  private async _processJobs(): Promise<void> {
    const now = Date.now();

    // Get all jobs due for execution
    const jobs = await this.redis.zrangebyscore(
      'survey:scheduled',
      '-inf',
      now.toString(),
      'LIMIT',
      0,
      100
    );

    if (jobs.length === 0) {
      return;
    }

    console.log(`Processing ${jobs.length} survey jobs`);

    for (const jobData of jobs) {
      const job: SurveyJob = JSON.parse(jobData);

      try {
        await this._executeJob(job);

        // Remove job from queue
        await this.redis.zrem('survey:scheduled', jobData);
      } catch (error) {
        console.error(`Failed to execute job ${job.id}:`, error);

        // Retry logic
        if (job.attempts < job.maxAttempts) {
          job.attempts += 1;
          job.scheduledAt = Date.now() + 300000; // Retry in 5 minutes

          // Update job in queue
          await this.redis.zrem('survey:scheduled', jobData);
          await this.redis.zadd(
            'survey:scheduled',
            job.scheduledAt,
            JSON.stringify(job)
          );

          console.log(`Rescheduled job ${job.id}, attempt ${job.attempts}/${job.maxAttempts}`);
        } else {
          // Max attempts reached, remove job
          await this.redis.zrem('survey:scheduled', jobData);
          console.error(`Job ${job.id} failed after ${job.maxAttempts} attempts`);
        }
      }
    }
  }

  /**
   * Execute a survey job
   */
  private async _executeJob(job: SurveyJob): Promise<void> {
    console.log(`Executing ${job.currentTier} survey for session ${job.sessionId}`);

    switch (job.currentTier) {
      case 'ai_call':
        await this._executeAICall(job);
        break;

      case 'sms_link':
        await this._executeSMS(job);
        break;

      case 'email_link':
        await this._executeEmail(job);
        break;

      default:
        throw new Error(`Unknown survey tier: ${job.currentTier}`);
    }
  }

  /**
   * Execute AI call survey
   * Delegates to LiveKit survey agent
   */
  private async _executeAICall(job: SurveyJob): Promise<void> {
    if (!job.endUserPhone) {
      throw new Error('Phone number required for AI call');
    }

    // In production, this would trigger the LiveKit survey agent
    // For now, we'll simulate and schedule SMS fallback
    console.log(`[AI CALL] Would call ${job.endUserPhone} for session ${job.sessionId}`);

    // Simulate AI call not answered -> schedule SMS
    await this.scheduleSMS(
      job.sessionId,
      job.resolutionId,
      job.endUserId,
      job.endUserPhone,
      job.endUserEmail
    );
  }

  /**
   * Execute SMS survey
   */
  private async _executeSMS(job: SurveyJob): Promise<void> {
    if (!job.endUserPhone) {
      throw new Error('Phone number required for SMS');
    }

    const surveyUrl = `${this.surveyBaseUrl}/survey/${job.sessionId}?method=sms`;

    const result = await this.smsService.sendSurveyLink(
      job.endUserPhone,
      surveyUrl
    );

    if (!result.success) {
      throw new Error(`SMS failed: ${result.error}`);
    }

    console.log(`[SMS] Survey link sent to ${job.endUserPhone}`);

    // Schedule email fallback if we have email
    if (job.endUserEmail) {
      await this.scheduleEmail(
        job.sessionId,
        job.resolutionId,
        job.endUserId,
        job.endUserEmail
      );
    }
  }

  /**
   * Execute email survey
   */
  private async _executeEmail(job: SurveyJob): Promise<void> {
    if (!job.endUserEmail) {
      throw new Error('Email required for email survey');
    }

    const surveyUrl = `${this.surveyBaseUrl}/survey/${job.sessionId}?method=email`;

    const result = await this.emailService.sendSurveyLink(
      job.endUserEmail,
      surveyUrl,
      job.sessionId
    );

    if (!result.success) {
      throw new Error(`Email failed: ${result.error}`);
    }

    console.log(`[EMAIL] Survey link sent to ${job.endUserEmail}`);
  }

  /**
   * Cancel all surveys for a session
   * Called when user completes survey at any tier
   */
  async cancelSurveysForSession(sessionId: string): Promise<void> {
    const allJobs = await this.redis.zrange('survey:scheduled', 0, -1);

    for (const jobData of allJobs) {
      const job: SurveyJob = JSON.parse(jobData);
      if (job.sessionId === sessionId) {
        await this.redis.zrem('survey:scheduled', jobData);
        console.log(`Cancelled ${job.currentTier} survey for session ${sessionId}`);
      }
    }
  }

  /**
   * Get pending surveys count
   */
  async getPendingCount(): Promise<number> {
    return await this.redis.zcard('survey:scheduled');
  }

  /**
   * Get surveys for a session
   */
  async getSurveysForSession(sessionId: string): Promise<SurveyJob[]> {
    const allJobs = await this.redis.zrange('survey:scheduled', 0, -1);
    const sessionJobs: SurveyJob[] = [];

    for (const jobData of allJobs) {
      const job: SurveyJob = JSON.parse(jobData);
      if (job.sessionId === sessionId) {
        sessionJobs.push(job);
      }
    }

    return sessionJobs;
  }
}

/**
 * Create survey scheduler
 */
export function createSurveyScheduler(redis: Redis): SurveyScheduler {
  const surveyBaseUrl = process.env.SURVEY_BASE_URL || 'https://platform.com';
  return new SurveyScheduler(redis, surveyBaseUrl);
}
