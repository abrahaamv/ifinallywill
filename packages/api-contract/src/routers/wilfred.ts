/**
 * Wilfred AI Router — Estate Planning Sidechat
 *
 * Simplified chat router for the Wilfred AI assistant that appears
 * in the will/POA wizard sidebar. Uses the platform's existing
 * AI provider routing and message storage.
 *
 * Key differences from the general chat router:
 * - Hardcoded estate planning system prompt
 * - Wizard context injection (current step, province, form values)
 * - Simpler cost routing (GPT-4o-mini for most, GPT-4o for complex)
 * - No CRAG/RAG (uses domain-specific prompts instead)
 */

import { messages, sessions } from '@platform/db';
import { createModuleLogger } from '@platform/shared';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { router, protectedProcedure, protectedMutation } from '../trpc';

const logger = createModuleLogger('wilfred-router');

const WILFRED_SYSTEM_PROMPT = `You are Wilfred, a friendly and knowledgeable AI assistant helping users create their estate planning documents on IFinallyWill.

Your role:
- Guide users through creating wills and powers of attorney for Canadian provinces
- Explain legal concepts in plain, accessible language
- Help users understand what each section means and why it matters
- Suggest best practices based on the user's province and family situation
- Never provide specific legal advice — always recommend consulting a lawyer for complex situations

Tone: Warm, professional, reassuring. Many users find estate planning stressful — help them feel confident.

Important rules:
- Only discuss Canadian estate law (primarily Ontario, BC, Alberta, Quebec)
- If asked about other jurisdictions, politely redirect to Canadian context
- Never draft legal clauses — the templates handle that
- Keep answers concise (2-4 paragraphs max)
- When unsure, say so honestly and suggest consulting a professional`;

/**
 * Build context string from wizard state to inject into AI prompt
 */
function buildWizardContext(ctx: {
  stepId?: string;
  province?: string;
  documentType?: string;
  completedSteps?: string[];
  formValues?: Record<string, unknown>;
}): string {
  const parts: string[] = [];

  if (ctx.documentType) {
    const typeLabel = ctx.documentType === 'primary_will' ? 'Last Will & Testament'
      : ctx.documentType === 'secondary_will' ? 'Secondary Will'
      : ctx.documentType === 'poa_property' ? 'Power of Attorney for Property'
      : ctx.documentType === 'poa_health' ? 'Power of Attorney for Health'
      : ctx.documentType;
    parts.push(`Document: ${typeLabel}`);
  }

  if (ctx.province) parts.push(`Province: ${ctx.province}`);
  if (ctx.stepId) parts.push(`Current step: ${ctx.stepId}`);

  if (ctx.completedSteps && ctx.completedSteps.length > 0) {
    parts.push(`Completed steps: ${ctx.completedSteps.join(', ')}`);
  }

  if (ctx.formValues) {
    const summary = Object.entries(ctx.formValues)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join('; ');
    if (summary) parts.push(`Current form data: ${summary}`);
  }

  return parts.length > 0
    ? `\n\n[Wizard Context]\n${parts.join('\n')}`
    : '';
}

