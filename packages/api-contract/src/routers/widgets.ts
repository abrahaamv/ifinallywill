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

import { widgets } from '@platform/db';
import { internalError, notFound } from '@platform/shared';
import { TRPCError } from '@trpc/server';
import { count, eq } from 'drizzle-orm';
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
      let query = ctx.db.select({
        id: widgets.id,
        tenantId: widgets.tenantId,
        name: widgets.name,
        domainWhitelist: widgets.domainWhitelist,
        settings: widgets.settings,
        isActive: widgets.isActive,
        createdAt: widgets.createdAt,
        updatedAt: widgets.updatedAt
      }).from(widgets).$dynamic();

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
      const [widget] = await ctx.db.select({
        id: widgets.id,
        tenantId: widgets.tenantId,
        name: widgets.name,
        domainWhitelist: widgets.domainWhitelist,
        settings: widgets.settings,
        isActive: widgets.isActive,
        createdAt: widgets.createdAt,
        updatedAt: widgets.updatedAt
      }).from(widgets).where(eq(widgets.id, input.id)).limit(1);

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
      // Create widget - tenantId automatically set via RLS
      const [newWidget] = await ctx.db
        .insert(widgets)
        .values({
          tenantId: ctx.tenantId, // Explicit for clarity, but RLS enforces match
          name: input.name,
          domainWhitelist: input.domainWhitelist,
          settings: input.settings,
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

      // Update widget - RLS ensures we can only update within our tenant
      const [updated] = await ctx.db
        .update(widgets)
        .set({
          name: input.name,
          domainWhitelist: input.domainWhitelist,
          settings: input.settings,
          isActive: input.isActive,
          updatedAt: new Date(),
        })
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
});
