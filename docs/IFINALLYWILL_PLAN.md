# IFinallyWill Migration: Implementation Plan

## Context

IFinallyWill (Willsystem-v6) is a Laravel/MySQL/React estate planning app being migrated into the Platform monorepo (TypeScript/Fastify/tRPC/PostgreSQL). The Willsystem serves as a functional reference — same data collected, same template variables, but rebuilt with proper architecture. The platform's enterprise infrastructure (Auth.js, RLS, RAG, WebRTC, Redis Streams) is inherited. Key additions: AI sidechat "Wilfred", partner REST API, "idiot proof" UX benchmarked against Epilogue.co.

**Multi-tenancy model**: Full multi-tenant. IFinallyWill is tenant #1 (default). Future white-label clients get their own tenant IDs. Partners are affiliates (separate table), not tenants. Role mapping: `owner` = root, `admin` = admin, `member` = regular user.

**Reference doc**: `docs/IFINALLYILL_PREPLAN_ANALYSIS.md` (21 sections, complete analysis)

---

## Phase 1: Database Schema + App Scaffold + Zod Schemas

**Goal**: Foundation — all tables, app shell, shared validation schemas.
**Effort**: 3-4 days

### 1A. Database Schema

**Create** `packages/db/src/schema/willsystem.ts`:

17 tables following existing Drizzle conventions (see `crag.ts` for pattern):

| Table | Key Columns | Notes |
|-------|------------|-------|
| `key_names` | userId FK→users, firstName, lastName, relationship enum, contact fields | User-level people pool |
| `estate_documents` | userId FK→users, tenantId FK→tenants, coupleDocId self-ref, documentType enum, province, status, completionPct | Top-level entity |
| `will_data` | estateDocId FK→estate_documents (UNIQUE), personalInfo jsonb, maritalStatus, executors jsonb, residue jsonb, etc. | Per-section jsonb columns |
| `poa_data` | estateDocId FK→estate_documents (UNIQUE), primaryAgent FK→key_names, backupAgents uuid[] | POA-specific |
| `poa_health_details` | poaDataId FK→poa_data, organDonation, dnr, statements jsonb | Health POA extension |
| `assets` | userId FK→users, assetClassId FK→asset_classes, willType enum, details jsonb | User-level |
| `asset_classes` | serial PK, classNumber, name, fieldSchema jsonb | Reference data |
| `bequests` | estateDocId FK→estate_documents, assetId FK→assets, shares jsonb | Per-document |
| `document_types` | serial PK, name, displayName, province, basePrice integer (cents) | Catalog |
| `template_versions` | documentTypeId FK, content text, version integer, isActive | Versioned HTML |
| `document_orders` | userId FK, discountCodeId FK, status enum, subtotal/discount/finalPrice (cents), stripeSessionId | Payment |
| `document_order_items` | orderId FK, estateDocId FK, documentTypeId FK, unitPrice | Line items |
| `generated_documents` | orderId FK, documentTypeId FK, estateDocId FK, htmlContent, fileKey | PDF output |
| `partners` | name, subdomain UNIQUE, contactEmail, revenueSharePct, creditsBalance, outstandingBalance | Affiliates |
| `discount_codes` | partnerId FK, code UNIQUE, discountPct, isFree, maxUses | Partner codes |
| `code_usages` | codeId FK, userId FK, orderId FK, discountAmount, partnerEarnings | Tracking |
| `api_tenants` | name, contactEmail, apiKeyId FK→apiKeys, rateLimitTier | REST API consumers |

Enums: `documentType`, `documentStatus`, `maritalStatus`, `activationType`, `orderStatus`, `partnerStatus`, `relationship`, `willType`, `rateLimitTier`

All tables include `tenantId FK→tenants` (multi-tenant isolation). All get RLS policies.

**Modify** `packages/db/src/schema/index.ts`: Add `export * from './willsystem'`

### 1B. App Scaffold

**Create** `apps/ifinallyWill/` following `apps/landing/` patterns:

```
apps/ifinallyWill/
├── package.json          # @platform/ifinallyWill, port 5177
├── vite.config.ts        # @tailwindcss/vite, @vitejs/plugin-react
├── tsconfig.json + .app.json + .node.json
├── index.html
└── src/
    ├── main.tsx + main.css
    ├── App.tsx             # React Router skeleton
    ├── styles/
    │   ├── theme.css       # OKLCH variables (light default + dark toggle)
    │   └── landing.css     # Navy/gold for public pages
    ├── utils/
    │   ├── trpc.ts         # tRPC client setup
    │   └── auth.ts         # Auth hooks
    ├── providers/
    │   ├── AuthProvider.tsx
    │   └── TRPCProvider.tsx
    ├── layouts/            # Placeholder layouts
    ├── pages/              # Placeholder routes
    └── components/         # Empty for now
```