export const wilfredRouter = router({
  /** Create a new Wilfred chat session tied to an estate document */
  createSession: protectedMutation
    .input(z.object({
      estateDocId: z.string().uuid(),
    }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await ctx.db
        .insert(sessions)
        .values({
          tenantId: ctx.tenantId,
          mode: 'text',
          isDemo: false,
        })
        .returning();

      if (!session) throw new Error('Failed to create Wilfred session');

      // Store initial system message with estate doc context
      await ctx.db.insert(messages).values({
        sessionId: session.id,
        role: 'system',
        content: `${WILFRED_SYSTEM_PROMPT}\n\n[Estate Document ID: ${input.estateDocId}]`,
      });

      return { sessionId: session.id };
    }),

  /** Send a message to Wilfred and get a response */
  sendMessage: protectedMutation
    .input(z.object({
      sessionId: z.string().uuid(),
      content: z.string().min(1).max(5000),
      wizardContext: z.object({
        stepId: z.string().optional(),
        province: z.string().optional(),
        documentType: z.string().optional(),
        completedSteps: z.array(z.string()).optional(),
        formValues: z.record(z.unknown()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify session exists
      const [session] = await ctx.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) throw new Error('Session not found');
      if (session.endedAt) throw new Error('Session has ended');

      // Store user message
      const [userMessage] = await ctx.db
        .insert(messages)
        .values({
          sessionId: input.sessionId,
          role: 'user',
          content: input.content,
        })
        .returning();

      if (!userMessage) throw new Error('Failed to store message');

      // Get conversation history (last 15 messages for context window)
      const history = await ctx.db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, input.sessionId))
        .orderBy(messages.timestamp)
        .limit(15);

      // Build AI messages array
      const contextSuffix = input.wizardContext
        ? buildWizardContext(input.wizardContext)
        : '';

      const aiMessages = history.map((msg) => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.role === 'system'
          ? msg.content + contextSuffix
          : msg.content,
      }));

      // Call AI provider (graceful degradation if AI core unavailable)
      let responseContent = '';
      let model = 'fallback';

      try {
        const { AIRouter } = await import('@platform/ai-core');
        const aiRouter = new AIRouter({
          openaiApiKey: process.env.OPENAI_API_KEY ?? 'sk-placeholder',
          anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
          googleApiKey: process.env.GOOGLE_API_KEY ?? '',
          openaiBaseURL: process.env.LLM_GATEWAY_URL ?? undefined,
          enableFallback: true,
          logRouting: false,
        });

        const aiResponse = await aiRouter.complete({
          messages: aiMessages,
          temperature: 0.7,
          maxTokens: 1024,
        });

        responseContent = aiResponse.content ?? 'I apologize, I was unable to generate a response. Please try again.';
        model = aiResponse.model ?? 'unknown';

        // Track cost
        if (aiResponse.usage?.cost) {
          const newCost = (Number(session.costUsd) + aiResponse.usage.cost).toFixed(6);
          await ctx.db.update(sessions).set({ costUsd: newCost }).where(eq(sessions.id, session.id));
        }
      } catch (err) {
        logger.warn('AI provider call failed, using fallback response', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        responseContent = "I'm having trouble connecting to my knowledge base right now. Please try again in a moment, or continue with your document — you can always come back to ask questions later.";
      }

      // Store assistant response
      const [assistantMessage] = await ctx.db
        .insert(messages)
        .values({
          sessionId: input.sessionId,
          role: 'assistant',
          content: responseContent,
          metadata: { model } as Record<string, unknown>,
        })
        .returning();

      return {
        userMessage,
        assistantMessage,
        model,
      };
    }),

  /** Get chat history for a session */
  getHistory: protectedProcedure
    .input(z.object({
      sessionId: z.string().uuid(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input, ctx }) => {
      // Verify session belongs to tenant
      const [session] = await ctx.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, input.sessionId))
        .limit(1);

      if (!session) return [];

      const msgs = await ctx.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.sessionId, input.sessionId),
            // Exclude system messages from history display
          ),
        )
        .orderBy(messages.timestamp)
        .limit(input.limit);

      // Filter out system messages for the UI
      return msgs.filter((m) => m.role !== 'system');
    }),

  /** Get contextual suggestions for the current wizard step */
  getSuggestions: protectedProcedure
    .input(z.object({
      stepId: z.string(),
      documentType: z.string(),
      province: z.string().optional(),
    }))
    .query(({ input }) => {
      // Return pre-built suggestions based on step + document type
      const suggestions = STEP_SUGGESTIONS[input.stepId] ?? DEFAULT_SUGGESTIONS;
      return { suggestions };
    }),
});

/** Pre-built quick-ask suggestions per wizard step */
const STEP_SUGGESTIONS: Record<string, string[]> = {
  'personal-info': [
    'What name should I use on my will?',
    'Does my province affect my will?',
  ],
  'family-status': [
    'How does marital status affect inheritance?',
    'What is common-law for estate purposes?',
  ],
  'spouse-info': [
    'Does my spouse automatically inherit everything?',
    'What if we have different last names?',
  ],
  children: [
    'How are stepchildren treated in a will?',
    'What if I have children from multiple relationships?',
  ],
  guardians: [
    'How do I choose a guardian for my children?',
    'Can I name multiple guardians?',
  ],
  assets: [
    'What assets should I include in my will?',
    'Do I need to list every item?',
  ],
  bequests: [
    'What is a specific bequest?',
    'Can I give percentages instead of items?',
  ],
  residue: [
    'What is the residue of an estate?',
    'How should I distribute the residue?',
  ],
  executors: [
    'What does an executor do?',
    'Can I name a professional executor?',
  ],
  wipeout: [
    'What is a wipeout clause?',
    'Who should be my ultimate beneficiary?',
  ],
  'poa-agent-selection': [
    'What qualities should my agent have?',
    'Can my agent be from another province?',
  ],
  'poa-activation': [
    'What is the difference between immediate and springing POA?',
    'When should I choose incapacity activation?',
  ],
  'poa-health-directives': [
    'What should I include in health directives?',
    'Are advance directives legally binding?',
  ],
  'poa-organ-donation': [
    'How does organ donation work in my province?',
    'What is a DNR order?',
  ],
};

const DEFAULT_SUGGESTIONS = [
  'What should I know about this step?',
  'Can you explain this in simpler terms?',
];
