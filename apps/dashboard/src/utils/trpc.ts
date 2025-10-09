/**
 * tRPC Client Configuration for Dashboard App
 * Type-safe API client with React Query integration
 */

import type { AppRouter } from '@platform/api-contract';
import { createTRPCReact } from '@trpc/react-query';

/**
 * tRPC React hooks
 * Auto-generated types from backend AppRouter
 */
export const trpc = createTRPCReact<AppRouter>();
