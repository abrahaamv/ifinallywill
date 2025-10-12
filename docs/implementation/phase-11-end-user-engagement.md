# Phase 11: End User Engagement & Survey System

**Status**: Planning
**Timeline**: 5 weeks (35 days)
**Dependencies**: Phase 10 (Resolution Tracking), Phase 5 (LiveKit Agent)

## Overview

Complete end user identity management, multi-tier survey system with AI voice calls, human agent escalation, and intelligent problem deduplication. Includes landing page demo system for lead generation.

**Key Features**:
- Phone/email verification with user choice (reduced friction)
- In-widget feedback modal (avoid 40% of AI calls)
- Multi-tier survey fallback: AI call → SMS → Email (no harassment)
- Semantic problem deduplication (prevent duplicate RAG content)
- Human agent escalation via meeting link (meet.platform.com/{token})
- Chat-first approach (gather context before expensive LiveKit)
- Landing page demo chatbot (lead generation + live product testing)

**Cost Impact**: ~$0.20/resolution savings (20% reduction)

---

## Part 1: Database Schema

### 1.1 End Users Table

```sql
-- End users (separate from tenant admin users)
CREATE TABLE end_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact information (user chooses phone OR email)
  phone_number VARCHAR(20), -- E.164 format: +15555551234
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMPTZ,

  email VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,

  -- Identity (optional)
  name VARCHAR(255),
  external_id VARCHAR(255), -- Tenant's CRM ID for the user

  -- Consent flags (GDPR/CCPA compliance)
  consent_sms BOOLEAN DEFAULT false,
  consent_email BOOLEAN DEFAULT false,
  consent_calls BOOLEAN DEFAULT false,
  consented_at TIMESTAMPTZ,

  -- Abuse prevention
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,

  -- Device fingerprinting (from FingerprintJS)
  device_fingerprint VARCHAR(255),

  -- Source tracking (for landing page leads)
  source VARCHAR(50) DEFAULT 'widget', -- 'widget', 'landing_demo'
  is_potential_tenant BOOLEAN DEFAULT false, -- Landing page leads

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_phone CHECK (phone_number IS NULL OR phone_number ~ '^\+[1-9]\d{1,14}$'),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~ '^[^@]+@[^@]+\.[^@]+$'),
  CONSTRAINT at_least_one_contact CHECK (phone_number IS NOT NULL OR email IS NOT NULL)
);

CREATE INDEX idx_end_users_tenant ON end_users(tenant_id);
CREATE INDEX idx_end_users_phone ON end_users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_end_users_email ON end_users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_end_users_external_id ON end_users(tenant_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_end_users_blocked ON end_users(is_blocked) WHERE is_blocked = true;
CREATE INDEX idx_end_users_source ON end_users(source, is_potential_tenant);

-- Link sessions to end users
ALTER TABLE sessions
  ADD COLUMN end_user_id UUID REFERENCES end_users(id) ON DELETE SET NULL,
  ADD COLUMN is_demo BOOLEAN DEFAULT false; -- Landing page demo sessions

CREATE INDEX idx_sessions_end_user ON sessions(end_user_id) WHERE end_user_id IS NOT NULL;
CREATE INDEX idx_sessions_demo ON sessions(is_demo) WHERE is_demo = true;
```

### 1.2 Survey Responses Table

```sql
CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  end_user_id UUID REFERENCES end_users(id) ON DELETE SET NULL,
  resolution_id UUID REFERENCES resolutions(id) ON DELETE CASCADE,

  -- Survey method
  survey_method VARCHAR(20) NOT NULL, -- 'in_widget', 'ai_call', 'sms_link', 'email_link'
  fallback_attempts INTEGER DEFAULT 0, -- 0-3 (in_widget, call, sms, email)

  -- Questions & answers
  problem_solved BOOLEAN, -- Was your problem solved?
  experience_rating INTEGER, -- 1-5 stars
  would_recommend BOOLEAN, -- Would you recommend to a friend?
  feedback_text TEXT,

  -- Refusal tracking
  refused_to_rate BOOLEAN DEFAULT false, -- User clicked "Later" button

  -- Metadata
  responded_at TIMESTAMPTZ,
  call_duration_seconds INTEGER, -- For AI voice surveys
  call_answered BOOLEAN, -- Did user answer the call?
  call_recording_url TEXT, -- Optional recording
  survey_completed BOOLEAN DEFAULT false, -- Did user complete full survey?

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rating CHECK (experience_rating BETWEEN 1 AND 5 OR experience_rating IS NULL),
  CONSTRAINT valid_method CHECK (survey_method IN ('in_widget', 'ai_call', 'sms_link', 'email_link'))
);

CREATE INDEX idx_survey_responses_tenant ON survey_responses(tenant_id);
CREATE INDEX idx_survey_responses_session ON survey_responses(session_id);
CREATE INDEX idx_survey_responses_end_user ON survey_responses(end_user_id);
CREATE INDEX idx_survey_responses_resolution ON survey_responses(resolution_id);
CREATE INDEX idx_survey_responses_method ON survey_responses(survey_method);
CREATE INDEX idx_survey_responses_completed ON survey_responses(survey_completed);
```

### 1.3 Unresolved Problems Table (with Semantic Deduplication)

```sql
CREATE TABLE unresolved_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Problem identification (semantic similarity)
  problem_description TEXT NOT NULL,
  problem_embedding vector(1024), -- Voyage Multimodal-3 embedding
  problem_hash VARCHAR(64) NOT NULL, -- SHA256 hash of normalized description

  -- Tracking
  first_session_id UUID REFERENCES sessions(id),
  last_session_id UUID REFERENCES sessions(id),
  affected_user_count INTEGER DEFAULT 1, -- Number of users with this problem
  attempt_count INTEGER DEFAULT 1, -- Total attempts across all users

  -- Status
  status VARCHAR(20) DEFAULT 'unresolved', -- 'unresolved', 'rag_updated', 'resolved'

  -- AI-generated solution (awaiting approval)
  generated_solution_draft TEXT, -- Markdown format
  generated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,

  -- Knowledge base integration
  knowledge_document_id UUID REFERENCES knowledge_documents(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unresolved_problems_tenant ON unresolved_problems(tenant_id);
CREATE INDEX idx_unresolved_problems_status ON unresolved_problems(status);
CREATE INDEX idx_unresolved_problems_hash ON unresolved_problems(tenant_id, problem_hash);

-- Vector similarity index for semantic deduplication
CREATE INDEX idx_unresolved_problems_embedding ON unresolved_problems
USING ivfflat (problem_embedding vector_cosine_ops)
WITH (lists = 100);

-- Blocked users per problem
CREATE TABLE unresolved_problem_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES unresolved_problems(id) ON DELETE CASCADE,
  end_user_id UUID NOT NULL REFERENCES end_users(id) ON DELETE CASCADE,

  first_blocked_at TIMESTAMPTZ DEFAULT NOW(),
  notified_when_resolved BOOLEAN DEFAULT false,

  UNIQUE(problem_id, end_user_id)
);

CREATE INDEX idx_unresolved_problem_users_end_user ON unresolved_problem_users(end_user_id);
CREATE INDEX idx_unresolved_problem_users_problem ON unresolved_problem_users(problem_id);
```

