# IFinallyWill: Quick Start Implementation Plan

> **Focus**: Get registration flow and Personal.jsx working flawlessly ASAP
> **Timeline**: 9-14 days to functional demo
> **Date**: 2026-02-25

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 0: Foundation Setup](#phase-0-foundation-setup)
3. [Phase 1: Registration Flow](#phase-1-registration-flow)
4. [Phase 2: Personal.jsx Decomposition](#phase-2-personaljsx-decomposition)
5. [Phase 3: Backend Integration](#phase-3-backend-integration)
6. [Phase 4: Testing & Polish](#phase-4-testing--polish)
7. [What We're NOT Doing Yet](#what-were-not-doing-yet)
8. [Success Criteria](#success-criteria)

---

## Executive Summary

### The Challenge

**From IFINALLYILL_PREPLAN_ANALYSIS.md findings**:
- Willsystem-v6's `Personal.jsx` is **8,601 lines** of unmaintainable code
- Built with junior patterns: DOM reads, module globals, no TypeScript
- Registration flow mixes Inertia.js + Laravel + localStorage
- Critical but messy — needs complete rebuild, not refactor

### The Solution

**Two parallel tracks**:
1. **Registration Flow** → Clean React + tRPC + Auth.js
2. **Personal.jsx Decomposition** → 20 focused TypeScript components

### Timeline

```
Phase 0: Foundation     (Days 1-2)    → Clean app structure + shadcn/ui
Phase 1: Registration   (Days 3-5)    → Working auth + account creation
Phase 2: Personal.jsx   (Days 6-9)    → Decomposed wizard steps
Phase 3: Backend        (Days 10-12)  → tRPC integration + data persistence
Phase 4: Polish         (Days 13-14)  → Testing + UX refinement
```

**Total**: 9-14 days to functional demo with auth + first wizard flow

---

## Phase 0: Foundation Setup

**Duration**: 1-2 days  
**Goal**: Clean app structure with proper tooling

### Tasks

#### 0.1: Create Clean App Structure

```bash
# Create new app in monorepo
cd apps
mkdir ifinallyWill
cd ifinallyWill

# Initialize with Vite + React + TypeScript
pnpm create vite . --template react-ts

# Install dependencies
pnpm add react-router-dom@6 @tanstack/react-query@5
pnpm add @trpc/client@11 @trpc/react-query@11
pnpm add react-hook-form@7 @hookform/resolvers@3
pnpm add zod@3 tailwindcss@4 framer-motion@12
pnpm add @stripe/stripe-js@5 @stripe/react-stripe-js@3

# Install shadcn/ui (copy from existing Platform app)
cp -r ../landing/src/components/ui ./src/components/ui
```

#### 0.2: Setup Tailwind v4

```css
/* src/styles/globals.css */
@import "tailwindcss";

@theme {
  /* Landing theme (navy/gold) - for marketing pages */
  --color-tenant-primary: #0A1E86;
  --color-tenant-secondary: #FFBF00;
  --color-tenant-primary-dark: #0C1F3C;
  
  /* Internal app theme (OKLCH) - for wizard/dashboard */
  --color-primary: oklch(0.76 0.1 98);
  --color-secondary: oklch(0.76 0.1 278);
  --color-accent: oklch(0.7 0.15 160);
  --color-success: oklch(0.7 0.15 145);
  --color-warning: oklch(0.8 0.12 85);
  --color-error: oklch(0.65 0.2 25);
  
  --color-bg-dark: oklch(0.95 0 98);
  --color-bg: oklch(0.97 0 98);
  --color-bg-light: oklch(0.99 0 98);
  
  --color-text: oklch(0.15 0 98);
  --color-text-muted: oklch(0.4 0 98);
}

/* Dark theme toggle */
[data-theme="dark"] {
  --color-bg-dark: oklch(0.1 0 98);
  --color-bg: oklch(0.15 0 98);
  --color-bg-light: oklch(0.2 0 98);
  --color-text: oklch(0.96 0 98);
  --color-text-muted: oklch(0.76 0 98);
}
```

#### 0.3: Setup tRPC Client

```typescript
// src/lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@ifinallyWill/api-contract';

export const trpc = createTRPCReact<AppRouter>();

// src/lib/trpc-client.ts
import { httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import { trpc } from './trpc';

export const queryClient = new QueryClient();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || 'http://localhost:3000/trpc',
      credentials: 'include',
    }),
  ],
});
```

#### 0.4: Setup React Router v6

```typescript
// src/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import { LandingLayout } from './layouts/LandingLayout';
import { WizardLayout } from './layouts/WizardLayout';
import { AuthLayout } from './layouts/AuthLayout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingLayout />,
    children: [
      { index: true, element: <WelcomePage /> },
      { path: 'how-it-works', element: <HowItWorksPage /> },
      { path: 'pricing', element: <PricingPage /> },
    ],
  },
  {
    path: '/auth',
    element: <AuthLayout />,
    children: [
      { path: 'register', element: <RegisterPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: '/wizard',
    element: <WizardLayout />,
    children: [
      { path: 'welcome', element: <WizardWelcomeStep /> },
      { path: 'personal', element: <PersonalInfoStep /> },
      { path: 'family', element: <FamilyStep /> },
      // ... more steps
    ],
  },
]);
```

#### 0.5: Copy Landing Page Assets

```bash
# Copy from IfinallyWIll_frontend to maintain branding
cp -r IfinallyWIll_frontend/public/images ./public/images
cp -r IfinallyWIll_frontend/public/ai_videos ./public/ai_videos
```

### Deliverables

- ✅ Clean TypeScript app structure
- ✅ Tailwind v4 configured with dual themes
- ✅ shadcn/ui components available
- ✅ tRPC client configured
- ✅ React Router with layouts
- ✅ Branding assets in place

---

## Phase 1: Registration Flow

**Duration**: 2-3 days  
**Goal**: Working registration with email + Google OAuth

### What We're Porting

From `IfinallyWIll_frontend/src/components/Register.jsx` (the multi-step registration wizard):

```javascript
// v6 Registration Steps (localStorage-based)
1. Welcome → Province selection
2. Document Selection → Choose what to create (will, POA, bundle)
3. Couples Question → Solo vs joint
4. Account Creation → Email/password or Google OAuth
5. Payment → Stripe checkout (we'll defer this to Phase 3)
```

### Key Improvements Over v6

| Aspect | v6 (Old) | New (Platform) |
|--------|----------|----------------|
| State | localStorage + module globals | React Context + react-hook-form |
| Validation | Client-only, inconsistent | Zod schemas (client + server) |
| Auth | Laravel Sanctum | Auth.js (Google OAuth + email) |
| API | Axios POST to Laravel | tRPC mutation |
| Package model | Hardcoded packages | Document catalog (dynamic pricing) |

### Tasks

#### 1.1: Province Selection Step

```typescript
// src/pages/auth/register/ProvinceStep.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const provinceSchema = z.object({
  province: z.enum([
    'ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE',
  ]),
});

type ProvinceFormData = z.infer<typeof provinceSchema>;

export function ProvinceStep({ onNext }: { onNext: (data: ProvinceFormData) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProvinceFormData>({
    resolver: zodResolver(provinceSchema),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8">
        <h1 className="text-3xl font-bold mb-2">Let's get started</h1>
        <p className="text-muted-foreground mb-8">
          First, which province do you live in? This helps us show you the right documents.
        </p>
        
        <form onSubmit={handleSubmit(onNext)}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            {provinces.map(({ code, name }) => (
              <label key={code} className="relative">
                <input
                  type="radio"
                  value={code}
                  {...register('province')}
                  className="peer sr-only"
                />
                <div className="
                  cursor-pointer rounded-lg border-2 p-4 text-center
                  hover:border-primary transition-colors
                  peer-checked:border-primary peer-checked:bg-primary/5
                ">
                  <div className="font-medium">{code}</div>
                  <div className="text-xs text-muted-foreground mt-1">{name}</div>
                </div>
              </label>
            ))}
          </div>
          
          {errors.province && (
            <p className="text-error text-sm mb-4">{errors.province.message}</p>
          )}
          
          <Button type="submit" className="w-full" size="lg">
            Continue →
          </Button>
        </form>
      </Card>
    </div>
  );
}

const provinces = [
  { code: 'ON', name: 'Ontario' },
  { code: 'QC', name: 'Quebec' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'AB', name: 'Alberta' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland' },
  { code: 'PE', name: 'PEI' },
];
```

#### 1.2: Document Selection Step

```typescript
// src/pages/auth/register/DocumentSelectionStep.tsx
import { trpc } from '@/lib/trpc';

const documentSelectionSchema = z.object({
  selectedDocuments: z.array(z.enum(['primary_will', 'secondary_will', 'poa_property', 'poa_health'])).min(1),
});

type DocumentSelectionData = z.infer<typeof documentSelectionSchema>;

export function DocumentSelectionStep({
  province,
  onNext,
  onBack,
}: {
  province: string;
  onNext: (data: DocumentSelectionData) => void;
  onBack: () => void;
}) {
  // Query document types + pricing for this province
  const { data: documentTypes, isLoading } = trpc.documents.listTypes.useQuery({ province });
  
  const { register, handleSubmit, watch } = useForm<DocumentSelectionData>({
    resolver: zodResolver(documentSelectionSchema),
  });
  
  const selectedDocuments = watch('selectedDocuments', []);
  
  // Calculate bundle discount
  const subtotal = documentTypes?.filter(dt => selectedDocuments.includes(dt.name))
    .reduce((sum, dt) => sum + dt.basePrice, 0) || 0;
  
  const isBundle = selectedDocuments.length >= 4;
  const bundleDiscount = isBundle ? 4700 : 0; // $47 off
  const total = subtotal - bundleDiscount;

  return (
    <Card className="max-w-4xl w-full p-8">
      <h1 className="text-3xl font-bold mb-2">What would you like to create?</h1>
      <p className="text-muted-foreground mb-8">
        Select the documents you need. You can always add more later.
      </p>
      
      <form onSubmit={handleSubmit(onNext)}>
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {documentTypes?.map((docType) => (
            <label key={docType.name} className="relative">
              <input
                type="checkbox"
                value={docType.name}
                {...register('selectedDocuments')}
                className="peer sr-only"
              />
              <Card className="
                cursor-pointer p-6 border-2 transition-all
                hover:border-primary hover:shadow-md
                peer-checked:border-primary peer-checked:bg-primary/5
              ">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{getDocumentIcon(docType.name)}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{docType.displayName}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {docType.description}
                    </p>
                    <div className="font-medium text-primary">
                      ${(docType.basePrice / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="peer-checked:block hidden">
                    <svg className="w-6 h-6 text-primary" /* checkmark icon */ />
                  </div>
                </div>
              </Card>
            </label>
          ))}
        </div>
        
        {/* Pricing Summary */}
        <Card className="p-4 mb-6 bg-accent/10">
          <div className="flex justify-between items-center mb-2">
            <span>Subtotal</span>
            <span className="font-medium">${(subtotal / 100).toFixed(2)}</span>
          </div>
          {isBundle && (
            <div className="flex justify-between items-center mb-2 text-success">
              <span>Bundle Discount</span>
              <span className="font-medium">-${(bundleDiscount / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
            <span>Total</span>
            <span>${(total / 100).toFixed(2)}</span>
          </div>
        </Card>
        
        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button type="submit" className="flex-1" disabled={selectedDocuments.length === 0}>
            Continue →
          </Button>
        </div>
      </form>
    </Card>
  );
}

function getDocumentIcon(docType: string): string {
  const icons: Record<string, string> = {
    primary_will: '📄',
    secondary_will: '📋',
    poa_property: '🏦',
    poa_health: '🏥',
  };
  return icons[docType] || '📄';
}
```

#### 1.3: Couples Question Step

```typescript
// src/pages/auth/register/CouplesStep.tsx
const couplesSchema = z.object({
  planningTogether: z.enum(['solo', 'couples']),
});

export function CouplesStep({ onNext, onBack }: StepProps) {
  const { register, handleSubmit } = useForm<z.infer<typeof couplesSchema>>({
    resolver: zodResolver(couplesSchema),
  });

  return (
    <Card className="max-w-2xl w-full p-8">
      <h1 className="text-3xl font-bold mb-2">Just for you or you and your partner?</h1>
      <p className="text-muted-foreground mb-8">
        If you're creating documents together, we can help coordinate and save you time.
      </p>
      
      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <label className="block">
          <input
            type="radio"
            value="solo"
            {...register('planningTogether')}
            className="peer sr-only"
          />
          <Card className="
            cursor-pointer p-6 border-2 transition-all
            hover:border-primary
            peer-checked:border-primary peer-checked:bg-primary/5
          ">
            <h3 className="font-semibold text-lg mb-2">Just for me</h3>
            <p className="text-sm text-muted-foreground">
              I'm creating my own documents
            </p>
          </Card>
        </label>
        
        <label className="block">
          <input
            type="radio"
            value="couples"
            {...register('planningTogether')}
            className="peer sr-only"
          />
          <Card className="
            cursor-pointer p-6 border-2 transition-all
            hover:border-primary
            peer-checked:border-primary peer-checked:bg-primary/5
          ">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">Me and my partner</h3>
              <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full font-medium">
                SAVE $175
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              We're creating documents together (recommended for couples)
            </p>
          </Card>
        </label>
        
        <div className="flex gap-4 mt-8">
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button type="submit" className="flex-1">
            Continue →
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

#### 1.4: Account Creation Step

```typescript
// src/pages/auth/register/AccountCreationStep.tsx
import { signIn } from 'next-auth/react'; // or Auth.js equivalent
import { trpc } from '@/lib/trpc';

const accountSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
});

type AccountFormData = z.infer<typeof accountSchema>;

export function AccountCreationStep({
  registrationData,
  onComplete,
  onBack,
}: {
  registrationData: RegistrationData;
  onComplete: () => void;
  onBack: () => void;
}) {
  const createAccountMutation = trpc.auth.register.useMutation({
    onSuccess: async (data) => {
      // Sign in automatically after registration
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      onComplete();
    },
  });
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
  });
  
  const onSubmit = async (data: AccountFormData) => {
    await createAccountMutation.mutateAsync({
      ...data,
      province: registrationData.province,
      selectedDocuments: registrationData.selectedDocuments,
      planningTogether: registrationData.planningTogether === 'couples',
    });
  };
  
  const handleGoogleSignIn = async () => {
    await signIn('google', {
      callbackUrl: '/wizard/welcome',
    });
  };

  return (
    <Card className="max-w-md w-full p-8">
      <h1 className="text-3xl font-bold mb-2">Create your account</h1>
      <p className="text-muted-foreground mb-6">
        We'll save your progress so you can come back anytime.
      </p>
      
      {/* Google OAuth Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full mb-6"
        onClick={handleGoogleSignIn}
      >
        <svg className="w-5 h-5 mr-2" /* Google icon */ />
        Continue with Google
      </Button>
      
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">Or with email</span>
        </div>
      </div>
      
      {/* Email/Password Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">First Name</label>
            <input
              {...register('firstName')}
              className="w-full px-3 py-2 border rounded-md"
            />
            {errors.firstName && (
              <p className="text-error text-xs mt-1">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Last Name</label>
            <input
              {...register('lastName')}
              className="w-full px-3 py-2 border rounded-md"
            />
            {errors.lastName && (
              <p className="text-error text-xs mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full px-3 py-2 border rounded-md"
          />
          {errors.email && (
            <p className="text-error text-xs mt-1">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label className="text-sm font-medium mb-1.5 block">Password</label>
          <input
            type="password"
            {...register('password')}
            className="w-full px-3 py-2 border rounded-md"
          />
          {errors.password && (
            <p className="text-error text-xs mt-1">{errors.password.message}</p>
          )}
        </div>
        
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('acceptTerms')}
            className="mt-1"
          />
          <span className="text-sm text-muted-foreground">
            I agree to the{' '}
            <a href="/terms" className="text-primary underline">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-primary underline">Privacy Policy</a>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-error text-xs">{errors.acceptTerms.message}</p>
        )}
        
        <div className="flex gap-4 mt-6">
          <Button type="button" variant="outline" onClick={onBack}>
            ← Back
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create Account →'}
          </Button>
        </div>
      </form>
      
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <a href="/auth/login" className="text-primary font-medium">Sign in</a>
      </p>
    </Card>
  );
}
```

#### 1.5: Registration Flow Orchestrator

```typescript
// src/pages/auth/register/index.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProvinceStep } from './ProvinceStep';
import { DocumentSelectionStep } from './DocumentSelectionStep';
import { CouplesStep } from './CouplesStep';
import { AccountCreationStep } from './AccountCreationStep';

type RegistrationData = {
  province?: string;
  selectedDocuments?: string[];
  planningTogether?: 'solo' | 'couples';
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>({});
  
  const updateData = (newData: Partial<RegistrationData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };
  
  const handleComplete = () => {
    // Registration complete, redirect to wizard
    navigate('/wizard/welcome');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg to-bg-light flex items-center justify-center p-4">
      {/* Progress Indicator */}
      <div className="fixed top-4 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-2 bg-surface/80 backdrop-blur px-6 py-3 rounded-full shadow-lg">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i < step ? 'bg-success text-white' :
                i === step ? 'bg-primary text-white' :
                'bg-border text-muted-foreground'
              }`}
            >
              {i < step ? '✓' : i}
            </div>
          ))}
        </div>
      </div>
      
      {/* Step Content */}
      {step === 1 && (
        <ProvinceStep onNext={(provinceData) => {
          updateData(provinceData);
          setStep(2);
        }} />
      )}
      
      {step === 2 && data.province && (
        <DocumentSelectionStep
          province={data.province}
          onNext={(docData) => {
            updateData(docData);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}
      
      {step === 3 && (
        <CouplesStep
          onNext={(couplesData) => {
            updateData(couplesData);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}
      
      {step === 4 && (
        <AccountCreationStep
          registrationData={data as Required<RegistrationData>}
          onComplete={handleComplete}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
```

### Deliverables

- ✅ 4-step registration wizard
- ✅ Province selection with card UI
- ✅ Document catalog with dynamic pricing
- ✅ Bundle discount calculation
- ✅ Couples vs solo detection
- ✅ Email/password + Google OAuth
- ✅ tRPC integration for account creation
- ✅ Type-safe with Zod validation
- ✅ Responsive mobile-first design

---

## Phase 2: Personal.jsx Decomposition

**Duration**: 3-4 days  
**Goal**: Break 8,601-line monolith into 20 focused components

### The Problem: Personal.jsx Analysis

From `IfinallyWIll_frontend/src/components/Personal.jsx`:

```javascript
// 8,601 lines containing:
- All wizard steps (0-17) in one component
- DOM-based data extraction with document.getElementById()
- Module-level global variables (city, country, province, etc.)
- Mixed concerns: navigation, validation, data persistence, UI rendering
- Ref-based parent-child communication
- localStorage for critical state
```

### Decomposition Strategy

Break into **one component per wizard step**, following the objectStatus structure from PREPLAN:

```
objectStatus[profileIndex][stepIndex] = { stepData }

Steps to decompose:
  0: personal      → PersonalInfoStep.tsx
  1: marriedq      → MaritalStatusStep.tsx
  2: married       → SpouseInfoStep.tsx
  3: kidsq         → HasChildrenStep.tsx
  4: kids          → ChildrenStep.tsx
  5: executors     → ExecutorsStep.tsx
  6: relatives     → KeyPeopleStep.tsx
  7: bequests      → BequestsStep.tsx
  8: residue       → ResidueStep.tsx
  9: wipeout       → WipeoutStep.tsx
  10: trusting     → TrustingStep.tsx
  11: guardians    → GuardiansStep.tsx
  12: pets         → PetsStep.tsx
  13: additional   → AdditionalWishesStep.tsx
  14: poaProperty  → PoaPropertyStep.tsx
  15: poaHealth    → PoaHealthStep.tsx
  16: finalDetails → FinalDetailsStep.tsx
  17: review       → ReviewStep.tsx
```

### Tasks

#### 2.1: Create Wizard Infrastructure

```typescript
// src/lib/wizard-config.ts
export enum WizardStep {
  WELCOME = 'welcome',
  PERSONAL_INFO = 'personal',
  MARITAL_STATUS = 'marital-status',
  SPOUSE_INFO = 'spouse',
  HAS_CHILDREN = 'has-children',
  CHILDREN = 'children',
  KEY_PEOPLE = 'key-people',
  EXECUTORS = 'executors',
  GUARDIANS = 'guardians',
  PETS = 'pets',
  ASSETS = 'assets',
  BEQUESTS = 'bequests',
  RESIDUE = 'residue',
  WIPEOUT = 'wipeout',
  TRUSTING = 'trusting',
  ADDITIONAL = 'additional',
  POA_PROPERTY = 'poa-property',
  POA_HEALTH = 'poa-health',
  FINAL_DETAILS = 'final-details',
  REVIEW = 'review',
}

export const wizardSteps: WizardStep[] = [
  WizardStep.WELCOME,
  WizardStep.PERSONAL_INFO,
  WizardStep.MARITAL_STATUS,
  WizardStep.SPOUSE_INFO,
  WizardStep.HAS_CHILDREN,
  WizardStep.CHILDREN,
  WizardStep.KEY_PEOPLE,
  WizardStep.EXECUTORS,
  WizardStep.GUARDIANS,
  WizardStep.PETS,
  WizardStep.ASSETS,
  WizardStep.BEQUESTS,
  WizardStep.RESIDUE,
  WizardStep.WIPEOUT,
  WizardStep.TRUSTING,
  WizardStep.ADDITIONAL,
  WizardStep.POA_PROPERTY,
  WizardStep.POA_HEALTH,
  WizardStep.FINAL_DETAILS,
  WizardStep.REVIEW,
];

export const stepMetadata: Record<WizardStep, {
  title: string;
  description: string;
  category: 'about' | 'family' | 'estate' | 'arrangements' | 'poas' | 'review';
  estimatedMinutes: number;
}> = {
  [WizardStep.PERSONAL_INFO]: {
    title: 'Personal Information',
    description: 'Tell us about yourself',
    category: 'about',
    estimatedMinutes: 2,
  },
  // ... rest of steps
};
```

```typescript
// src/hooks/useWizardNavigation.ts
import { useNavigate, useLocation } from 'react-router-dom';
import { wizardSteps, WizardStep } from '@/lib/wizard-config';

export function useWizardNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const currentStep = location.pathname.split('/').pop() as WizardStep;
  const currentIndex = wizardSteps.indexOf(currentStep);
  
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < wizardSteps.length - 1;
  
  const goToNext = () => {
    if (canGoForward) {
      navigate(`/wizard/${wizardSteps[currentIndex + 1]}`);
    }
  };
  
  const goToPrevious = () => {
    if (canGoBack) {
      navigate(`/wizard/${wizardSteps[currentIndex - 1]}`);
    }
  };
  
  const goToStep = (step: WizardStep) => {
    navigate(`/wizard/${step}`);
  };
  
  return {
    currentStep,
    currentIndex,
    totalSteps: wizardSteps.length,
    canGoBack,
    canGoForward,
    goToNext,
    goToPrevious,
    goToStep,
  };
}
```

```typescript
// src/hooks/useWizardData.ts
import { trpc } from '@/lib/trpc';

/**
 * Hook to manage wizard data for current document
 * Replaces v6's objectStatus global state
 */
export function useWizardData(estateDocId: string) {
  // Get current will data
  const { data: willData, isLoading } = trpc.willData.get.useQuery({ estateDocId });
  
  // Update section mutation
  const updateSection = trpc.willData.updateSection.useMutation({
    onSuccess: () => {
      // Invalidate cache to refetch
      trpc.useUtils().willData.get.invalidate({ estateDocId });
    },
  });
  
  return {
    data: willData,
    isLoading,
    updateSection: updateSection.mutate,
    isUpdating: updateSection.isPending,
  };
}
```

#### 2.2: PersonalInfoStep (Highest Priority)

This is the MOST CRITICAL step to get right — it's the first wizard step after welcome.

```typescript
// src/pages/wizard/steps/PersonalInfoStep.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { trpc } from '@/lib/trpc';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Zod schema matching will_data.personalInfo from PREPLAN
const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(), // ISO date string
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  country: z.string().default('Canada'),
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

export function PersonalInfoStep({ estateDocId }: { estateDocId: string }) {
  const { goToNext, goToPrevious } = useWizardNavigation();
  
  // Load existing data
  const { data: willData } = trpc.willData.get.useQuery({ estateDocId });
  const existingPersonalInfo = willData?.personalInfo;
  
  // Update mutation
  const updatePersonalInfo = trpc.willData.updateSection.useMutation({
    onSuccess: () => {
      goToNext();
    },
  });
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: existingPersonalInfo || undefined,
  });
  
  const onSubmit = async (data: PersonalInfoFormData) => {
    await updatePersonalInfo.mutateAsync({
      estateDocId,
      section: 'personalInfo',
      data,
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Let's start with the basics</h1>
        <p className="text-muted-foreground">
          We need some information about you to create your will.
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name Fields */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-error text-sm mt-1">{errors.firstName.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              {...register('middleName')}
              placeholder="Michael"
            />
          </div>
          
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder="Smith"
            />
            {errors.lastName && (
              <p className="text-error text-sm mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        
        {/* Contact Fields */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john.smith@example.com"
            />
            {errors.email && (
              <p className="text-error text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="(416) 555-1234"
            />
          </div>
        </div>
        
        {/* Date of Birth */}
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            {...register('dateOfBirth')}
          />
        </div>
        
        {/* Location Fields */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="Toronto"
            />
            {errors.city && (
              <p className="text-error text-sm mt-1">{errors.city.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="province">Province *</Label>
            <select
              id="province"
              {...register('province')}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">Select...</option>
              <option value="ON">Ontario</option>
              <option value="QC">Quebec</option>
              <option value="BC">British Columbia</option>
              <option value="AB">Alberta</option>
              <option value="MB">Manitoba</option>
              <option value="SK">Saskatchewan</option>
              <option value="NS">Nova Scotia</option>
              <option value="NB">New Brunswick</option>
              <option value="NL">Newfoundland</option>
              <option value="PE">PEI</option>
            </select>
            {errors.province && (
              <p className="text-error text-sm mt-1">{errors.province.message}</p>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex gap-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={goToPrevious}
          >
            ← Back
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Continue →'}
          </Button>
        </div>
      </form>
    </div>
  );
}
```

#### 2.3: Repeat Pattern for All Steps

Each wizard step follows the same pattern:

1. **Define Zod schema** matching the database section
2. **Load existing data** with tRPC query
3. **Form with react-hook-form** + validation
4. **Update mutation** saves to database
5. **Navigation hooks** for back/forward
6. **Auto-save on blur** (optional, add debounce)

**Estimated effort per step**:
- Simple steps (yes/no questions): 1-2 hours
- Medium steps (forms with 5-10 fields): 2-4 hours
- Complex steps (arrays, nested data): 4-6 hours

**Parallelization**: Can have 2-3 developers work on different steps simultaneously since they're independent.

#### 2.4: Wizard Layout

```typescript
// src/layouts/WizardLayout.tsx
import { Outlet } from 'react-router-dom';
import { useWizardNavigation } from '@/hooks/useWizardNavigation';
import { stepMetadata } from '@/lib/wizard-config';
import { WilfredPanel } from '@/components/WilfredPanel';

export function WizardLayout() {
  const { currentStep, currentIndex, totalSteps } = useWizardNavigation();
  const metadata = stepMetadata[currentStep];
  const progressPercent = Math.round((currentIndex / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-bg">
      {/* Progress Bar */}
      <div className="sticky top-0 z-50 bg-surface border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">
              Step {currentIndex + 1} of {totalSteps}
            </div>
            <div className="text-sm text-muted-foreground">
              About {metadata.estimatedMinutes} min left
            </div>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* Wizard Step Content */}
          <div>
            <Outlet />
          </div>
          
          {/* Wilfred AI Panel (desktop) */}
          <div className="hidden lg:block">
            <WilfredPanel currentStep={currentStep} />
          </div>
        </div>
      </div>
      
      {/* Wilfred AI Bottom Sheet (mobile) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0">
        <WilfredBottomSheet currentStep={currentStep} />
      </div>
    </div>
  );
}
```

### Deliverables

- ✅ Wizard infrastructure (navigation, config, hooks)
- ✅ PersonalInfoStep (fully functional)
- ✅ 19 additional step components (decomposed from Personal.jsx)
- ✅ Wizard layout with progress tracking
- ✅ Type-safe with Zod schemas
- ✅ Auto-save on each step completion
- ✅ Responsive design

---

## Phase 3: Backend Integration

**Duration**: 2-3 days  
**Goal**: Connect wizard to PostgreSQL + tRPC

### Tasks

#### 3.1: Database Schema Migration

Implement the schema from IFINALLYILL_PREPLAN_ANALYSIS.md Section 6.

```bash
cd packages/db

# Create new schema file
touch src/schema/willsystem.ts
```

```typescript
// packages/db/src/schema/willsystem.ts
import { pgTable, uuid, varchar, jsonb, integer, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const documentTypeEnum = pgEnum('document_type', [
  'primary_will',
  'secondary_will',
  'poa_property',
  'poa_health',
]);

export const relationshipEnum = pgEnum('relationship', [
  'spouse',
  'child',
  'sibling',
  'parent',
  'grandparent',
  'nibling',
  'pibling',
  'cousin',
  'other',
]);

export const maritalStatusEnum = pgEnum('marital_status', [
  'married',
  'single',
  'common_law',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'draft',
  'in_progress',
  'complete',
  'expired',
]);

// Key Names (shared people pool)
export const keyNames = pgTable('key_names', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  firstName: varchar('first_name').notNull(),
  middleName: varchar('middle_name'),
  lastName: varchar('last_name').notNull(),
  relationship: relationshipEnum('relationship').notNull(),
  email: varchar('email'),
  phone: varchar('phone'),
  city: varchar('city'),
  province: varchar('province'),
  country: varchar('country').default('Canada'),
  gender: varchar('gender'),
  dateOfBirth: timestamp('date_of_birth'),
  isBlendedFamily: boolean('is_blended_family').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Estate Documents (top-level)
export const estateDocuments = pgTable('estate_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  coupleDocId: uuid('couple_doc_id').references(() => estateDocuments.id),
  documentType: documentTypeEnum('document_type').notNull(),
  province: varchar('province').notNull(),
  country: varchar('country').default('Canada').notNull(),
  status: documentStatusEnum('status').default('draft').notNull(),
  completionPct: integer('completion_pct').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Will Data (one per will document)
export const willData = pgTable('will_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  estateDocId: uuid('estate_doc_id').references(() => estateDocuments.id, { onDelete: 'cascade' }).unique().notNull(),
  personalInfo: jsonb('personal_info'), // { fullName, email, city, province, phone, dob }
  maritalStatus: maritalStatusEnum('marital_status'),
  spouseInfo: jsonb('spouse_info'), // { firstName, lastName, email, phone, city, province }
  executors: jsonb('executors'), // [{ keyNameId, position: 'primary'|'alternate'|'backup' }]
  residue: jsonb('residue'), // { type, distribution }
  wipeout: jsonb('wipeout'), // { entries }
  trusting: jsonb('trusting'), // [{ childKeyNameId, age, shares, trustees: [keyNameId] }]
  guardians: jsonb('guardians'), // [{ keyNameId, position, childKeyNameIds: [] }]
  pets: jsonb('pets'), // [{ name, type, breed, amount, guardianKeyNameId, backupKeyNameId }]
  additional: jsonb('additional'), // { organDonation, burial, specialWishes }
  finalDetails: jsonb('final_details'), // { witnessOne, witnessTwo, signingLocation, signingDate }
  completedSteps: varchar('completed_steps').array(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// POA Data (one per POA document)
export const poaData = pgTable('poa_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  estateDocId: uuid('estate_doc_id').references(() => estateDocuments.id, { onDelete: 'cascade' }).unique().notNull(),
  personalInfo: jsonb('personal_info'),
  primaryAgent: uuid('primary_agent').references(() => keyNames.id),
  jointAgent: uuid('joint_agent').references(() => keyNames.id),
  backupAgents: uuid('backup_agents').array(),
  restrictions: varchar('restrictions'),
  activationType: pgEnum('activation_type', ['immediate', 'incapacity'])('activation_type'),
  completedSteps: varchar('completed_steps').array(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// POA Health Details (extension)
export const poaHealthDetails = pgTable('poa_health_details', {
  id: uuid('id').primaryKey().defaultRandom(),
  poaDataId: uuid('poa_data_id').references(() => poaData.id, { onDelete: 'cascade' }).unique().notNull(),
  organDonation: boolean('organ_donation').default(false),
  dnr: boolean('dnr').default(false),
  statements: jsonb('statements'), // { terminalCondition, unconsciousCondition, mentalImpairment }
});

// ... (rest of schema from PREPLAN: assets, bequests, document_types, etc.)
```

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate
```

#### 3.2: Create tRPC Routers

```typescript
// packages/api-contract/src/routers/willData.ts
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { eq } from 'drizzle-orm';
import { willData, estateDocuments } from '@ifinallyWill/db/schema';

// Schemas for each section
const personalInfoSchema = z.object({
  firstName: z.string(),
  middleName: z.string().optional(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  city: z.string(),
  province: z.string(),
  country: z.string().default('Canada'),
});

const executorsSchema = z.array(z.object({
  keyNameId: z.string().uuid(),
  position: z.enum(['primary', 'alternate', 'backup']),
}));

// ... more section schemas

export const willDataRouter = router({
  // Get will data for a document
  get: protectedProcedure
    .input(z.object({ estateDocId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify user owns this document
      const doc = await ctx.db.query.estateDocuments.findFirst({
        where: eq(estateDocuments.id, input.estateDocId),
      });
      
      if (!doc || doc.userId !== ctx.session.user.id) {
        throw new Error('Document not found');
      }
      
      // Get will data
      const data = await ctx.db.query.willData.findFirst({
        where: eq(willData.estateDocId, input.estateDocId),
      });
      
      return data;
    }),
  
  // Update a specific section
  updateSection: protectedProcedure
    .input(z.object({
      estateDocId: z.string().uuid(),
      section: z.enum([
        'personalInfo',
        'maritalStatus',
        'spouseInfo',
        'executors',
        'residue',
        'wipeout',
        'trusting',
        'guardians',
        'pets',
        'additional',
        'finalDetails',
      ]),
      data: z.any(), // Will validate based on section
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const doc = await ctx.db.query.estateDocuments.findFirst({
        where: eq(estateDocuments.id, input.estateDocId),
      });
      
      if (!doc || doc.userId !== ctx.session.user.id) {
        throw new Error('Document not found');
      }
      
      // Validate data based on section
      let validatedData;
      switch (input.section) {
        case 'personalInfo':
          validatedData = personalInfoSchema.parse(input.data);
          break;
        case 'executors':
          validatedData = executorsSchema.parse(input.data);
          break;
        // ... other sections
        default:
          validatedData = input.data;
      }
      
      // Update the specific section (only this column, not full replace)
      await ctx.db.update(willData)
        .set({
          [input.section]: validatedData,
          updatedAt: new Date(),
        })
        .where(eq(willData.estateDocId, input.estateDocId));
      
      return { success: true };
    }),
  
  // Get completed steps
  getCompletedSteps: protectedProcedure
    .input(z.object({ estateDocId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const data = await ctx.db.query.willData.findFirst({
        where: eq(willData.estateDocId, input.estateDocId),
        columns: { completedSteps: true },
      });
      
      return data?.completedSteps || [];
    }),
});
```

#### 3.3: Auth.js Configuration

```typescript
// packages/auth/src/config.ts (update for IFinallyWill)
import { AuthConfig } from '@auth/core/types';
import GoogleProvider from '@auth/core/providers/google';
import CredentialsProvider from '@auth/core/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@ifinallyWill/db';
import bcrypt from 'bcryptjs';

export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email),
        });
        
        if (!user || !user.passwordHash) {
          return null;
        }
        
        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        
        if (!isValid) {
          return null;
        }
        
        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
  },
};
```

### Deliverables

- ✅ Database schema migrated
- ✅ tRPC routers for will data
- ✅ Auth.js configured
- ✅ Registration creates user + initial document
- ✅ Wizard saves data to PostgreSQL
- ✅ Data persistence working end-to-end

---

## Phase 4: Testing & Polish

**Duration**: 1-2 days  
**Goal**: Bug fixes, UX refinement, testing

### Tasks

#### 4.1: End-to-End Testing

- ✅ Registration flow (email + Google)
- ✅ All wizard steps save correctly
- ✅ Navigation (back/forward) preserves data
- ✅ Validation errors display properly
- ✅ Mobile responsive on all steps
- ✅ Loading states during mutations

#### 4.2: UX Polish

- ✅ Add loading skeletons
- ✅ Improve error messages
- ✅ Add success toasts on save
- ✅ Smooth transitions between steps
- ✅ Auto-focus first field on each step
- ✅ Keyboard navigation (Enter to continue)

#### 4.3: Performance

- ✅ Optimize tRPC queries (batching)
- ✅ Add optimistic updates
- ✅ Lazy load wizard steps
- ✅ Image optimization

### Deliverables

- ✅ Fully functional registration + wizard
- ✅ All bugs fixed
- ✅ Smooth UX
- ✅ Mobile-tested
- ✅ Ready for user testing

---

## What We're NOT Doing Yet

**Defer to later phases**:

- ❌ Landing page migration (use existing)
- ❌ Dashboard/profile pages
- ❌ Payment integration (Stripe)
- ❌ Document generation (PDF)
- ❌ POA wizard steps (focus on will first)
- ❌ Family tree visualization (BalknaGraph)
- ❌ Admin panel
- ❌ Partner/tenant features
- ❌ Wilfred AI sidechat (use placeholder)
- ❌ Email notifications
- ❌ Asset management

**Why defer?** Get core wizard working first, then add features incrementally.

---

## Success Criteria

### After Phase 1 (Registration)
✅ User can create account with email or Google  
✅ User sees province selection  
✅ User sees document catalog with pricing  
✅ User creates account  
✅ User redirected to wizard

### After Phase 2 (Personal.jsx Decomposition)
✅ PersonalInfoStep working flawlessly  
✅ All 20 wizard steps exist as separate components  
✅ Navigation between steps works  
✅ Form validation displays correctly  
✅ Mobile responsive

### After Phase 3 (Backend)
✅ Data saves to PostgreSQL  
✅ Data persists between sessions  
✅ User can log out and log back in  
✅ User can complete entire will wizard  
✅ Progress tracked (completedSteps)

### After Phase 4 (Polish)
✅ No critical bugs  
✅ Smooth UX, no loading jank  
✅ Ready for client demo  
✅ Ready for user testing

---

## Next Steps

**Once you approve this plan:**

1. **Phase 0**: I'll setup the clean app structure (1 day)
2. **Phase 1**: Port registration flow (2-3 days)
3. **Phase 2**: Decompose Personal.jsx (3-4 days)
4. **Phase 3**: Backend integration (2-3 days)
5. **Phase 4**: Testing & polish (1-2 days)

**Total timeline: 9-14 days to working demo**

**Ready to start?** 🚀
