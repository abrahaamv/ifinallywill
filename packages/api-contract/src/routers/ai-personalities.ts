/**
 * AI Personalities Router (Phase 4 Enhancement)
 * Manage AI assistant personalities with custom tones, knowledge bases, and behaviors
 */

import { aiPersonalities } from '@platform/db';
import { badRequest, internalError, notFound } from '@platform/shared';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

/**
 * Personality metadata interface
 */
interface PersonalityMetadata {
  tone?: string;
  knowledgeBaseIds?: string[];
  tags?: string[];
  category?: string;
  usageStats?: {
    totalUses: number;
    avgTokens: number;
    avgCost: number;
  };
}

/**
 * Personality tone options
 */
const personalityToneSchema = z.enum([
  'professional',
  'friendly',
  'casual',
  'empathetic',
  'technical',
]);

/**
 * Input validation schemas
 */
const createPersonalitySchema = z.object({
  name: z.string().min(1).max(100),
  tone: personalityToneSchema,
  systemPrompt: z.string().min(1).max(5000),
  knowledgeBaseIds: z.array(z.string()).default([]),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().int().min(100).max(4000).default(1000),
});

const updatePersonalitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  tone: personalityToneSchema.optional(),
  systemPrompt: z.string().min(1).max(5000).optional(),
  knowledgeBaseIds: z.array(z.string()).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(100).max(4000).optional(),
});

const deletePersonalitySchema = z.object({
  id: z.string().uuid(),
});

const setDefaultSchema = z.object({
  id: z.string().uuid(),
});

/**
 * AI Personalities router
 * All endpoints require authentication (protectedProcedure)
 */