### 1.4 Escalations Table (Updated from Phase 10)

```sql
-- Update escalations table with more fields
ALTER TABLE escalations
  ADD COLUMN escalation_type VARCHAR(50) DEFAULT 'ai_failure',
    -- 'ai_failure', 'time_exceeded', 'duplicate_problem', 'user_request'
  ADD COLUMN within_service_hours BOOLEAN DEFAULT true,
  ADD COLUMN scheduled_followup_at TIMESTAMPTZ,
  ADD COLUMN human_agent_id UUID REFERENCES users(id),
  ADD COLUMN human_agent_joined_at TIMESTAMPTZ,
  ADD COLUMN meeting_url TEXT, -- meet.platform.com/{token}
  ADD COLUMN escalation_metadata JSONB; -- Session duration, attempt count, etc.

CREATE INDEX idx_escalations_type ON escalations(escalation_type);
CREATE INDEX idx_escalations_scheduled ON escalations(scheduled_followup_at)
  WHERE scheduled_followup_at IS NOT NULL;
CREATE INDEX idx_escalations_human_agent ON escalations(human_agent_id)
  WHERE human_agent_id IS NOT NULL;
```

### 1.5 Tenant Configuration (AI Personalities Extended)

```sql
ALTER TABLE ai_personalities
  -- End user verification requirements
  ADD COLUMN require_end_user_phone BOOLEAN DEFAULT false,
  ADD COLUMN require_end_user_email BOOLEAN DEFAULT true,
  ADD COLUMN require_both_contacts BOOLEAN DEFAULT false, -- Require phone AND email

  -- Survey settings
  ADD COLUMN enable_post_conversation_survey BOOLEAN DEFAULT true,
  ADD COLUMN survey_method_priority JSONB DEFAULT '["in_widget", "ai_call", "sms_link", "email_link"]',
  ADD COLUMN survey_delay_minutes INTEGER DEFAULT 5, -- Wait 5 minutes after conversation

  -- Human agent escalation
  ADD COLUMN enable_human_escalation BOOLEAN DEFAULT true,
  ADD COLUMN service_hours JSONB, -- {"monday": {"start": "08:00", "end": "16:00", "timezone": "America/New_York"}, ...}
  ADD COLUMN escalation_phone VARCHAR(20), -- Optional: call this number if no agent available

  -- Problem tracking
  ADD COLUMN enable_problem_blocking BOOLEAN DEFAULT true,
  ADD COLUMN similarity_threshold DECIMAL(3,2) DEFAULT 0.85, -- For semantic deduplication

  -- LiveKit session abuse prevention
  ADD COLUMN require_text_chat_first BOOLEAN DEFAULT true, -- Gather context before LiveKit
  ADD COLUMN min_messages_before_video INTEGER DEFAULT 3, -- Minimum chat messages before video call
  ADD COLUMN max_demo_duration_seconds INTEGER DEFAULT 300; -- 5 minutes for landing page demos

-- Indexes
CREATE INDEX idx_ai_personalities_survey_enabled
  ON ai_personalities(enable_post_conversation_survey)
  WHERE enable_post_conversation_survey = true;
CREATE INDEX idx_ai_personalities_escalation_enabled
  ON ai_personalities(enable_human_escalation)
  WHERE enable_human_escalation = true;
```

---

## Part 2: Implementation Roadmap

### Week 1: End User Identity & Verification (Days 1-7)

#### Day 1-2: End Users Table + Basic CRUD

**Backend** (`packages/api-contract/src/routers/end-users.ts`):
```typescript
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { endUsers } from '@platform/db/schema';
import { eq, and } from 'drizzle-orm';

export const endUsersRouter = router({
  // Create or get existing end user
  createOrGet: publicProcedure
    .input(z.object({
      tenantId: z.string().uuid(),
      phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
      email: z.string().email().optional(),
      source: z.enum(['widget', 'landing_demo']).default('widget'),
      deviceFingerprint: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if end user exists
      const existing = await ctx.db.query.endUsers.findFirst({
        where: and(
          eq(endUsers.tenantId, input.tenantId),
          input.phone ? eq(endUsers.phoneNumber, input.phone) : undefined,
          input.email ? eq(endUsers.email, input.email) : undefined
        ),
      });

      if (existing) return existing;

      // Create new end user
      const [newUser] = await ctx.db.insert(endUsers).values({
        tenantId: input.tenantId,
        phoneNumber: input.phone,
        email: input.email,
        source: input.source,
        deviceFingerprint: input.deviceFingerprint,
        isPotentialTenant: input.source === 'landing_demo',
      }).returning();

      return newUser;
    }),

  // Check if user is blocked
  checkBlocked: publicProcedure
    .input(z.object({
      endUserId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.endUsers.findFirst({
        where: eq(endUsers.id, input.endUserId),
      });

      return {
        isBlocked: user?.isBlocked || false,
        reason: user?.blockedReason,
      };
    }),
});
```

**Frontend Widget** (`apps/widget-sdk/src/components/ContactVerification.tsx`):
```tsx
import { useState } from 'react';
import { trpc } from '../utils/trpc';

export function ContactVerification({
  tenantId,
  onVerified
}: {
  tenantId: string;
  onVerified: (endUserId: string) => void;
}) {
  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>('email');
  const [contactValue, setContactValue] = useState('');

  const createEndUser = trpc.platform.endUsers.createOrGet.useMutation();

  const handleSubmit = async () => {
    const deviceFingerprint = await getDeviceFingerprint(); // FingerprintJS

    const result = await createEndUser.mutateAsync({
      tenantId,
      phone: contactMethod === 'phone' ? contactValue : undefined,
      email: contactMethod === 'email' ? contactValue : undefined,
      source: 'widget',
      deviceFingerprint,
    });

    // Trigger verification flow (next step)
    onVerified(result.id);
  };

  return (
    <div className="space-y-4">
      <h3>To continue, please verify your contact info:</h3>

      <div className="flex gap-4">
        <button
          onClick={() => setContactMethod('phone')}
          className={contactMethod === 'phone' ? 'active' : ''}
        >
          📱 Phone
        </button>
        <button
          onClick={() => setContactMethod('email')}
          className={contactMethod === 'email' ? 'active' : ''}
        >
          📧 Email
        </button>
      </div>

      {contactMethod === 'phone' ? (
        <input
          type="tel"
          placeholder="+1 (555) 123-4567"
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
        />
      ) : (
        <input
          type="email"
          placeholder="your@email.com"
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
        />
      )}

      <button onClick={handleSubmit}>Continue</button>
    </div>
  );
}
```

#### Day 3-4: SMS Verification (Twilio)

**Backend** (`packages/api/src/services/sms-verification.ts`):
```typescript
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendVerificationCode(phoneNumber: string): Promise<string> {
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store code in Redis with 10-minute expiration
  await redis.setex(`verification:${phoneNumber}`, 600, code);

  // Send SMS via Twilio
  await twilioClient.messages.create({
    body: `Your verification code is: ${code}. Valid for 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });

  return code; // Return for testing purposes
}

