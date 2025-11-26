/**
 * Widgets Router (Phase 3 - Week 2.3)
 *
 * Widget configuration management with automatic RLS enforcement.
 * All queries automatically filtered by tenant_id via PostgreSQL RLS policies.
 *
 * Security:
 * - authMiddleware sets app.current_tenant_id for each request
 * - RLS policies filter all SELECT/UPDATE/DELETE operations
 * - UUID validation prevents SQL injection
 * - Role hierarchy enforced: owner > admin > member
 */

import { aiPersonalities, widgets } from '@platform/db';
import { internalError, notFound } from '@platform/shared';
import { TRPCError } from '@trpc/server';
import { and, count, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, ownerProcedure, protectedProcedure, router } from '../trpc';

/**
 * Input validation schemas
 */
const widgetSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
  greeting: z.string().max(200, 'Greeting too long').optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
  // Screen share settings for unified widget
  enableScreenShare: z.boolean().optional(),
  screenSharePrompt: z.string().max(500, 'Screen share prompt too long').optional(),
});

const createWidgetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  domainWhitelist: z
    .array(z.string().url('Invalid domain URL'))
    .min(1, 'At least one domain required'),
  settings: widgetSettingsSchema.optional(),
});

const updateWidgetSchema = z.object({
  id: z.string().uuid('Invalid widget ID'),
  name: z.string().min(1).max(100).optional(),
  domainWhitelist: z.array(z.string().url('Invalid domain URL')).optional(),
  settings: widgetSettingsSchema.optional(),
  isActive: z.boolean().optional(),
});

const getWidgetSchema = z.object({
  id: z.string().uuid('Invalid widget ID'),
});

const listWidgetsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  isActive: z.boolean().optional(),
});

const deleteWidgetSchema = z.object({
  id: z.string().uuid('Invalid widget ID'),
});

const getWithPersonalitySchema = z.object({
  widgetId: z.string().uuid('Invalid widget ID'),
});

const setPersonalitySchema = z.object({
  widgetId: z.string().uuid('Invalid widget ID'),
  personalityId: z.string().uuid('Invalid personality ID').nullable(),
});

/**
 * Widgets router with RLS enforcement
 */
