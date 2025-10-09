/**
 * Skeleton Component
 * Loading placeholder for content
 * Used to indicate loading state before content appears
 */

import type * as React from 'react';

import { cn } from '../lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
