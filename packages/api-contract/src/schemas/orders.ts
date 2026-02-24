/**
 * IFinallyWill: Orders & Payments Zod Schemas
 */

import { z } from 'zod';

export const createOrderSchema = z.object({
	estateDocIds: z.array(z.string().uuid()).min(1, 'At least one document required'),
});

export const applyCodeSchema = z.object({
	orderId: z.string().uuid(),
	code: z.string().min(1, 'Discount code is required'),
});

export const orderStatusSchema = z.enum(['pending', 'paid', 'generated', 'downloaded', 'expired']);