export const widgetsRouter = router({
  /**
   * List widgets in current tenant
   *
   * RLS automatically filters by tenantId
   * All roles can list widgets
   */
  list: protectedProcedure.input(listWidgetsSchema).query(async ({ ctx, input }) => {
    try {
      // Build query with filters
      let query = ctx.db
        .select({
          id: widgets.id,
          tenantId: widgets.tenantId,
          name: widgets.name,
          domainWhitelist: widgets.domainWhitelist,
          settings: widgets.settings,
          isActive: widgets.isActive,
          createdAt: widgets.createdAt,
          updatedAt: widgets.updatedAt,
        })
        .from(widgets)
        .$dynamic();

      // RLS handles tenant filtering automatically
      // No need for .where(eq(widgets.tenantId, ctx.tenantId))

      // Apply active filter if provided
      if (input.isActive !== undefined) {
        query = query.where(eq(widgets.isActive, input.isActive));
      }

      // Apply pagination
      const results = await query.limit(input.limit).offset(input.offset);

      // Get total count
      const countResult = await ctx.db.select({ count: count() }).from(widgets);

      const totalCount = Number(countResult[0]?.count ?? 0);

      return {
        widgets: results.map((widget) => ({
          id: widget.id,
          name: widget.name,
          domainWhitelist: widget.domainWhitelist,
          settings: widget.settings,
          isActive: widget.isActive,
          createdAt: widget.createdAt,
          updatedAt: widget.updatedAt,
        })),
        total: totalCount,
        hasMore: input.offset + results.length < totalCount,
      };
    } catch (error) {
      throw internalError({
        message: 'Failed to retrieve widgets',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Get widget by ID
   *
   * RLS ensures widget belongs to current tenant
   */
  get: protectedProcedure.input(getWidgetSchema).query(async ({ ctx, input }) => {
    try {
      const [widget] = await ctx.db
        .select({
          id: widgets.id,
          tenantId: widgets.tenantId,
          name: widgets.name,
          domainWhitelist: widgets.domainWhitelist,
          settings: widgets.settings,
          isActive: widgets.isActive,
          createdAt: widgets.createdAt,
          updatedAt: widgets.updatedAt,
        })
        .from(widgets)
        .where(eq(widgets.id, input.id))
        .limit(1);

      if (!widget) {
        throw notFound({
          message: 'Widget not found or access denied',
        });
      }

      return {
        id: widget.id,
        name: widget.name,
        domainWhitelist: widget.domainWhitelist,
        settings: widget.settings,
        isActive: widget.isActive,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: 'Failed to retrieve widget',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Create widget (admin/owner only)
   *
   * Automatically associates widget with current tenant via RLS
   */
  create: adminProcedure.input(createWidgetSchema).mutation(async ({ ctx, input }) => {
    try {
      // Apply defaults for settings if not provided
      const settings = {
        theme: input.settings?.theme ?? 'light' as const,
        position: input.settings?.position ?? 'bottom-right' as const,
        greeting: input.settings?.greeting,
        primaryColor: input.settings?.primaryColor,
        secondaryColor: input.settings?.secondaryColor,
      };

      // Create widget - tenantId automatically set via RLS
      const [newWidget] = await ctx.db
        .insert(widgets)
        .values({
          tenantId: ctx.tenantId, // Explicit for clarity, but RLS enforces match
          name: input.name,
          domainWhitelist: input.domainWhitelist,
          settings,
          isActive: true,
        })
        .returning();

      if (!newWidget) {
        throw internalError({
          message: 'Failed to create widget',
        });
      }

      return {
        id: newWidget.id,
        name: newWidget.name,
        domainWhitelist: newWidget.domainWhitelist,
        settings: newWidget.settings,
        isActive: newWidget.isActive,
        createdAt: newWidget.createdAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: 'Failed to create widget',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Update widget (admin/owner only)
   *
   * RLS ensures widget belongs to current tenant
   */
  update: adminProcedure.input(updateWidgetSchema).mutation(async ({ ctx, input }) => {
    try {
      // Verify widget exists and belongs to tenant (RLS)
      const [existing] = await ctx.db
        .select({ id: widgets.id })
        .from(widgets)
        .where(eq(widgets.id, input.id))
        .limit(1);

      if (!existing) {
        throw notFound({
          message: 'Widget not found or access denied',
        });
      }

      // Build update object - only include provided fields
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.domainWhitelist !== undefined) updateData.domainWhitelist = input.domainWhitelist;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      if (input.settings !== undefined) {
        // Ensure settings has required fields with defaults
        updateData.settings = {
          theme: input.settings.theme ?? 'light' as const,
          position: input.settings.position ?? 'bottom-right' as const,
          greeting: input.settings.greeting,
          primaryColor: input.settings.primaryColor,
          secondaryColor: input.settings.secondaryColor,
          enableScreenShare: input.settings.enableScreenShare,
          screenSharePrompt: input.settings.screenSharePrompt,
        };
      }

      // Update widget - RLS ensures we can only update within our tenant
      const [updated] = await ctx.db
        .update(widgets)
        .set(updateData)
        .where(eq(widgets.id, input.id))
        .returning();

      if (!updated) {
        throw internalError({
          message: 'Failed to update widget',
        });
      }

      return {
        id: updated.id,
        name: updated.name,
        domainWhitelist: updated.domainWhitelist,
        settings: updated.settings,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: 'Failed to update widget',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Delete widget (owner only)
   *
   * RLS ensures widget belongs to current tenant
   */
  delete: ownerProcedure.input(deleteWidgetSchema).mutation(async ({ ctx, input }) => {
    try {
      // Delete widget - RLS ensures we can only delete within our tenant
      const [deleted] = await ctx.db
        .delete(widgets)
        .where(eq(widgets.id, input.id))
        .returning({ id: widgets.id });

      if (!deleted) {
        throw notFound({
          message: 'Widget not found or access denied',
        });
      }

      return {
        id: deleted.id,
        deleted: true,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;

      throw internalError({
        message: 'Failed to delete widget',
        cause: error as Error,
        logLevel: 'error',
      });
    }
  }),

  /**
   * Get widget with its AI personality
   *
   * Returns widget with the associated AI personality.
   * Falls back to tenant's default personality if widget has none set.
   */
  getWithPersonality: protectedProcedure
    .input(getWithPersonalitySchema)
    .query(async ({ ctx, input }) => {
      try {
        // Get widget with personality
        const [widget] = await ctx.db
          .select({
            id: widgets.id,
            tenantId: widgets.tenantId,
            name: widgets.name,
            domainWhitelist: widgets.domainWhitelist,
            settings: widgets.settings,
            aiPersonalityId: widgets.aiPersonalityId,
            isActive: widgets.isActive,
            createdAt: widgets.createdAt,
            updatedAt: widgets.updatedAt,
          })
          .from(widgets)
          .where(eq(widgets.id, input.widgetId))
          .limit(1);

        if (!widget) {
          throw notFound({
            message: 'Widget not found or access denied',
          });
        }

        // Get personality - either widget's specific or tenant default
        let personality = null;

        if (widget.aiPersonalityId) {
          // Widget has a specific personality
          const [widgetPersonality] = await ctx.db
            .select({
              id: aiPersonalities.id,
              name: aiPersonalities.name,
              description: aiPersonalities.description,
              systemPrompt: aiPersonalities.systemPrompt,
              temperature: aiPersonalities.temperature,
              maxTokens: aiPersonalities.maxTokens,
              topP: aiPersonalities.topP,
              frequencyPenalty: aiPersonalities.frequencyPenalty,
              presencePenalty: aiPersonalities.presencePenalty,
              preferredModel: aiPersonalities.preferredModel,
              isDefault: aiPersonalities.isDefault,
            })
            .from(aiPersonalities)
            .where(eq(aiPersonalities.id, widget.aiPersonalityId))
            .limit(1);

          personality = widgetPersonality || null;
        }

        // Fallback to tenant's default personality if widget has none
        if (!personality) {
          const [defaultPersonality] = await ctx.db
            .select({
              id: aiPersonalities.id,
              name: aiPersonalities.name,
              description: aiPersonalities.description,
              systemPrompt: aiPersonalities.systemPrompt,
              temperature: aiPersonalities.temperature,
              maxTokens: aiPersonalities.maxTokens,
              topP: aiPersonalities.topP,
              frequencyPenalty: aiPersonalities.frequencyPenalty,
              presencePenalty: aiPersonalities.presencePenalty,
              preferredModel: aiPersonalities.preferredModel,
              isDefault: aiPersonalities.isDefault,
            })
            .from(aiPersonalities)
            .where(
              and(
                eq(aiPersonalities.tenantId, ctx.tenantId),
                eq(aiPersonalities.isDefault, true),
                eq(aiPersonalities.isActive, true)
              )
            )
            .limit(1);

          personality = defaultPersonality || null;
        }

        return {
          widget: {
            id: widget.id,
            name: widget.name,
            domainWhitelist: widget.domainWhitelist,
            settings: widget.settings,
            aiPersonalityId: widget.aiPersonalityId,
            isActive: widget.isActive,
            createdAt: widget.createdAt,
            updatedAt: widget.updatedAt,
          },
          personality: personality
            ? {
                id: personality.id,
                name: personality.name,
                description: personality.description,
                systemPrompt: personality.systemPrompt,
                temperature: Number(personality.temperature),
                maxTokens: personality.maxTokens,
                topP: personality.topP ? Number(personality.topP) : undefined,
                frequencyPenalty: personality.frequencyPenalty
                  ? Number(personality.frequencyPenalty)
                  : undefined,
                presencePenalty: personality.presencePenalty
                  ? Number(personality.presencePenalty)
                  : undefined,
                preferredModel: personality.preferredModel,
                isDefault: personality.isDefault,
              }
            : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw internalError({
          message: 'Failed to retrieve widget with personality',
          cause: error as Error,
          logLevel: 'error',
        });
      }
    }),

  /**
   * Set widget's AI personality (admin/owner only)
   *
   * Associates an AI personality with a widget.
   * Pass null to use tenant's default personality.
   */
  setPersonality: adminProcedure
    .input(setPersonalitySchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify widget exists and belongs to tenant (RLS)
        const [existing] = await ctx.db
          .select({ id: widgets.id })
          .from(widgets)
          .where(eq(widgets.id, input.widgetId))
          .limit(1);

        if (!existing) {
          throw notFound({
            message: 'Widget not found or access denied',
          });
        }

        // If personalityId provided, verify it exists and belongs to tenant
        if (input.personalityId) {
          const [personality] = await ctx.db
            .select({ id: aiPersonalities.id })
            .from(aiPersonalities)
            .where(
              and(
                eq(aiPersonalities.id, input.personalityId),
                eq(aiPersonalities.tenantId, ctx.tenantId)
              )
            )
            .limit(1);

          if (!personality) {
            throw notFound({
              message: 'AI personality not found or access denied',
            });
          }
        }

        // Update widget's personality
        const [updated] = await ctx.db
          .update(widgets)
          .set({
            aiPersonalityId: input.personalityId,
            updatedAt: new Date(),
          })
          .where(eq(widgets.id, input.widgetId))
          .returning({
            id: widgets.id,
            aiPersonalityId: widgets.aiPersonalityId,
            updatedAt: widgets.updatedAt,
          });

        if (!updated) {
          throw internalError({
            message: 'Failed to update widget personality',
          });
        }

        return {
          id: updated.id,
          aiPersonalityId: updated.aiPersonalityId,
          updatedAt: updated.updatedAt,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        throw internalError({
          message: 'Failed to set widget personality',
          cause: error as Error,
          logLevel: 'error',
        });
      }
    }),
});
