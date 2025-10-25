# Design System Quick Start Guide

**Get started with the Enterprise AI Platform design system in 5 minutes**

---

## 🎨 Two Token Systems = Maximum Flexibility

### **Enterprise Tokens** (packages/ui/src/styles/tokens.css)
Use for custom UI and brand-specific designs.

```tsx
// Blue enterprise palette (50-950)
<div className="bg-primary-600 text-white p-6 rounded-lg">
  <h1 className="text-2xl font-bold">Welcome</h1>
</div>

// Gray neutral scale
<p className="text-gray-700">Body text</p>
<p className="text-gray-500">Secondary text</p>
```

### **shadcn/ui Tokens** (packages/ui/src/styles/globals.css)
Use with shadcn components for automatic theming.

```tsx
import { Button, Card } from '@platform/ui';

<Card className="bg-card text-card-foreground">
  <Button className="bg-primary text-primary-foreground">
    Click Me
  </Button>
</Card>
```

---

## 🌓 Dark Mode (3 Steps)

### 1. Import tokens in your app
```css
/* apps/your-app/src/main.css */
@import "tailwindcss";
@import "@platform/ui/styles/tokens";

@custom-variant dark (&:is(.dark *));
```

### 2. Add dark mode toggle
```tsx
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

### 3. Use theme-aware colors
```tsx
// These automatically adjust in dark mode
<div className="bg-gray-50 text-gray-900"> {/* Light: #f9fafb / Dark: #1f2937 */}
  <h1 className="text-primary-600">Title</h1> {/* Light: #2563eb / Dark: #60a5fa */}
</div>
```

---

## 📱 Layout Components

### AppShell - Main container
```tsx
import { AppShell, AppHeader, Sidebar } from '@platform/ui';

<AppShell
  sidebar={<Sidebar sections={navSections} />}
  header={<AppHeader user={currentUser} />}
>
  {children}
</AppShell>
```

### Sidebar - Navigation with mobile support
```tsx
const navSections = [
  {
    title: 'Main',
    items: [
      {
        id: 'home',
        label: 'Home',
        icon: Home,
        href: '/dashboard',
        active: true
      },
      {
        id: 'conversations',
        label: 'Conversations',
        icon: MessageSquare,
        badge: 12
      },
    ],
  },
];

<Sidebar
  logo={<Logo />}
  sections={navSections}
  footer={<UserProfile />}
  onNavigate={(href) => router.push(href)}
/>
```

**Features**:
- ✅ Mobile responsive (drawer overlay)
- ✅ Keyboard navigation (arrow keys, Home, End)
- ✅ Collapsible
- ✅ WCAG 2.1 AA compliant

### AppHeader - Search, notifications, user menu
```tsx
<AppHeader
  title="Dashboard"
  user={{
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatar.jpg'
  }}
  notifications={3}
  onSearch={(query) => handleSearch(query)}
  onNotificationClick={() => openNotifications()}
  onUserMenuClick={(action) => {
    if (action === 'logout') logout();
  }}
/>
```

---

## 🎯 Common Patterns

### Cards with hover effects
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-card hover:shadow-lg transition-shadow p-6">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
    Card Title
  </h3>
  <p className="text-gray-600 dark:text-gray-400">
    Card description text
  </p>
</div>
```

### Buttons
```tsx
// Primary button
<button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md">
  Primary Action
</button>

// Secondary button
<button className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-md">
  Secondary Action
</button>

// Using shadcn/ui
import { Button } from '@platform/ui';
<Button variant="default">Click Me</Button>
```

### Status badges
```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
  Active
</span>

<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
  Error
</span>
```

### Responsive grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

---

## 🧑‍💻 Development Tips

### Use semantic colors
```tsx
✅ Good:
<div className="text-success-600">Success message</div>
<div className="text-error-600">Error message</div>

❌ Bad:
<div className="text-green-600">Success message</div>
<div className="text-red-600">Error message</div>
```

### Test dark mode
```tsx
// Always test components in both modes
document.documentElement.classList.add('dark');    // Test dark mode
document.documentElement.classList.remove('dark'); // Test light mode
```

### Check contrast
Use browser DevTools to verify WCAG AA compliance (4.5:1 for text).

---

## 📚 Full Documentation

- **Complete Guide**: `docs/design/DESIGN_SYSTEM.md` (570 lines)
- **Implementation Summary**: `docs/design/DESIGN_SYSTEM_IMPLEMENTATION_SUMMARY.md`
- **Token Reference**: `packages/ui/src/styles/tokens.css` (360 lines)

---

## 🎉 That's it!

You're ready to build with the design system. For detailed documentation, see:
- `docs/design/DESIGN_SYSTEM.md` - Complete reference
- `packages/ui/src/components/` - Component examples
- Tailwind CSS v4 docs: https://tailwindcss.com/docs

Happy building! 🚀