export const aiPersonalitiesRouter = router({
  /**
   * List all personalities for current tenant
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const { db, tenantId } = ctx;

    // Query ai_personalities table with tenant isolation (RLS enforcement via WHERE clause)
    const results = await db
      .select()
      .from(aiPersonalities)
      .where(and(eq(aiPersonalities.tenantId, tenantId), eq(aiPersonalities.isActive, true)))
      .orderBy(desc(aiPersonalities.isDefault), desc(aiPersonalities.updatedAt));

    // Transform database results to match API schema
    const personalities = results.map((p) => {
      const metadata = p.metadata as PersonalityMetadata | null;
      return {
        id: p.id,
        tenantId: p.tenantId,
        name: p.name,
        tone: metadata?.tone || 'professional',
        systemPrompt: p.systemPrompt,
        knowledgeBaseIds: metadata?.knowledgeBaseIds || [],
        temperature: Number(p.temperature),
        maxTokens: p.maxTokens || 1000,
        isDefault: p.isDefault,
        usageCount: metadata?.usageStats?.totalUses || 0,
        lastUsed:
          metadata && 'lastUsed' in metadata && metadata.lastUsed
            ? new Date(metadata.lastUsed as string)
            : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });

    return {
      personalities,
      total: personalities.length,
    };
  }),

  /**
   * Create a new personality
   */
  create: protectedProcedure.input(createPersonalitySchema).mutation(async ({ ctx, input }) => {
    const { db, tenantId } = ctx;

    // Insert into ai_personalities table with tenant isolation
    const [personality] = await db
      .insert(aiPersonalities)
      .values({
        tenantId,
        name: input.name,
        systemPrompt: input.systemPrompt,
        temperature: input.temperature.toString(),
        maxTokens: input.maxTokens,
        isDefault: false,
        isActive: true,
        metadata: {
          tone: input.tone,
          knowledgeBaseIds: input.knowledgeBaseIds,
          usageStats: {
            totalUses: 0,
            avgTokens: 0,
            avgCost: 0,
          },
        } as PersonalityMetadata,
      })
      .returning();

    if (!personality) {
      throw internalError({ message: 'Failed to create personality' });
    }

    return {
      success: true,
      personality: {
        id: personality.id,
        tenantId: personality.tenantId,
        name: personality.name,
        tone: input.tone,
        systemPrompt: personality.systemPrompt,
        knowledgeBaseIds: input.knowledgeBaseIds,
        temperature: Number(personality.temperature),
        maxTokens: personality.maxTokens || 1000,
        isDefault: personality.isDefault,
        usageCount: 0,
        lastUsed: null,
        createdAt: personality.createdAt,
        updatedAt: personality.updatedAt,
      },
    };
  }),

  /**
   * Update an existing personality
   */
  update: protectedProcedure.input(updatePersonalitySchema).mutation(async ({ ctx, input }) => {
    const { db, tenantId } = ctx;
    const { id, ...updates } = input;

    // First, verify personality exists and belongs to tenant (RLS enforcement)
    const [existing] = await db
      .select()
      .from(aiPersonalities)
      .where(and(eq(aiPersonalities.id, id), eq(aiPersonalities.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      throw notFound({ message: 'Personality not found or access denied' });
    }

    // Build update object
    const updateData: Partial<typeof aiPersonalities.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.systemPrompt) updateData.systemPrompt = updates.systemPrompt;
    if (updates.temperature !== undefined) updateData.temperature = updates.temperature.toString();
    if (updates.maxTokens !== undefined) updateData.maxTokens = updates.maxTokens;

    // Update metadata fields
    if (updates.tone || updates.knowledgeBaseIds) {
      const currentMetadata = (existing.metadata as PersonalityMetadata | null) || {};
      updateData.metadata = {
        ...currentMetadata,
        ...(updates.tone && { tone: updates.tone }),
        ...(updates.knowledgeBaseIds && { knowledgeBaseIds: updates.knowledgeBaseIds }),
      } as PersonalityMetadata;
    }

    // Update personality
    const [updated] = await db
      .update(aiPersonalities)
      .set(updateData)
      .where(and(eq(aiPersonalities.id, id), eq(aiPersonalities.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw internalError({ message: 'Failed to update personality' });
    }

    const updatedMetadata = updated.metadata as PersonalityMetadata | null;
    return {
      success: true,
      personality: {
        id: updated.id,
        tenantId: updated.tenantId,
        name: updated.name,
        tone: updatedMetadata?.tone || 'professional',
        systemPrompt: updated.systemPrompt,
        knowledgeBaseIds: updatedMetadata?.knowledgeBaseIds || [],
        temperature: Number(updated.temperature),
        maxTokens: updated.maxTokens || 1000,
        isDefault: updated.isDefault,
        updatedAt: updated.updatedAt,
      },
    };
  }),

  /**
   * Delete a personality
   */
  delete: protectedProcedure.input(deletePersonalitySchema).mutation(async ({ ctx, input }) => {
    const { db, tenantId } = ctx;
    const { id } = input;

    // First, verify personality exists and belongs to tenant
    const [existing] = await db
      .select()
      .from(aiPersonalities)
      .where(and(eq(aiPersonalities.id, id), eq(aiPersonalities.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      throw notFound({ message: 'Personality not found or access denied' });
    }

    // Prevent deletion of default personality
    if (existing.isDefault) {
      throw badRequest({
        message: 'Cannot delete default personality. Set another personality as default first.',
      });
    }

    // Soft delete by setting isActive to false (preserves audit trail)
    await db
      .update(aiPersonalities)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(aiPersonalities.id, id), eq(aiPersonalities.tenantId, tenantId)));

    return {
      success: true,
    };
  }),

  /**
   * Set a personality as the default for the tenant
   */
  setDefault: protectedProcedure.input(setDefaultSchema).mutation(async ({ ctx, input }) => {
    const { db, tenantId } = ctx;
    const { id } = input;

    // First, verify personality exists and belongs to tenant
    const [existing] = await db
      .select()
      .from(aiPersonalities)
      .where(
        and(
          eq(aiPersonalities.id, id),
          eq(aiPersonalities.tenantId, tenantId),
          eq(aiPersonalities.isActive, true)
        )
      )
      .limit(1);

    if (!existing) {
      throw notFound({ message: 'Personality not found or access denied' });
    }

    // Transaction: Atomically update default status
    await db.transaction(async (tx) => {
      // Set all personalities for tenant to isDefault = false
      await tx
        .update(aiPersonalities)
        .set({
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(eq(aiPersonalities.tenantId, tenantId));

      // Set specified personality to isDefault = true
      await tx
        .update(aiPersonalities)
        .set({
          isDefault: true,
          updatedAt: new Date(),
        })
        .where(and(eq(aiPersonalities.id, id), eq(aiPersonalities.tenantId, tenantId)));
    });

    return {
      success: true,
    };
  }),
});