**Modify** root `package.json`: Add `"dev:ifinallyWill": "pnpm --filter @platform/ifinallyWill dev"`

Dependencies (exact versions): react 18.3.1, react-dom 18.3.1, react-router-dom (match existing apps), react-hook-form, @hookform/resolvers, framer-motion (match landing), lucide-react, @stripe/stripe-js, @stripe/react-stripe-js

### 1C. Zod Schemas

**Create** `packages/api-contract/src/schemas/`:
- `estate-documents.ts` — personalInfoSchema, spouseInfoSchema, executorsSchema, residueSchema, wipeoutSchema, trustingSchema, guardiansSchema, petsSchema, additionalSchema, finalDetailsSchema
- `poa.ts` — poaAgentsSchema, poaHealthDetailsSchema
- `key-names.ts` — keyNameSchema, createKeyNameSchema
- `assets.ts` — assetSchema, bequestSchema
- `orders.ts` — createOrderSchema, applyCodeSchema
- `partners.ts` — partnerSchema, discountCodeSchema

### Validation
```bash
pnpm typecheck && pnpm build
```

---

## Phase 2: Core tRPC Routers

**Goal**: All CRUD routers wired into appRouter. No UI yet.
**Effort**: 4-5 days

### New Routers

All in `packages/api-contract/src/routers/`:

| Router | File | Key Procedures |
|--------|------|----------------|
| `estateDocuments` | `estate-documents.ts` | create, get, list, updateStatus, getProgress, linkCouple, mirrorForSpouse |
| `willData` | `will-data.ts` | get, updateSection (per-jsonb-column), getCompletedSteps |
| `poaData` | `poa-data.ts` | get, updateSection, getCompletedSteps, updateHealthDetails |
| `keyNames` | `key-names.ts` | create, update, delete (check refs), list |
| `estateAssets` | `estate-assets.ts` | create, update, delete, list (prefixed to avoid collision) |
| `assetClasses` | `asset-classes.ts` | list (publicProcedure — reference data) |
| `bequests` | `bequests.ts` | set, delete, listByDoc |

Pattern: `protectedProcedure` for reads, `protectedMutation` for writes. All queries scoped by `tenantId` (via RLS). Input validated by Zod schemas from Phase 1C.

**Modify** `packages/api-contract/src/router.ts`: Import and add all 7 routers to `appRouter`.

### Seed Data

**Modify** `packages/db/src/seed.ts`:
- `asset_classes`: 20+ types (real estate, vehicles, bank accounts, investments, life insurance, jewelry, etc.)
- `document_types`: 4 types × provinces with pricing
- Default IFinallyWill tenant record

### Validation
```bash
pnpm typecheck && pnpm build
```

---

## Phase 3: Auth + Registration + Document Portfolio

**Goal**: First user-facing milestone — register, see dashboard, create documents.
**Effort**: 5-7 days

### 3A. Auth Integration
- `src/providers/AuthProvider.tsx` — reuse `packages/auth`
- `src/providers/TRPCProvider.tsx` — tRPC React Query client
- `src/components/ProtectedRoute.tsx` — route guard

### 3B. Registration Wizard
Port v6 `WizardSteps/` concept (~70% reuse, full TypeScript rewrite):

- `src/pages/auth/RegisterPage.tsx` — multi-step wizard shell
- `src/components/registration/WelcomeStep.tsx` — individual/couples
- `src/components/registration/LocationStep.tsx` — province selection
- `src/components/registration/DocumentSelectionStep.tsx` — choose documents (replaces v6 package selection)
- `src/components/registration/AccountStep.tsx` — email/password or Google OAuth
- `src/components/registration/SummaryStep.tsx` — review before creation

All forms: react-hook-form + Zod resolvers. localStorage persistence for wizard state.

### 3C. Document Portfolio Dashboard
- `src/pages/app/DashboardPage.tsx` — shows `estate_documents` via `estateDocuments.list`
- `src/components/dashboard/DocumentCard.tsx` — type, status, completion %
- `src/components/dashboard/CreateDocumentDialog.tsx` — add new document
- `src/layouts/AppLayout.tsx` — sidebar nav, authenticated wrapper

