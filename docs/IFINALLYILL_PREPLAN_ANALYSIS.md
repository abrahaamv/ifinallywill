# IFinallyWill Migration: Pre-Plan Analysis Document

> **Purpose**: Comprehensive analysis of Willsystem-v6 → Platform migration.
> Review this document, discuss any changes needed, then we create the implementation plan.
> **Date**: 2026-02-24

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What We're Building](#2-what-were-building)
3. [Willsystem-v6 Database Analysis (Source of Truth)](#3-willsystem-v6-database-analysis)
4. [Will Creation Workflow (As-Is)](#4-will-creation-workflow-as-is)
5. [Architectural Problems to Fix](#5-architectural-problems-to-fix)
6. [New Database Schema (PostgreSQL/Drizzle)](#6-new-database-schema)
7. [The obj_statuses Question: Redesign Recommendation](#7-the-obj_statuses-redesign)
8. [Document Independence: POAs as Standalone](#8-document-independence)
9. [Couples / Dual-Profile: Redesign](#9-couples-dual-profile-redesign)
10. [Partner vs Tenant Model](#10-partner-vs-tenant-model)
11. [AI Sidechat ("Wilfred") Architecture](#11-ai-sidechat-architecture)
12. [Partner REST API Design](#12-partner-rest-api-design)
13. [Design System & Theme Architecture](#13-design-system)
14. [UX Redesign (Epilogue-Inspired)](#14-ux-redesign)
15. [Document/Template System + Data Mapping](#15-document-template-system)
16. [Payment Model](#16-payment-model)
17. [Platform Features: Keep / Strip / Repurpose](#17-platform-features-disposition)
18. [tRPC Router Plan](#18-trpc-router-plan)
19. [Component Migration Strategy](#19-component-migration-strategy)
20. [Landing Page & Registration Reuse](#20-landing-page-reuse)
21. [Open Questions for Discussion](#21-open-questions)

---

## 1. Executive Summary

**What**: Migrate IFinallyWill (Willsystem-v6, a Laravel/MySQL/React monolith) into the Platform (TypeScript/Fastify/tRPC/PostgreSQL monorepo). The Willsystem serves as a functional mockup — we extract business logic and UX concepts, rebuild everything with proper architecture.

**Why**: The Willsystem-v6 is:
- Built by junior developers with poor architectural decisions
- Full of bugs (client's words)
- PHP/Laravel backend limiting scalability and type safety
- 8,601-line monolithic components
- DOM-based form data extraction instead of React state
- Module-level global variables for form state
- Giant JSON blob for all will data

**How**: Option C — delete 4 existing VisualKit apps, create single `apps/ifinallyWill` SPA, add new domain-specific tRPC routers, new PostgreSQL schema, keep all platform infrastructure.

**Critical principle**: The data collected from users stays **exactly the same** — same form inputs, same data shapes per step, same template variables. We are NOT redesigning what data builds the documents. We are ONLY fixing the implementation: how data is stored (normalized columns vs JSON blob), validated (Zod schemas), referenced (UUID FKs vs name-string matching), and managed (React state vs DOM reads). The templates consume identical variables.

**Key additions the client wants**:
- Always-on AI sidechat (RAG-powered, "idiot proof")
- Partner REST API for external integrations
- System so simple "anyone can use it" — benchmark: Willful.co and Epilogue.co

---

## 2. What We're Building

### Roles (3 only)
| Role | Permissions |
|------|------------|
| **user** | Create/manage own will, buy documents, chat with AI |
| **admin** | Everything root does EXCEPT: grant/revoke admin/root, Stripe transaction access, payment refunds/cancellations |
| **root** | Full access including payment management, partner management, role grants |

### Entities
| Entity | Purpose |
|--------|---------|
| **User** | End user creating their will |
| **Partner** | Distribution affiliate (branded subdomain, discount codes, usage analytics) |
| **Tenant** | API consumer who uses IFinallyWill as a provider (REST API access) |

### Core Features
1. Will creation wizard (personal info, family, assets, executors, guardians, bequests, POAs, final wishes)
2. Couples/spousal mirror wills
3. Secondary wills
4. Province-specific document templates
5. PDF generation & download
6. Stripe payments (document bundles, no packages)
7. Partner discount codes with revenue sharing
8. Partner analytics dashboard
9. AI sidechat (always-on, context-aware, RAG-powered)
10. REST API for tenants/partners
11. Admin panel (user management, template management, analytics)

### What's NOT in scope
- No lawyers/sales teams
- No scheduling/appointments
- No document review/approval workflow
- No support ticketing (for now)
- No meeting rooms (kept for future)

---

## 3. Willsystem-v6 Database Analysis

### Complete Table Inventory (29 tables)

#### Core Domain Tables (what we rebuild)

**users** — 25+ columns including tenant_id, user_type (1-4), Google OAuth fields, marketing fields
- user_type: 1=User, 2=Admin, 3=Root, 4=Lawyer
- Has selected_package JSON, marketing email tracking fields
- BelongsToTenant trait with TenantScope global scope

**obj_statuses** — THE MAIN DATA STORE
- `information` JSON column contains ALL will data
- `related_id` → FK to users(id), CASCADE DELETE
- One per user (hasOne relationship)
- Structure: Multi-dimensional array [profiles][steps]

**assets** — client_id, asset_class_id, will_type ('primary'/'secondary')

**asset_classes** — class_number, name (20+ types: real estate, vehicles, bank accounts, etc.)

**asset_details** — asset_id, client_id, details (ENCRYPTED array — `encrypted:array` cast)

**trees** — user_id, tree JSON (family tree hierarchical data)

**payments** — user_id, payment_intent_id (Stripe), amount, discount fields, package reference, is_upsell, additional_documents JSON

**packages** — name, price (VARCHAR not decimal!), description, campaign, is_signature_required, document_versions JSON

**discount_codes** — code (UNIQUE), discount_percentage, is_active, expires_at, max_uses, current_uses
- NO partner association! (missing concept in v6)
- NO revenue share tracking

**template_types** — name, display_name, province, country, is_custom, base_template_type_id (self-reference)
- Standard types: primaryWill, secondaryWill, poaHealth, poaProperty
- Province-specific variants via province + country columns

**template_versions** — template_type_id, content (LONGTEXT — actual HTML), version, is_active
- One active version per template type
- Province-aware: `getActiveByTypeAndProvince()`

**tenants** — name, domain (UNIQUE), branding (colors, logo), plan, trial, status (pending/approved/rejected), program_type, program_config JSON, expires_at

#### Tables We DON'T Need (stripping)

| Table | Reason to Remove |
|-------|-----------------|
| lawyers | No lawyer team |
| availability_slots | No scheduling |
| reservations | No scheduling |
| sales_teams | No sales team |
| sales_availability_slots | No sales scheduling |
| sales_reservations | No sales scheduling |
| time_offs | No scheduling |
| law_firms | Deprecated (replaced by tenants) |
| institutions | Replaced by partner concept |
| support_tickets | Out of scope for now |
| ticket_responses | Out of scope |
| ticket_categories | Out of scope |
| landing_content | New landing built from scratch |

#### Tables to Transform

| Old Table | New Concept |
|-----------|-------------|
| obj_statuses (JSON blob) | Normalized will tables (see Section 7) |
| packages | Removed — replaced by document catalog |
| tenants | Split into Partners + Tenants |
| discount_codes | Extended with partner_id, revenue_share_pct |
| contracts | Removed — replaced by document_types |

---

## 4. Will Creation Workflow (As-Is)

### The objectStatus Data Structure

The heart of Willsystem-v6. A multi-dimensional array:

```
objectStatus[profileIndex][stepIndex] = { stepData }

Profile indexes:
  [0] = Primary user's will
  [1] = Spouse's will (if couples plan)
  [2] = Primary user's secondary will (if selected)
  [3] = Spouse's secondary will (if selected)

Step indexes (0-17):
  0:  personal        — fullName, email, city, province, country, phone
  1:  marriedq        — selection: 'true', 'false', 'soso'
  2:  married         — spouse firstName, lastName, email, phone, location, relative: 'Spouse'
  3:  kidsq           — selection: 'true', 'false'
  4:  kids            — Array of child objects (name, age, birthdate, gender, blendedFamily)
  5:  executors       — Array of executor appointment objects
  6:  relatives       — Array of relative/beneficiary objects
  7:  bequests        — Object mapping assetId → recipient with shares
  8:  residue         — Distribution selection (equal_split, percentage, person)
  9:  wipeout         — Debt forgiveness rules
  10: trusting        — Testamentary trust conditions for children
  11: guardians       — Guardian → children mapping with positions
  12: pets            — Pet details with guardian assignments
  13: additional      — Special wishes, organ donation, funeral
  14: poaProperty     — Primary/alternate agent, powers, effective date
  15: poaHealth       — Primary/alternate agent, powers
  16: finalDetails    — Final review information
  17: documentDOM     — Generated HTML for PDF (per docType key)
```

### Wizard Categories (User-Facing Navigation)

```
About You (1 step)
├── Personal Information [pointer 0]

Your Family (3 steps)
├── Key Names / Family Tree [pointer 1]
├── Guardian for Minors [pointer 8]
└── Guardian for Pets [pointer 9]

Your Estate (4 steps)
├── My Assets [pointer 2]
├── Gifts / Bequests [pointer 3]
├── What's Left / Residue [pointer 5]
└── Inheritance for Children [pointer 7]

Your Arrangements (5 steps)
├── Will Executors [pointer 4]
├── Wipeout Clause [pointer 6]
├── Additional Information [pointer 12]
├── Enhance Package [pointer 13]
└── Review & Download [pointer 14]

Your POAs (2 steps)
├── POA for Property [pointer 10]
└── POA for Health [pointer 11]
```

### Dual Profile Mechanics

When user selects couples plan:
1. Primary user fills their info → `objectStatus[0]`
2. Spouse info collected during family step → auto-initializes `objectStatus[1]`
3. **Shared steps**: Family Tree, Assets, Executors, Trusting, Guardians (changes apply to both)
4. **Individual steps**: Personal, POAs, Additional (each profile has own)
5. ProfileSwitcher modal confirms which profile user is editing
6. `currentProfile` state tracks active profile by email

### Data Flow

```
Registration wizard (localStorage) → Account creation (API)
→ Initialize objectStatus[0] → POST /api/obj-statuses
→ Fill steps sequentially → PUT /api/obj-statuses/{id} (full JSON save each time)
→ If married → initializeSpousalWill() copies data to objectStatus[1]
→ If secondary will → initializeSecondaryWill() creates objectStatus[2-3]
→ Review → Generate HTML documentDOM → Send to Puppeteer PDF server
→ Payment (Stripe) → Download PDFs
```

### Asset Flow (Separate API)
```
User adds asset → POST /api/assets (normalized table, not in objectStatus)
Asset linked to user via client_id + asset_class_id
Asset details stored encrypted in asset_details table
Bequest step references assets by ID for gift assignments
```

---

## 5. Architectural Problems to Fix

### Critical Issues in Willsystem-v6

| Problem | Severity | Our Fix |
|---------|----------|---------|
| **DOM-based data extraction** — `document.getElementById()` in form handlers | Critical | React controlled components + Zod validation |
| **8,601-line Personal.jsx** — one component for everything | Critical | Decompose into ~20 focused step components |
| **Module-level global variables** for form state (city, country, etc.) | Critical | React state + context |
| **Giant JSON blob** (objectStatus) saves entire will on every step change | High | Normalized tables, save only changed section |
| **Pointer system** (0-15 indices) for navigation | High | Named route-based wizard with URL state |
| **Ref-based save triggers** — parent calls child `.save()` via refs | High | Form library (react-hook-form) with auto-save |
| **localStorage for critical state** (currentProfile, currentStep) | High | Server-side state with Redis session cache |
| **Price stored as VARCHAR** in packages table | Medium | Proper decimal/integer cents in Drizzle |
| **No TypeScript** — all .jsx files, no type safety | Medium | Full TypeScript strict mode |
| **Mixed CSS** — Tailwind + Bootstrap + styled-components | Medium | Tailwind v4 only (shadcn/ui) |
| **Missing indexes** on frequently queried columns | Medium | Proper indexes in schema design |
| **No tenant isolation on discount_codes** | Medium | Partner-owned codes with proper FK |
| **SalesReservation model references Lawyer (wrong FK)** | Low | Eliminated (no sales team) |
| **Asset details encryption** without key rotation | Low | At-rest encryption via PostgreSQL |

### Opportunities for Improvement

| Area | Current (v6) | New (Platform) |
|------|-------------|----------------|
| **State management** | localStorage + DOM reads | React state + tRPC queries + Redis cache |
| **Form handling** | Manual DOM extraction | react-hook-form + Zod schemas |
| **API layer** | Inertia.js (no real API) | tRPC (type-safe) + REST adapter |
| **Validation** | Client-side only, inconsistent | Zod schemas shared client/server |
| **Database** | MySQL + Eloquent + JSON blob | PostgreSQL + Drizzle + normalized + RLS |
| **Auth** | Laravel Sanctum | Auth.js + MFA + PKCE |
| **Realtime** | None | WebSocket + Redis Streams (AI chat) |
| **AI** | Basic Llama Index assistant | RAG + Gemini/GPT routing + streaming |
| **Payments** | Direct Stripe calls | tRPC router with Stripe webhooks |
| **Multi-tenancy** | Eloquent global scope | PostgreSQL RLS (76+ policies reusable) |
| **PDF generation** | Puppeteer PM2 process | Puppeteer in monorepo service |

---

## 6. New Database Schema

### Schema: `packages/db/src/schema/willsystem.ts`

### CORE ARCHITECTURAL CHANGE: Document Independence

In v6, POAs are embedded inside the will object. **This was wrong.** POAs are standalone legal documents. A user might:
- Create only a POA Property (no will)
- Add a will later and reuse existing people
- Add a spouse later who clones or starts fresh
- When both partners need the same document type, both get created together

**New model: "Document Portfolio"** — each user has independent estate documents sharing a common people pool.

#### People Pool (User-Level)

```
key_names
  id              uuid PK
  userId          uuid FK → users  ← USER-level, not document-level
  firstName       varchar
  middleName      varchar NULLABLE
  lastName        varchar
  relationship    enum('spouse', 'child', 'sibling', 'parent', 'grandparent', 'nibling', 'pibling', 'cousin', 'other')
  email           varchar NULLABLE
  phone           varchar NULLABLE
  city            varchar NULLABLE
  province        varchar NULLABLE
  country         varchar NULLABLE
  gender          varchar NULLABLE
  dateOfBirth     date NULLABLE
  isBlendedFamily boolean DEFAULT false
  createdAt       timestamp
  updatedAt       timestamp
```

**Why user-level `key_names`**: People are shared across ALL documents (wills, POAs). When you name your sister as executor in your will AND as POA agent, it's the same person record. When you create a new document later, you can reuse existing people. Matches v6's `findPersonInfo()` lookup pattern but with proper relational integrity.

#### Estate Documents (Top-Level Entity)

```
estate_documents
  id              uuid PK
  userId          uuid FK → users
  coupleDocId     uuid FK → estate_documents NULLABLE — links partner's matching doc
  documentType    enum('primary_will', 'secondary_will', 'poa_property', 'poa_health')
  province        varchar — determines template
  country         varchar DEFAULT 'Canada'
  status          enum('draft', 'in_progress', 'complete', 'expired')
  completionPct   integer DEFAULT 0
  createdAt       timestamp
  updatedAt       timestamp
```

**`coupleDocId`** links two documents when both partners create the same type together (e.g., spouse's matching will). This replaces v6's profile array indices [0]/[1].

#### Will-Specific Data (only for will documents)

```
will_data
  id              uuid PK
  estateDocId     uuid FK → estate_documents (UNIQUE — one data per doc)
  personalInfo    jsonb — { fullName, email, city, province, country, phone, dob }
  maritalStatus   enum('married', 'single', 'common_law')
  spouseInfo      jsonb — { firstName, lastName, email, phone, city, province, country }
  executors       jsonb — [{ keyNameId, position: 'primary'|'alternate'|'backup' }]
  residue         jsonb — { type, distribution }
  wipeout         jsonb — { entries }
  trusting        jsonb — [{ childKeyNameId, age, shares, trustees: [keyNameId] }]
  guardians       jsonb — [{ keyNameId, position, childKeyNameIds: [] }]
  pets            jsonb — [{ name, type, breed, amount, guardianKeyNameId, backupKeyNameId }]
  additional      jsonb — { organDonation, burial, specialWishes }
  finalDetails    jsonb — { witnessOne, witnessTwo, signingLocation, signingDate }
  completedSteps  varchar[] — array of completed step IDs
  updatedAt       timestamp
```

**Key difference from v6**: References use `keyNameId` (UUID) not name strings. v6's `findPersonInfo()` does name-matching which is fragile — our version joins by ID.

#### POA-Specific Data (only for POA documents)

```
poa_data
  id              uuid PK
  estateDocId     uuid FK → estate_documents (UNIQUE — one data per doc)
  personalInfo    jsonb — { fullName, email, city, province, country, phone, dob }
  primaryAgent    uuid FK → key_names — the attorney
  jointAgent      uuid FK → key_names NULLABLE — co-attorney
  backupAgents    uuid[] — array of key_names IDs
  restrictions    text NULLABLE
  activationType  enum('immediate', 'incapacity')
  completedSteps  varchar[] — array of completed step IDs
  updatedAt       timestamp

-- POA Health gets additional fields:
poa_health_details
  id              uuid PK
  poaDataId       uuid FK → poa_data
  organDonation   boolean DEFAULT false
  dnr             boolean DEFAULT false
  statements      jsonb — { terminalCondition, unconsciousCondition, mentalImpairment, ... }
```

**Design Decision**: Each section is a `jsonb` column (not one blob). This means:
- Save only the changed column on each step (not the whole document)
- Can query/report on individual sections (e.g., "how many users have completed executors?")
- Still flexible like JSON (no rigid column per field)
- Sections are validated by Zod schemas before save

#### Assets

```
assets
  id              uuid PK
  userId          uuid FK → users  ← USER-level (shared across documents)
  assetClassId    integer FK → asset_classes
  willType        enum('primary', 'secondary') DEFAULT 'primary'
  details         jsonb — dynamic fields per asset class (encrypted at rest)
  createdAt       timestamp
  updatedAt       timestamp

asset_classes
  id              serial PK
  classNumber     integer UNIQUE
  name            varchar
  fieldSchema     jsonb — describes the dynamic fields for this class
  createdAt       timestamp
```

**Improvement**: `asset_classes.fieldSchema` defines what fields each class expects. Makes forms truly dynamic and validatable.

```
bequests
  id              uuid PK
  estateDocId     uuid FK → estate_documents
  assetId         uuid FK → assets
  shares          jsonb — [{ keyNameId, percentage }]
  createdAt       timestamp
  updatedAt       timestamp
```

**Why normalize bequests**: Enables "which assets have been assigned?" queries, share validation (must total 100%), and referential integrity.

#### Document Domain

```
document_types
  id              serial PK
  name            varchar — 'primaryWill', 'secondaryWill', 'poaProperty', 'poaHealth'
  displayName     varchar
  description     text NULLABLE
  province        varchar NULLABLE — NULL means all provinces
  country         varchar DEFAULT 'Canada'
  basePrice       integer — in cents (e.g., 8900 = $89.00 CAD)
  isActive        boolean DEFAULT true
  createdAt       timestamp

template_versions
  id              uuid PK
  documentTypeId  integer FK → document_types
  content         text — HTML template with variable placeholders
  version         integer
  isActive        boolean DEFAULT false
  notes           text NULLABLE
  createdById     uuid FK → users NULLABLE
  createdAt       timestamp

document_orders
  id              uuid PK
  userId          uuid FK → users
  discountCodeId  uuid FK → discount_codes NULLABLE
  status          enum('pending', 'paid', 'generated', 'downloaded', 'expired')
  subtotal        integer — in cents, before discount
  discountAmount  integer DEFAULT 0 — in cents
  finalPrice      integer — in cents, after discount
  stripeSessionId varchar NULLABLE
  stripePaymentIntentId varchar NULLABLE UNIQUE
  paidAt          timestamp NULLABLE
  createdAt       timestamp
  updatedAt       timestamp

document_order_items
  id              uuid PK
  orderId         uuid FK → document_orders
  estateDocId     uuid FK → estate_documents — which document this item generates
  documentTypeId  integer FK → document_types
  unitPrice       integer — in cents
  createdAt       timestamp

generated_documents
  id              uuid PK
  orderId         uuid FK → document_orders
  documentTypeId  integer FK → document_types
  estateDocId     uuid FK → estate_documents
  htmlContent     text — generated HTML (for re-generation)
  fileKey         varchar — S3/storage key for PDF
  generatedAt     timestamp
```

#### Partner Domain

```
partners
  id              uuid PK
  name            varchar
  subdomain       varchar UNIQUE — 'mcdonalds' → mcdonalds.ifinallyWill.com
  contactEmail    varchar
  contactName     varchar NULLABLE
  logoUrl         varchar NULLABLE
  primaryColor    varchar DEFAULT '#2CC78C'
  status          enum('active', 'suspended', 'pending')
  defaultDiscountPct  integer DEFAULT 0 — partner-wide default
  revenueSharePct     integer DEFAULT 0 — what % partner earns
  creditsBalance      integer DEFAULT 0 — in cents (earnings - payouts)
  totalEarnings       integer DEFAULT 0 — lifetime earnings in cents
  totalDocumentsGiven integer DEFAULT 0 — free docs given away
  outstandingBalance  integer DEFAULT 0 — amount partner owes us for free docs
  createdAt       timestamp
  updatedAt       timestamp

discount_codes
  id              uuid PK
  partnerId       uuid FK → partners
  code            varchar UNIQUE
  description     text NULLABLE
  discountPct     integer — e.g., 20 = 20% off for user
  isFree          boolean DEFAULT false — partner fully subsidizes
  maxUses         integer NULLABLE
  currentUses     integer DEFAULT 0
  isActive        boolean DEFAULT true
  expiresAt       timestamp NULLABLE
  createdAt       timestamp
  updatedAt       timestamp

code_usages
  id              uuid PK
  codeId          uuid FK → discount_codes
  userId          uuid FK → users
  orderId         uuid FK → document_orders
  discountAmount  integer — cents saved by user
  partnerEarnings integer — cents earned by partner (from revenue share)
  partnerCost     integer DEFAULT 0 — cents partner owes us (for free docs)
  createdAt       timestamp
```

**Partner billing flow**:
1. User applies code → discountAmount applied to order
2. If `isFree`: partner.outstandingBalance += document cost
3. If not free: partner.creditsBalance += partnerEarnings (their revenue share)
4. Monthly: Root sends Stripe payment link to partner for outstandingBalance
5. Monthly: Root pays out creditsBalance to partner (or nets against outstandingBalance)

#### Tenant Domain (API Consumers)

```
api_tenants
  id              uuid PK
  name            varchar
  contactEmail    varchar
  apiKeyId        uuid FK → apiKeys (existing platform table)
  status          enum('active', 'suspended', 'pending')
  rateLimitTier   enum('basic', 'standard', 'premium') DEFAULT 'basic'
  usageThisMonth  integer DEFAULT 0
  createdAt       timestamp
  updatedAt       timestamp
```

Tenants use the existing platform `apiKeys` table for authentication. The REST API authenticates via API key → looks up tenant → applies rate limits.

---

## 7. The obj_statuses Redesign

### Current Problem

In Willsystem-v6, ALL will data lives in one `information` JSON column:

```javascript
// Every save replaces the ENTIRE blob
PUT /api/obj-statuses/{id}
Body: { information: JSON.stringify({ data: [[{...50KB of data...}]] }) }
```

Problems:
- Race conditions (two tabs = last write wins)
- No partial saves (change one field → re-save entire will)
- Can't query individual sections
- Can't track which step was last modified
- No validation before save
- No history/versioning

### New Design: Section-Based Columns

Each `will_data`/`poa_data` row has individual `jsonb` columns per section:

```
will_data.personalInfo    → save when user finishes "About You"
will_data.executors       → save when user finishes "Executors"
poa_data.primaryAgent     → save when user finishes "POA Attorney"
... etc
```

**Benefits**:
- Only the changed section is written (no full-blob replace)
- Each section has its own Zod schema for validation
- Can query "how many users have completed guardians?" with simple SQL
- Can track `updatedAt` per section if needed
- `completedSteps` array tracks wizard progress

**The Zod schemas live in `packages/api-contract`** and are shared between client and server:

```typescript
// packages/api-contract/src/schemas/estate-documents.ts
export const personalInfoSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  city: z.string(),
  province: z.string(),
  country: z.string().default('Canada'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export const executorsSchema = z.array(z.object({
  keyNameId: z.string().uuid(),  // references key_names table
  position: z.enum(['primary', 'alternate', 'backup']),
}));

export const poaAgentsSchema = z.object({
  primaryAgent: z.string().uuid(),   // key_names ID
  jointAgent: z.string().uuid().nullable(),
  backupAgents: z.array(z.string().uuid()),
  restrictions: z.string().nullable(),
  activationType: z.enum(['immediate', 'incapacity']),
});

// ... one schema per section
```

**Migration path**: We can write a migration script that reads `obj_statuses.information` JSON and distributes it into the new normalized structure. This is only needed if there's existing production data to preserve.

---

## 8. Document Independence: POAs as Standalone

### The Problem in Willsystem-v6

In v6, POA data is embedded inside the will's `objectStatus` at steps [14] (POA Property) and [15] (POA Health). This is architecturally wrong because:

1. **POAs are independent legal documents** — A user might need a POA for Property without ever creating a will
2. **Separate document lifecycle** — POAs can be updated independently, expire on different schedules
3. **Different signing requirements** — POAs have different witnessing rules than wills in most provinces
4. **Couples asymmetry** — One spouse might need a POA Health but not Property, while the other needs both

### The v6 Mess: Double-Nesting

The data from POA steps is stored with a double-nesting bug:

```javascript
// What gets saved:
objectStatus[0][14] = { poaProperty: { poaProperty: { attorney: "...", ... } } }
objectStatus[0][15] = { poaHealth: { poaHealth: { attorney: "...", ... } } }

// prepareTemplateData() has to unwrap this:
statusObject.poaProperty = statusObject?.poaProperty?.poaProperty || {};
statusObject.poaHealth = statusObject?.poaHealth?.poaHealth || {};
```

This double-nesting was a bug that became a "feature" — every template and rendering function now depends on it.

### New Design: Document Portfolio

Each user has a **document portfolio** — a collection of independent `estate_documents`:

```
User's Document Portfolio
├── Primary Will          (estate_documents, type: 'primary_will')
│   └── will_data         (one-to-one)
├── POA for Property      (estate_documents, type: 'poa_property')
│   └── poa_data          (one-to-one)
├── POA for Health        (estate_documents, type: 'poa_health')
│   └── poa_data          (one-to-one)
│       └── poa_health_details (one-to-one extension)
└── Secondary Will        (estate_documents, type: 'secondary_will')
    └── will_data         (one-to-one)
```

**Key architectural benefits**:
- User can create POAs independently — no will required
- Each document has its own status, completion %, and step tracking
- Shared `key_names` pool means the same person can be executor in a will AND agent in a POA
- No double-nesting — `poa_data` stores flat, clean fields with proper FK references
- Attorney lookups use `key_names.id` (UUID FK) instead of v6's fragile `findPersonInfo()` name-matching

### Wizard Integration

The wizard presents document creation as a choice:

```
"What would you like to create today?"
┌─────────────────────┐  ┌─────────────────────┐
│ 📄 Last Will &      │  │ 📋 Power of Attorney │
│    Testament        │  │    for Property      │
│                     │  │                      │
│ Protect your family │  │ Choose someone to    │
│ and distribute your │  │ manage your finances │
│ estate              │  │ if you can't         │
│                     │  │                      │
│ From $89            │  │ From $49             │
└─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐
│ 🏥 Power of Attorney│  │ 📦 Complete Bundle   │
│    for Health       │  │    All 4 Documents   │
│                     │  │                      │
│ Choose someone to   │  │ Everything you need  │
│ make health care    │  │ Save $47             │
│ decisions for you   │  │                      │
│                     │  │                      │
│ From $49            │  │ From $189            │
└─────────────────────┘  └─────────────────────┘
```

When the user selects a bundle, ALL documents are created but each has its own wizard flow and independent completion tracking.

---

## 9. Couples / Dual-Profile Redesign

### Current Problems in v6

- ProfileSwitcher modal is confusing ("which profile am I editing?")
- Module-level globals track current profile
- Shared vs individual steps determined by hardcoded pointer indices
- Both profiles stored in same JSON array (objectStatus[0] and [1])
- Secondary wills add profiles [2] and [3] — 4 profiles in one blob

### New Design: `coupleDocId` Self-Reference

When both partners create the same document type, each gets their OWN `estate_document` linked by `coupleDocId`:

```
User A creates Primary Will  →  estate_documents(id: "aaa", type: "primary_will")
User A's spouse gets matched →  estate_documents(id: "bbb", type: "primary_will", coupleDocId: "aaa")
                                                                                  ↑ links to partner's doc
```

**Shared data lives on `key_names` and `assets`** (user-level, not document-level):
- `key_names` belongs to the user — both spouses see the same people
- `assets` belongs to the user — shared across all documents
- Both spouses reference the same people pool

**Individual data lives on `will_data` / `poa_data`** (per document):
- Each document has its own executors, guardians, additional wishes
- Each document has its own personalInfo
- Each document has its own completedSteps tracking

**Profile switching in the UI**:
- URL-based: `/documents/aaa/executors` vs `/documents/bbb/executors`
- Clear visual indicator showing whose document you're editing (top banner with name + avatar)
- Shared steps (key_names, assets) show both names: "People (shared between you and Jane)"
- No modal needed — the URL and visual context make it obvious

**Mirror document generation**:
- After primary user completes → "Create matching [document] for [Spouse]?"
- Auto-copy: executors (swapped — spouse becomes primary beneficiary), guardians (same)
- Spouse can review and modify before finalizing
- This matches Willful/Epilogue patterns

---

## 10. Partner vs Tenant Model

### Partners (Affiliates)

**What they are**: Distribution affiliates who drive users to IFinallyWill via branded subdomains and discount codes.

**What they can do**:
- Login to partner dashboard at `mcdonalds.ifinallyWill.com/partner`
- View analytics: users referred, codes used, revenue generated
- Create/manage discount codes
- View their earnings (creditsBalance) and outstanding charges (outstandingBalance)

**What they CANNOT do**:
- Manage users
- Access individual user data
- Manage templates
- Process payments/refunds
- Grant roles

**Revenue model**:
```
Discount code "MCFAMILY20":
  discountPct: 20         → User pays 20% less
  revenueSharePct: 10     → McDonald's earns 10% of the sale
  isFree: false

Example: User buys $139 Complete bundle with MCFAMILY20:
  User pays: $139 * 0.80 = $111.20
  McDonald's earns: $111.20 * 0.10 = $11.12
  IFinallyWill revenue: $111.20 - $11.12 = $100.08

If isFree: true (McDonald's gives doc for free to employees):
  User pays: $0
  McDonald's owes us: $139 (full price of document)
  Monthly Stripe invoice sent to McDonald's
```

### Tenants (API Consumers)

**What they are**: Businesses that integrate IFinallyWill into their own products via REST API.

**What they can do**:
- Create users via API
- Create wills via API on behalf of users
- Generate documents via API
- Receive webhooks for status changes

**Authentication**: Existing platform `apiKeys` router — already built.

**Rate limiting**: Existing platform rate limiting middleware — already built.

---

## 11. AI Sidechat ("Wilfred") Architecture

### What Neither Competitor Has (Our Differentiator)

Willful and Epilogue have ZERO AI integration. They rely on:
- Static tooltip text
- Pre-written educational content
- Template-based conditional logic

IFinallyWill's AI sidechat is a **significant competitive advantage**.

### Design

**Always-on floating panel** (right side on desktop, bottom sheet on mobile):
- Available on every wizard step
- Knows which step the user is on
- Knows what data the user has filled in so far
- Provides contextual guidance, not generic help

**Example interactions**:

Step: Executors
```
User: "I don't know who to choose as executor"
Wilfred: "An executor is the person who carries out the instructions in your
will. Most people in Ontario choose a trusted family member. You've added
Sarah (your sister) and Michael (your brother) to your family tree. Either
could serve as executor. Would you like to know what an executor's
responsibilities include?"
```

Step: Assets
```
Wilfred: "I see you haven't added any assets yet. Common assets to include
are: your home, vehicles, bank accounts, investments, and life insurance.
You don't need exact values — estimates are fine. Would you like to start
with your home?"
```

### Technical Architecture

```
Platform Component          → Wilfred Use
─────────────────────────────────────────
packages/knowledge (RAG)    → Estate planning document corpus
packages/ai-core            → Gemini/GPT cost-optimized routing
packages/realtime (WS)      → Streaming chat responses
Redis Streams               → Real-time message delivery
services/vk-agent           → Voice mode (future — Gemini Live API)
```

**Knowledge base** trained on:
- Estate planning guides (per province)
- Legal terminology definitions
- Common questions and scenarios
- IFinallyWill-specific instructions
- Province-specific rules (signing requirements, age of majority, etc.)

**Context injection**: On each user message, the system prepends:
```
Current step: Executors
Province: Ontario
Will type: Couples
Family members: Sarah (sister), Michael (brother), Jane (spouse), Tommy (child, 8)
Assets: 3 added (house, savings account, RRSP)
Completed steps: personal, family, assets
```

This makes Wilfred's responses hyper-relevant to the user's situation.

**Cost model** (platform's AI cost optimization):
- Simple questions (definitions, explanations) → GPT-4o-mini ($0.15/1M tokens)
- Complex questions (advice, edge cases) → GPT-4o ($5.00/1M tokens)
- ~70% of questions are simple → blended cost is very low

---

## 12. Partner REST API Design

### Endpoints

```
Authentication: Bearer token (API key from platform's apiKeys system)

GET  /api/v1/partner/profile          → Partner details, balances
GET  /api/v1/partner/analytics         → Usage stats (users, codes, revenue)
GET  /api/v1/partner/analytics/daily   → Daily breakdown
GET  /api/v1/partner/codes             → List discount codes
POST /api/v1/partner/codes             → Create discount code
PUT  /api/v1/partner/codes/:id         → Update code
GET  /api/v1/partner/codes/:id/usage   → Code usage details

--- Tenant API (for API consumers) ---

POST /api/v1/users                     → Create user
GET  /api/v1/users/:id                 → Get user
POST /api/v1/wills                     → Create will for user
GET  /api/v1/wills/:id                 → Get will status
PUT  /api/v1/wills/:id/sections/:name  → Update will section
POST /api/v1/documents/generate        → Generate documents for will
GET  /api/v1/documents/:id             → Get document download URL
GET  /api/v1/document-types            → List available documents + pricing
```

### Implementation

The REST API is a **thin Fastify adapter over tRPC**. We add REST routes in `packages/api/src/routes/rest-v1.ts` that:
1. Validate the API key
2. Look up the partner/tenant
3. Call the corresponding tRPC procedure
4. Return JSON response

This avoids duplicating business logic — the tRPC routers are the single source of truth.

---

## 13. Design System & Theme Architecture

### Two Visual Systems

IFinallyWill has **two distinct visual systems**:

1. **Landing pages** (public marketing) — Keep existing navy/gold branding as-is
2. **Internal app** (wizard, dashboard, admin) — New OKLCH-based modern theme

### Landing Page Branding (Keep As-Is)

```css
/* Existing Willsystem-v6 branding — DO NOT CHANGE */
--tenant-primary: #0A1E86;           /* Navy blue */
--tenant-secondary: #FFBF00;         /* Gold */
--tenant-primary-dark: #0C1F3C;      /* Darker navy */
--color-background-primary: #F4FAF7; /* Fresh mint */
--color-text-primary: #000000;
--color-text-secondary: #333333;

/* Fonts */
font-family: Inter, Playfair Display, Nunito Sans, Source Sans Pro;
```

This branding applies to: Welcome page, How It Works, Compare, About Us, Partners, Help Centre, Affiliate Program.

### Internal App Theme (New — OKLCH)

```css
/* apps/ifinallyWill/src/styles/theme.css */

/* === LIGHT THEME (default) === */
:root {
  /* Backgrounds */
  --bg-dark: oklch(0.95 0 98);
  --bg: oklch(0.97 0 98);
  --bg-light: oklch(0.99 0 98);

  /* Text */
  --text: oklch(0.15 0 98);
  --text-muted: oklch(0.4 0 98);

  /* Primary (warm gold) */
  --primary: oklch(0.76 0.1 98);
  --primary-hover: oklch(0.7 0.12 98);
  --primary-text: oklch(0.15 0 98);

  /* Secondary (cool purple) */
  --secondary: oklch(0.76 0.1 278);
  --secondary-hover: oklch(0.7 0.12 278);
  --secondary-text: oklch(0.98 0 278);

  /* Accents */
  --accent: oklch(0.7 0.15 160);         /* Teal */
  --success: oklch(0.7 0.15 145);        /* Green */
  --warning: oklch(0.8 0.12 85);         /* Amber */
  --error: oklch(0.65 0.2 25);           /* Red */

  /* Borders & Surfaces */
  --border: oklch(0.88 0 98);
  --surface: oklch(0.98 0 98);
  --surface-hover: oklch(0.95 0 98);
}

/* === DARK THEME (toggle) === */
[data-theme="dark"] {
  --bg-dark: oklch(0.1 0 98);
  --bg: oklch(0.15 0 98);
  --bg-light: oklch(0.2 0 98);

  --text: oklch(0.96 0 98);
  --text-muted: oklch(0.76 0 98);

  --primary: oklch(0.76 0.1 98);
  --primary-hover: oklch(0.82 0.08 98);
  --primary-text: oklch(0.1 0 98);

  --secondary: oklch(0.76 0.1 278);
  --secondary-hover: oklch(0.82 0.08 278);
  --secondary-text: oklch(0.1 0 278);

  --border: oklch(0.25 0 98);
  --surface: oklch(0.18 0 98);
  --surface-hover: oklch(0.22 0 98);
}
```

### Mobile-First Responsive Strategy

**Design order**: Mobile → Tablet → Desktop (never the reverse).

```
Mobile (< 640px):
- Single column layout
- Bottom navigation for wizard steps
- Full-width form fields
- Wilfred as bottom-sheet overlay
- Hamburger nav for sections

Tablet (640px - 1024px):
- Two-column layout where appropriate
- Side navigation visible
- Wilfred as collapsible side panel

Desktop (> 1024px):
- Three-column: nav + content + Wilfred
- Full sidebar navigation
- Persistent Wilfred panel (right)
```

### Tailwind v4 Integration

```css
/* @theme directive in Tailwind v4 (CSS-only, no tailwind.config.js) */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.76 0.1 98);
  --color-secondary: oklch(0.76 0.1 278);
  --color-accent: oklch(0.7 0.15 160);
  --color-success: oklch(0.7 0.15 145);
  --color-warning: oklch(0.8 0.12 85);
  --color-error: oklch(0.65 0.2 25);
}
```

Usage: `bg-primary`, `text-secondary`, `border-accent` — standard Tailwind utility classes.

### shadcn/ui Customization

shadcn/ui components will use the OKLCH variables. The `components.json` config maps our tokens to shadcn's expected CSS variables. All form inputs, buttons, cards, dialogs use these tokens.

---

## 14. UX Redesign (Epilogue-Inspired)

### Design Benchmark: Epilogue.co

The client explicitly wants Epilogue-inspired UI/UX for all internal components. Key patterns to replicate:

1. **Clean, minimal design** — Lots of whitespace, large readable text
2. **One primary action per screen** — Never overwhelm the user
3. **Warm, approachable tone** — Legal accuracy in the document, plain language in the UI
4. **Card-based selections** — Visual cards with icons instead of dropdowns
5. **Progress confidence** — "About 20 minutes", step indicators, % completion
6. **Reassurance messaging** — "Don't worry, you can change this later"
7. **Smart conditional flows** — No kids? Skip guardian sections entirely
8. **Auto-save on every field** — Never lose progress
9. **Document preview before payment** — Builds trust and confidence
10. **Post-signing instructions** — The part most platforms forget

### Recommended Wizard Flow

```
Phase 1: Setup (1 min)
├── Province selection → determines templates + terminology
├── "For yourself or you and your partner?" → individual vs couples
└── Create account (email + password, or Google OAuth)

Phase 2: About You (3 min)
├── Your information (name, DOB, address)
├── [If couples] Partner information (name, DOB, email)
└── Family situation (children? yes/no → conditional)

Phase 3: Your People (3-5 min)
├── Add children (name, age, gender for each)
├── Add key people (siblings, parents, others — key_names)
└── Family tree visualization (BalknaGraph)

Phase 4: Your Estate (3-5 min)
├── Add assets (guided — "Do you own a home? Vehicles? Investments?")
├── Specific gifts (assign specific assets to specific people)
├── What's left (residual estate distribution — % or equal split)
└── [If children] Inheritance conditions (age-based release, trustee)

Phase 5: Key Roles (3-5 min)
├── Executor (primary + backup — with explainer)
├── [If minor children] Guardian for children
├── [If pets] Guardian for pets
└── Wipeout clause (what if everyone predeceases — with explainer)

Phase 6: Powers of Attorney (INDEPENDENT document flows)
├── POA for Property (own wizard: agent selection, joint/backup, restrictions, activation)
└── POA for Health (own wizard: agent selection, health directives, organ donation, DNR)

Phase 7: Final Wishes (1-2 min)
├── Organ donation preference
├── Burial/cremation preference
└── Any special wishes or messages

Phase 8: Review & Get Documents (2-3 min)
├── Full summary review (natural language, not data table)
├── Document preview (rendered template)
├── Select documents to generate
├── Apply discount code
├── Payment (Stripe checkout)
├── Download PDFs
└── Signing & witnessing instructions (province-specific)
```

**Total estimated time: ~20 minutes** (matching Willful/Epilogue)

### Navigation UI

Desktop:
```
┌──────────────────────────────────────────────────────────────┐
│  IFinallyWill              About 12 min left                 │
│  ═══════════════════●════════════════  65%                    │
├──────────┬─────────────────────────────────┬─────────────────┤
│          │                                  │                 │
│ ✓ Setup  │  Who should be your executor?    │  💬 Wilfred     │
│ ✓ About  │                                  │                 │
│ ✓ People │  An executor carries out your    │  "Need help     │
│ ◐ Estate │  will's instructions. Most       │   choosing an   │
│ ● Roles  │  people choose a trusted family  │   executor?     │
│ ○ POAs   │  member.                         │   I can explain │
│ ○ Wishes │                                  │   what they do" │
│ ○ Review │  ┌────────────────┐              │                 │
│          │  │ Sarah (sister)  │ ← card      │  [Ask Wilfred]  │
│          │  └────────────────┘              │                 │
│          │  ┌────────────────┐              │                 │
│          │  │ Michael (bro)   │              │                 │
│          │  └────────────────┘              │                 │
│          │                                  │                 │
│          │  [Back]           [Continue →]    │                 │
└──────────┴─────────────────────────────────┴─────────────────┘
```

Mobile:
```
┌────────────────────────┐
│ ══════●════════  65%   │
│ IFinallyWill    ☰      │
├────────────────────────┤
│                        │
│ Who should be your     │
│ executor?              │
│                        │
│ An executor carries    │
│ out your will's        │
│ instructions.          │
│                        │
│ ┌────────────────────┐ │
│ │ Sarah (sister)     │ │
│ └────────────────────┘ │
│ ┌────────────────────┐ │
│ │ Michael (brother)  │ │
│ └────────────────────┘ │
│                        │
│ [Back]    [Continue →]  │
├────────────────────────┤
│     💬 Chat with Wilfred│
└────────────────────────┘
```

---

## 15. Document/Template System + Data Mapping

### Architecture

```
document_types (DB table)
  primaryWill    — $89 base (Ontario)
  secondaryWill  — $49 base
  poaProperty    — $49 base
  poaHealth      — $49 base
  (prices vary by province)

template_versions (DB table)
  Each document_type has one active template per province
  Template = HTML with Handlebars-style variable placeholders
  Version tracked, only one active per type+province
```

### Template Engine

Templates use **Handlebars variable substitution** (not AI generation):

```html
<!-- will-ontario-v3.html -->
<h1>LAST WILL AND TESTAMENT</h1>
<p>I, {{personal.fullName}}, of the {{personal.city}} of {{personal.province}},
declare this to be my Last Will and Testament, hereby revoking all former
Wills and Codicils made by me.</p>

{{#if executors.length}}
<h2>APPOINTMENT OF ESTATE TRUSTEE</h2>
<p>I appoint {{executors[0].name}} as my Estate Trustee.</p>
{{#if executors.length > 1}}
<p>If {{executors[0].name}} is unable or unwilling to act, I appoint
{{executors[1].name}} as my alternate Estate Trustee.</p>
{{/if}}
{{/if}}

{{#each bequests}}
<p>I give {{this.assetDescription}} to {{this.recipientName}}.</p>
{{/each}}
```

### Complete Step → Data → Template Variable Mapping

This is the critical mapping from wizard steps to template variables. Our new system replaces v6's fragile patterns with clean Zod-validated data + UUID references.

#### Will Documents

| Wizard Step | v6 objectStatus Key | Our Table/Column | Template Variables |
|-------------|--------------------|--------------------|-------------------|
| Personal Info | `personal` (step 0) | `will_data.personalInfo` | `{{personal.fullName}}`, `{{personal.city}}`, `{{personal.province}}`, `{{personal.email}}`, `{{personal.telephone}}` |
| Married Status | `marriedq` (step 1) | `will_data.maritalStatus` | `{{isMarried}}`, `{{isCommonRelationship}}` |
| Spouse Info | `married` (step 2) | `will_data.spouseInfo` | `{{spouseInfo.fullName}}`, `{{spouseInfo.firstName}}`, `{{spouseInfo.city}}`, `{{spouseInfo.province}}` |
| Has Kids | `kidsq` (step 3) | Derived from `key_names` count where relationship='child' | `{{hasKids}}` |
| Children | `kids` (step 4) | `key_names` where relationship='child' | `{{#each kids}}{{this.firstName}}{{/each}}` |
| Executors | `executors` (step 5) | `will_data.executors` (keyNameId refs) | `{{#each executors}}{{this.firstName}}{{/each}}` |
| Bequests | `bequests` (step 6) | `bequests` table (assetId + shares) | `{{renderBequests bequests}}` |
| Residue | `residue` (step 7) | `will_data.residue` | `{{residueInfo.selected}}`, `{{#each residueInfo.beneficiary}}` |
| Wipeout | `wipeout` (step 8) | `will_data.wipeout` | `{{#each wipeoutInfo}}{{this.name}}{{/each}}` |
| Trusting | `trusting` (step 9) | `will_data.trusting` (keyNameId refs) | `{{#each trusting}}{{this.name}} at age {{this.age}}{{/each}}` |
| Guardians | `guardians` (step 10) | `will_data.guardians` (keyNameId refs) | `{{#each guardians}}{{this.guardian}} for {{this.ward}}{{/each}}` |
| Pets | `pets` (step 11) | `will_data.pets` (keyNameId refs) | `{{#each pets}}{{this.petName}} cared by {{this.guardian}}{{/each}}` |
| Additional | `additional` (step 14) | `will_data.additional` | `{{additionalInfo.customClauseText}}`, `{{additionalInfo.finalRestingPlace}}` |
| Final Details | `finalDetails` (step 15) | `will_data.finalDetails` | `{{finalDetails.specialInstructions}}` |

#### POA Documents

| Wizard Step | v6 objectStatus Key | Our Table/Column | Template Variables |
|-------------|--------------------|--------------------|-------------------|
| Personal Info | `personal` (reused) | `poa_data.personalInfo` | `{{personal.fullName}}`, `{{personal.city}}` |
| Primary Agent | `poaProperty.attorney` | `poa_data.primaryAgent` FK→key_names | `{{attorneyOne.fullName}}`, `{{attorneyOne.city}}`, `{{attorneyOne.province}}`, `{{attorneyOne.telephone}}` |
| Joint Agent | `poaProperty.joint` | `poa_data.jointAgent` FK→key_names | `{{attorneyJoint.fullName}}`, `{{attorneyJoint.city}}` |
| Backup Agents | `poaProperty.backups` | `poa_data.backupAgents` uuid[] | `{{#each attorneyTwo}}{{this.fullName}}{{/each}}` |
| Restrictions | `poaProperty.restrictions` | `poa_data.restrictions` | `{{restrictions}}` |
| Activation | `poaProperty.activationType` | `poa_data.activationType` | `{{activationType}}` |
| Organ Donation | `poaHealth.organDonation` | `poa_health_details.organDonation` | `{{POAInfo.organDonation}}` |
| DNR | `poaHealth.dnr` | `poa_health_details.dnr` | `{{POAInfo.dnr}}` |
| Health Statements | `poaHealth.statements` | `poa_health_details.statements` | `{{statements.terminalCondition}}`, `{{statements.unconsciousCondition}}` |

### Key Improvement: UUID References Replace Name Matching

**v6 pattern (FRAGILE)**:
```javascript
// findPersonInfo() does string matching across 3 arrays
function findPersonInfo(name, relatives, kids, spouseInfo) {
  // Search: relatives → kids → spouse by exact name match
  // Returns: { city, country, province, fullName, telephone }
}
```

**Our pattern (SOLID)**:
```typescript
// Template data preparation joins by UUID
const executor = await db.query.keyNames.findFirst({
  where: eq(keyNames.id, willData.executors[0].keyNameId)
});
// Returns: full person record with guaranteed referential integrity
```

### Handlebars Helpers (Port from v6)

| Helper | Purpose | Example |
|--------|---------|---------|
| `formatLocation` | City, province, country | `{{formatLocation city province country}}` |
| `capitalLetters` | Uppercase | `{{capitalLetters personal.firstName}}` |
| `concat` | Join strings | `{{concat firstName " " lastName}}` |
| `if_eq` / `if_neq` | Equality checks | `{{#if_eq status "active"}}...{{/if_eq}}` |
| `if_gt` | Greater than | `{{#if_gt age 21}}...{{/if_gt}}` |
| `if_or` / `if_and` | Logical ops | `{{#if_or isMarried hasKids}}...{{/if_or}}` |
| `renderBequests` | Format bequest list | `{{renderBequests bequests}}` |
| `groupByPriority` | Group executors | `{{#groupByPriority executors}}...{{/groupByPriority}}` |

### PDF Generation

Keep Puppeteer approach (already proven in v6):

```
services/pdf-server/          → Node.js Puppeteer service
  POST /generate
    Body: { html: string, options: { format, margin, etc } }
    Returns: PDF buffer
```

Integrated into monorepo as `services/pdf-server`, managed by the platform's process orchestration.

---

## 16. Payment Model

### No Packages — Document Catalog

Users see all available documents and select what they want:

```
Document Catalog (Ontario):
├── Last Will and Testament ............. $89
├── Power of Attorney (Property) ........ $49
├── Power of Attorney (Health) .......... $49
├── Secondary Will ...................... $49
└── ─────────────────────────────────────────
    Complete Bundle (all 4) ............. $189 (save $47)
    Couples Complete (all 4 × 2) ....... $299 (save $175)
```

**Bundle pricing is automatic**: The system detects when selecting multiple documents creates a bundle-eligible combination and shows the discounted price.

### Discount Code Flow

```
1. User enters code at checkout → POST validate code
2. System checks: is_active, not expired, usage < maxUses
3. If valid: calculate discount
   - Regular code: finalPrice = subtotal * (1 - discountPct/100)
   - Free code (isFree): finalPrice = $0
4. Process payment (Stripe if not free, direct generation if free)
5. Record code_usage with earnings/cost tracking
6. Increment discount_code.currentUses
7. Update partner balances
```

---

## 17. Platform Features: Keep / Strip / Repurpose

### KEEP (reuse as-is)

| Feature | Package | Reason |
|---------|---------|--------|
| Auth.js | packages/auth | Google OAuth + sessions |
| MFA (TOTP) | router: mfa | Security for admin/root |
| API Keys | router: apiKeys | Partner/tenant API auth |
| Health check | router: health | Production monitoring |
| Rate limiting | middleware | API protection |
| CSRF protection | middleware | Form security |
| Helmet.js | middleware | Security headers |
| Redis caching | packages/realtime | Session cache, AI streaming |
| Compression | middleware | Brotli/gzip |
| Audit logs | table: auditLogs | Activity tracking |
| GDPR | table: gdprRequests | Data deletion |
| PostgreSQL + Drizzle | packages/db | Database layer |
| Turborepo | root | Build orchestration |

### REPURPOSE (modify for IFinallyWill)

| Feature | Current Purpose | New Purpose |
|---------|----------------|-------------|
| `knowledge` router | RAG for chat widget | RAG for Wilfred (estate planning corpus) |
| `chat` router | AI customer chat | Wilfred sidechat |
| `users` router | VisualKit user mgmt | IFinallyWill user mgmt |
| `analytics` router | Platform analytics | IFinallyWill analytics |
| `auth` router | VisualKit auth | IFinallyWill auth |
| Redis Streams | Chat message broadcast | Wilfred streaming responses |
| VK-Agent | Voice AI for meetings | Wilfred voice mode (future) |

### STRIP (remove code but keep packages intact)

| Feature | Why Remove |
|---------|-----------|
| `widgets` router | No embeddable widget |
| `aiPersonalities` router | Single AI personality (Wilfred) |
| `surveys` router | No surveys |
| `escalations` router | No escalation |
| `problems` router | No problem tracking |
| `chatwoot` router | No support chat integration |
| `crm` router | No CRM |
| `ticketing` router | No ticketing |
| `knowledgeSync` router | No external knowledge sync |
| `communication` router | No multi-channel comms |
| `qualityAssurance` router | No QA reviews |
| `crag` router | No corrective RAG |
| `enterpriseSecurity` router | No SSO/custom roles (use simple 3-role system) |
| `endUsers` router | No widget visitors |
| `verification` router | No SMS/email verification flows |

### KEEP FOR FUTURE (don't delete, just don't use)

| Feature | Future Use |
|---------|-----------|
| `meeting` app | Lawyer video consultations |
| Janus Gateway | Real-time video |
| VK-Agent | Voice-powered Wilfred |
| WebSocket realtime | Already used for Wilfred |

---

## 18. tRPC Router Plan

### New Routers for IFinallyWill

```
packages/api-contract/src/routers/

estateDocuments.ts (top-level document management)
  estateDocuments.create       → create new document (userId, province, type)
  estateDocuments.get          → get document by ID (with will_data or poa_data)
  estateDocuments.list         → list user's document portfolio
  estateDocuments.updateStatus → transition document status
  estateDocuments.getProgress  → completion percentage + missing steps
  estateDocuments.linkCouple   → link two documents via coupleDocId
  estateDocuments.mirrorForSpouse → create mirrored document for spouse

willData.ts (will-specific section management)
  willData.get                → get will data by estateDocId
  willData.updateSection      → update one section (personalInfo, executors, etc.)
  willData.getCompletedSteps  → which steps are done

poaData.ts (POA-specific section management)
  poaData.get                 → get POA data by estateDocId
  poaData.updateSection       → update POA fields (agent, restrictions, etc.)
  poaData.getCompletedSteps   → which steps are done
  poaData.updateHealthDetails → update POA Health extensions (organ donation, DNR, statements)

keyNames.ts (shared people pool)
  keyNames.create     → add person to user's pool
  keyNames.update     → update person
  keyNames.delete     → remove person (check no active references)
  keyNames.list       → list all for user

assets.ts
  assets.create       → add asset
  assets.update       → update asset
  assets.delete       → remove asset
  assets.list         → list user's assets (filterable by willType)

assetClasses.ts
  assetClasses.list   → get all asset classes with field schemas

bequests.ts
  bequests.set        → assign/update bequest for asset in a document
  bequests.delete     → remove bequest
  bequests.listByDoc  → list bequests for an estate document

documents.ts (document generation & ordering)
  documents.listTypes       → available document types (by province)
  documents.createOrder     → start document order
  documents.applyCode       → apply discount code to order
  documents.checkout        → create Stripe session
  documents.generate        → generate PDFs for paid order
  documents.download        → get download URL
  documents.getSigningGuide → province-specific signing instructions

templates.ts (admin/root only)
  templates.list          → list template types + versions
  templates.getActive     → get active template for type+province
  templates.createVersion → upload new template version
  templates.activate      → set a version as active

partners.ts
  partners.create       → create partner (root only)
  partners.update       → update partner details
  partners.list         → list partners (root only)
  partners.getDashboard → partner's own analytics
  partners.getBalance   → partner's financial summary

discountCodes.ts
  discountCodes.create    → create code (partner or root)
  discountCodes.update    → update code
  discountCodes.validate  → check if code is valid + calculate discount
  discountCodes.list      → list codes (by partner)
  discountCodes.getUsage  → usage stats for a code

payments.ts
  payments.list           → list payments (root only)
  payments.getByOrder     → get payment for an order
  payments.handleWebhook  → Stripe webhook handler

wilfred.ts (AI sidechat)
  wilfred.sendMessage     → send chat message with context
  wilfred.getHistory      → get chat history for session
  wilfred.getContext       → get current wizard context for AI
```

### Existing Routers to Keep (modified)

```
auth.ts      → keep, simplify (remove VisualKit-specific flows)
users.ts     → keep, add role management for root
health.ts    → keep as-is
mfa.ts       → keep as-is
apiKeys.ts   → keep as-is
analytics.ts → keep, modify queries for IFinallyWill data
knowledge.ts → keep, retrain on estate planning corpus
chat.ts      → repurpose as Wilfred backend
```

---

## 19. Component Migration Strategy

### Approach

**NOT a 1:1 port**. We're taking concepts and rebuilding in TypeScript with proper patterns:

1. **Read the v6 component** — understand what data it collects and what UI it presents
2. **Design the new component** — TypeScript, react-hook-form, Zod validation, shadcn/ui
3. **Build from scratch** — using v6 as reference for business logic only
4. **Reuse visual concepts** — layout patterns, color choices, branding elements

### Key Component Mappings

| Willsystem-v6 Component | New Component | Notes |
|-------------------------|---------------|-------|
| Personal.jsx (8,601 lines) | ~20 focused step components | Decompose into one component per wizard step |
| FormCity.jsx (59KB) | ProvinceSelect + CityAutocomplete | Use proper React state, not DOM reads |
| AddHuman.jsx (36KB) | FamilyMemberForm | react-hook-form + Zod |
| HumanTable.jsx (87KB) | FamilyMemberList + FamilyMemberCard | shadcn/ui DataTable |
| GuardianForMinors.jsx (75KB) | GuardianStep | Card-based UI, not complex table |
| Additional.jsx (33KB) | FinalWishesStep | Simplified, one-question-per-screen |
| PoaProperty.jsx | PoaPropertyStep | react-hook-form |
| PoaHealth.jsx | PoaHealthStep | react-hook-form |
| FamilyTreePage.jsx | FamilyTreeView | BalknaGraph (keep, license owned) |
| PaymentModal.jsx | CheckoutPage | Full page, not modal |
| FloatingWilfred.jsx | WilfredPanel | Redesigned AI sidechat |
| ObjStatusForm.jsx | N/A (eliminated) | Replaced by tRPC mutations per section |
| objectStatusUtils.js | N/A (eliminated) | Replaced by Zod schemas + tRPC |
| stepUtils.js | wizardConfig.ts | TypeScript enum-based step definitions |
| formHandlers.js | N/A (eliminated) | Replaced by react-hook-form |

### New Libraries Needed

```json
{
  "react-hook-form": "7.x",           // Form state management
  "zod": "3.x",                       // Already in platform
  "@hookform/resolvers": "3.x",       // Zod + react-hook-form bridge
  "@balkangraph/familytree.js": "1.9.45",  // Family tree (license owned)
  "@stripe/stripe-js": "5.x",         // Stripe
  "@stripe/react-stripe-js": "3.x",   // Stripe React
  "framer-motion": "12.x",            // Already in platform (landing app)
  "handlebars": "4.x",                // Template rendering (PDF)
}
```

---

## 20. Landing Page & Registration Reuse

### Landing Pages: ~70% Reuse

The existing Willsystem-v6 landing pages are **close to what the client wants**. They keep the navy/gold branding, Epilogue-inspired design, and existing content structure.

#### Pages to Port (As-Is with Minor Fixes)

| Page | File | Reuse % | Notes |
|------|------|---------|-------|
| Welcome (hero, features, pricing, FAQ) | `Welcome.jsx` | ~70% | Fix content, update pricing to new catalog model |
| How It Works | `HowItWorks.jsx` | ~80% | Content mostly accurate, fix step descriptions |
| Compare | `Compare.jsx` | ~70% | Update comparison table, keep advantage cards |
| About Us | `AboutUs.jsx` | ~80% | Minor content updates |
| Partners/Affiliate | `Partners.jsx`, `AffiliateProgram.jsx` | ~60% | Adapt to new partner model |
| Help Centre | `HelpCentre.jsx` | ~70% | Update FAQ content |

#### Existing Branding Elements (KEEP)

```
Colors: Navy (#0A1E86), Gold (#FFBF00), Off-white (#F5F5F7)
Fonts: Inter (body), Playfair Display (headings), Nunito Sans (UI)
Animations: framer-motion (fade-in, scroll triggers, carousel)
Layout: Hero + sections pattern, responsive grid
Icons: Lucide React
```

#### Content Architecture (Port from Inertia to tRPC)

v6 uses a `landingContent` server prop via Inertia.js:
```javascript
// v6: Props from Laravel controller
export default function Welcome({ landingContent, editing }) { ... }

// New: tRPC query
const { data: landingContent } = trpc.content.getLanding.useQuery();
```

The `landingContent` object structure (sections: hero, aiAdvantage, how, features, pricing, information, pet, howdifferent, featured, probate, aihelp, faq, footer) is worth keeping — it's a clean CMS-like pattern.

#### Key Components to Port

| Component | Purpose | Port Strategy |
|-----------|---------|---------------|
| `UnifiedNavbar` | Fixed nav, responsive | Rebuild with shadcn NavigationMenu |
| `HeroCarousel` | 3-slide hero with CTAs | Port animation logic, use shadcn Carousel |
| `AIAdvantage` | Wilfred differentiator section | Port as-is, update copy |
| `PricingSection` | Document pricing cards | Rebuild for new catalog model (no packages) |
| `FaqSection` | Accordion FAQ | Use shadcn Accordion |
| `SiteFooter` | Editable footer | Port as-is |
| `EditableText` | Admin inline editing | Port pattern for admin CMS |

### Registration Page: ~70% Reuse

The registration wizard is **heavily inspired by Epilogue** — which the client likes. Key patterns to keep:

1. **Multi-step wizard flow** — Step state machine with back/forward navigation
2. **localStorage persistence** — Save form data between sessions
3. **Province → document selection** flow (adapted for new document catalog)
4. **Google OAuth integration** — Keep the flow, use Auth.js backend
5. **Browser back-button confirmation** — Prevent accidental loss

#### What Changes in Registration

| Aspect | v6 (Old) | New |
|--------|---------|-----|
| Package selection step | Choose a package tier | Choose individual documents (catalog model) |
| Pricing display | Package prices | Per-document + bundle discount |
| Account creation | Laravel Sanctum | Auth.js (Google + email/password) |
| Form state | Inertia.js useForm | react-hook-form + Zod |
| Server communication | Axios + Inertia | tRPC mutations |
| Couples detection | PlanningTogetherStep | Same flow, creates linked estate_documents |

### Porting Effort Estimate

| Area | Hours | Priority |
|------|-------|----------|
| Navbar + footer | 4-6h | P0 |
| Welcome page (hero, sections) | 6-8h | P0 |
| Registration wizard | 8-12h | P0 |
| How It Works | 3-4h | P1 |
| Compare page | 4-6h | P1 |
| About/Partners/Help | 6-8h | P2 |
| Admin content editing (EditableText) | 4-6h | P2 |
| **Total** | **~35-50h** | |

---

## 21. Open Questions for Discussion

### Must Decide Before Implementation

1. **BalknaGraph family tree** — License is owned. Keep as a "view your family tree" visualization (read-only view of key_names)? Use simple card-based forms for data entry (matching Epilogue pattern)?

2. **Secondary wills** — Still in scope? They add a `secondary_will` document type to the portfolio. Willful and Epilogue both support them. If yes, same wizard flow as primary will but with fewer applicable steps.

3. **Document pricing** — Are the example prices ($89 will, $49 POA) accurate? Who sets prices per province? Root only?

4. **Partner self-registration** — Can a company apply to become a partner via a public form, or does root manually create every partner?

5. **Newsletter / marketing** — v6 had newsletter subscriptions and Python marketing email campaigns. Needed for launch?

6. **Support** — Removed ticketing from scope. Is "email us" sufficient, or do we need a basic contact form?

7. **Multi-language** — v6 had a Python translation service. Is multi-language a launch requirement or later phase?

8. **Data migration** — Are there existing users in live Willsystem-v6 that need data migrated? Or clean launch?

9. **Signing instructions** — For now, provide PDF instructions per province for how to sign and witness? (Meeting room for future)

### Answered / Confirmed

10. ~~POA independence~~ → **CONFIRMED**: POAs are standalone documents, not embedded in wills. See Section 8.

11. ~~BalknaGraph license~~ → **CONFIRMED**: License owned, can use `@balkangraph/familytree.js`.

12. ~~Partner billing~~ → **CONFIRMED**: Monthly Stripe payment links for outstanding balance. See Section 6 partner billing flow.

13. ~~key_names naming~~ → **CONFIRMED**: Table named `key_names` (not `family_members`), matching v6 wizard terminology.

14. ~~Theme split~~ → **CONFIRMED**: Landing keeps navy/gold branding. Internal app uses OKLCH theme. See Section 13.

15. ~~Mobile-first~~ → **CONFIRMED**: Mobile-first responsive design, light theme default, dark as toggle.

16. ~~Epilogue UI benchmark~~ → **CONFIRMED**: All new internal components use Epilogue-inspired clean/minimal design.

### Nice to Validate

17. **Asset encryption** — v6 encrypts asset details at app level (Laravel encrypted cast). PostgreSQL encryption at rest sufficient, or do we need app-level encryption too?

18. **Worldcities reference data** — v6 has a worldcities CSV for city autocomplete. Port this or use a geocoding API?

19. **Bundle discount calculation** — Automatic (system detects eligible combos) or manually configured per document combination?

20. **Email service** — v6 has a Python email server (PM2 process). Do we use the platform's existing email capability, or do we need a dedicated email service?

---

> **Next Step**: Review this document. Discuss any questions or changes. Then we create the phased implementation plan.
