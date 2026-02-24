/**
 * Asset Classes Router
 *
 * Read-only reference data for asset types.
 * Public procedure — no auth required (catalog data).
 */

import { publicProcedure, router } from '../trpc';
import { assetClasses } from '@platform/db';

export const assetClassesRouter = router({
	/**
	 * List all asset classes (reference data)
	 */
	list: publicProcedure.query(async ({ ctx }) => {
		return ctx.db.query.assetClasses.findMany({
			orderBy: (classes, { asc }) => [asc(classes.classNumber)],
		});
	}),
});
