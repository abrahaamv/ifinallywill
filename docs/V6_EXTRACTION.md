# Willsystem-v6 Complete Extraction Reference

> **Purpose**: Single authoritative reference for porting Willsystem-v6 to the platform monorepo.
> **Source codebase**: `/home/abrahaam/Documents/GitHub/Willsystem-v6/`
> **Compiled from**: 6 research agent analyses covering Personal.jsx monolith, templates/PDF, React components, Laravel backend, database migrations, and utility functions.
> **Date**: 2026-02-24

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Database Schema (38 Tables)](#2-database-schema-38-tables)
3. [Object Status System](#3-object-status-system)
4. [Will Wizard Flow (15 Steps)](#4-will-wizard-flow-15-steps)
5. [Template System](#5-template-system)
6. [PDF Generation Pipeline](#6-pdf-generation-pipeline)
7. [Payment System](#7-payment-system)
8. [Registration Wizard](#8-registration-wizard)
9. [React Components Inventory](#9-react-components-inventory)
10. [Laravel Backend Inventory](#10-laravel-backend-inventory)
11. [Utils & Business Logic](#11-utils--business-logic)
12. [Multi-Tenancy & Auth](#12-multi-tenancy--auth)
13. [Platform Migration Mapping](#13-platform-migration-mapping)

---

## 1. Executive Summary

### What is Willsystem-v6?

Willsystem-v6 is a **multi-tenant estate planning SaaS** built on Laravel 11 + Inertia.js + React. It enables Canadian residents to create legally valid wills, powers of attorney, and secondary wills through a guided wizard interface. The system supports 10 Canadian provinces with jurisdiction-specific legal templates.

### What are we extracting?

We are porting the **entire will-creation business logic** to the platform monorepo (React 18 + Vite 6 + Fastify/tRPC backend). This includes:

- **Database**: 38 tables across 54 migrations (PostgreSQL)
- **Will Wizard**: 15-step multi-profile wizard (8,601-line `Personal.jsx` monolith)
- **Registration Wizard**: 10-15 conditional steps (1,836-line `Register.jsx`)
- **Template System**: 45 document templates across 10 provinces, 30+ Handlebars helpers
- **PDF Generation**: Puppeteer-based HTML-to-PDF pipeline with legal formatting
- **Payment**: Stripe checkout with 6 packages, discount codes, upsells, tax calculation
- **Backend**: 48 Laravel controllers, 31 models, 10 services, 14 artisan commands
- **Utils**: 22 utility files with 180+ functions and 6,500+ lines of business logic
- **AI Integration**: Wilfred chat assistant, MCP server, text-to-speech

### Overall Scope

| Metric | Count |
|--------|-------|
| Database tables | 38 |
| Migrations | 54 |
| Laravel controllers | 48 |
| Laravel models | 31 |
| Laravel services | 10 |
| tRPC-equivalent routes | ~150 |
| React components (major) | 25+ |
| Will wizard steps | 15 |
| Registration wizard steps | 10-15 (conditional) |
| Document templates | 45 (JS) + 19 (Blade email) |
| Handlebars helpers | 30+ |
| Utility files | 22 |
| Utility functions | 180+ |
| Lines of code (frontend) | ~30,000+ |
| Lines of code (backend) | ~15,000+ |
| Packages (pricing) | 6 |
| Provinces supported | 10 |

### Key Architecture Decisions

1. **Central Data Store**: All will data lives in a single JSON blob called `objectStatus` stored in the `obj_statuses` table. This is a massive denormalized structure containing up to 4 profile arrays, each with 18 data indices.
2. **Multi-Profile System**: Supports primary, spousal, and 2 secondary will profiles within a single `objectStatus`. Profile switching during shared steps is a core complexity.
3. **Template Compilation**: Handlebars templates compiled client-side in the browser (not server-rendered). Templates are JavaScript arrays of section objects.
4. **PDF Server**: Separate Express.js + Puppeteer server on port 5050 for HTML-to-PDF conversion.
5. **Multi-Tenancy**: Subdomain-based tenant resolution with traits for auto-filtering.

---

## 2. Database Schema (38 Tables)

### 2.1 Core Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `users` | id, name, email, password, user_type (1=user, 2=admin, 3=root, 4=lawyer), tenant_id, phone, gender, city, province, country, selected_package, email_opt_in, google_id, google_token, password_change_required, last_marketing_email_at, marketing_email_count | System users |
| `tenants` | id, name, domain, logo_url, primary_color, secondary_color, plan, trial_ends_at, is_demo, expires_at, program_type, program_config (JSON), status | Multi-tenant organizations |
| `obj_statuses` | id, information (JSON BLOB), related_id (FK users), created_at, updated_at | **THE central data store** - contains entire will state as JSON |
| `packages` | id, name, price, description, campaign, expiration_date, is_signature_required, document_versions | Service packages (6 package types) |
| `payments` | id, user_id, payment_intent_id, amount, status, obj_status_id, package_id, discount_code, is_upsell, payment_date | Stripe payment records |
| `contracts` | id, description | Contract definitions |

### 2.2 Template System Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `template_types` | id, name, display_name, description, is_custom, base_template_type_id, province, country | Document template type definitions |
| `template_versions` | id, template_type_id (FK), version, content (TEXT), is_active | Versioned template content |

### 2.3 Asset Management Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `assets` | id, client_id (FK users), asset_class_id (FK), will_type | User assets for will planning |
| `asset_classes` | id, name, description, class_number, category, keywords, is_common | Asset type classifications |
| `asset_details` | id, asset_id (FK), description, value, is_primary | Detailed asset information |

### 2.4 Family Tree Table

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `trees` | id, user_id (FK), tree (JSON) | Family tree data structure |

### 2.5 Support System Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `support_tickets` | id, user_id, ticket_number, title, description, type, status, priority, category, assigned_to, resolved_at | Support tickets |
| `ticket_responses` | id, ticket_id (FK), user_id (FK), content, is_staff_response | Ticket thread responses |
| `ticket_categories` | id, name, description | Ticket categorization |

### 2.6 Scheduling Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `lawyers` | id, first_name, last_name, date_of_birth, email, tenant_id | Lawyer accounts |
| `law_firms` | id, name, address, city, province, country, phone, email | Law firm entities |
| `reservations` | id, lawyer_id (FK), user_id (FK), start_time, end_time, status | Lawyer appointment bookings |
| `availability_slots` | id, lawyer_id (FK), day_of_week, start_time, end_time, is_available | Lawyer availability |
| `time_offs` | id, lawyer_id/sales_team_id, start_date, end_date, reason | PTO records |
| `sales_team` | id, first_name, last_name, date_of_birth, email, tenant_id | Sales staff |
| `sales_availability_slots` | id, sales_team_id (FK), day_of_week, start_time, end_time | Sales availability |
| `sales_reservations` | id, sales_team_id (FK), user_id (FK), start_time, end_time, status | Sales bookings |

### 2.7 Communication Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `email_logs` | id, to, from, subject, template_name, variables (JSON), status, error_message, attachments (JSON), sent_at, tenant_id | Email audit trail |
| `newsletter` | id, email, is_subscribed, subscribed_at, unsubscribed_at, tenant_id | Newsletter subscriptions |

### 2.8 Other Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `discount_codes` | id, code, description, discount_percentage, is_active, expires_at, max_uses, current_uses | Promotional discount codes |
| `landing_contents` | id, section, key, value | CMS content for landing pages |
| `cities` (worldcities) | id, name, country, province, latitude, longitude | City autocomplete database |
| `institutions` | id, name, type, description | Institution data |
| `personal_access_tokens` | id, tokenable_type, tokenable_id, name, token, abilities, last_used_at | Sanctum API tokens |
| `sessions` | id, user_id, ip_address, user_agent, payload, last_activity | Laravel sessions |
| `cache` | key, value, expiration | Application cache |
| `cache_locks` | key, owner, expiration | Cache lock management |
| `jobs` | id, queue, payload, attempts, reserved_at, available_at | Queue jobs |
| `job_batches` | id, name, total_jobs, pending_jobs, failed_jobs | Batch job tracking |
| `failed_jobs` | id, uuid, connection, queue, payload, exception, failed_at | Failed job records |
| `password_reset_tokens` | email, token, created_at | Password reset tokens |

### 2.9 Relationship Diagram (Key FKs)

```
tenants (1) ──────── (*) users
users (1) ──────────── (1) obj_statuses (via related_id)
users (1) ──────────── (*) payments
users (1) ──────────── (*) assets
users (1) ──────────── (1) trees
users (1) ──────────── (*) support_tickets
users (1) ──────────── (*) reservations
packages (1) ────────── (*) payments
template_types (1) ──── (*) template_versions
assets (1) ──────────── (1) asset_details
asset_classes (1) ────── (*) assets
lawyers (1) ──────────── (*) reservations
lawyers (1) ──────────── (*) availability_slots
support_tickets (1) ──── (*) ticket_responses
```

---

## 3. Object Status System

### 3.1 The Central JSON Blob

The `obj_statuses.information` column stores **the entire will state** as a massive JSON array. This is the single most important data structure in the system.

### 3.2 Structure: 4 Profiles, 18 Data Indices Each

```javascript
objectStatus = [
  [ // Profile 0 (Primary Will Owner)
    { personal: {...}, owner: "alice@example.com", packageInfo: {...} },  // [0] Personal + Package
    { marriedq: {...} },                    // [1] Married question (yes/no)
    { married: {...email, firstName, ...} }, // [2] Spouse details
    { kidsq: {...} },                       // [3] Kids question (yes/no)
    { kids: [...] },                        // [4] Children array
    { executors: [...] },                   // [5] Executor assignments
    { relatives: [...] },                   // [6] Extended family/friends
    { bequests: {...} },                    // [7] Gift assignments
    { residue: {...} },                     // [8] Residual estate
    { wipeout: {...} },                     // [9] Wipeout clause
    { trusting: [...] },                    // [10] Testamentary trust
    { guardians: [...] },                   // [11] Guardian assignments
    { pets: {...} },                        // [12] Pet guardians
    { additional: {...} },                  // [13] Funeral/wishes
    { poaProperty: [...] },                 // [14] POA Property agents
    { poaHealth: [...] },                   // [15] POA Health agents
    { finalDetails: {...} },                // [16] Final details
    { documentDOM: [...] }                  // [17] Rendered HTML cache
  ],
  [ // Profile 1 (Spousal Will Owner) - same 18-index structure
    ...
  ],
  [ // Profile 2 (Secondary Will A) - same structure
    ...
  ],
  [ // Profile 3 (Secondary Will B) - same structure
    ...
  ]
]
```

### 3.3 Profile Types & Identification

| Profile Index | Type | Owner Format | Document Type |
|--------------|------|--------------|---------------|
| 0 | Primary | `alice@example.com` | `primaryWill` or `defaultWill` |
| 1 | Spousal | `bob@example.com` | `spousalWill` |
| 2 | Secondary A | `alice@example.com*secondaryWill` | `secondaryWill` |
| 3 | Secondary B | `bob@example.com*secondaryWill` | `secondaryWill` |

### 3.4 Profile Switching Logic

Profiles are identified by `owner` email. Key functions:

```javascript
getObjectStatus(objectStatus, currentProfile)
// Finds profile where personal.email === currentProfile
// Returns entire profile array (18 indices)

getPartnerProfile(currentProfile, objectStatus)
// Returns spouse email if exists

shouldSwitchToPartner(pointer, currentProfile, objectStatus)
// Returns boolean: does this shared step need partner switch?
```

**Profile Switching Flow**:
1. Save current objectStatus to DB (critical -- avoids data loss)
2. Show transition notification to user
3. `setTimeout(1200ms)`: Fade page transition
4. Set `currentProfile` to partner email
5. Force re-render with new profile data

### 3.5 Package Info (Embedded in Profile 0)

```javascript
objectStatus[0][0].packageInfo = {
  documents: [
    { id: 1, docType: 'primaryWill', owner: 'alice@example.com', willIdentifier: 'primaryWill', dataStatus: 'complete', associatedWill: 'primaryWill' },
    { id: 2, docType: 'poaProperty', owner: 'alice@example.com', associatedWill: 'primaryWill', dataStatus: 'incomplete' },
    { id: 3, docType: 'spousalWill', owner: 'bob@example.com', willIdentifier: 'spousalWill', dataStatus: 'incomplete' },
    // ...
  ],
  packageName: "Complete Plan",
  packagePrice: 159,
  // ...
}
```

### 3.6 Data Persistence Flow

```
User submits step form
  -> getFormData() / getBequestArrObj() etc. (extract from DOM)
  -> validate.formData() / validate.bequest() etc. (validation)
  -> IF valid:
     -> propertiesAndData = [{ name: 'fieldKey', data: formData }]
     -> pushInfo(pointer) -> handleProfileData(currentProfile, propertiesAndData, objectStatus)
     -> handleProfileData() merges data into objectStatus[profileIndex]
     -> setObjectStatus(updatedObjectStatus) <- React state
     -> localStorage.setItem('fullData', JSON.stringify(updatedObjectStatus))
     -> updateDataObject(updatedObjectStatus, currIdObjDB) <- async DB save
```

### 3.7 Progress Calculation

```javascript
calculateProfileProgress(profileEmail) ->
  Get relevantSteps based on document type:
    Secondary: [1, 3, 4, 5, 6, 14] (6 steps only)
    Primary/Spousal: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 13, 14] + [10,11 if POAs]
  For each step: Check if stepData exists + stepConfig.check(stepData) passes
  Return (completedSteps / relevantSteps.length) * 100

calculateTotalProgress(profiles) ->
  Sequential: Primary 0-100%, Spousal 100-200%, Secondary A 200-300%, Secondary B 300-400%
```

---

## 4. Will Wizard Flow (15 Steps)

### 4.1 Step Configuration

| Pointer | Step ID | Category | Title | Shared? | Skip Secondary? |
|---------|---------|----------|-------|---------|-----------------|
| 0 | personal-info | aboutYou | Personal Information | No | N/A |
| 1 | family-tree | yourFamily | Key Names | **Yes** | N/A |
| 2 | assets | yourEstate | My Assets | **Yes** | Yes |
| 3 | bequest | yourEstate | Gifts | No | Yes |
| 4 | executors | yourArrangements | Will Executors | **Yes** | No |
| 5 | residue | yourEstate | What's Left | No | Yes |
| 6 | wipeout | yourArrangements | Wipeout Information | No | Yes |
| 7 | trust | yourEstate | Inheritance of Children | **Yes** | No |
| 8 | guardian-minors | yourFamily | Guardian for Minors | **Yes** | Yes |
| 9 | guardian-pets | yourFamily | Guardian for Pets | **Yes** | Yes |
| 10 | poa-property | yourPOAs | Power of Attorney Property | No | N/A |
| 11 | poa-health | yourPOAs | Power of Attorney Health Care | No | N/A |
| 12 | additional | yourArrangements | Additional Information | No | Yes |
| 13 | enhance | yourArrangements | Enhance Your Package | No | No |
| 14 | review | yourArrangements | Review Documents | No | No |

### 4.2 Categories (Sidebar Navigation)

```javascript
categories = {
  aboutYou:          { steps: [personal-info] },
  yourFamily:        { steps: [family-tree, guardian-minors, guardian-pets] },
  yourEstate:        { steps: [assets, bequest, residue, trust] },
  yourArrangements:  { steps: [executors, wipeout, additional, enhance, review] },
  yourPOAs:          { steps: [poa-property, poa-health] }
}
```

### 4.3 Step Visibility Rules

- **POA-only packages**: Hide yourEstate, yourArrangements (except enhance); keep yourFamily (key names only)
- **Secondary wills**: Hide assets (2), trust (7), guardians (8), pets (9), additional (12), enhance (13); no POAs
- **Single will packages**: Show all steps minus spousal-specific ones
- **Couples packages**: Show all; Assets/Executors/Family/Trust/Guardians shared; Residue/Bequest/Wipeout per-profile

### 4.4 Shared Steps & Profile Switching

**Shared Steps**: 1, 2, 4, 7, 8, 9

When a shared step is completed on the primary profile, the system shows a modal asking to switch to the spouse profile and repeat. Exceptions:

| Pointer | Exception |
|---------|-----------|
| 1 (Family Tree) | Modal confirms "Key Names" entry; triggers nav tour afterward |
| 2 (Assets) | Both profiles use checkboxes together; NO switching |
| 7 (Trusting) | Data saved to BOTH profiles automatically; NO switching |
| 3 (Bequest) | A->B switching: Primary Bequest -> Spouse Bequest -> Residue |

### 4.5 Step Details

#### Pointer 0: Personal Information
- **Component**: `<FormCity />`
- **Data**: Full name, email, DOB, gender, address (city/province/country), phone, send method
- **Validation**: `validate.formData(personalData)`
- **API**: `storeDataObject()` -- creates DB record with packageInfo
- **Special**: Clears all `documentDOM` arrays when updated (marks docs for regeneration)

#### Pointer 1: Family Tree (Key Names)
- **Component**: `<FamilyTreePage />`
- **Data**: Married/common-law partner, children (names, ages), extended relatives
- **Modal**: PersonConfirmationModal -> "I Understand" -> triggers nav tour
- **API**: Auto-saved by FamilyTreePage; syncs to objectStatus

#### Pointer 2: Assets
- **Component**: `<AssetsComponent />`
- **Data**: Asset type (real estate, vehicles, investments, business, etc.), details, values
- **Special**: Both primary + spouse profiles check assets together (NO profile switching)
- **Ref-based**: `assetsRef.current.isInFormMode` / `isInCreateMode` for button state

#### Pointer 3: Bequest (Gifts)
- **Component**: `<FamilyTreePage mode="bequest" readOnly />`
- **Data**: Asset-to-recipient mappings, distribution percentages
- **Profile Switching**: Primary bequest -> Spouse bequest -> Residue
- **Validation**: `validate.bequest(bequestData)`

#### Pointer 4: Executors
- **Component**: `<HumanTable />`
- **Data**: Executor names, emails, phone, address, role (primary/alternate)
- **Multi-Profile Validation**: Both profiles must have at least 1 executor (for couples)

#### Pointer 5: Residue (What's Left)
- **Component**: `<Residue />`
- **Data**: Beneficiary for leftover estate, fallback instructions
- **Options**: Specific beneficiaries, custom clause, parents then siblings per stirpes, etc.

#### Pointer 6: Wipeout
- **Component**: `<Wipeout />`
- **Data**: Wipeout clause details, conditional distributions
- **Options**: 100% to parents and siblings, 100% to siblings, specific beneficiaries, etc.

#### Pointer 7: Trust (Testamentary Trust)
- **Component**: `<Trusting />`
- **Data**: Trust terms for minor beneficiaries, distribution age/conditions
- **Special**: If "no trusting" selected, saves timestamps to BOTH profiles

#### Pointer 8: Guardian for Minors
- **Component**: `<GuardianForMinors />`
- **Data**: Guardian name, contact, alternate guardians, special instructions, priority ranking (1-5)

#### Pointer 9: Guardian for Pets
- **Component**: `<Pets />`
- **Data**: Pet names, types, guardian assignments, backup guardians, care amounts
- **Special**: Always marks step complete (timestamp only); pets are optional

#### Pointer 10: POA Property
- **Component**: `<PoaProperty />`
- **Data**: Agent name/email/phone, alternate agents, powers granted, activation type (immediate/conditional)
- **Sync**: `syncPOADataAcrossProfiles()` saves to ALL profiles (primary + spouse + secondaries)

#### Pointer 11: POA Health
- **Component**: `<PoaHealth />`
- **Data**: Healthcare agent, living will preferences, healthcare directives, organ donation, DNR
- **Statements**: Terminal condition, unconscious condition, mental impairment, violent behavior, pain management
- **Sync**: Same cross-profile sync as POA Property

#### Pointer 12: Additional Information
- **Component**: `<Additional />`
- **Data**: Final resting place (6 options), custom clause text, other wishes list
- **Triggers**: Category celebration -> dashboard on completion

#### Pointer 13: Enhance Your Package
- **Component**: `<UpsellPackage />`
- **Upsells**: Add signature requirement, add spousal will, add secondary wills, add additional POAs

#### Pointer 14: Review Documents
- **Component**: `<DocumentSelector />`
- **Shows**: All documents with completion %, download/preview
- **Payment gate**: Requires payment before PDF editor (except admin users)

### 4.6 nextStep() Flow (400+ lines)

```
nextStep() async ->
  1. Call pushInfo(pointer) -- validates, saves to objectStatus + localStorage + DB
  2. Check profile switching (shared steps):
     IF shouldSwitchToPartner && hasPartner:
       Save to DB, show transition notification, fade page, switch profile
       Return (exit early)
  3. Special category logic:
     Assets -> Bequest -> (spouse bequest if couples) -> Residue -> Executors -> Wipeout -> Dashboard
  4. Find next incomplete step in category
     IF found: navigate to it
     ELSE: celebrate category completion, navigate to dashboard
```

### 4.7 Couples Workflow

```
Primary completes:
  About You (1 step)
  My Family (3 steps)
  My Estate:
    Assets (both profiles together)
    Bequest (primary) -> [Switch to Spouse Modal] -> Bequest (spouse)
    -> Residue (primary) -> Residue (spouse)
    -> Trust (both together)
  Your Arrangements:
    Executors (primary) -> [Switch Modal] -> Executors (spouse)
    Wipeout (primary) -> Wipeout (spouse)
    Additional -> Enhance -> Review
  POAs:
    POA Property -> POA Health (synced to all profiles)
```

---

## 5. Template System

### 5.1 Overview

- **45 document templates** across 10 Canadian provinces
- **6 document types** per province: defaultWill, primaryWill, spousalWill, secondaryWill, poaHealth, poaProperty
- **19 email templates** (Blade-based, for porting to React email)
- Templates are **JavaScript arrays of section objects**, NOT raw HTML files

### 5.2 Template File Locations

**Document Templates**: `resources/js/Components/PDF/Content/Templates/Canada/`

```
Canada/
  Alberta Wills + POA/
    defaultWill.js, primaryWill.js, spousalWill.js, secondaryWill.js, poaHealth.js, poaProperty.js
  British Columbia Wills + POA/
    ... (same 6 files)
  Manitoba Wills + POA/
  New Brunswick Wills + POA/
  Newfoundland and Labrador Wills + POA/
  Nova Scotia Wills + POA/
  Ontario Wills + POA/
  Prince Edward Island Wills + POA/
  Saskatchewan Wills + POA/
```

**Note**: Only 9 provinces listed above (Quebec is excluded -- civil law jurisdiction with different legal framework).

### 5.3 Template Section Object Structure

```javascript
// Each template file exports an array of section objects:
[
  {
    id: "defaultWill-titleIntro",
    title: `<p style="text-align: center"><strong>LAST WILL AND TESTAMENT OF {{personal.fullName}}</strong></p>`,
    order: 1,
    fallback: "",
    content: `<p>I, {{personal.fullName}}, presently of {{personal.city}}{{#if personal.province}}, {{personal.province}}{{/if}} declare that this is my Last Will and Testament.</p>`,
    keywords: ["personal.fullName", "personal.city", "personal.province"],
    children: []  // nested child sections
  },
  // ... more sections
]
```

### 5.4 Handlebars Helpers (30+)

**Location**: `resources/js/utils/templateRenderer.js`

#### Comparison Helpers
| Helper | Syntax | Purpose |
|--------|--------|---------|
| `if_eq` | `{{#if_eq a b}}...{{/if_eq}}` | Equality check |
| `if_neq` | `{{#if_neq a b}}...{{/if_neq}}` | Inequality check |
| `if_gt` | `{{#if_gt a b}}...{{/if_gt}}` | Greater than |
| `if_or` | `{{#if_or a b c}}...{{/if_or}}` | OR operator |
| `if_and` | `{{#if_and a b c}}...{{/if_and}}` | AND operator |
| `unless_eq` | `{{#unless_eq a b}}...{{/unless_eq}}` | Unless equal |

#### Formatting Helpers
| Helper | Syntax | Purpose |
|--------|--------|---------|
| `formatLocation` | `{{formatLocation city province country}}` | Outputs "of City, Province, Country" |
| `capitalLetters` | `{{capitalLetters text}}` | Converts to UPPERCASE |
| `concat` | `{{concat arg1 arg2 arg3}}` | String concatenation |
| `subtract` | `{{subtract a b}}` | Numeric subtraction |
| `get` | `{{get object.property}}` | Safe nested property access |

#### Domain-Specific Helpers
| Helper | Syntax | Purpose |
|--------|--------|---------|
| `findPersonInfo` | `{{#findPersonInfo "Name" relatives kids spouseInfo}}` | Locate person in family tree |
| `isLawFirm` | `{{#isLawFirm name}}` | Check if name is law firm |
| `isSpecificRelation` | `{{#isSpecificRelation relation}}` | Check known relation types |
| `renderBequests` | `{{#renderBequests bequests relatives kids spouseInfo}}` | Render bequest list with backups |
| `groupByPriority` | `{{#groupByPriority executors}}` | Group executors by priority level |
| `eachGroup` | `{{#eachGroup}}` | Iterate executor groups |
| `prevGroup` | `{{#prevGroup}}` | Access previous executor group |
| `groupByPosition` | `{{#groupByPosition guardians}}` | Group guardians by position |

### 5.5 Template Variables

#### Base Variables (All Documents)
```javascript
templateData = {
  personal: { fullName, firstName, middleName, lastName, email, city, province, country, gender, phone },
  isMarried: boolean,
  isCommonRelationship: boolean,
  spouseInfo: { fullName, firstName, middleName, lastName, city, province, country, phone, relative },
  hasKids: boolean,
  kids: [{ fullName, firstName, lastName, age, city, province, country }],
  relatives: [{ firstName, lastName, middleName, fullName, relative, city, province, country, phone }]
}
```

#### Will-Specific Variables
```javascript
executors: [{ firstName, lastName, priority (0=primary, 1=backup...), city, province, country, phone }],
bequests: [{ id, bequest, names, shares, backup, isCustom, shared_uuid }],
trusting: [{ age, shares, firstName, lastName }],
minTrustingAge / maxTrustingAge: number,
guardians: [{ guardian, backup, position (0=primary) }],
pets: [{ name, type, guardian, backup, amount, numericAmount, isShared }],
residueInfo: { selected, beneficiary: [...], clause },
wipeoutInfo: { selectedCategory, table_dataBequest: [...] },
additionalInfo: {...},
willType: "PRIMARY" | "SPOUSAL" | "SECONDARY",
documentType: "primaryWill" | "spousalWill" | "defaultWill" | "secondaryWill"
```

#### POA Health Variables
```javascript
attorneyOne: { fullName, city, province, country, telephone, relation },
attorneyJoint: { ...same },
attorneyTwo: [{ ...same }],  // backup attorneys array
restrictions: string,
POAInfo: { organDonation: boolean, dnr: boolean },
statements: {
  terminalCondition: { selected: boolean, wishes: string },
  unconsciousCondition: { selected, wishes },
  mentalImpairment: { selected, wishes },
  violentBehavior: { selected, wishes },
  painManagement: { selected, wishes }
}
```

#### POA Property Variables
```javascript
attorneyOne: { ...same as health },
attorneyJoint: { ...same },
attorneyTwo: [{ ...same }],
restrictions: string,
activationType: "immediate" | "conditional"
```

### 5.6 Template Versioning (Database-Driven)

- Each `template_types` record can have multiple `template_versions`
- Only one version is `is_active = true` at a time
- Frontend calls `/api/templates/document-template?documentType=primaryWill&province=Ontario`
- **Fallback chain**: Province template -> Ontario fallback -> hardcoded default

### 5.7 Email Templates (19 Blade Files)

| Template | Purpose |
|----------|---------|
| `welcome.blade.php` | New user welcome |
| `document-delivery.blade.php` | PDF documents attached |
| `document-review.blade.php` | Document approval request |
| `payment-link.blade.php` | Payment URL email |
| `payment-confirmation.blade.php` | Payment received |
| `password-reset.blade.php` | Password reset |
| `contact-thank-you.blade.php` | Contact form thank you |
| `contact-admin-notification.blade.php` | Admin contact notification |
| `support-ticket-created/assigned/response/status-update.blade.php` | Support workflow |
| `newsletter-welcome.blade.php` | Newsletter subscription |
| `marketing-reminder/reengage/final-push.blade.php` | Marketing automation (3 tiers) |
| `system-monitor-report.blade.php` | System monitoring |
| `raw-html.blade.php` | Custom HTML fallback |

---

## 6. PDF Generation Pipeline

### 6.1 Complete Flow

```
User Data (React objectStatus)
    |
    v
prepareTemplateData() -- formats objectStatus into template variables
    |
    v
renderTemplate(sections, data) -- compiles Handlebars template
    |
    v
HTML with Handlebars resolved to actual content
    |
    v
PDFEditor component -- TipTap WYSIWYG editor displays/edits HTML
    |
    v
User clicks "Download PDF" or "Send as PDF"
    |
    v
POST to PDF_SERVER_URL/generate-pdf
    |
    v
Express.js Puppeteer Server (port 5050, HTTPS)
    |
    v
browser.setContent(htmlContent) -> page.pdf()
    |
    v
A4 PDF with headers/footers, base64 encoded
    |
    v
Frontend: download link OR email attachment
```

### 6.2 PDF Server Configuration

**Location**: `resources/js/pdf-server/server.js`

- **Framework**: Express.js + Puppeteer + CORS
- **Port**: 5050 (HTTPS with Let's Encrypt certs)
- **Endpoint**: `POST /generate-pdf`

**Request**:
```json
{
  "htmlContent": "<html>...</html>",
  "fileName": "John Doe-primaryWill.pdf",
  "documentTitle": "Last Will and Testament",
  "personName": "John Doe"
}
```

**Response**:
```json
{
  "message": "PDF successfully generated",
  "pdfBase64": "JVBERi0xLjQKJ..."
}
```

**PDF Formatting**:
- Format: A4, Portrait
- Margins: 25mm top, 20mm bottom, 10mm left/right
- Headers: Right-aligned document title (Times New Roman serif)
- Footers: Right-aligned page numbers
- Line numbers: Added on left margin for legal formatting (when sending as PDF)
- Print background enabled

### 6.3 Key PDF Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `sendDocumentsAsPDF()` | `documentsUtils.js` | Generate PDFs for all docs, add line numbers, email |
| `sendDocumentsForApproval()` | `documentsUtils.js` | Send approval request with review token |
| `generateLineNumbers()` | `documentsUtils.js` | Add sequential line numbering to left margin |
| `renderTemplate()` | `templateRenderer.js` | Compile Handlebars template with data |
| `prepareTemplateData()` | `templateRenderer.js` | Transform objectStatus to template variables |
| `convertSectionsToTemplate()` | `templateRenderer.js` | Convert section array to Handlebars string |

### 6.4 Document Storage

```javascript
// Rendered HTML cached in objectStatus:
documentDOM: {
  primaryWill: { v1: { content: "<html>...</html>" } },
  poaHealth: { v1: { content: "<html>...</html>" } },
  // ...
}
```

- First document (index 0) always unlocked
- Subsequent documents unlock when previous has `v1.content`
- POAs require associated will owner's will to exist first

---

## 7. Payment System

### 7.1 Package Pricing (6 Packages)

| Package Key | Price | Was | Documents | Province Filter |
|-------------|-------|-----|-----------|-----------------|
| `basicWillNoSecondary` | $89 | -- | 1 Will | Non-ON/BC |
| `basicWillWithSecondary` | $89 | -- | 1 Will + 1 Secondary | ON/BC only |
| `completePlanNoSecondary` | $159 | -- | 1 Will + 2 POAs | Non-ON/BC |
| `completePlanWithSecondary` | $159 | -- | 1 Will + 1 Secondary + 2 POAs | ON/BC only |
| `couplesPlanNoSecondary` | $249 | $349 | 2 Wills + 4 POAs | Non-ON/BC |
| `couplesPlanWithSecondary` | $249 | $349 | 2 Wills + 2 Secondary + 4 POAs | ON/BC only |

**Secondary Will provinces**: Ontario, British Columbia (only these two support secondary wills)

### 7.2 Stripe Integration

**Payment Flow**:
1. User reaches checkout step (registration) or attempts PDF download (will wizard)
2. `createPaymentIntent()` -- backend creates Stripe Payment Intent
3. PaymentModal renders with `<CardElement />` from `@stripe/react-stripe-js`
4. User enters card -> `stripe.confirmCardPayment(clientSecret)`
5. Backend webhook confirms payment -> updates `payments` table
6. Frontend receives success callback -> unlocks document access

**Payment Trigger Points**:
- On registration (checkout step)
- On package selection in will wizard
- On attempting to open PDF editor (if not paid)
- On document selection (if completed + not paid)

**Backend Endpoints**:
- `POST /api/payment-intent` -- Create Stripe Payment Intent
- `POST /api/payments/webhook` -- Stripe webhook handler
- `GET /api/payments/status` -- Check payment status by obj_status_id
- `POST /api/payments/send-link` -- Send payment link via email
- `GET /api/payments/verify-checkout` -- Verify Stripe Checkout Session

### 7.3 Discount Codes

```javascript
// Table: discount_codes
{
  code: "SUMMER2025",
  description: "Summer promotion",
  discount_percentage: 20,
  is_active: true,
  expires_at: "2025-09-01",
  max_uses: 100,
  current_uses: 42
}
```

**Endpoints**: `POST /api/discount/verify`, `POST /api/discount/check`

### 7.4 Tax Calculation

**Location**: `resources/js/utils/taxUtils.js`

Calculates Canadian provincial sales tax:
- GST (5%) + PST (varies by province)
- HST (combined) in ON, NB, NL, NS, PEI
- No PST in AB, NT, NU, YK
- Breakdown displayed in checkout step

### 7.5 Upsell System

**Enhance Your Package** (Pointer 13):
- Add signature requirement
- Add spousal will (if married, no spousal will yet)
- Add secondary wills (if ON/BC, company shares/online business)
- Add additional POAs

`handlePackageUpgrade()` adds new document to packageInfo, triggers payment if needed.

---

## 8. Registration Wizard

### 8.1 Overview

**File**: `resources/js/Pages/Auth/Register.jsx` (1,836 lines)

The registration wizard is a multi-step form that collects user preferences before account creation. It is separate from the will wizard (Personal.jsx) and feeds into it.

### 8.2 Steps (10-15, Conditional)

| Step | ID | Component | Condition | Data Collected |
|------|----|-----------|-----------|----------------|
| 1 | welcome | WelcomeStep | Always | None (intro screen) |
| 2 | location | LocationStep | Always | city, province, country |
| 3 | name | NameStep | Always | first_name, middle_name, last_name, phone_number |
| 4 | account | AccountStep | Always | email, password (or Google OAuth) |
| 5 | secondaryWill | SecondaryWillStep | ON/BC only | wants_secondary_will |
| 6 | poa | POAStep | Always | poa_type (property/health/both/none) |
| 7 | partner | PartnerStep | Always | has_partner (yes/no), marital_status |
| 8 | partnerName | PartnerNameStep | has_partner=yes | spouse_first_name, spouse_last_name, spouse_email, spouse_phone |
| 9 | partnerLocation | PartnerLocationStep | partner + different address | spouse_city, spouse_province, spouse_country |
| 10 | planningTogether | PlanningTogetherStep | partner + not from couples selection | wants_spousal_package |
| 11 | packageSelection | PackageSelectionStep | Always | selected_package |
| 12 | checkout | CheckoutStep | Always | Payment confirmation or skip |

### 8.3 Form Data Structure

```javascript
defaultFormData = {
  // Location
  city: '', province: '', country: '',
  // Name
  name: '', first_name: '', middle_name: '', last_name: '', common_name: '',
  // Secondary Will
  wants_secondary_will: null,
  // POA
  wants_poa: null, poa_type: null,
  // Partner
  has_partner: '', marital_status: '',
  spouse_name: '', spouse_first_name: '', spouse_middle_name: '', spouse_last_name: '',
  spouse_email: '', spouse_phone: '', spouse_same_address: true,
  spouse_city: '', spouse_province: '', spouse_country: '',
  // Package
  wants_spousal_package: null, selected_package: null,
  package_price: 0, package_name: '',
  skip_package_selection: false, from_couples_plan_selection: false,
  // Payment
  payment_status: '', payment_intent_id: '', payment_method: '',
  // Other
  has_children: '', will_type: 'family_will',
  email: '', password: '', password_confirmation: '',
  is_google_user: false, google_id: '',
  phone_number: '',
  terms_accepted: false, marketing_opt_in: false
}
```

### 8.4 Registration Submission Flow

```
1. User completes all steps
2. handleSubmit():
   a. Create user account (POST /register or Google OAuth)
   b. Build objectStatus from registration data
   c. Initialize packageInfo with documents based on selected_package
   d. Call storeDataObject() to save objectStatus to DB
   e. Assign document ownership via assignDocumentOwnership()
   f. Send welcome email (fire and forget)
   g. Redirect to /personal (will wizard)
3. Will wizard loads objectStatus from DB and continues from there
```

### 8.5 Key Helper Functions

- `generateSpousalEmail(primaryEmail)`: Creates `{user}-spousal@{domain}` email for spouse
- `ensurePhoneHasPlus(value)`: Ensures phone starts with "+"
- `sendRegistrationWelcomeEmail(userData, packageData)`: Non-blocking welcome email
- `loadSavedState()`: Loads wizard state from localStorage for resume
- `performLogoutCleanup()`: Clears localStorage on fresh registration load

---

## 9. React Components Inventory

### 9.1 Core Wizard Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `Personal.jsx` | 8,601 | **THE** will wizard monolith -- all 15 steps, profile switching, data flow |
| `Create.jsx` | ~200 | Entry point, passes Inertia props to Personal.jsx |
| `Register.jsx` | 1,836 | Registration wizard, 10-15 steps |

### 9.2 Will Step Components

| Component | Lines | Props | Global Export |
|-----------|-------|-------|--------------|
| `FormCity.jsx` | 1,192 | onCitySelect, validationErrors, formValues | `getFormData()` |
| `FamilyTreePage.jsx` | ~2,000+ | mode, readOnly, datas, objectStatus | Auto-saves |
| `AssetsComponent.jsx` | ~1,500+ | ref-based | `assetsRef` |
| `Bequest.jsx` | 700+ | 13 props (auth, datas, assets, etc.) | `getBequestArrObj()` |
| `HumanTable.jsx` | 1,857 | 8 props (datas, executorNames, etc.) | `getHumansArrObj()` |
| `Residue.jsx` | ~500 | datas, errors | Via form handlers |
| `Wipeout.jsx` | ~500 | datas, errors | Via form handlers |
| `Trusting.jsx` | ~500 | datas, errors | Via form handlers |
| `GuardianForMinors.jsx` | 1,526 | 5 props (datas, errors, etc.) | `getGuardiansForMinors()` |
| `Pets.jsx` | ~500 | datas, errors | Via form handlers |
| `PoaProperty.jsx` | ~800 | ref-based | Ref save delegate |
| `PoaHealth.jsx` | ~800 | ref-based | Ref save delegate |
| `Additional.jsx` | 802 | 5 props (datas, errors, etc.) | `getAdditionalInformation()` |
| `UpsellPackage.jsx` | ~400 | package info | Upsell handler |
| `DocumentSelector.jsx` | ~600 | documents, onSelectDocument, hasPayment | Selection handler |
| `FinalDetails.jsx` | 105 | datas | `getFinalDetails()` |

### 9.3 Registration Step Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `WelcomeStep.jsx` | ~100 | Landing intro screen |
| `LocationStep.jsx` | ~200 | City/province/country selection |
| `NameStep.jsx` | 147 | First/middle/last name + phone |
| `AccountStep.jsx` | 357 | Email/password or Google OAuth |
| `SecondaryWillStep.jsx` | 190 | Secondary will eligibility (ON/BC) |
| `POAStep.jsx` | 218 | POA type selection (4 options) |
| `PartnerStep.jsx` | 250+ | Has partner + relationship type |
| `PartnerNameStep.jsx` | ~200 | Spouse name/email/phone |
| `PartnerLocationStep.jsx` | ~200 | Spouse address (if different) |
| `PlanningTogetherStep.jsx` | ~150 | Joint vs separate planning |
| `PackageSelectionStep.jsx` | ~400 | Package tier selection |
| `CheckoutStep.jsx` | 300+ | Order summary + payment |

### 9.4 Modal Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `PaymentModal.jsx` | 66KB | Stripe Elements payment modal |
| `ProfileSelector.jsx` | 312 | Profile assignment for documents |
| `PersonConfirmationModal.jsx` | 244 | "I Understand" confirmation for shared steps |
| `DocumentOrderModal.jsx` | 239 | Document completion order enforcement |
| `CelebrationModal.jsx` | ~200 | Category completion confetti |
| `SecondaryWillModal.jsx` | ~150 | Secondary will explanation |

### 9.5 Shared UI Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `FloatingWilfred.jsx` | 33 | AI chat floating button |
| `PricingCard.jsx` | 445 | Package pricing display card |
| `ProfileSidebar.jsx` | 210 | Left sidebar document selector |
| `InstructionComponent.jsx` | 76 | Step instruction banner |
| `InstructionBanner.jsx` | 147 | Step config + banner wrapper |
| `AddHuman.jsx` | 708 | Add/edit person form |
| `AddPersonDropdown.jsx` | ~200 | Select person from family tree |
| `CityAutocomplete.jsx` | ~300 | City search with autocomplete |
| `CustomToast.jsx` | ~100 | Toast notifications |
| `TourGuide.jsx` | ~200 | Interactive tutorial system |
| `PetSection.jsx` | 133 | Pet guardianship marketing section |

### 9.6 Admin Components

| Component | Purpose |
|-----------|---------|
| `PDFEditor.jsx` (5,127 lines) | TipTap WYSIWYG for editing generated documents |
| `TemplateEditor.jsx` | Admin template editing interface |
| `packagesData.js` (263 lines) | Package definitions and pricing configuration |

### 9.7 Design Patterns

1. **Global Export Functions**: Steps expose `getFormData()` / `getBequestArrObj()` etc. as window globals for parent to call
2. **Ref-Based Delegation**: Some components (Assets, POA) use `ref.current.save()` pattern
3. **Styling**: Hybrid approach -- Tailwind CSS + styled-components + Bootstrap
4. **Animations**: Framer Motion for entrance/hover/exit effects throughout
5. **Data Tables**: React Data Table Component for lists (executors, guardians, bequests)
6. **State**: React useState + localStorage for persistence, no Redux/Zustand

---

## 10. Laravel Backend Inventory

### 10.1 Controllers (48 Total)

#### Authentication (8 Controllers)
| Controller | Key Methods |
|-----------|-------------|
| `AuthenticatedSessionController` | store (login), destroy (logout) |
| `RegisteredUserController` | store (register with email verification) |
| `GoogleOAuthController` | redirect, callback (Google OAuth for login) |
| `GoogleAuthController` | redirect, callback (Google OAuth for calendar) |
| `EmailVerificationPromptController` | show verification page |
| `EmailVerificationNotificationController` | resend verification |
| `PasswordResetLinkController` | store (send reset link) |
| `NewPasswordController` | store (reset with token) |

#### Core Business (15 Controllers)
| Controller | Key Methods | Purpose |
|-----------|-------------|---------|
| `ObjStatusController` | CRUD + getRecentStatuses, getByEmail, searchById, getStatusesByDateRange | **Central data store** operations |
| `PaymentController` | createPaymentIntent, sendPaymentLink, handleStripeWebhook, checkPaymentStatus, checkUpsellPayment, verifyCheckoutSession, storePayment (20+ methods) | Stripe payment processing |
| `PackageController` | index, show | Package listing |
| `PackageSelectionController` | showSelection, saveSelectedPackage | Package selection workflow |
| `TemplateController` | getTemplateTypes, getByProvince, getActiveByProvince, getCurrentByProvince, getByVersion, getAvailableProvinces, getDocumentTemplate (30+ methods) | Template management |
| `AssetController` | CRUD + getAssets, searchUsers, getUserByEmail, getClientAssets | Asset management |
| `TreeController` | CRUD + updateByUser, getUserTree, saveUserTree, updatePersonalInfoReferences | Family tree operations |
| `StripeController` | handleWebhook, handleCheckoutSession | Stripe webhooks |
| `ContractController` | index | Contract listing |
| `CityController` | search | City autocomplete |
| `DiscountController` | verifyDiscountCode, checkDiscountCode, CRUD | Discount management |
| `ProfileController` | edit, update, destroy, validateEmail | User profile |
| `SupportTicketController` | CRUD + addResponse, updateStatus, assignTicket, dashboard, analytics (14 methods) | Support system |

#### Admin & Management (9 Controllers)
| Controller | Purpose |
|-----------|---------|
| `LawyerController` | Lawyer CRUD + availability + reservations + time-offs + law firm creation |
| `SalesTeamController` | Sales team CRUD + availability + reservations |
| `UserManagementController` | Admin user CRUD + hasWill, updateRelatives |
| `AdminUserController` | Create client user on behalf |
| `TenantApprovalController` | Tenant approval/rejection workflow |
| `DocumentsApprovalController` | Document approval UI |
| `FilesReviewController` | File review |
| `AllFilesController` | File listing |
| `PackageStatusController` | Package status tracking |

#### API v1 (6 Controllers)
| Controller | Purpose |
|-----------|---------|
| `Api/V1/AuthController` | API token auth (register, login, logout, me) |
| `Api/V1/UserController` | API user CRUD + getByEmail |
| `Api/V1/ObjectStatusController` | API object status CRUD + searchById |
| `Api/V1/TokenController` | Token generation for 3rd parties |
| `Api/TenantRegistrationController` | Tenant self-registration + subdomain check |
| `Api/BrandingController` | Tenant branding retrieval |

#### Specialized (10 Controllers)
| Controller | Purpose |
|-----------|---------|
| `EmailController` | sendEmail, sendRawEmail, sendTestEmail, getStatistics, retryEmail |
| `EmailTemplateController` | Email template management |
| `EmailPreferencesController` | Unsubscribe handling |
| `NewsletterController` | signup, subscribe, unsubscribe |
| `TranslationController` | Document translation with async jobs |
| `Api/AIModeController` | AI chat with streaming, text-to-speech |
| `Api/LandingAIAssistantController` | Landing page AI assistant |
| `Api/MCPController` | MCP server integration (execute, getTools, health) |
| `AffiliateController` | Affiliate program applications |
| `GoogleCalendarController` | Google Calendar event CRUD |

### 10.2 Models (31 Total)

| Model | Key Relationships | Traits |
|-------|-------------------|--------|
| `User` | hasOne(ObjStatus), hasMany(Appointment, Availability) | BelongsToTenant |
| `Tenant` | hasMany(User) | -- |
| `ObjStatus` | belongsTo(User) | -- |
| `Package` | -- | -- |
| `Payment` | belongsTo(User, ObjStatus) | -- |
| `TemplateType` | hasMany(TemplateVersion), hasOne(activeVersion) | -- |
| `TemplateVersion` | belongsTo(TemplateType) | -- |
| `Asset` | belongsTo(User, AssetClass), hasOne(AssetDetail) | -- |
| `AssetClass` | hasMany(Asset) | -- |
| `AssetDetail` | belongsTo(Asset) | -- |
| `Tree` | belongsTo(User) | -- |
| `SupportTicket` | belongsTo(User), hasMany(TicketResponse) | -- |
| `TicketResponse` | belongsTo(SupportTicket, User) | -- |
| `TicketCategory` | -- | -- |
| `EmailLog` | belongsTo(Tenant) | BelongsToTenant |
| `DiscountCode` | -- | -- |
| `Newsletter` | -- | BelongsToTenant |
| `Lawyer` | hasMany(AvailabilitySlot, Reservation, TimeOff) | -- |
| `Reservation` | belongsTo(Lawyer, User) | -- |
| `AvailabilitySlot` | belongsTo(Lawyer) | -- |
| `SalesTeam` | hasMany(SalesAvailabilitySlot, SalesReservation, TimeOff) | -- |
| `SalesReservation` | belongsTo(SalesTeam, User) | -- |
| `SalesAvailabilitySlot` | belongsTo(SalesTeam) | -- |
| `TimeOff` | belongsTo(Lawyer or SalesTeam) | -- |
| `LawFirm` | -- | -- |
| `Institution` | -- | -- |
| `City` | -- | -- |
| `Contract` | -- | -- |
| `LandingContent` | -- | -- |

### 10.3 Services (10 Total)

| Service | Key Methods | Purpose |
|---------|-------------|---------|
| `DocumentProgressService` | calculateUserProgress, calculateProfileProgress, getRelevantSteps, isStepComplete | Will progress % for marketing segmentation |
| `MarketingEmailService` | runDailyCampaign, segmentUsers, prioritizeUsers, sendEmails | Daily marketing automation (segment: reminder/reengage/final_push) |
| `MarketingAnalyticsService` | healthCheck, analyzeUsers, calculateProgress, previewSegments | Python-based analytics for segmentation |
| `GoogleCalendarService` | createEvent, addAttendeeToEvent | Calendar integration |
| `TemplateService` | getAllTemplates, getTemplateByType, clearCache | Template caching layer |
| `TranslationService` | translateHTML, translateBatch | OpenAI-powered document translation |
| `EmailService` | send, sendBatch | Email sending orchestration |
| `BrandingService` | getBrandingForEmail | Tenant-specific branding |
| `MonitoringService` | runMonitoringTests, testLaravel, testRegister, testLogin, testPDF, testEmail, testAI, sendEmailReport (20+ methods) | System monitoring with email alerts |
| `TenantFilterService` | filter queries by tenant | Tenant query scoping |

### 10.4 Middleware (12 Total)

| Middleware | Purpose |
|-----------|---------|
| `ResolveTenant` | Extract tenant from subdomain, validate status, set context |
| `EnsureAdmin` | Require user_type = 2 |
| `EnsureRoot` | Require user_type = 3 |
| `EnsureAdminOrRoot` | Require user_type 2 or 3 |
| `EnsureAdminRootOrLawyer` | Require user_type 2, 3, or 4 |
| `EnsureNotRegularUser` | Block user_type = 1 |
| `EnsureUserOrRoot` | Allow user_type 1 or 3 |
| `EnsureSupportAdmin` | Allow support access for admin/root/lawyer |
| `RestrictTenantAdmin` | Restrict tenant-scoped admin actions |
| `AllowGuestsAndAdmins` | Allow unauthenticated + admin access |
| `HandleInertiaRequests` | Inertia.js props injection |
| `SetAssetUrl` | CDN asset URL configuration |

### 10.5 Artisan Commands (14 Total)

| Command | Signature | Purpose |
|---------|-----------|---------|
| `CommandExecute` | `command:execute {--force}` | Interactive production setup menu |
| `CreateRootUser` | `user:create-root` | Create super admin |
| `GenerateToken` | `generate:token {email} {id}` | Document approval tokens |
| `RestoreVladAccount` | `vlad:restore` | Account restoration from SQL |
| `SeedAssetClasses` | `seed:asset-classes` | Seed asset classifications |
| `SeedDiscountCodes` | `seed:discount-codes` | Seed discount codes |
| `SeedPackages` | `seed:packages` | Seed all 6 packages |
| `SeedTemplates` | `seed:templates` | Seed provincial templates from JS files |
| `SeedTenant` | `tenant:seed` | Create/update tenant data |
| `SeedWorldCities` | `seed:worldcities` | Seed city autocomplete data from CSV |
| `SendMarketingEmails` | `marketing:send-emails` | Daily marketing campaign |
| `SystemMonitor` | `monitor:system` | Daily system health checks |
| `TestEmail` | `email:test` | Test email delivery |
| `UpdateCTAText` | `cta:update-to-start-for-free` | Update CTA button text |

### 10.6 Mail Classes (5)

| Class | Purpose |
|-------|---------|
| `DynamicTemplateEmail` | Template-based with variables, attachments, logging |
| `DocumentDeliveryEmail` | Document PDF delivery |
| `DocumentReviewEmail` | Document approval request |
| `WelcomeEmail` | New user welcome |
| `RawHtmlEmail` | Raw HTML content |

### 10.7 Jobs (1)

| Job | Purpose |
|-----|---------|
| `TranslateDocumentJob` | Async document translation via queue |

---

## 11. Utils & Business Logic

### 11.1 Utility Files (22 Files, 6,500+ Lines, 180+ Functions)

**Location**: `resources/js/utils/`

| File | Lines | Key Functions | Purpose |
|------|-------|---------------|---------|
| `objectStatusUtils.js` | ~800 | `getObjectStatus()`, `extractData()`, `getCostumerStepDataMap()`, `handleProfileData()`, `getPartnerProfile()`, `shouldSwitchToPartner()` | Central data access/mutation for objectStatus |
| `documentsUtils.js` | ~600 | `sendDocumentsAsPDF()`, `sendDocumentsForApproval()`, `generateLineNumbers()`, `sendWelcomeEmail()`, `assignTemplateVersionForDocument()` | Document generation and delivery |
| `templateRenderer.js` | ~500 | `renderTemplate()`, `prepareTemplateData()`, `convertSectionsToTemplate()`, `registerHandlebarsHelpers()` | Handlebars template compilation |
| `documentAssignmentUtils.js` | ~400 | `assignDocumentOwnership()`, `createCompleteObjectStatus()`, `determineDocumentType()` | Document-to-profile assignment |
| `packageUtils.js` | ~300 | `packageDocuments()`, `initializePackageDocuments()`, `getPackageContents()` | Package document initialization |
| `stepUtils.js` | ~300 | `getVisibleSteps()`, `isStepComplete()`, `getStepConfig()`, `STEP_CONFIG` | Step visibility and completion logic |
| `profileUtils.js` | ~250 | `selectProfile()`, `calculateProfileProgress()`, `calculateTotalProgress()` | Profile switching and progress |
| `profileWorkflowHelpers.js` | ~250 | `syncPOADataAcrossProfiles()`, `celebrateCategoryCompletion()`, `handlePersonalInfoUpdated()` | Profile workflow orchestration |
| `familyTreeSync.js` | ~200 | `updateRelativesFromAddPersonDropdown()`, `syncFamilyTreeWithObjectStatus()` | Family tree <-> objectStatus sync |
| `FamilyTreeRelationships.js` | ~200 | `getRelationshipTypes()`, `determineRelationship()`, `isSpecificRelation()` | Relationship type definitions |
| `formHandlers.js` | ~200 | `getFormData()`, `getBequestArrObj()`, `getHumansArrObj()`, `getGuardiansForMinors()` | Form data extraction |
| `taxUtils.js` | ~150 | `getTaxBreakdown()`, `calculateTax()`, `getProvincialRate()` | Canadian provincial tax calculation |
| `discountUtils.js` | ~100 | `verifyDiscountCode()`, `applyDiscount()`, `calculateDiscountedPrice()` | Discount code application |
| `emailService.js` | ~150 | `sendEmail()`, `sendBulkEmail()`, `getEmailStats()` | Frontend email API wrapper |
| `authUtils.js` | ~100 | `performLogoutCleanup()`, `isAuthenticated()`, `getUserType()` | Auth helpers |
| `relativeUtils.js` | ~100 | `formatRelativeName()`, `findRelativeByName()`, `getRelativeOptions()` | Relative name/type utilities |
| `legalTermExplanations.js` | ~200 | `getLegalTermExplanation()`, `LEGAL_TERMS` | Legal term definitions for AI/tooltips |
| `mcpClient.js` | ~150 | `executeMCPTool()`, `getMCPTools()`, `checkMCPHealth()` | MCP server client |
| `useTenantColors.js` | ~50 | `useTenantColors()` | React hook for tenant-specific colors |
| `OldStepUtils.js` | ~200 | Legacy step utility functions | Deprecated (kept for backward compatibility) |

### 11.2 Key Algorithms

#### Profile Progress Calculation
```javascript
calculateProfileProgress(profileEmail, objectStatus, familyTreeData, userHasAssets) ->
  1. Determine document type for this profile (primary/spousal/secondary)
  2. Get relevant steps:
     Secondary: [1, 3, 4, 5, 6, 14]
     Primary/Spousal: [0,1,2,3,4,5,6,7,8,9,12,13,14] + [10,11] if POA
  3. For each step:
     Extract step data from objectStatus
     Run stepConfig.check(stepData) -- returns boolean
  4. Return (completed / total) * 100
```

#### POA Cross-Profile Sync
```javascript
syncPOADataAcrossProfiles(poaType, poaData, objectStatus) ->
  1. Get all profiles that should have this POA
  2. For each profile:
     objectStatus[profileIndex][poaIndex] = poaData
  3. Save entire objectStatus to DB
  // Ensures all profiles share identical POA data
```

#### Secondary Will Profile Cloning
```javascript
selectProfile(objectStatus, email, 'secondaryWill') ->
  1. Check if *secondaryWill profile exists
  2. If not: Clone from base profile:
     Copy: personal, marriedq, married, kidsq, kids, relatives
     Empty: executors, bequests, residue, wipeout, trusting, guardians, pets, additional, poaProperty, poaHealth, finalDetails, documentDOM
  3. Create new profile at objectStatus[2] or [3]
  4. Set owner = email + "*secondaryWill"
  5. Save to DB
  6. Switch to new profile
```

#### Document Assignment
```javascript
assignDocumentOwnership(objectStatus, profileEmail, document) ->
  1. Find document in packageInfo.documents by id
  2. Set document.owner = profileEmail
  3. Determine template version based on province + docType
  4. Set document.associatedWill if POA
  5. Update objectStatus[0][0].packageInfo
  6. Save to DB
```

---

## 12. Multi-Tenancy & Auth

### 12.1 User Types

| Type | Value | Role | Access |
|------|-------|------|--------|
| `TYPE_USER` | 1 | Regular user | Personal will planning only |
| `TYPE_ADMIN` | 2 | Organization admin | Tenant management, user creation |
| `TYPE_ROOT` | 3 | Super admin | System-wide control, all tenants |
| `TYPE_LAWYER` | 4 | Lawyer account | Reservations, document review |

### 12.2 Tenant Resolution

**Middleware**: `ResolveTenant`

```php
// Extracts tenant from subdomain:
// firmname.ifinallywill.com -> tenant where domain = 'firmname'
$subdomain = explode('.', $request->getHost())[0];
$tenant = Tenant::where('domain', $subdomain)->first();

// Sets tenant context for all subsequent queries:
app()->instance('currentTenant', $tenant);
```

**Tenant Status Values**: `approved`, `pending`, `rejected`

### 12.3 Tenant Auto-Filtering (Traits)

```php
// BelongsToTenant trait - auto-sets tenant_id on creation:
protected static function booted() {
    static::creating(function ($model) {
        $model->tenant_id = app('currentTenant')?->id;
    });
}

// TenantScope trait - auto-filters queries:
protected static function booted() {
    static::addGlobalScope('tenant', function ($builder) {
        $builder->where('tenant_id', app('currentTenant')?->id);
    });
}
```

### 12.4 Authentication

- **Web Auth**: Laravel Breeze (session-based, cookies)
- **API Auth**: Laravel Sanctum (token-based)
- **OAuth**: Google OAuth via Socialite (login + calendar integration)
- **Password Reset**: Token-based with email link
- **Email Verification**: Required after registration

### 12.5 Role-Based Route Guards

```php
// Middleware examples from routes:
Route::middleware(['auth', 'ensure.admin'])->group(function () {
    // Admin-only routes
});

Route::middleware(['auth', 'ensure.admin.or.root'])->group(function () {
    // Admin or root routes
});

Route::middleware(['auth:sanctum'])->group(function () {
    // API token-protected routes
});
```

### 12.6 Rate Limiting

- API endpoints: 60 requests/minute (configurable)
- Authentication endpoints: Stricter limits to prevent brute force

---

## 13. Platform Migration Mapping

### 13.1 v6 Table -> Platform Table Mapping

| v6 Table | Platform Equivalent | Migration Notes |
|----------|-------------------|-----------------|
| `users` | `users` (existing platform table) | Add v6-specific columns: selected_package, google_id, password_change_required, marketing fields |
| `tenants` | `tenants` (existing) | Add v6 columns: program_type, program_config, domain, branding colors, trial/expiration |
| `obj_statuses` | **NEW** `will_statuses` | Rename for clarity. Core JSON blob storage. FK to users. |
| `packages` | **NEW** `will_packages` | 6 package definitions with signature variants |
| `payments` | **NEW** `will_payments` | Stripe payment records. Consider merging with platform payments if any. |
| `template_types` | **NEW** `will_template_types` | Province-specific template metadata |
| `template_versions` | **NEW** `will_template_versions` | Versioned template content |
| `assets` | **NEW** `will_assets` | User assets for will planning |
| `asset_classes` | **NEW** `will_asset_classes` | Asset type classifications (seed data) |
| `asset_details` | **NEW** `will_asset_details` | Detailed asset info |
| `trees` | **NEW** `family_trees` | JSON family tree data |
| `support_tickets` | Reuse platform support or **NEW** | Depends on existing support system |
| `ticket_responses` | Reuse or **NEW** | Follow support_tickets decision |
| `ticket_categories` | Reuse or **NEW** | Follow support_tickets decision |
| `lawyers` | **NEW** `will_lawyers` | Lawyer management |
| `law_firms` | **NEW** `will_law_firms` | Law firm entities |
| `reservations` | **NEW** `will_reservations` | Lawyer booking |
| `availability_slots` | **NEW** `will_availability_slots` | Lawyer availability |
| `time_offs` | **NEW** `will_time_offs` | PTO tracking |
| `sales_team` | **NEW** `will_sales_team` | Sales staff |
| `sales_availability_slots` | **NEW** `will_sales_availability` | Sales availability |
| `sales_reservations` | **NEW** `will_sales_reservations` | Sales bookings |
| `email_logs` | Consider reusing platform audit or **NEW** | Email audit trail |
| `newsletter` | **NEW** `will_newsletter` | Newsletter subscriptions |
| `discount_codes` | **NEW** `will_discount_codes` | Promotional codes |
| `landing_contents` | **NEW** `will_landing_contents` | CMS content |
| `cities` | **NEW** `world_cities` | City autocomplete (seed from CSV) |
| `institutions` | **NEW** `will_institutions` | Institution data |
| `contracts` | **NEW** `will_contracts` | Contract definitions |
| `personal_access_tokens` | Use platform Auth.js sessions | Not needed -- platform uses Auth.js |
| `sessions` | Use platform sessions | Not needed |
| `cache/cache_locks` | Use platform Redis | Not needed |
| `jobs/job_batches/failed_jobs` | Use platform job system | If async jobs are needed |
| `password_reset_tokens` | Use platform Auth.js | Not needed |

### 13.2 v6 Controller -> Platform tRPC Router Mapping

| v6 Controller | Platform tRPC Router | Methods to Port |
|--------------|---------------------|-----------------|
| `ObjStatusController` | **NEW** `willStatus` router | CRUD + search + getByEmail + getRecent |
| `PaymentController` | **NEW** `willPayment` router | createIntent, webhook, checkStatus, sendLink |
| `PackageController` | **NEW** `willPackage` router | list, getById |
| `TemplateController` | **NEW** `willTemplate` router | getByProvince, getActive, getDocument, CRUD |
| `AssetController` | **NEW** `willAsset` router | CRUD + getByUser + search |
| `TreeController` | **NEW** `familyTree` router | CRUD + updateByUser + syncPersonalInfo |
| `DiscountController` | **NEW** `willDiscount` router | verify, check, CRUD |
| `LawyerController` | **NEW** `willLawyer` router | CRUD + availability + reservations |
| `SalesTeamController` | **NEW** `willSales` router | CRUD + availability + reservations |
| `SupportTicketController` | Extend existing or **NEW** | CRUD + responses + assignment |
| `EmailController` | **NEW** `willEmail` router | send, sendRaw, test, stats |
| `CityController` | **NEW** `willCity` router | search autocomplete |
| `AIModeController` | Extend existing AI routers | chat, chatStream, tts |
| `UserManagementController` | Extend existing `users` router | Admin user management |
| `ProfileController` | Extend existing `users` router | Profile edit/update |
| `TenantApprovalController` | Extend existing or **NEW** | Tenant approval workflow |

### 13.3 v6 Frontend -> Platform Frontend Mapping

| v6 Component | Platform Equivalent | Migration Strategy |
|-------------|--------------------|--------------------|
| `Personal.jsx` (8,601 lines) | **DECOMPOSE** into 15+ smaller components | Break monolith into per-step components with shared state (Zustand or context) |
| `Register.jsx` (1,836 lines) | **DECOMPOSE** into step components | Each registration step becomes a route or sub-component |
| `PDFEditor.jsx` (5,127 lines) | **NEW** PDF editor component | Port TipTap integration, replace Puppeteer with platform PDF solution |
| `PaymentModal.jsx` (66KB) | **NEW** payment component | Port Stripe Elements integration |
| All step components | Individual route components | Each step becomes its own file under `apps/ifinallyWill/src/pages/` |
| Handlebars templates (45 files) | Port to platform template system | Keep Handlebars or migrate to JSX-based rendering |
| packagesData.js | Database-driven or config file | Move package definitions to DB or shared config |

### 13.4 Technology Stack Mapping

| v6 Tech | Platform Equivalent |
|---------|-------------------|
| Laravel 11 | Fastify 5.3.2+ |
| Inertia.js | React Router (client-side routing) |
| Laravel Blade | React JSX |
| Laravel Sanctum | Auth.js |
| Laravel Breeze | Auth.js |
| Eloquent ORM | Drizzle ORM |
| MySQL/PostgreSQL | PostgreSQL 16+ |
| Redis (cache) | Redis |
| Laravel Queue | Platform job system (TBD) |
| Stripe PHP SDK | Stripe JS SDK |
| Express.js Puppeteer PDF | Platform PDF solution (Puppeteer or alternatives) |
| Handlebars templates | Keep Handlebars (browser) or port to JSX |
| Bootstrap + Tailwind + styled-components | Tailwind CSS v4 + shadcn/ui |
| Framer Motion | Framer Motion (keep) |
| React Data Table | shadcn/ui Table or TanStack Table |
| TipTap editor | TipTap (keep) or alternative |

### 13.5 Critical Migration Risks

1. **objectStatus JSON blob**: The entire will state is a single JSON column. Must decide: keep as JSON blob (fastest port) or normalize into relational tables (cleaner but massive effort).
2. **Global export functions**: Steps expose data via `window.getFormData()` etc. Must refactor to React-native patterns (context, state management, or form libraries).
3. **Profile switching complexity**: The 4-profile system with shared steps and cross-profile sync is deeply coupled to the monolith. Must be carefully decomposed.
4. **Template Handlebars helpers**: 30+ custom helpers with legal document generation logic. Must be ported exactly to avoid legal document errors.
5. **PDF generation**: Current Express.js + Puppeteer server must be replicated or replaced. Consider server-side PDF generation via API.
6. **Provincial tax calculation**: Tax rates and rules must be kept current.
7. **Stripe integration**: Must maintain payment flow integrity during migration.
8. **Multi-tenancy**: v6 uses subdomain-based resolution with traits; platform uses different tenant isolation patterns.

### 13.6 Recommended Migration Order

1. **Phase 1**: Database schema (create all will-specific tables in Drizzle)
2. **Phase 2**: Core data model (objectStatus CRUD via tRPC, package/template seeding)
3. **Phase 3**: Registration wizard (10-15 steps, user creation, package selection)
4. **Phase 4**: Will wizard skeleton (15 steps, navigation, sidebar, progress tracking)
5. **Phase 5**: Step-by-step form implementation (pointer 0-14, one at a time)
6. **Phase 6**: Profile switching and couples flow
7. **Phase 7**: Template system and PDF generation
8. **Phase 8**: Payment integration (Stripe)
9. **Phase 9**: Document management (DocumentSelector, PDFEditor)
10. **Phase 10**: Admin features (lawyer management, tenant approval, marketing)

---

## Appendix A: Quick Reference - Data Index Map

| Index | Key | Type | Description |
|-------|-----|------|-------------|
| 0 | personal + packageInfo | object | Personal info + package metadata |
| 1 | marriedq | object | "Are you married?" question |
| 2 | married | object | Spouse details |
| 3 | kidsq | object | "Do you have kids?" question |
| 4 | kids | array | Children list |
| 5 | executors | array | Executor assignments |
| 6 | relatives | array | Extended family/friends |
| 7 | bequests | object | Gift assignments |
| 8 | residue | object | Residual estate distribution |
| 9 | wipeout | object | Wipeout clause |
| 10 | trusting | array | Testamentary trust terms |
| 11 | guardians | array | Guardian assignments |
| 12 | pets | object | Pet guardian assignments |
| 13 | additional | object | Funeral/wishes/custom clauses |
| 14 | poaProperty | array | POA Property agents |
| 15 | poaHealth | array | POA Health agents |
| 16 | finalDetails | object | Final details and instructions |
| 17 | documentDOM | object | Rendered HTML cache per document |

## Appendix B: Quick Reference - Province Template Coverage

| Province | Code | HST/GST+PST | Secondary Will Support |
|----------|------|-------------|----------------------|
| Alberta | AB | 5% GST only | No |
| British Columbia | BC | 5% GST + 7% PST | **Yes** |
| Manitoba | MB | 5% GST + 7% RST | No |
| New Brunswick | NB | 15% HST | No |
| Newfoundland & Labrador | NL | 15% HST | No |
| Nova Scotia | NS | 15% HST | No |
| Ontario | ON | 13% HST | **Yes** |
| Prince Edward Island | PE | 15% HST | No |
| Saskatchewan | SK | 5% GST + 6% PST | No |

## Appendix C: Quick Reference - Package Document Counts

| Package | Wills | Secondary | POA Property | POA Health | Total Docs |
|---------|-------|-----------|-------------|-----------|-----------|
| Basic (no sec) | 1 | 0 | 0 | 0 | 1 |
| Basic (sec) | 1 | 1 | 0 | 0 | 2 |
| Complete (no sec) | 1 | 0 | 1 | 1 | 3 |
| Complete (sec) | 1 | 1 | 1 | 1 | 4 |
| Couples (no sec) | 2 | 0 | 2 | 2 | 6 |
| Couples (sec) | 2 | 2 | 2 | 2 | 8 |
