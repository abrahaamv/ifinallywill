# Migration Plan: v6 Registration Flow + Personal.jsx Experience

## Context

The `IfinallyWIll_frontend` is a React 18 SPA extracted from a Laravel project. It has a 12-step Epilogue-inspired registration wizard and an 8,643-line `Personal.jsx` monolith that serves as the main will-creation dashboard. The user wants BOTH ported exactly into the modern `apps/ifinallyWill` app (TypeScript, Tailwind v4, shadcn/ui, tRPC).

**The new app already has**: 16 will step components, 9 POA step components, WizardShell, WizardSidebar, useAutoSave, useRegistrationWizard (5-step), tRPC client, React Hook Form + Zod. We're rebuilding the registration from scratch and reconstructing the Personal.jsx shell around the existing step components.

---

## PHASE 1: Registration Flow (v6 Visual Design, Exact Port)

### 1.1 Design System & Primitives

**Create** `src/styles/register.css`
- Port v6's `Register.css` scoped under `.register-scope`
- Navy (#0A1E86), Gold (#FFBF00), Off-white branding
- Floating label animations, card hover states, progress bar styles
- Reference: `IfinallyWIll_frontend/src/pages/Auth/Register.css`

**Create** `src/components/registration/primitives/` (6 reusable components):

| File | Purpose | Reference |
|------|---------|-----------|
| `FloatingInput.tsx` | Floating label input (used in Name, Account, PartnerName steps) | v6 NameStep.jsx `.epilogue-floating-label-group` |
| `OptionCard.tsx` | Selectable card with icon + badge support | v6 SecondaryWillStep/POAStep card pattern |
| `SectionTitle.tsx` | Branded h1 heading | Duplicated across all v6 steps |
| `NavButtons.tsx` | Back/Continue button pair | v6 `.navigation-buttons` |
| `CityAutocomplete.tsx` | City search dropdown with debounce, auto-fill province | v6 LocationStep.jsx lines 50-165 |
| `StepSubtitle.tsx` | Descriptive text below title | v6 SubTitle pattern |

**Copy** `IfinallyWIll_frontend/public/cities.json` → `apps/ifinallyWill/public/cities.json`

### 1.2 Registration Data & Step Config

**Rewrite** `src/hooks/useRegistrationWizard.ts`
- Expand `RegistrationData` from 6 fields to 55+ fields matching v6's state (Register.jsx lines 52-116)
- Fields: location (city/province/country), name parts (first/middle/last/common), phone, gender, secondary will preference, POA type, partner details (name/email/phone/location/same-address), package selection, account credentials
- Keep localStorage persistence (`ifw-registration` key)

**Create** `src/lib/registrationSteps.ts`
- Pure function `getSteps(data: RegistrationData)` → step array
- Conditional logic from v6 Register.jsx lines 142-245:
  - SecondaryWillStep: only ON/BC provinces
  - PartnerNameStep: only if `has_partner === 'yes'`
  - PartnerLocationStep: only if `partner_same_address === false`
  - PlanningTogetherStep: only if has partner AND not from couples plan
  - PackageSelection + Checkout always last

### 1.3 Registration Steps (12 components)

Each step ports the v6 component to TypeScript, using primitives from 1.1.

| # | File to Create/Replace | v6 Reference | Key Features |
|---|----------------------|--------------|-------------|
| 1 | `registration/WelcomeStep.tsx` (replace) | WelcomeStep.jsx | Bullet list, feature cards, brand styling |
| 2 | `registration/LocationStep.tsx` (replace) | LocationStep.jsx | CityAutocomplete, auto-fill province, manual fallback |
| 3 | `registration/NameStep.tsx` (create) | NameStep.jsx | FloatingInputs for first/middle/last/phone, gender='other' |
| 4 | `registration/AccountStep.tsx` (replace) | AccountStep.jsx | Email validation via tRPC, password show/hide, Google OAuth, star rating |
| 5 | `registration/SecondaryWillStep.tsx` (create) | SecondaryWillStep.jsx | 2 OptionCards, auto-advance 200ms, ON/BC only |
| 6 | `registration/POAStep.tsx` (create) | POAStep.jsx | 4 OptionCards, "SMART CHOICE" badge on Both |
| 7 | `registration/PartnerStep.tsx` (create) | PartnerStep.jsx | 2-phase: Yes/No → Married/CommonLaw, data clearing |
| 8 | `registration/PartnerNameStep.tsx` (create) | PartnerNameStep.jsx | FloatingInputs, email duplicate check, same-address checkbox |
| 9 | `registration/PartnerLocationStep.tsx` (create) | PartnerLocationStep.jsx | CityAutocomplete for partner |
| 10 | `registration/PlanningTogetherStep.tsx` (create) | PlanningTogetherStep.jsx | Family illustration, savings display, Yes/No buttons |
| 11 | `registration/PackageSelectionStep.tsx` (create) | PackageSelectionStep.tsx | Dynamic package grid, PricingCards, spouse requirement modal |
| 12 | `registration/CheckoutStep.tsx` (create) | CheckoutStep.tsx | Order summary, tax breakdown, pay/skip buttons |

### 1.4 Registration Layout

**Create** `src/layouts/RegistrationLayout.tsx`
- Gold header banner with back-to-home link + step indicator
- Segmented progress bar (navy filled segments)
- Content area with AnimatePresence transitions
- Slide-out help panel (right side, 400px)
- Floating help toggle button (bottom-right)
- Reference: v6 `WizardLayout.jsx`

**Create** `src/components/registration/WizardHelpContent.tsx`
- Step-specific FAQ/tips content
- Reference: v6 `WizardHelpContent.jsx`

### 1.5 Registration Orchestrator

**Rewrite** `src/pages/auth/RegisterPage.tsx`
- Use RegistrationLayout wrapper
- Dynamic step array from `getSteps(data)`
- AnimatePresence step transitions
- Navigation: handleNext with skip logic (skip_package_selection, from_couples_plan_selection)
- tRPC mutation for account creation on final step
- Loading overlay during creation
- Redirect to `/app/will/personal` post-registration
- Reference: v6 Register.jsx lines 250-395

### 1.6 Supporting Utils

**Create** `src/utils/packageUtils.ts` — `packageDocuments()`, `packageRequiresTwoPeople()`
**Create** `src/utils/taxUtils.ts` — `calculateTax()`, `getTaxBreakdown()`, `formatPrice()`
**Create** `src/utils/packagesData.ts` — `getPackagesForUser()`, `mapPackageToCardFormat()`

---

## PHASE 2: Personal.jsx / WizardShell Reconstruction

### 2.1 PersonalShell Architecture (core)

**Create** `src/components/wizard/PersonalShell.tsx`
- Replaces current linear WizardShell for will documents
- Two view modes: `'dashboard'` (category cards) and `categoryKey` (step detail)
- State: currentView, currentStep, pointer, currentProfile, currentDocument, objectStatus
- 6 category definitions from v6 (About You, Your Family, Your Estate, Your Arrangements, Your POAs)
- Filtered categories based on package/document type
- Lazy-loaded step components via React.lazy
- 2-column desktop layout: sidebar + content
- Mobile: full-width with bottom nav
- Reference: v6 Personal.jsx structure (state lines 1050-1100, categories lines 1423-1500)

**Create** `src/components/wizard/DashboardView.tsx`
- Category card grid (icon, title, description, time estimate, completion %)
- Profile selector banner at top
- "Enhance Package" upsell card
- Reference: v6 Personal.jsx dashboard render section

**Create** `src/components/wizard/CategoryDetailView.tsx`
- Category header with back-to-dashboard
- Within-category step navigation (back/next)
- Suspense-wrapped step content
- Bottom nav bar (Save and Continue / Finish)
- Reference: v6 Personal.jsx `CategoryDetailView` function (lines 162-600)

### 2.2 Sidebar Reconstruction

**Rewrite** `src/components/wizard/WizardSidebar.tsx`
- Category-based collapsible sidebar (not linear step list)
- Category headers expand/collapse to show steps
- Step completion checkmarks
- Current step highlight (purple)
- Collapse to icon-only mode with toggle button
- First-visit highlight animation
- Profile indicator in header
- Reference: v6 Personal.jsx sidebar rendering

**Create** `src/hooks/useSidebarState.ts` — collapse state + localStorage persistence

### 2.3 Modal Stack (10 modals)

**Create** `src/components/modals/` directory:

| Modal | Purpose | v6 Reference |
|-------|---------|-------------|
| `PersonConfirmationModal.tsx` | Gates Key Names/Bequest steps, "I Understand" | PersonConfirmationModal.jsx |
| `PaymentModal.tsx` | Stripe in-app payment | PaymentModal.jsx |
| `DocumentSelectorModal.tsx` | Switch primary/secondary/spousal context | DocumentSelectorMinimal.jsx |
| `PDFEditorModal.tsx` | Document preview/editing | PDFEditor.jsx |
| `ProfileSelectorModal.tsx` | Switch between profiles | ProfileSelector.jsx |
| `PackageSelectorModal.tsx` | Package selection/upgrade | SelectPackageModal.jsx |
| `CelebrationModal.tsx` | Confetti on document completion | CelebrationModal.jsx |
| `DocumentOrderModal.tsx` | Shows prerequisite ordering | DocumentOrderModal.jsx |
| `LeaveConfirmModal.tsx` | Browser back button interception | Inline in Personal.jsx |
| `VideoTutorialModal.tsx` | Step tutorial video player | VideoAssistantPlayer.jsx |

### 2.4 Profile Switching

**Create** `src/hooks/useProfileSwitching.ts`
- objectStatus array management (index 0=primary, 1=spouse, 2+=secondary)
- currentProfile state with switching logic
- Shared steps detection (Family Tree, Assets, Executors, Guardians)
- Port `handleSelectProfile()` and `handleProfileData()` from v6 `profileUtils.js`
- Reference: v6 `utils/profileUtils.js`, `utils/profileWorkflowHelpers.js`

**Rewrite** `src/components/wizard/ProfileBanner.tsx`
- Full profile indicator with switch button
- Document context display
- Profile type indicator (Primary/Spouse/Secondary)
- Reference: v6 ProfileStatusIndicator, ProfileTypeIndicator, ProfileBadge

### 2.5 Step Reconnection

**Update** all 16 step components in `src/components/steps/`
- Accept PersonalShell props (objectStatus, currentProfile, currentDocument, pointer)
- Support ref-based imperative save (forwardRef + useImperativeHandle)
- Accept `onAddPersonFromDropdown` callback for cross-step key_names
- Accept PersonConfirmationModal trigger props

### 2.6 Data Loading & Navigation

**Create** `src/hooks/usePersonalData.ts`
- Replace v6's axios-based `loadDataFromDatabase()` with tRPC queries
- Load: objectStatus, package info, documents, family tree, assets, profiles
- Save: tRPC mutations per section (not full-blob replace)

**Create** `src/hooks/useStepNavigation.ts`
- Category-aware next/prev navigation
- Pointer-based step identification (DATA_STRUCTURE_ORDER array)
- Form save triggers before navigation (imperative ref calls)
- Category-to-dashboard transitions
- Reference: v6 `nextStep()`, `backStep()`, `handleNavigateBack()`, `handleNavigateNext()`

### 2.7 Wilfred AI & Routing

**Update** `src/components/wilfred/WilfredPanel.tsx` — Connect to PersonalShell context, step-aware prompts, floating button with highlight animation

**Update** `src/App.tsx` — Add PersonalShell route at `/app/will/:docId` with optional `/:category?/:stepId?` for deep-linking

---

## Execution Order & Dependencies

```
Phase 1 (can start NOW):
  [1.1 Primitives] + [1.2 Data Model] + [1.6 Utils]  ← parallel, no deps
        ↓                    ↓
  [1.3 Step Components] ← needs 1.1 + 1.2
  [1.4 Layout] ← needs 1.1
        ↓
  [1.5 Orchestrator] ← needs 1.3 + 1.4

Phase 2 (after Phase 1 core):
  [2.1 PersonalShell] + [2.3 Modals] + [2.7 Wilfred]  ← parallel
        ↓
  [2.2 Sidebar] + [2.4 Profile] ← need 2.1
        ↓
  [2.5 Step Reconnect] + [2.6 Data/Nav] ← need 2.1 + 2.4
```

**Recommended parallel agent batches:**
1. Batch 1: 1.1 + 1.2 + 1.6 (foundation)
2. Batch 2: 1.3 steps 1-6 + 1.4 layout (once primitives ready)
3. Batch 3: 1.3 steps 7-12 + 1.5 orchestrator
4. Batch 4: 2.1 shell + 2.3 modals
5. Batch 5: 2.2 sidebar + 2.4 profile + 2.5 steps + 2.6 data

---

## Verification

After each phase:
```bash
pnpm typecheck          # All 24 packages pass
pnpm build              # Full build succeeds
pnpm dev:ifinallyWill   # Visual verification at localhost:5177
```

### Phase 1 verification:
- Navigate to `/register` → see v6-style Welcome step
- Complete full 12-step flow with conditional branching
- Ontario province shows SecondaryWill step, Alberta does not
- Partner "Yes" shows 3 extra partner steps
- Help panel toggles correctly
- All form validations work
- Account creation calls tRPC mutation

### Phase 2 verification:
- Navigate to `/app/will/:docId` → see dashboard with category cards
- Click category → expands to step-by-step within category
- Sidebar shows categories with collapsible steps
- Profile banner shows current profile, switch works
- Modals open/close correctly (document selector, payment, celebration)
- Step data saves via tRPC (not localStorage)
- Back-to-dashboard navigation works
- Wilfred panel opens with step-aware context

---

## Key Files Reference

### v6 Source (read-only reference):
- `IfinallyWIll_frontend/src/pages/Auth/Register.jsx` (397 lines - orchestrator)
- `IfinallyWIll_frontend/src/pages/Auth/Register.css` (1,498 lines - design system)
- `IfinallyWIll_frontend/src/components/WizardSteps/` (13 step components)
- `IfinallyWIll_frontend/src/layouts/WizardLayout.jsx` (166 lines)
- `IfinallyWIll_frontend/src/pages/Will/Personal.jsx` (8,643 lines - monolith)
- `IfinallyWIll_frontend/src/components/FormCity.jsx` (personal info form)
- `IfinallyWIll_frontend/src/utils/profileUtils.js`
- `IfinallyWIll_frontend/src/utils/stepUtils.js`
- `IfinallyWIll_frontend/src/utils/objectStatusUtils.js`

### New App (modify/create):
- `apps/ifinallyWill/src/pages/auth/RegisterPage.tsx` (rewrite)
- `apps/ifinallyWill/src/hooks/useRegistrationWizard.ts` (rewrite)
- `apps/ifinallyWill/src/components/registration/` (12 steps + 6 primitives)
- `apps/ifinallyWill/src/layouts/RegistrationLayout.tsx` (create)
- `apps/ifinallyWill/src/components/wizard/PersonalShell.tsx` (create)
- `apps/ifinallyWill/src/components/wizard/WizardSidebar.tsx` (rewrite)
- `apps/ifinallyWill/src/components/wizard/DashboardView.tsx` (create)
- `apps/ifinallyWill/src/components/wizard/CategoryDetailView.tsx` (create)
- `apps/ifinallyWill/src/components/modals/` (10 modals)
- `apps/ifinallyWill/src/hooks/useProfileSwitching.ts` (create)
- `apps/ifinallyWill/src/hooks/usePersonalData.ts` (create)
- `apps/ifinallyWill/src/hooks/useStepNavigation.ts` (create)
- `apps/ifinallyWill/src/App.tsx` (update routes)
