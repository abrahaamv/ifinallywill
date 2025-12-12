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

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/dialog';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './components/dropdown-menu';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './components/select';

export { Checkbox } from './components/checkbox';

export { RadioGroup, RadioGroupItem } from './components/radio-group';

export { Alert, AlertTitle, AlertDescription } from './components/alert';

export { Toast, ToastViewport, toastVariants } from './components/toast';
export type { ToastProps } from './components/toast';

export { Progress } from './components/progress';
export type { ProgressProps } from './components/progress';

export { Skeleton } from './components/skeleton';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/table';

export { Textarea } from './components/textarea';
export type { TextareaProps } from './components/textarea';

export { Switch } from './components/switch';

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './components/accordion';

// Layout Components
export { AppShell, AppHeader, Sidebar } from './components/layout';
export type { SidebarItem, SidebarSection } from './components/layout';