export async function verifyCode(phoneNumber: string, code: string): Promise<boolean> {
  const storedCode = await redis.get(`verification:${phoneNumber}`);

  if (!storedCode) return false; // Code expired
  if (storedCode !== code) return false; // Code incorrect

  // Delete code after successful verification
  await redis.del(`verification:${phoneNumber}`);

  return true;
}
```

**tRPC Router** (`packages/api-contract/src/routers/verification.ts`):
```typescript
export const verificationRouter = router({
  sendSmsCode: publicProcedure
    .input(z.object({ phoneNumber: z.string() }))
    .mutation(async ({ input }) => {
      await sendVerificationCode(input.phoneNumber);
      return { success: true };
    }),

  verifySmsCode: publicProcedure
    .input(z.object({
      phoneNumber: z.string(),
      code: z.string().length(6),
      endUserId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const isValid = await verifyCode(input.phoneNumber, input.code);

      if (!isValid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid verification code' });
      }

      // Update end user as verified
      await ctx.db.update(endUsers)
        .set({
          phoneVerified: true,
          phoneVerifiedAt: new Date()
        })
        .where(eq(endUsers.id, input.endUserId));

      return { success: true };
    }),
});
```

#### Day 5-6: Email Verification (SendGrid)

**Backend** (`packages/api/src/services/email-verification.ts`):
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendVerificationEmail(email: string, endUserId: string): Promise<void> {
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex');

  // Store token in Redis with 24-hour expiration
  await redis.setex(`email_verification:${token}`, 86400, endUserId);

  // Verification link
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  await sgMail.send({
    to: email,
    from: 'noreply@platform.com',
    subject: 'Verify your email address',
    html: `
      <h2>Verify Your Email</h2>
      <p>Click the link below to verify your email address:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function verifyEmailToken(token: string): Promise<string | null> {
  const endUserId = await redis.get(`email_verification:${token}`);

  if (!endUserId) return null; // Token expired or invalid

  // Delete token after use
  await redis.del(`email_verification:${token}`);

  return endUserId;
}
```

#### Day 7: Device Fingerprinting (FingerprintJS)

**Frontend** (`apps/widget-sdk/src/utils/fingerprint.ts`):
```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';

let fpPromise: Promise<any> | null = null;

export async function getDeviceFingerprint(): Promise<string> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load({ apiKey: process.env.VITE_FINGERPRINT_API_KEY });
  }

  const fp = await fpPromise;
  const result = await fp.get();

  return result.visitorId;
}
```

**Abuse Prevention Logic**:
```typescript
// Check for multiple accounts from same device
const existingUsers = await ctx.db.query.endUsers.findMany({
  where: and(
    eq(endUsers.tenantId, tenantId),
    eq(endUsers.deviceFingerprint, deviceFingerprint)
  ),
});

if (existingUsers.length >= 5) {
  // Potential abuse - require manual review
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'Too many accounts from this device. Please contact support.',
  });
}
```

---

### Week 2: In-Widget Feedback Modal (Days 8-14)

#### Day 8-10: Modal UI Component

**Widget Component** (`apps/widget-sdk/src/components/FeedbackModal.tsx`):
```tsx
import { useState } from 'react';
import { Star } from 'lucide-react';
import { trpc } from '../utils/trpc';

