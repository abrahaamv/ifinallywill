/**
 * @platform/ui - Shared UI Component Library
 * Based on shadcn/ui with Tailwind CSS v4
 * Used across landing, dashboard, meeting, and widget-sdk apps
 */

// Core utilities
export {
  cn,
  formatBytes,
  debounce,
  throttle,
  generateId,
  sleep,
  safeJSONParse,
  isBrowser,
  isDevelopment,
  isProduction,
} from './lib/utils';

// Components
export { Button, buttonVariants } from './components/button';
export type { ButtonProps } from './components/button';

export { Input } from './components/input';
export type { InputProps } from './components/input';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/card';

export { Label } from './components/label';

export { Badge, badgeVariants } from './components/badge';
export type { BadgeProps } from './components/badge';

export { Avatar, AvatarImage, AvatarFallback } from './components/avatar';