### 3D. Design System
- `src/styles/theme.css` — OKLCH light/dark (from pre-plan Section 13)
- `src/styles/landing.css` — navy #0A1E86, gold #FFBF00 (v6 branding)
- shadcn/ui components customized with OKLCH tokens

### Validation
```bash
pnpm typecheck && pnpm build
```
User can register, see dashboard, create document records.

---

## Phase 4: Will Creation Wizard

**Goal**: Full will creation — all sections, auto-save, couples flow.
**Effort**: 8-12 days

### 4A. Wizard Framework
- `src/components/wizard/WizardShell.tsx` — sidebar + content + Wilfred placeholder
- `src/components/wizard/WizardSidebar.tsx` — step list with ✓/◐/● indicators
- `src/components/wizard/WizardProgress.tsx` — progress bar + time estimate
- `src/hooks/useWizardNavigation.ts` — URL-based, conditional skip logic
- `src/hooks/useAutoSave.ts` — debounced tRPC mutations
- `src/config/wizardConfig.ts` — step definitions (replaces v6 pointer system)

### 4B. Will Steps (16 components, one per step)

Each is a react-hook-form form calling `willData.updateSection`:

| Step | Component | Conditional |
|------|-----------|-------------|
| Personal Info | `PersonalInfoStep.tsx` | Always |
| Family Status | `FamilyStatusStep.tsx` | Always |
| Spouse Info | `SpouseInfoStep.tsx` | If married/common-law |
| Children | `ChildrenStep.tsx` | Always (can skip if none) |
| Key People | `FamilyMembersStep.tsx` | Always |
| Family Tree | `FamilyTreeStep.tsx` | Always (BalknaGraph view) |
| Guardian | `GuardianStep.tsx` | If minor children |
| Pet Guardian | `PetGuardianStep.tsx` | If has pets |
| Assets | `AssetsStep.tsx` | Always |
| Bequests | `BequestsStep.tsx` | If has assets |
| Residue | `ResidueStep.tsx` | Always |
| Inheritance | `InheritanceStep.tsx` | If minor children |
| Executors | `ExecutorsStep.tsx` | Always |
| Wipeout | `WipeoutStep.tsx` | Always |
| Additional | `AdditionalStep.tsx` | Always |
| Review | `ReviewStep.tsx` | Always |

### 4C. Shared Form Components
- `PersonSelector.tsx` — card-based selection from key_names
- `FamilyMemberForm.tsx` — reusable person entry form
- `FamilyMemberCard.tsx` — display existing person
- `AssetForm.tsx` — dynamic form from asset_classes.fieldSchema

### 4D. Couples Flow
- `ProfileBanner.tsx` — "Editing [Name]'s will" top banner
- URL-based switching: `/app/documents/:docId/step-name`
- Mirror document: "Create matching will for [Spouse]?" button

### Validation
```bash
pnpm typecheck && pnpm build
```
Full will creation works end-to-end. All sections auto-save via tRPC.

---

## Phase 5: POA Flows + Document Generation + Payments

**Goal**: Independent POA wizards, template rendering, PDF generation, Stripe payments.
**Effort**: 7-10 days

### 5A. POA Wizards

POA Property (7 steps): PersonalInfo, AgentSelection, JointAgent, BackupAgents, Restrictions, ActivationType, Review

POA Health (extends Property + 3 steps): HealthDirectives, OrganDonation, Review

Both use `poaData.updateSection` mutations with key_names UUID references (not name strings).

### 5B. Template Engine + PDF