export function FeedbackModal({
  sessionId,
  resolutionId,
  onSubmit,
  onLater
}: {
  sessionId: string;
  resolutionId: string;
  onSubmit: () => void;
  onLater: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [problemSolved, setProblemSolved] = useState<boolean | null>(null);

  const submitSurvey = trpc.platform.surveys.submitInWidget.useMutation();

  const handleSubmit = async () => {
    await submitSurvey.mutateAsync({
      sessionId,
      resolutionId,
      rating,
      problemSolved,
    });

    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
        <h3 className="text-lg font-semibold">How was your experience?</h3>

        {/* 5-star rating */}
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className="hover:scale-110 transition"
            >
              <Star
                className={rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                size={32}
              />
            </button>
          ))}
        </div>

        {/* Problem solved? */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Was your problem solved?</p>
          <div className="flex gap-4">
            <button
              onClick={() => setProblemSolved(true)}
              className={`flex-1 py-2 rounded ${problemSolved === true ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
            >
              ✅ Yes
            </button>
            <button
              onClick={() => setProblemSolved(false)}
              className={`flex-1 py-2 rounded ${problemSolved === false ? 'bg-red-500 text-white' : 'bg-gray-100'}`}
            >
              ❌ No
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || problemSolved === null}
            className="flex-1 bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          >
            Submit
          </button>
          <button
            onClick={onLater}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Later
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          If you skip this, we'll call you in a few minutes for quick feedback.
        </p>
      </div>
    </div>
  );
}
```

#### Day 11-12: LLM Integration (Trigger Modal)

**LiveKit Agent** (`livekit-agent/conversation_handler.py`):
```python
class ConversationHandler:
    async def end_conversation(self, session_id: str, resolution_id: str):
        """Called when conversation ends - trigger feedback modal"""

        # Check if problem was resolved
        resolution = await self.get_resolution(resolution_id)

        if resolution['status'] == 'successful':
            # Tell user about feedback
            await self.llm.speak(
                "Before we end, can you rate your experience? "
                "It helps us improve. If you skip this, we'll call you "
                "in a few minutes for quick feedback."
            )

            # Send event to widget to show modal
            await self.send_widget_event({
                'type': 'show_feedback_modal',
                'sessionId': session_id,
                'resolutionId': resolution_id
            })
        else:
            # Problem not solved - create escalation
            await self.create_escalation(session_id, resolution_id)
```

#### Day 13-14: Backend API + Survey Storage

**tRPC Router** (`packages/api-contract/src/routers/surveys.ts`):
```typescript
export const surveysRouter = router({
  submitInWidget: publicProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      resolutionId: z.string().uuid(),
      rating: z.number().min(1).max(5),
      problemSolved: z.boolean(),
      feedbackText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get session details
      const session = await ctx.db.query.sessions.findFirst({
        where: eq(sessions.id, input.sessionId),
      });

      // Create survey response
      await ctx.db.insert(surveyResponses).values({
        tenantId: session.tenantId,
        sessionId: input.sessionId,
        endUserId: session.endUserId,
        resolutionId: input.resolutionId,
        surveyMethod: 'in_widget',
        experienceRating: input.rating,
        problemSolved: input.problemSolved,
        feedbackText: input.feedbackText,
        surveyCompleted: true,
        respondedAt: new Date(),
      });

      // Update resolution status if problem not solved
      if (!input.problemSolved) {
        await ctx.db.update(resolutions)
          .set({
            status: 'failed',
            userRating: input.rating
          })
          .where(eq(resolutions.id, input.resolutionId));
      }

      return { success: true };
    }),

  recordRefusal: publicProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      resolutionId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // User clicked "Later" - record refusal
      await ctx.db.insert(surveyResponses).values({
        tenantId: session.tenantId,
        sessionId: input.sessionId,
        resolutionId: input.resolutionId,
        surveyMethod: 'in_widget',
        refusedToRate: true,
      });

      // Schedule AI call survey in 5 minutes
      await scheduleAISurveyCall(input.sessionId, input.resolutionId);

      return { success: true };
    }),
});
```

---

### Week 3: Multi-Tier Survey System (Days 15-22)

#### Day 15-17: AI Survey Agent (Voice Calls)

**Python Agent** (`livekit-agent/survey_agent.py`):
```python
from livekit import rtc, agents
from livekit.agents import voice
import asyncio
from datetime import datetime

class PostConversationSurveyAgent(voice.Agent):
    """AI agent that calls users to collect post-conversation feedback"""

    def __init__(self):
        super().__init__()
        self.questions = [
            {
                "text": "Hi! This is a quick follow-up about your recent conversation. Was your issue resolved?",
                "type": "yes_no",
                "field": "problem_solved"
            },
            {
                "text": "On a scale of 1 to 5, how would you rate your experience?",
                "type": "rating_1_5",
                "field": "experience_rating"
            },
            {
                "text": "Would you like to share any feedback?",
                "type": "open_ended",
                "field": "feedback_text"
            }
        ]

    async def conduct_survey(self, end_user_phone: str, session_id: str, resolution_id: str):
        """Make outbound call and conduct survey"""

        # Create LiveKit room for outbound call
        room = await self.create_outbound_room(end_user_phone)

        # Track metadata
        call_start = datetime.now()
        call_answered = False
        responses = {}

        try:
            # Wait for user to join (30 second timeout)
            await asyncio.wait_for(self.wait_for_participant(), timeout=30)
            call_answered = True

            # Conduct survey
            for q in self.questions:
                answer = await self.ask_question(q["text"], q["type"])
                responses[q["field"]] = answer

            # Thank user
            await self.speak("Thank you for your feedback! This helps us improve. Have a great day.")

        except asyncio.TimeoutError:
            # User didn't answer - proceed to SMS fallback
            call_answered = False

        finally:
            call_duration = (datetime.now() - call_start).total_seconds()

            # Save survey response
            await self.save_survey_response(
                session_id=session_id,
                resolution_id=resolution_id,
                method='ai_call',
                call_answered=call_answered,
                call_duration=call_duration,
                responses=responses if call_answered else None
            )

            # If not answered, trigger SMS fallback
            if not call_answered:
                await self.trigger_sms_fallback(session_id, resolution_id)

            await room.disconnect()

    async def ask_question(self, question: str, question_type: str):
        """Ask question and parse response"""
        await self.speak(question)

        # Listen for user response
        response_text = await self.listen()

        # Parse based on type
        if question_type == "yes_no":
            return "yes" in response_text.lower()
        elif question_type == "rating_1_5":
            # Extract number from response
            import re
            match = re.search(r'[1-5]', response_text)
            return int(match.group()) if match else None
        elif question_type == "open_ended":
            return response_text
```

#### Day 18-19: SMS Fallback (Twilio)

**Backend Service** (`packages/api/src/services/survey-fallback.ts`):
```typescript
export async function sendSmsSurveyLink(
  phoneNumber: string,
  sessionId: string,
  resolutionId: string
): Promise<void> {
  // Generate survey token
  const token = crypto.randomBytes(32).toString('hex');

  // Store in Redis (7-day expiration)
  await redis.setex(`survey:${token}`, 604800, JSON.stringify({
    sessionId,
    resolutionId,
    phoneNumber
  }));

  // Survey link
  const surveyUrl = `${process.env.APP_URL}/survey/${token}`;

  // Send SMS
  await twilioClient.messages.create({
    body: `Thanks for using our service! Please rate your experience: ${surveyUrl}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
  });

  // Log attempt
  await db.insert(surveyResponses).values({
    sessionId,
    resolutionId,
    surveyMethod: 'sms_link',
    fallbackAttempts: 1,
  });
}
```

**Survey Page** (`apps/widget-sdk/src/pages/SurveyPage.tsx`):
```tsx
export function SurveyPage({ token }: { token: string }) {
  const [rating, setRating] = useState(0);
  const [problemSolved, setProblemSolved] = useState<boolean | null>(null);

  const submitSurvey = trpc.platform.surveys.submitFromLink.useMutation();

  const handleSubmit = async () => {
    await submitSurvey.mutateAsync({
      token,
      rating,
      problemSolved,
    });

    // Show thank you message
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">How was your experience?</h2>
        {/* Same 5-star + yes/no UI as modal */}
      </div>
    </div>
  );
}
```

#### Day 20-21: Email Fallback (SendGrid)

**Backend Service** (`packages/api/src/services/email-survey.ts`):
```typescript
export async function sendEmailSurveyLink(
  email: string,
  sessionId: string,
  resolutionId: string
): Promise<void> {
  // Generate survey token (same as SMS)
  const token = crypto.randomBytes(32).toString('hex');

  await redis.setex(`survey:${token}`, 604800, JSON.stringify({
    sessionId,
    resolutionId,
    email
  }));

  const surveyUrl = `${process.env.APP_URL}/survey/${token}`;

  await sgMail.send({
    to: email,
    from: 'feedback@platform.com',
    subject: 'How was your experience?',
    html: `
      <h2>We'd Love Your Feedback!</h2>
      <p>Please take 30 seconds to rate your recent support experience:</p>
      <a href="${surveyUrl}" style="display:inline-block; background:#007bff; color:#fff; padding:12px 24px; text-decoration:none; border-radius:6px;">
        Rate Experience
      </a>
    `,
  });

  // Log attempt
  await db.insert(surveyResponses).values({
    sessionId,
    resolutionId,
    surveyMethod: 'email_link',
    fallbackAttempts: 2,
  });
}
```

#### Day 22: Cron Job for Survey Scheduling

**Scheduler** (`packages/api/src/jobs/survey-scheduler.ts`):
```typescript
import cron from 'node-cron';

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('[Survey Scheduler] Checking for pending surveys...');

  // Find sessions that ended 5+ minutes ago without survey
  const pendingSurveys = await db.execute(sql`
    SELECT
      s.id as session_id,
      s.end_user_id,
      r.id as resolution_id,
      eu.phone_number,
      eu.email,
      eu.consent_calls,
      eu.consent_sms,
      eu.consent_email
    FROM sessions s
    JOIN resolutions r ON r.session_id = s.id
    JOIN end_users eu ON eu.id = s.end_user_id
    WHERE s.ended_at < NOW() - INTERVAL '5 minutes'
      AND s.ended_at > NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM survey_responses sr
        WHERE sr.session_id = s.id
      )
  `);

  for (const survey of pendingSurveys) {
    // Attempt AI call (if consent given)
    if (survey.consent_calls && survey.phone_number) {
      await queueAISurveyCall(survey);
    }
    // Fallback to SMS
    else if (survey.consent_sms && survey.phone_number) {
      await sendSmsSurveyLink(survey.phone_number, survey.session_id, survey.resolution_id);
    }
    // Final fallback to email
    else if (survey.consent_email && survey.email) {
      await sendEmailSurveyLink(survey.email, survey.session_id, survey.resolution_id);
    }
  }
});

