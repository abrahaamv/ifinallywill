/**
 * AI Personalities Router (Phase 4 Enhancement)
 * Manage AI assistant personalities with custom tones, knowledge bases, and behaviors
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

/**
 * Personality tone options
 */
const personalityToneSchema = z.enum(['professional', 'friendly', 'casual', 'empathetic', 'technical']);

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
    const { db: _db, tenantId } = ctx;

    // TODO: Query ai_personalities table with RLS enforcement
    // For now, return mock data to avoid database errors
    const personalities = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenantId,
        name: 'Professional Support Agent',
        tone: 'professional' as const,
        systemPrompt:
          'You are a professional customer support agent. Provide clear, concise answers with a formal tone.',
        knowledgeBaseIds: [],
        temperature: 0.7,
        maxTokens: 1000,
        isDefault: true,
        usageCount: 1247,
        lastUsed: new Date('2024-01-15T10:30:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
      },
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        tenantId,
        name: 'Friendly Helper',
        tone: 'friendly' as const,
        systemPrompt:
          'You are a friendly and approachable AI assistant. Use a warm, conversational tone while being helpful.',
        knowledgeBaseIds: [],
        temperature: 0.8,
        maxTokens: 1200,
        isDefault: false,
        usageCount: 543,
        lastUsed: new Date('2024-01-14T15:45:00Z'),
        createdAt: new Date('2024-01-02T00:00:00Z'),
        updatedAt: new Date('2024-01-14T15:45:00Z'),
      },
      {
        id: '323e4567-e89b-12d3-a456-426614174002',
        tenantId,
        name: 'Technical Expert',
        tone: 'technical' as const,
        systemPrompt:
          'You are a technical expert. Provide detailed, accurate technical information with precise terminology.',
        knowledgeBaseIds: [],
        temperature: 0.5,
        maxTokens: 1500,
        isDefault: false,
        usageCount: 892,
        lastUsed: new Date('2024-01-16T08:20:00Z'),
        createdAt: new Date('2024-01-03T00:00:00Z'),
        updatedAt: new Date('2024-01-16T08:20:00Z'),
      },
    ];

    return {
      personalities,
      total: personalities.length,
    };
  }),

  /**
   * Create a new personality
   */
  create: protectedProcedure.input(createPersonalitySchema).mutation(async ({ ctx, input }) => {
    const { db: _db, tenantId } = ctx;

    // TODO: Insert into ai_personalities table with RLS enforcement
    // For now, return mock success response
    const personality = {
      id: crypto.randomUUID(),
      tenantId,
      ...input,
      isDefault: false,
      usageCount: 0,
      lastUsed: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return {
      success: true,
      personality,
    };
  }),

  /**
   * Update an existing personality
   */
  update: protectedProcedure.input(updatePersonalitySchema).mutation(async ({ ctx, input }) => {
    const { db: _db, tenantId } = ctx;
    const { id, ...updates } = input;

    // TODO: Update ai_personalities table with RLS enforcement
    // Verify personality belongs to tenant before updating
    // For now, return mock success response
    return {
      success: true,
      personality: {
        id,
        tenantId,
        ...updates,
        updatedAt: new Date(),
      },
    };
  }),

  /**
   * Delete a personality
   */
  delete: protectedProcedure.input(deletePersonalitySchema).mutation(async ({ ctx, input }) => {
    const { db: _db, tenantId: _tenantId } = ctx;
    const { id: _id } = input;

    // TODO: Delete from ai_personalities table with RLS enforcement
    // Verify personality belongs to tenant before deleting
    // Prevent deletion of default personality
    // For now, return mock success response
    return {
      success: true,
    };
  }),

  /**
   * Set a personality as the default for the tenant
   */
  setDefault: protectedProcedure.input(setDefaultSchema).mutation(async ({ ctx, input }) => {
    const { db: _db, tenantId: _tenantId } = ctx;
    const { id: _id } = input;

    // TODO: Update ai_personalities table with RLS enforcement
    // 1. Set all personalities for tenant to isDefault = false
    // 2. Set specified personality to isDefault = true
    // Verify personality belongs to tenant
    // For now, return mock success response
    return {
      success: true,
    };
  }),
});
