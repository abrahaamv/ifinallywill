# IFinallyWill Willsystem v6 Port: Implementation Continuation

**Status**: In Progress (Phase 0 Complete, Phase 1 Starting)  
**Last Updated**: 2026-02-25  
**Current Commit**: `0711dc0` - Provincial template system complete  
**Target**: Production-ready willsystem with full v6 feature parity

---

## Table of Contents

1. [Current Status](#current-status)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Phases](#implementation-phases)
4. [Phase 0: Backend Foundation](#phase-0-backend-foundation-complete)
5. [Phase 1: Missing Components](#phase-1-missing-components-in-progress)
6. [Phase 2: Backend Integration](#phase-2-backend-integration)
7. [Phase 3: Payment System](#phase-3-payment-system)
8. [Phase 4: Admin Dashboard](#phase-4-admin-dashboard)
9. [Phase 5: Production Polish](#phase-5-production-polish)
10. [Validation Checklist](#validation-checklist)
11. [Progress Tracking](#progress-tracking)

---

## Current Status

### ✅ Completed (Phases 0-Partial)

**Infrastructure**:
- [x] Turborepo monorepo setup with pnpm workspaces
- [x] Fastify + tRPC v11 backend API (port 3001)
- [x] PostgreSQL + Drizzle ORM with RLS policies
- [x] Auth.js authentication with session management
- [x] Redis caching and rate limiting
- [x] TypeScript strict mode throughout (21/21 packages passing)

**Database** (`packages/db/src/schema/willsystem.ts`):
- [x] 50+ table schema designed
- [x] Core tables: tenants, users, keyNames, estateDocuments, willData, poaData
- [x] Asset management: estateAssets, assetClasses, bequests
- [x] Template system: templateTypes, templateVersions
- [x] Orders: documentOrders, orderItems
- [x] Partners: partners, partnerDiscountCodes
- [x] Tenant isolation with RLS policies

**tRPC API** (`packages/api-contract/src/router.ts`):
- [x] 12 willsystem routers integrated into appRouter:
  - estateDocuments, willData, poaData, keyNames
  - estateAssets, assetClasses, bequests
  - documentOrders, templateVersions
  - documentGeneration, wilfred, partners

**Frontend** (`apps/ifinallyWill`):
- [x] Standalone React + Vite SPA
- [x] 16 step components (4,887 LOC)
- [x] Zustand state management
- [x] React Hook Form + Zod validation
- [x] Shadcn/ui components
- [x] Responsive design

**Templates** (`apps/ifinallyWill/src/templates/canada/`):
- [x] 46 provincial templates (9 provinces × 5 document types)
- [x] Handlebars rendering system
- [x] Template data mapper
- [x] Provincial legal clauses

### 🚧 In Progress

**Phase 1: Missing Components**:
- [ ] POA Property step component
- [ ] POA Health step component  
- [ ] Profile management system (Primary/Spousal/Secondary)
- [ ] Dynamic step routing

### ❌ Not Started

**Phases 2-5**: Backend integration, payment system, admin dashboard, production polish

---

## Architecture Overview

### Technology Stack

**Frontend**:
- React 18.3.1, TypeScript 5.7.2, Vite 6.x
- TailwindCSS v4.1.14, Shadcn/ui
- Zustand, React Hook Form + Zod, TanStack Query
- @react-pdf/renderer

**Backend**:
- Node.js 20+, Fastify 5.3.2+, tRPC v11
- Drizzle ORM, PostgreSQL 16+
- Auth.js, Redis

**Infrastructure**:
- pnpm workspaces, Turborepo, Docker Compose, Biome

### Data Flow

```
User Browser → React App → tRPC Client → Fastify Server → tRPC Routers → Drizzle ORM → PostgreSQL
```

### Key Design Decisions

1. **Section-Based Data Storage**: Will data in separate jsonb columns per section
2. **People Pool Pattern**: All people in `keyNames` table, referenced by UUID
3. **Document Portfolio Model**: Multiple independent documents per user
4. **Province-Specific Templates**: Selected based on user's province
5. **Partner System**: Affiliates with discount codes and revenue sharing

---

## Implementation Phases

### Timeline Overview

| Phase | Duration | Description | Status |
|-------|----------|-------------|--------|
| Phase 0 | DONE | Backend foundation | ✅ Complete |
| Phase 1 | 1-2 weeks | Missing components | 🚧 In Progress |
| Phase 2 | 2-3 weeks | Backend integration | ❌ Not Started |
| Phase 3 | 2-3 weeks | Payment system | ❌ Not Started |
| Phase 4 | 2-3 weeks | Admin dashboard | ❌ Not Started |
| Phase 5 | 1-2 weeks | Production polish | ❌ Not Started |

**Total Estimated Time**: 8-13 weeks (solo developer)  
**Target Completion**: Q2 2026

---

## Phase 0: Backend Foundation ✅ COMPLETE

**Completed Work**:
- Database schema: 50+ tables in `willsystem.ts`
- tRPC routers: 12 routers integrated
- Auth.js authentication system
- Build system: All 21 packages passing typecheck

---

## Phase 1: Missing Components 🚧 IN PROGRESS

**Goal**: Complete all step components for feature parity with v6

**Duration**: 1-2 weeks  
**Current Progress**: 0%

### Task 1.1: POA Property Step Component

**File**: `apps/ifinallyWill/src/components/poa-steps/PoaPropertyStep.tsx`

**Requirements**:
- Attorney appointment form (primary + backup)
- Property management powers checklist
- Activation conditions (immediate/incapacity)
- Provincial variations
- Integration with keyNames
- Zod validation + React Hook Form

**Data Structure**:
```typescript
interface PoaPropertyData {
  attorneys: {
    primary: string;      // UUID from keyNames
    backups: string[];    // UUIDs from keyNames
  };
  activationType: 'immediate' | 'incapacity';
  propertyInstructions: {
    bankAccounts: boolean;
    realEstate: boolean;
    investments: boolean;
    businessInterests: boolean;
    vehicles: boolean;
    otherAssets: boolean;
  };
  restrictions?: string;
}
```

**Acceptance Criteria**:
- [ ] Form renders with all fields
- [ ] Attorney selection from keyNames
- [ ] Validation passes
- [ ] Data saves to Zustand store
- [ ] Provincial variations handled

---

### Task 1.2: POA Health Step Component

**File**: `apps/ifinallyWill/src/components/poa-steps/PoaHealthStep.tsx`

**Requirements**:
- Healthcare attorney form
- Medical decision powers
- End-of-life instructions
- Organ donation preferences
- Provincial variations

**Data Structure**:
```typescript
interface PoaHealthData {
  attorneys: { primary: string; backups: string[]; };
  activationType: 'immediate' | 'incapacity';
  healthInstructions: {
    medicalTreatment: boolean;
    longTermCare: boolean;
    endOfLifeDecisions: boolean;
    organDonation: boolean;
  };
  endOfLifeWishes?: string;
  organDonationPreferences?: 'all' | 'specific' | 'none';
  specificOrgans?: string[];
}
```

---

### Task 1.3: Profile Management System

**Goal**: Enable Primary/Spousal/Secondary will creation

**Components**:
1. ProfileSelector - Toggle between profiles
2. Profile Store - Multi-profile state management
3. Step Router Refactor - Profile-aware navigation

**Profile Store**:
```typescript
interface ProfileStore {
  activeProfile: 'primary' | 'spousal' | 'secondary';
  profiles: {
    primary: WillData;
    spousal?: WillData;
    secondary?: WillData;
  };
  coupleDocId?: string;
  switchProfile: (profile: ProfileType) => void;
  linkSpousesData: () => void;
}
```

---

### Task 1.4: Dynamic Step Routing

**Goal**: Show/hide steps based on user data

**Logic**:
```typescript
function getVisibleSteps(data: WillData): Step[] {
  const steps = ['personalInfo', 'maritalStatus'];
  
  if (data.maritalStatus === 'married') steps.push('spouseInfo');
  if (data.hasChildren) steps.push('children', 'guardians', 'trusting');
  
  steps.push('executors', 'assets', 'bequests', 'residue', 'wipeout');
  
  if (data.pets?.length) steps.push('petGuardian');
  
  steps.push('additional', 'finalDetails', 'poaProperty', 'poaHealth', 'review');
  
  return steps;
}
```

---

### Phase 1 Deliverables

**Commits**:
1. `feat(poa): add POA Property step component`
2. `feat(poa): add POA Health step component`
3. `feat(wizard): implement profile management system`
4. `feat(wizard): add dynamic step routing`

**Validation**:
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] POA forms submit successfully
- [ ] Profile switching works
- [ ] Dynamic routing shows/hides steps

---

## Phase 2: Backend Integration

**Goal**: Replace localStorage with tRPC + PostgreSQL

**Duration**: 2-3 weeks  
**Status**: Not Started

### Tasks

#### Task 2.1: Database Migrations
```bash
pnpm db:push  # Apply schema
pnpm db:seed  # Seed test data
```

#### Task 2.2: tRPC Endpoint Implementation
Complete router implementations for:
- estateDocuments (create, get, list, update, delete)
- willData (get, updateSection)
- poaData (get, updateProperty, updateHealth)
- keyNames (CRUD operations)
- documentGeneration (generate, preview, download)

#### Task 2.3: Frontend tRPC Integration
Replace Zustand localStorage with tRPC calls:
```typescript
// Old: localStorage
const { willData, setWillData } = useWizardStore();

// New: tRPC
const { data: willData } = trpc.willData.get.useQuery({ estateDocId });
const updateSection = trpc.willData.updateSection.useMutation();
```

#### Task 2.4: Authentication Integration
Add login/registration pages for ifinallyWill app

---

## Phase 3: Payment System

**Goal**: Stripe integration for document purchases

**Duration**: 2-3 weeks  
**Status**: Not Started

### Document Packages

```typescript
const packages = [
  { id: 'basic', name: 'Will Only', price: 3999 },  // $39.99
  { id: 'complete', name: 'Will + POAs', price: 6999 },  // $69.99
  { id: 'couple', name: 'Couple Package', price: 9999 },  // $99.99
];
```

### Tasks
- Stripe setup (API keys, webhook secret)
- Checkout flow with Stripe Elements
- Webhook handler for payment events
- Document gating (lock downloads until paid)

---

## Phase 4: Admin Dashboard

**Goal**: Admin UI for client management and document review

**Duration**: 2-3 weeks  
**Status**: Not Started

### Tasks
- Admin layout with sidebar navigation
- Client management (list, search, filter)
- Document review and approval workflow
- Email notifications (Resend/SendGrid)

---

## Phase 5: Production Polish

**Goal**: UX enhancements and production readiness

**Duration**: 1-2 weeks  
**Status**: Not Started

### Tasks
- Tour system (react-joyride)
- Celebration modals (canvas-confetti)
- Performance optimization (code splitting, bundle analysis)
- Security hardening (HTTPS, rate limiting, CORS)

---

## Validation Checklist

### Development
- [ ] `pnpm typecheck` passes (21/21 packages)
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds

### Functionality
- [ ] User can register and login
- [ ] User can create a will (all steps)
- [ ] User can create spousal will
- [ ] User can create POAs
- [ ] Data persists to PostgreSQL
- [ ] Profile switching works
- [ ] Payment flow completes
- [ ] PDF generation works
- [ ] Document download gated
- [ ] Admin can review documents

### Security
- [ ] Authentication required
- [ ] Tenant isolation (RLS)
- [ ] Rate limiting configured
- [ ] Environment variables secured

### Performance
- [ ] Page load < 3s
- [ ] API response < 500ms
- [ ] PDF generation < 10s
- [ ] Lighthouse score 90+

---

## Progress Tracking

### Phase Completion

| Phase | Status | Start | End | Duration | Commits |
|-------|--------|-------|-----|----------|---------|
| Phase 0 | ✅ Complete | 2026-02-01 | 2026-02-25 | 24 days | 3 |
| Phase 1 | 🚧 In Progress | 2026-02-25 | - | - | 0 |
| Phase 2 | ❌ Not Started | - | - | - | 0 |
| Phase 3 | ❌ Not Started | - | - | - | 0 |
| Phase 4 | ❌ Not Started | - | - | - | 0 |
| Phase 5 | ❌ Not Started | - | - | - | 0 |

### Task Completion (Phase 1)

- [ ] Task 1.1: POA Property Step (0%)
- [ ] Task 1.2: POA Health Step (0%)
- [ ] Task 1.3: Profile Management (0%)
- [ ] Task 1.4: Dynamic Routing (0%)

### Blockers

None currently.

### Next Actions

1. ✅ Create this document
2. ⏭️ Start Task 1.1: POA Property Step Component
3. ⏭️ Start Task 1.2: POA Health Step Component

---

**Last Updated**: 2026-02-25  
**Document Version**: 1.0.0  
**Maintained By**: Development Team  

**Update Instructions**: Update at end of each phase and for major decisions.