// Check for SMS fallback (AI call not answered after 2 hours)
cron.schedule('0 * * * *', async () => {
  const needsSmsFallback = await db.query.surveyResponses.findMany({
    where: and(
      eq(surveyResponses.surveyMethod, 'ai_call'),
      eq(surveyResponses.callAnswered, false),
      eq(surveyResponses.surveyCompleted, false),
      sql`${surveyResponses.createdAt} < NOW() - INTERVAL '2 hours'`
    ),
  });

  for (const response of needsSmsFallback) {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, response.sessionId),
      with: { endUser: true },
    });

    if (session?.endUser?.phoneNumber) {
      await sendSmsSurveyLink(
        session.endUser.phoneNumber,
        response.sessionId,
        response.resolutionId
      );
    }
  }
});

// Check for email fallback (SMS not answered after 3 days)
cron.schedule('0 0 * * *', async () => {
  const needsEmailFallback = await db.query.surveyResponses.findMany({
    where: and(
      eq(surveyResponses.surveyMethod, 'sms_link'),
      eq(surveyResponses.surveyCompleted, false),
      sql`${surveyResponses.createdAt} < NOW() - INTERVAL '3 days'`
    ),
  });

  for (const response of needsEmailFallback) {
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.id, response.sessionId),
      with: { endUser: true },
    });

    if (session?.endUser?.email) {
      await sendEmailSurveyLink(
        session.endUser.email,
        response.sessionId,
        response.resolutionId
      );
    }
  }
});
```

---

### Week 4: Human Agent Escalation & Problem Deduplication (Days 23-30)

#### Day 23-25: Semantic Problem Deduplication

**Backend Service** (`packages/knowledge/src/problem-deduplication.ts`):
```typescript
import { generateEmbedding } from './embeddings';
import { sql } from 'drizzle-orm';

export async function checkForSimilarProblem(
  tenantId: string,
  problemDescription: string,
  threshold: number = 0.85
): Promise<{
  exists: boolean;
  problemId?: string;
  similarity?: number;
} {
  // Generate embedding for problem description
  const embedding = await generateEmbedding(problemDescription);

  // Find similar problems using cosine similarity
  const [similarProblem] = await db.execute(sql`
    SELECT
      id,
      problem_description,
      1 - (problem_embedding <=> ${embedding}) as similarity
    FROM unresolved_problems
    WHERE tenant_id = ${tenantId}
      AND status = 'unresolved'
      AND 1 - (problem_embedding <=> ${embedding}) > ${threshold}
    ORDER BY similarity DESC
    LIMIT 1
  `);

  if (similarProblem) {
    return {
      exists: true,
      problemId: similarProblem.id,
      similarity: similarProblem.similarity,
    };
  }

  return { exists: false };
}

export async function createOrUpdateUnresolvedProblem(
  tenantId: string,
  endUserId: string,
  sessionId: string,
  problemDescription: string
): Promise<string> {
  // Check for similar problem
  const similar = await checkForSimilarProblem(tenantId, problemDescription);

  if (similar.exists) {
    // Update existing problem
    await db.update(unresolvedProblems)
      .set({
        affectedUserCount: sql`${unresolvedProblems.affectedUserCount} + 1`,
        attemptCount: sql`${unresolvedProblems.attemptCount} + 1`,
        lastSessionId: sessionId,
        updatedAt: new Date(),
      })
      .where(eq(unresolvedProblems.id, similar.problemId));

    // Add user to blocked list
    await db.insert(unresolvedProblemUsers).values({
      problemId: similar.problemId,
      endUserId,
    }).onConflictDoNothing();

    return similar.problemId;
  }

  // Create new problem
  const embedding = await generateEmbedding(problemDescription);
  const hash = createHash('sha256').update(problemDescription.toLowerCase().trim()).digest('hex');

  const [newProblem] = await db.insert(unresolvedProblems).values({
    tenantId,
    problemDescription,
    problemEmbedding: embedding,
    problemHash: hash,
    firstSessionId: sessionId,
    lastSessionId: sessionId,
  }).returning();

  // Add user to blocked list
  await db.insert(unresolvedProblemUsers).values({
    problemId: newProblem.id,
    endUserId,
  });

  // Generate AI solution draft (background job)
  await queueSolutionGeneration(newProblem.id);

  return newProblem.id;
}
```

**LiveKit Agent Integration**:
```python
async def check_if_problem_blocked(self, end_user_id: str, problem_description: str):
    """Check if user is blocked from retrying this problem"""

    # Call backend API to check
    response = await self.api_client.post('/api/problems/check-blocked', {
        'endUserId': end_user_id,
        'problemDescription': problem_description
    })

    if response['blocked']:
        # Tell user they're blocked
        await self.llm.speak(
            f"We recognize this issue. Our team is working on a solution. "
            f"{response['affectedUserCount']} other users have reported the same problem. "
            f"We'll notify you as soon as it's resolved."
        )

        # End conversation
        return True

    return False
```

#### Day 26-27: Human Agent Notification System

**Backend** (`packages/api/src/services/escalation.ts`):
```typescript
export async function createEscalation(params: {
  sessionId: string;
  resolutionId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  withinServiceHours: boolean;
  metadata?: any;
}): Promise<string> {
  // Get session details
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, params.sessionId),
    with: { endUser: true },
  });

  // Generate meeting link
  const meetingToken = crypto.randomBytes(32).toString('hex');
  const meetingUrl = `${process.env.APP_URL}/meet/${meetingToken}`;

  // Create escalation
  const [escalation] = await db.insert(escalations).values({
    tenantId: session.tenantId,
    sessionId: params.sessionId,
    resolutionId: params.resolutionId,
    reason: params.reason,
    priority: params.priority,
    status: params.withinServiceHours ? 'awaiting_agent' : 'scheduled',
    withinServiceHours: params.withinServiceHours,
    meetingUrl,
    escalationMetadata: params.metadata,
    scheduledFollowupAt: params.withinServiceHours ? null : addHours(new Date(), 24),
  }).returning();

  if (params.withinServiceHours) {
    // Notify available human agents via WebSocket
    await notifyAvailableAgents(session.tenantId, {
      type: 'new_escalation',
      escalationId: escalation.id,
      sessionId: params.sessionId,
      endUserName: session.endUser?.name,
      endUserPhone: session.endUser?.phoneNumber,
      priority: params.priority,
      reason: params.reason,
      meetingUrl,
    });
  }

  return escalation.id;
}