**Create** `services/pdf-server/`:
- `src/index.ts` — Fastify server, `POST /generate` endpoint
- `src/renderer.ts` — Handlebars template compilation
- `src/helpers.ts` — Port v6 helpers: `formatLocation`, `capitalLetters`, `if_eq`, `renderBequests`, `groupByPriority`, etc.
- `src/data-mapper.ts` — Transform normalized DB data → template variables (replaces v6's `prepareTemplateData`)

**New routers**:
- `templates.ts` — list, getActive, createVersion, activate (adminProcedure)
- `documents.ts` — listTypes, createOrder, applyCode, checkout, generate, download, getSigningGuide

### 5C. Stripe Payments
- `src/pages/app/CheckoutPage.tsx` — full page (not modal)
- `src/components/checkout/OrderSummary.tsx`, `DiscountCodeInput.tsx`, `StripeCheckout.tsx`
- `payments.ts` router — list (ownerProcedure), getByOrder, handleWebhook (publicProcedure)

Backend dep: `stripe` (exact version) in packages/api

### Validation
```bash
pnpm typecheck && pnpm build
```
Full lifecycle: create → fill → pay → generate PDF → download.

---

## Phase 6: AI Sidechat (Wilfred) + Partner System

**Goal**: The AI differentiator and partner/affiliate system.
**Effort**: 5-7 days

### 6A. Wilfred AI

**Reuses**: `packages/knowledge` (RAG), `packages/ai-core` (cost routing), `packages/realtime` (streaming)

**New router** `wilfred.ts` — modeled on existing `chat.ts` but simplified:
- `sendMessage` — context injection from wizard state (step, province, key_names, assets, completedSteps)
- `getHistory` — chat history per session
- Hardcoded estate planning system prompt + RAG corpus
- GPT-4o-mini for simple questions (70%), GPT-4o for complex (30%)

**Frontend**:
- `WilfredPanel.tsx` — right panel (desktop) / bottom sheet (mobile)
- `WilfredMessages.tsx`, `WilfredInput.tsx`
- `useWilfredContext.ts` — builds context from current wizard state

### 6B. Partner System

**New routers**: `partners.ts`, `discount-codes.ts`

**Frontend**:
- `PartnerDashboard.tsx` — analytics, codes, balance
- `PartnerCodeManager.tsx` — create/manage codes
- Subdomain detection for partner branding

### Validation
```bash
pnpm typecheck && pnpm build
```

---

## Phase 7: Landing Pages + Admin + REST API + Polish

**Goal**: Complete application.
**Effort**: 7-10 days

### 7A. Landing Pages (~70% v6 reuse, TypeScript rewrite)
- WelcomePage, HowItWorksPage, ComparePage, AboutPage, PartnersPage, HelpCentrePage, AffiliatePage
- Navbar, Footer, HeroCarousel, PricingCards components
- LandingLayout with navy/gold theme

### 7B. Admin Panel
- AdminDashboard, AdminUsers, AdminTemplates, AdminPartners, AdminPayments
- AdminLayout with role guard (admin/owner only)

### 7C. REST API Adapter
- `packages/api/src/routes/rest-v1.ts` — thin Fastify routes over tRPC
- Auth via existing `apiKeys` system
- Rate limiting via existing middleware

### 7D. Polish
- BalknaGraph integration (`@balkangraph/familytree.js`)
- Mobile responsive pass on all wizard steps
- Province template data loaded into `template_versions`
- Error boundaries, loading states, skeleton screens

### Validation
```bash
pnpm typecheck && pnpm build
```

---

## Critical Path

```
Phase 1 (Schema + Scaffold)  ←── everything depends on this
   ↓
Phase 2 (tRPC Routers)
   ↓
Phase 3 (Auth + Registration + Dashboard)
   ↓
Phase 4 (Will Wizard)  ←── core feature
   ↓
Phase 5 (POA + Templates + Payments)
   ↓
Phase 6 (Wilfred AI + Partners)
   ↓
Phase 7 (Landing + Admin + REST + Polish)
```

Phases 4/5/6 can partially overlap if needed.

## Key Files to Modify (Existing)

| File | Change |
|------|--------|
| `packages/db/src/schema/index.ts` | Add `export * from './willsystem'` |
| `packages/api-contract/src/router.ts` | Import + wire all new routers into `appRouter` |
| `packages/db/src/seed.ts` | Add asset_classes, document_types, default tenant |
| Root `package.json` | Add `dev:ifinallyWill` script |

## Key Files to Create (New)

| File | Purpose |
|------|---------|
| `packages/db/src/schema/willsystem.ts` | 17 new tables + enums + relations |
| `packages/api-contract/src/schemas/estate-documents.ts` | Shared Zod schemas |
| `packages/api-contract/src/routers/estate-documents.ts` | Core document router |
| `packages/api-contract/src/routers/will-data.ts` | Will section updates |
| `packages/api-contract/src/routers/poa-data.ts` | POA section updates |
| `packages/api-contract/src/routers/key-names.ts` | People pool CRUD |
| `apps/ifinallyWill/` | Entire new app (~50-80 files) |
| `services/pdf-server/` | Puppeteer PDF service |

## Total Effort: ~39-55 dev-days (8-11 weeks solo)

## Verification

After each phase:
```bash
pnpm typecheck && pnpm build
```

End-to-end test after Phase 5:
1. Register new user (creates account + estate_documents)
2. Fill all will wizard steps (data persists via tRPC)
3. Create POA documents independently
4. Pay via Stripe checkout
5. Generate + download PDFs
6. Verify template variables match v6 output
