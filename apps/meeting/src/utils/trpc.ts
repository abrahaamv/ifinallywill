/**
 * tRPC Client Configuration for Meeting App
 * Type-safe API client with React Query integration
 */

import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@platform/api-contract';

/**
 * tRPC React hooks
 * Auto-generated types from backend AppRouter
 */
export const trpc = createTRPCReact<AppRouter>();