async function notifyAvailableAgents(tenantId: string, message: any): Promise<void> {
  // Get all online agents for this tenant
  const onlineAgents = await redis.smembers(`tenant:${tenantId}:online_agents`);

  // Publish to Redis Streams (from Phase 6)
  for (const agentId of onlineAgents) {
    await redis.xadd(
      `agent:${agentId}:notifications`,
      '*',
      'data',
      JSON.stringify(message)
    );
  }
}
```

**Dashboard UI** (`apps/dashboard/src/components/EscalationNotification.tsx`):
```tsx
export function EscalationNotification({ escalation }: { escalation: Escalation }) {
  const joinCall = trpc.platform.escalations.joinCall.useMutation();

  const handleJoin = async () => {
    // Mark escalation as accepted
    await joinCall.mutateAsync({
      escalationId: escalation.id
    });

    // Open meeting in new tab
    window.open(escalation.meetingUrl, '_blank');
  };

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-yellow-800">
            New Escalation - {escalation.priority.toUpperCase()} Priority
          </h4>
          <p className="text-sm text-yellow-700">{escalation.reason}</p>
          {escalation.session?.endUser && (
            <p className="text-sm text-yellow-600 mt-1">
              User: {escalation.session.endUser.phoneNumber || escalation.session.endUser.email}
            </p>
          )}
        </div>
        <button
          onClick={handleJoin}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Join Call
        </button>
      </div>
    </div>
  );
}
```

#### Day 28-29: Meeting Link Join Flow

**LiveKit Agent Logic**:
```python
async def handle_escalation(self, session_id: str, within_service_hours: bool):
    """Create escalation and wait for human agent"""

    # ALWAYS create escalation (fixed from user's feedback)
    escalation = await self.create_escalation(
        session_id=session_id,
        reason="AI could not resolve issue",
        within_service_hours=within_service_hours
    )

    if within_service_hours:
        # Tell user we're connecting them
        await self.llm.speak(
            "I'm connecting you with a human specialist who can help further. "
            "Please hold while I find an available agent..."
        )

        # Wait for human agent to join (5-minute timeout)
        human_joined = await self.wait_for_human_agent(timeout=300)

        if human_joined:
            # Human agent joined - provide context
            await self.llm.speak(
                "I've connected you with a specialist. "
                "They can see your conversation history and are ready to help."
            )

            # AI agent leaves room, human agent takes over
            await self.leave_room()
        else:
            # No agent available after 5 minutes
            await self.llm.speak(
                "I apologize, but all our specialists are currently busy. "
                "We've created a high-priority ticket and will call you back within 30 minutes."
            )
    else:
        # Out of service hours
        await self.llm.speak(
            "Our support team is currently offline. "
            "We've created a ticket and will follow up within 24 hours."
        )
```

#### Day 30: Service Hours Configuration

**Backend** (`packages/api-contract/src/routers/ai-personalities.ts`):
```typescript
export const aiPersonalitiesRouter = router({
  updateServiceHours: protectedProcedure
    .input(z.object({
      personalityId: z.string().uuid(),
      serviceHours: z.object({
        monday: z.object({
          enabled: z.boolean(),
          start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
          end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        }).optional(),
        // ... repeat for all days
        timezone: z.string(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(aiPersonalities)
        .set({ serviceHours: input.serviceHours })
        .where(eq(aiPersonalities.id, input.personalityId));

      return { success: true };
    }),
});

// Helper function to check if within service hours
export function isWithinServiceHours(
  serviceHours: any,
  timezone: string = 'America/New_York'
): boolean {
  const now = DateTime.now().setZone(timezone);
  const dayOfWeek = now.toFormat('EEEE').toLowerCase(); // 'monday', 'tuesday', etc.

  const dayConfig = serviceHours[dayOfWeek];
  if (!dayConfig?.enabled) return false;

  const currentTime = now.toFormat('HH:mm');
  return currentTime >= dayConfig.start && currentTime <= dayConfig.end;
}
```

**Dashboard UI** (`apps/dashboard/src/pages/settings/ServiceHours.tsx`):
```tsx
export function ServiceHoursSettings() {
  const [serviceHours, setServiceHours] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    // ... other days
    timezone: 'America/New_York',
  });

  const updateHours = trpc.platform.aiPersonalities.updateServiceHours.useMutation();

  return (
    <div className="space-y-4">
      <h2>Support Service Hours</h2>

      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
        <div key={day} className="flex items-center gap-4">
          <input
            type="checkbox"
            checked={serviceHours[day].enabled}
            onChange={(e) => setServiceHours({
              ...serviceHours,
              [day]: { ...serviceHours[day], enabled: e.target.checked }
            })}
          />
          <span className="w-24 capitalize">{day}</span>
          <input
            type="time"
            value={serviceHours[day].start}
            disabled={!serviceHours[day].enabled}
          />
          <span>to</span>
          <input
            type="time"
            value={serviceHours[day].end}
            disabled={!serviceHours[day].enabled}
          />
        </div>
      ))}

      <button onClick={() => updateHours.mutate({ serviceHours })}>
        Save Service Hours
      </button>
    </div>
  );
}
```

---

### Week 5: Chat-First Optimization & Landing Page Demo (Days 31-37)

#### Day 31-32: Chat-First Workflow (Cost Optimization)

**Widget Chat Component** (`apps/widget-sdk/src/components/ChatFirst.tsx`):
```tsx
export function ChatFirst({ tenantId }: { tenantId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [canStartVideo, setCanStartVideo] = useState(false);

  const sendMessage = trpc.platform.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      setMessages([...messages, response.message]);

      // Check if minimum messages reached
      if (messages.length >= 3) {
        setCanStartVideo(true);
      }
    },
  });

  const startVideoCall = async () => {
    // Backend pre-loads RAG context before LiveKit session
    const context = await trpc.platform.chat.prepareVideoContext.mutate({
      messages,
      tenantId,
    });

    // Start LiveKit session with pre-loaded context
    window.open(`/meet/${context.token}`, '_blank');
  };

  return (
    <div>
      {/* Text chat interface */}
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>

      <input
        placeholder="Describe your problem..."
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            sendMessage.mutate({ content: e.target.value });
          }
        }}
      />

      {canStartVideo && (
        <button onClick={startVideoCall} className="mt-4">
          📹 Start Video Call
        </button>
      )}
    </div>
  );
}
```

**Backend Context Preparation** (`packages/api-contract/src/routers/chat.ts`):
```typescript
export const chatRouter = router({
  prepareVideoContext: protectedProcedure
    .input(z.object({
      messages: z.array(z.any()),
      tenantId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Extract problem description from messages
      const problemDescription = input.messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');

      // Search RAG system for relevant docs
      const relevantDocs = await searchKnowledgeBase({
        tenantId: input.tenantId,
        query: problemDescription,
        limit: 5,
      });

      // Cache results for LiveKit agent (10-minute TTL)
      const cacheKey = `video_context:${crypto.randomUUID()}`;
      await redis.setex(cacheKey, 600, JSON.stringify({
        messages: input.messages,
        relevantDocs,
        tenantId: input.tenantId,
      }));

      // Generate LiveKit token with cache key in metadata
      const token = await generateLiveKitToken({
        tenantId: input.tenantId,
        metadata: { cacheKey },
      });

      return { token, cacheKey };
    }),
});
```

**LiveKit Agent** (use cached context):
```python
async def start_session_with_cache(self, cache_key: str):
    """Start session with pre-loaded context from Redis"""

    # Retrieve cached context
    cached_data = await redis.get(cache_key)
    context = json.loads(cached_data)

    # Pre-load relevant docs into agent memory
    self.relevant_docs = context['relevantDocs']
    self.chat_history = context['messages']

    # Agent can now respond faster (no RAG queries needed initially)
    await self.llm.speak(
        "I've reviewed your messages. Let me help you solve this problem. "
        "Can you show me your screen?"
    )
```

#### Day 33-34: Landing Page Demo Chatbot

**Landing Page Widget** (`apps/landing/src/components/DemoWidget.tsx`):
```tsx
export function DemoWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating chat button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-full p-4 shadow-lg"
      >
        💬 Try Live Demo
      </button>

      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl">
          <DemoChat onClose={() => setIsOpen(false)} />
        </div>
      )}
    </>
  );
}

