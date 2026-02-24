/**
 * tRPC Client Configuration for IFinallyWill
 * Type-safe API client with React Query integration
 */

import type { AppRouter } from '@platform/api-contract';
import { createTRPCReact } from '@trpc/react-query';

export const trpc = createTRPCReact<AppRouter>();
