# Design System Documentation

**Enterprise AI Assistant Platform** - Production-ready design system with Tailwind CSS v4

**Last Updated**: 2025-01-10
**Version**: 1.0.0
**Status**: Production Ready

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Token Systems](#token-systems)
3. [Color Palette](#color-palette)
4. [Dark Mode](#dark-mode)
5. [Typography](#typography)
6. [Spacing & Layout](#spacing--layout)
7. [Component Library](#component-library)
8. [Usage Guidelines](#usage-guidelines)
9. [Accessibility](#accessibility)
10. [Multi-Tenant Theming](#multi-tenant-theming)

---

## Overview

This platform uses **two complementary design token systems** to provide flexibility while maintaining consistency:

### **System 1: Enterprise Tokens** (`packages/ui/src/styles/tokens.css`)
- **Purpose**: Custom UI components, marketing pages, enterprise features
- **Color Format**: HEX values (#3b82f6)
- **Usage**: Tailwind utilities like `bg-primary-500`, `text-gray-700`
- **Advantages**: Fine-grained control with full color scales (50-950)

### **System 2: shadcn/ui Tokens** (`packages/ui/src/styles/globals.css`)
- **Purpose**: shadcn/ui component library (buttons, modals, forms, etc.)
- **Color Format**: HSL values (hsl(221.2 83.2% 53.3%))
- **Usage**: Semantic utilities like `bg-primary`, `text-muted-foreground`
- **Advantages**: Automatic theme-awareness, component integration

---

## Token Systems

### When to Use Each System

**Use Enterprise Tokens** when:
- Building custom UI components from scratch
- Creating landing pages or marketing content
- Need precise color control (specific shade like primary-600)
- Building data visualizations or charts
- Customizing beyond shadcn/ui components

**Use shadcn/ui Tokens** when:
- Using shadcn/ui components (Button, Card, Dialog, etc.)
- Building forms and inputs
- Need semantic color names (muted, accent, destructive)
- Want automatic dark mode support
- Rapid prototyping with consistent styling

### Example Usage

```tsx
// ✅ Enterprise Tokens - Custom component
<div className="bg-primary-50 border border-primary-200">
  <h2 className="text-primary-900 font-semibold">Dashboard</h2>
  <p className="text-gray-700">Welcome back!</p>
</div>

// ✅ shadcn/ui Tokens - shadcn component
<Card className="bg-card border-border">
  <CardHeader>
    <CardTitle className="text-foreground">Settings</CardTitle>
  </CardHeader>
  <CardContent className="text-muted-foreground">
    Configure your preferences
  </CardContent>
</Card>

// ✅ Mixed - Custom layout with shadcn components
<div className="bg-gray-50 p-6">
  <Button variant="default" className="bg-primary-600 hover:bg-primary-700">
    Get Started
  </Button>
</div>
```

---

## Color Palette

### Enterprise Blue Palette (Primary Brand)

Full scale from light to dark:

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `primary-50` | #eff6ff | #172554 | Lightest backgrounds |
| `primary-100` | #dbeafe | #1e3a8a | Subtle backgrounds |
| `primary-200` | #bfdbfe | #1e40af | Borders, dividers |
| `primary-300` | #93bbfd | #1d4ed8 | Hover states |
| `primary-400` | #609afc | #2563eb | Active backgrounds |
| **primary-500** | **#3b82f6** | **#3b82f6** | **Brand primary** |
| `primary-600` | #2563eb | #60a5fa | Links, CTAs |
| `primary-700` | #1d4ed8 | #93bbfd | Active text |
| `primary-800` | #1e40af | #bfdbfe | Text on dark |
| `primary-900` | #1e3a8a | #dbeafe | Headers, emphasis |
| `primary-950` | #172554 | #eff6ff | Darkest text |

### Gray Neutral Palette

Carefully balanced for readability in both light and dark modes:

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `gray-50` | #f9fafb | #1f2937 | Page backgrounds |
| `gray-100` | #f3f4f6 | #374151 | Subtle backgrounds |
| `gray-200` | #e5e7eb | #4b5563 | Borders, dividers |
| `gray-300` | #d1d5db | #6b7280 | Disabled text |
| `gray-400` | #9ca3af | #9ca3af | Placeholder text |
| `gray-500` | #6b7280 | #d1d5db | Secondary text |
| `gray-600` | #4b5563 | #e5e7eb | Body text |
| `gray-700` | #374151 | #f3f4f6 | Primary text |
| `gray-800` | #1f2937 | #f9fafb | Headers |
| `gray-900` | #111827 | #ffffff | Darkest text |

### Semantic Colors

Consistent semantic meaning across light and dark modes:

**Success (Green)**:
```css
--color-success-500: #22c55e;  /* Light mode */
--color-success-600: #4ade80;  /* Dark mode (lighter for visibility) */
```

**Warning (Yellow)**:
```css
--color-warning-500: #eab308;  /* Light mode */
--color-warning-600: #facc15;  /* Dark mode */
```

**Error (Red)**:
```css
--color-error-500: #ef4444;    /* Light mode */
--color-error-600: #f87171;    /* Dark mode */
```

**Info (Blue)**:
```css
--color-info-500: #0ea5e9;     /* Light mode */
--color-info-600: #38bdf8;     /* Dark mode */
```

---

## Dark Mode

### Implementation

All apps use **class-based dark mode** for consistency:

```css
/* All main.css files use this approach */
@custom-variant dark (&:is(.dark *));
```

### Activation

Add `.dark` class to `<html>` or `<body>`:

```tsx
// Example: Theme toggle component
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <button onClick={() => setIsDark(!isDark)}>
      {isDark ? '☀️ Light' : '🌙 Dark'}
    </button>
  );
}
```

### Dark Mode Token Strategy

**Enterprise Tokens** - Manually inverted:
- Light colors become dark (`gray-50` → `#1f2937`)
- Dark colors become light (`gray-900` → `#ffffff`)
- Primary adjusted for better contrast (`primary-600` lighter in dark mode)

**shadcn/ui Tokens** - Automatic inversion:
- Uses HSL for smooth transitions
- Automatically adjusts via `.dark` class
- Maintains semantic relationships

### Dark Mode Best Practices

1. **Test in Both Modes**: Always verify UI in light and dark mode
2. **Contrast Ratios**: Ensure WCAG AA compliance (4.5:1 for text)
3. **Brand Consistency**: Primary blue (#3b82f6) stays consistent
4. **Semantic Colors**: Use semantic tokens (success, warning, error) that auto-adjust

---

## Typography

### Font Families

```css
--font-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'Fira Code', 'Courier New', monospace;
```

### Font Sizes

Tailwind v4 scale with design tokens:

| Class | Size | Usage |
|-------|------|-------|
| `text-xs` | 0.75rem (12px) | Small labels, badges |
| `text-sm` | 0.875rem (14px) | Body text, captions |
| `text-base` | 1rem (16px) | Default body text |
| `text-lg` | 1.125rem (18px) | Subheadings |
| `text-xl` | 1.25rem (20px) | Page titles |
| `text-2xl` | 1.5rem (24px) | Section headers |
| `text-3xl` | 1.875rem (30px) | Hero headings |
| `text-4xl` | 2.25rem (36px) | Marketing headers |

### Font Weights

```css
--font-thin: 100;
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Line Heights

```css
--line-height-tight: 1.25;     /* Headers */
--line-height-normal: 1.5;     /* Body text */
--line-height-relaxed: 1.75;   /* Reading content */
```

---

## Spacing & Layout

### Spacing Scale

Consistent spacing using Tailwind's spacing scale:

| Token | Value | Usage |
|-------|-------|-------|
| `0` | 0 | Reset spacing |
| `1` | 0.25rem (4px) | Tight spacing |
| `2` | 0.5rem (8px) | Small gaps |
| `3` | 0.75rem (12px) | Component padding |
| `4` | 1rem (16px) | Default spacing |
| `6` | 1.5rem (24px) | Section spacing |
| `8` | 2rem (32px) | Large spacing |
| `12` | 3rem (48px) | Extra large |
| `16` | 4rem (64px) | Hero spacing |
| `24` | 6rem (96px) | Page sections |

### Layout Tokens

```css
--sidebar-width: 240px;              /* Desktop sidebar */
--sidebar-collapsed-width: 64px;     /* Collapsed sidebar */
--header-height: 64px;                /* App header */
--content-max-width: 1400px;         /* Max content width */
```

### Border Radius

```css
--radius-sm: 0.25rem (4px);   /* Subtle rounding */
--radius-md: 0.375rem (6px);  /* Default buttons */
--radius-lg: 0.5rem (8px);    /* Cards, modals */
--radius-xl: 0.75rem (12px);  /* Large containers */
--radius-2xl: 1rem (16px);    /* Hero sections */
--radius-full: 9999px;        /* Circular badges */
```

---

## Component Library

### Layout Components

**AppShell** - Main application container:
```tsx
<AppShell
  sidebar={<Sidebar sections={navSections} />}
  header={<AppHeader user={currentUser} />}
>
  {children}
</AppShell>
```

**Sidebar** - Collapsible navigation with mobile support:
```tsx
<Sidebar
  logo={<Logo />}
  sections={[
    {
      title: 'Main',
      items: [
        { id: 'home', label: 'Home', icon: Home, href: '/dashboard', active: true },
        { id: 'conversations', label: 'Conversations', icon: MessageSquare, badge: 12 },
      ],
    },
  ]}
  footer={<UserProfile />}
  onNavigate={(href) => router.push(href)}
/>
```

**AppHeader** - Application header with search and user menu:
```tsx
<AppHeader
  title="Dashboard"
  user={{ name: 'John Doe', email: 'john@example.com' }}
  notifications={3}
  onSearch={(query) => handleSearch(query)}
  onNotificationClick={() => openNotifications()}
  onUserMenuClick={(action) => handleUserAction(action)}
/>
```

### shadcn/ui Components

**Available Components** (17 total):
- Avatar, AvatarFallback, AvatarImage
- Badge
- Button
- Card, CardContent, CardHeader, CardTitle
- Dialog, DialogContent, DialogHeader, DialogTitle
- DropdownMenu (full suite)
- Input
- Label
- Separator
- Textarea

**Usage Example**:
```tsx
import { Button } from '@platform/ui';

<Button variant="default" size="lg">
  Get Started
</Button>
```

---

## Usage Guidelines

### 1. Component Selection

**Start with shadcn/ui**:
- Faster development
- Consistent styling
- Automatic theming
- Battle-tested components

**Build custom when**:
- Unique design requirements
- Complex interactions not covered by shadcn
- Brand-specific styling needed

### 2. Color Usage

**Do's** ✅:
- Use semantic colors for feedback (success, warning, error)
- Maintain brand consistency with primary blue
- Test contrast ratios for accessibility
- Use gray scale for text hierarchy

**Don'ts** ❌:
- Mix HEX and HSL in same component (choose one system)
- Hardcode color values (`#ff0000` instead of `text-error-500`)
- Use primary colors for destructive actions (use `destructive` instead)
- Ignore dark mode color adjustments

### 3. Responsive Design

Mobile-first approach:
```tsx
// ✅ Good - Mobile first
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-xl md:text-2xl lg:text-3xl">Title</h1>
</div>

// ❌ Bad - Desktop first (not recommended)
<div className="p-8 md:p-6 sm:p-4">
```

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast**:
- Normal text: ≥ 4.5:1 contrast ratio
- Large text (18pt+): ≥ 3:1 contrast ratio
- UI components: ≥ 3:1 contrast ratio

**Tested Combinations**:
- ✅ `text-gray-900` on `bg-white` (15.3:1)
- ✅ `text-primary-700` on `bg-primary-50` (7.8:1)
- ✅ `text-white` on `bg-primary-600` (4.9:1)

### Keyboard Navigation

**All interactive elements**:
- Tab-navigable (`tabindex="0"` or native focus)
- Visible focus indicators (`:focus-visible` ring)
- Logical tab order (DOM order matches visual)

**Sidebar**:
- Arrow keys for navigation (↑↓)
- Home/End keys for first/last item
- Enter/Space to activate

### Screen Reader Support

**Required ARIA attributes**:
- `role="navigation"` on `<nav>`
- `aria-label` on landmarks and controls
- `aria-current="page"` for active links
- `aria-expanded` for collapsible elements
- `aria-hidden="true"` for decorative icons

**Example**:
```tsx
<nav role="navigation" aria-label="Main navigation">
  <button
    aria-current="page"
    aria-label="Navigate to Dashboard. Currently active"
  >
    Dashboard
  </button>
</nav>
```

---

## Multi-Tenant Theming

### Dynamic Color Overrides

Tenants can customize brand colors via `data-theme` attribute:

```tsx
// Apply tenant theme
<div data-theme="tenant-123">
  <YourComponent />
</div>
```

### CSS Override Pattern

```css
/* Define tenant overrides in runtime CSS */
[data-theme="tenant-123"] {
  --color-primary-500: #8b5cf6;  /* Purple instead of blue */
  --color-primary-600: #7c3aed;
  /* ... other primary scale overrides */
}
```

### Best Practices

1. **Limit Customization**: Only allow primary color override (not entire palette)
2. **Validate Contrast**: Ensure tenant colors meet WCAG AA standards
3. **Fallback**: Always provide default blue palette as fallback
4. **Preview**: Show theme preview before saving tenant settings

---

## Migration Guide

### From Old System to New Design System

**Before** (Duplicated tokens in each app):
```css
/* apps/dashboard/src/main.css (164 lines) */
@theme {
  --color-primary-50: #eff6ff;
  /* ... 150+ lines of duplicated tokens */
}
```

**After** (Import shared tokens):
```css
/* apps/dashboard/src/main.css (48 lines) */
@import "tailwindcss";
@import "@platform/ui/styles/tokens";

/* Only app-specific overrides */
```

**Benefits**:
- 71% reduction in CSS file size
- Single source of truth for design tokens
- Easier to maintain and update
- Consistent styling across all apps

---

## Support and Resources

**Documentation**:
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

**Internal Files**:
- `packages/ui/src/styles/tokens.css` - Enterprise design tokens
- `packages/ui/src/styles/globals.css` - shadcn/ui tokens
- `packages/ui/src/components/` - Shared component library

**Questions?**
- Design System Issues: File issue in GitHub repo
- Component Requests: Create feature request
- Accessibility Concerns: Tag with `a11y` label

---

**Version History**:
- **1.0.0** (2025-01-10) - Initial production release
  - Centralized design tokens
  - Unified dark mode implementation
  - Full accessibility support
  - Mobile-responsive layout components