function DemoChat({ onClose }: { onClose: () => void }) {
  const [contactProvided, setContactProvided] = useState(false);

  if (!contactProvided) {
    return (
      <ContactVerification
        tenantId="demo_tenant"
        isDemo={true}
        onVerified={() => setContactProvided(true)}
      />
    );
  }

  return (
    <ChatFirst
      tenantId="demo_tenant"
      isDemo={true}
      maxDuration={300} // 5-minute limit
    />
  );
}
```

**Backend Demo Handling** (`packages/api-contract/src/routers/demo.ts`):
```typescript
export const demoRouter = router({
  createDemoUser: publicProcedure
    .input(z.object({
      phone: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create end user with is_potential_tenant flag
      const [endUser] = await ctx.db.insert(endUsers).values({
        tenantId: 'demo_tenant_id',
        phoneNumber: input.phone,
        email: input.email,
        source: 'landing_demo',
        isPotentialTenant: true,
      }).returning();

      // Send lead notification to sales team
      await sendLeadNotification({
        phone: input.phone,
        email: input.email,
        source: 'Landing Page Demo',
      });

      return { endUserId: endUser.id };
    }),

  createDemoSession: publicProcedure
    .input(z.object({
      endUserId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create demo session (no cost tracking, no escalations, no RAG)
      const [session] = await ctx.db.insert(sessions).values({
        tenantId: 'demo_tenant_id',
        endUserId: input.endUserId,
        isDemo: true,
      }).returning();

      return { sessionId: session.id };
    }),
});
```

**Demo AI Agent** (`livekit-agent/demo_agent.py`):
```python
class DemoAgent(voice.Agent):
    """Limited demo agent for landing page (cost-optimized)"""

    def __init__(self):
        super().__init__()
        self.is_demo = True
        self.max_duration = 300  # 5 minutes
        self.preloaded_responses = {
            "account setup": "Demo response about account setup...",
            "billing": "Demo response about billing...",
            # Pre-scripted responses to avoid expensive RAG queries
        }

    async def start_demo_session(self, session_id: str):
        """Time-limited demo with pre-loaded content"""

        # Start timer
        start_time = time.time()

        # Welcome message
        await self.llm.speak(
            "Welcome to our AI assistant demo! "
            "I'm here to show you how we can help your customers. "
            "What would you like to know about our platform?"
        )

        # Main conversation loop
        while time.time() - start_time < self.max_duration:
            user_input = await self.listen()

            # Use preloaded responses (no RAG queries)
            response = self.find_preloaded_response(user_input)

            if response:
                await self.llm.speak(response)
            else:
                await self.llm.speak(
                    "That's a great question! In a live session, "
                    "I'd search our knowledge base for the answer. "
                    "Would you like to see another demo scenario?"
                )

        # Time limit reached
        await self.llm.speak(
            "This concludes our demo. Interested in using this for your business? "
            "Our team will reach out to schedule a personalized walkthrough."
        )
```

#### Day 35: Abuse Prevention for LiveKit Sessions

**Backend Validation** (`packages/api/src/services/session-validation.ts`):
```typescript
export async function validateLiveKitSession(
  endUserId: string,
  sessionId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Check if user provided problem description
  const messages = await db.query.messages.findMany({
    where: and(
      eq(messages.sessionId, sessionId),
      eq(messages.role, 'user')
    ),
  });

  if (messages.length < 3) {
    return {
      allowed: false,
      reason: 'Please describe your problem in chat before starting video call',
    };
  }

  // Check if user is blocked
  const endUser = await db.query.endUsers.findFirst({
    where: eq(endUsers.id, endUserId),
  });

  if (endUser?.isBlocked) {
    return {
      allowed: false,
      reason: 'Your account has been suspended for abuse',
    };
  }

  // Check for recent video session (rate limiting)
  const recentSession = await db.execute(sql`
    SELECT id FROM sessions
    WHERE end_user_id = ${endUserId}
      AND created_at > NOW() - INTERVAL '1 hour'
      AND EXISTS (
        SELECT 1 FROM livekit_sessions
        WHERE session_id = sessions.id
      )
  `);

  if (recentSession.length >= 3) {
    return {
      allowed: false,
      reason: 'Too many video sessions. Please wait 1 hour before trying again.',
    };
  }

  return { allowed: true };
}
```

#### Day 36-37: Testing & Price Recalculation

**Testing Checklist**:
- ✅ End user phone/email verification flow
- ✅ In-widget feedback modal (40% completion rate target)
- ✅ Multi-tier survey fallback (AI call → SMS → Email)
- ✅ Semantic problem deduplication (>0.85 similarity)
- ✅ Human agent escalation (within/outside service hours)
- ✅ Meeting link join flow (meet.platform.com/{token})
- ✅ Chat-first optimization (3+ messages before video)
- ✅ Landing page demo (5-minute limit, no RAG)
- ✅ Abuse prevention (blocked users, rate limiting)

**Price Recalculation** (based on cost savings):

| Feature | Current Cost | With Phase 11 | Savings |
|---------|--------------|---------------|---------|
| Resolution tracking | $0.95 | $0.95 | $0 |
| Survey (AI call 100%) | $0.15 | - | - |
| Survey (40% modal, 60% AI) | - | $0.09 | $0.06 |
| Problem deduplication | - | - | $0.10 (fewer failed attempts) |
| Chat-first (RAG pre-load) | - | - | $0.04 (faster LiveKit) |
| **Total Resolution Cost** | **$1.10** | **$0.88** | **$0.22 (20%)** |

**Revised Pricing Options** (user requested reconsideration):

**Option A: Lower Overage Price** (Recommended)
- Professional: $89/seat + **$0.60/resolution** (was $0.75, now 39% below Intercom)
- Enterprise: $149/seat + **$0.60/resolution**
- Profit margin: ~68% (was 60%)

**Option B: Increase Included Resolutions**
- Professional: $89/seat + **80 included** (was 50) + $0.75 overage
- Enterprise: $149/seat + **250 included** (was 150) + $0.75 overage

**Option C: Keep Same Pricing** (Higher Profit)
- Professional: $89/seat + $0.75/resolution
- Profit margin increases to 75% (was 60%)

**User Note**: "we will be reviewing the real prices after staging and testing to know and calculate real values with mock data and testing"

---

## Part 3: Integration with Existing Systems

### 3.1 Phase 10 Resolution Tracking Updates

**Update `resolutions` table** (add fields):
```sql
ALTER TABLE resolutions
  ADD COLUMN end_user_id UUID REFERENCES end_users(id),
  ADD COLUMN problem_embedding vector(1024),
  ADD COLUMN problem_hash VARCHAR(64),
  ADD COLUMN is_duplicate BOOLEAN DEFAULT false,
  ADD COLUMN parent_problem_id UUID REFERENCES unresolved_problems(id);
```

### 3.2 Dashboard Updates

**New Pages**:
- `/dashboard/surveys` - Survey responses analytics
- `/dashboard/escalations` - Human agent escalation queue
- `/dashboard/problems` - Unresolved problems with solution approval
- `/dashboard/end-users` - End user contact management

**Existing Page Updates**:
- `/dashboard/performance` - Add survey response rates, resolution success rates
- `/dashboard/sessions` - Show end user contact info, escalation status

### 3.3 LiveKit Agent Integration

**Agent Workflows**:
1. **Check blocked problems** before conversation starts
2. **Chat-first** context gathering (minimum 3 messages)
3. **Intelligent escalation** (time limits, service hours)
4. **Post-conversation survey** trigger

**Cost Optimization**:
- Text chat: $0.001/message (GPT-4o-mini)
- RAG pre-load: Cache results for 10 minutes
- LiveKit session: Only start after context gathered
- Survey AI call: 60-90 second max duration

---

## Part 4: Security & Compliance

### 4.1 GDPR/CCPA Compliance

**Required Features**:
- ✅ Explicit consent checkboxes (SMS, email, calls)
- ✅ Privacy policy link during verification
- ✅ Right to deletion (end users can request data removal)
- ✅ Data retention limits (90 days for non-consenting users)
- ✅ Opt-out links in all communications

**Data Retention Policy**:
```sql
-- Delete end users who didn't consent after 90 days
DELETE FROM end_users
WHERE created_at < NOW() - INTERVAL '90 days'
  AND consent_sms = false
  AND consent_email = false
  AND consent_calls = false;
```

### 4.2 Abuse Prevention Summary

**Mechanisms**:
1. **Phone/Email Verification**: Twilio + SendGrid (~$0.05/verification)
2. **Device Fingerprinting**: FingerprintJS ($0.02/check)
3. **Rate Limiting**: Max 3 video sessions per hour
4. **Problem Blocking**: Prevent harassment of AI with unresolved issues
5. **Demo Time Limits**: 5 minutes for landing page demos

---

## Part 5: Success Metrics

### 5.1 Key Performance Indicators (KPIs)

**Survey Response Rates**:
- In-widget modal: **40%** target
- AI voice call: **30-40%** target
- SMS link: **5-10%** target
- Email link: **2-5%** target
- **Overall combined**: **60-70%** target

**Resolution Quality**:
- Successful resolution rate: **75%+** (from survey data)
- Average resolution time: **<8 minutes**
- Human escalation rate: **<10%**
- Problem deduplication accuracy: **>85%** similarity threshold

**Cost Savings**:
- Survey cost per resolution: **$0.09** (vs $0.15 baseline)
- Resolution cost per session: **$0.88** (vs $1.10 baseline)
- Total cost savings: **20%**

**Landing Page Conversion**:
- Demo completion rate: **>50%**
- Demo-to-signup conversion: **10-15%** target
- Lead quality score: **>7/10** (based on engagement)

### 5.2 Dashboard Analytics

**New Widgets**:
- Survey response funnel (modal → call → SMS → email)
- Resolution success rate trend
- Unresolved problems heatmap
- Human agent performance (escalations handled, avg time)
- Landing page demo metrics

---

## Part 6: Future Enhancements (Phase 12+)

**Potential Features**:
1. **Multi-language surveys** (Spanish, French, etc.)
2. **WhatsApp integration** for surveys (higher response rates in some regions)
3. **AI sentiment analysis** on survey feedback
4. **Automated problem categorization** (using LLM)
5. **Human agent call recording** (with consent)
6. **Predictive escalation** (escalate before user asks)
7. **Customer health scores** (based on survey trends)

---

## Validation & Testing

**After completing Phase 11**:
```bash
# Run all validation
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# Database migration
pnpm db:push

# Seed test data
pnpm db:seed

# Test end user flows
# 1. Widget verification (phone + email)
# 2. In-widget feedback modal
# 3. AI survey call simulation
# 4. SMS/email fallback
# 5. Problem deduplication
# 6. Human agent escalation
# 7. Landing page demo
```

**Security Audit Checklist**:
- [ ] SMS verification secure (no code reuse)
- [ ] Email verification tokens expire
- [ ] Device fingerprinting can't be spoofed
- [ ] Survey links are single-use
- [ ] GDPR consent properly logged
- [ ] Rate limiting prevents abuse
- [ ] Demo sessions isolated from production

---

## Notes & Considerations

**User's Personal Notes Addressed**:

1. ✅ **Multi-tier fallback**: AI call → SMS → Email (no harassment)
2. ✅ **In-widget modal**: 5-star + yes/no + "Later" button (avoid 40% of calls)
3. ✅ **Phone OR email**: User choice with verification for both
4. ✅ **Human escalation**: Meeting link join, service hours, scheduled follow-up
5. ✅ **Problem blocking**: Semantic deduplication prevents duplicate RAG content
6. ✅ **Time limits**: Intelligent escalation based on average ticket time
7. ✅ **Price reconsideration**: $0.22/resolution savings documented (user to finalize after testing)
8. ✅ **Phase 11 separate**: Resolution tracking stays in Phase 10, end user engagement in Phase 11

**Landing Page Demo**:
- Separate tenant (`demo_tenant_id`)
- Time-limited (5 minutes)
- Pre-loaded responses (no RAG queries)
- Lead capture with sales notifications
- Abuse prevention (device fingerprinting, rate limiting)

**Chat-First Optimization**:
- Minimum 3 messages before video call
- RAG pre-load during text chat (10-minute cache)
- LiveKit session starts with context ready
- Reduces average call time by ~20%

---

## Timeline Summary

| Week | Days | Focus | Status |
|------|------|-------|--------|
| 1 | 1-7 | End User Identity & Verification | Planned |
| 2 | 8-14 | In-Widget Feedback Modal | Planned |
| 3 | 15-22 | Multi-Tier Survey System | Planned |
| 4 | 23-30 | Human Agent Escalation & Problem Deduplication | Planned |
| 5 | 31-37 | Chat-First Optimization & Landing Page Demo | Planned |

**Total Duration**: 37 days (5 weeks + 2 days)

**Next Steps**:
1. User reviews this Phase 11 plan
2. User finalizes pricing after staging tests (Option A/B/C)
3. Start Phase 11 Week 1 implementation
4. Test with mock data before production deployment

---

**Document Version**: 1.0
**Last Updated**: 2025-10-11
**Dependencies**: Phase 10 (Resolution Tracking), Phase 5 (LiveKit Agent), Phase 6 (Redis Streams)
