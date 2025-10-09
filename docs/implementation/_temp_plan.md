# 🎯 **FRONTEND INTEGRATION & STAGING READINESS PLAN**

## **Phase Overview**: Complete 5-stage implementation to integrate authentication, restructure meeting flow, and add dashboard management features for staging deployment.

---

## **STAGE 1: Authentication System** (Days 1-2)

### **1.1 Auth Pages**
- Create `/apps/dashboard/src/pages/auth/LoginPage.tsx`
  - Email/password form with Auth.js signIn()
  - OAuth buttons (Google, Microsoft)
  - "Remember me" + "Forgot password" links
  - Redirect to dashboard after login

- Create `/apps/dashboard/src/pages/auth/SignupPage.tsx`
  - Registration form with validation
  - Terms acceptance checkbox
  - Auto-login after registration
  - Email verification notice

- Create `/apps/dashboard/src/pages/auth/ForgotPasswordPage.tsx`
  - Password reset request form
  - Success message with email check

### **1.2 Route Protection**
- Create `/apps/dashboard/src/components/ProtectedRoute.tsx`
  - Check Auth.js session status
  - Redirect to `/login` if unauthenticated
  - Show loading spinner during check

- Update `/apps/dashboard/src/App.tsx`
  - Wrap dashboard routes in `<ProtectedRoute>`
  - Public routes: /login, /signup, /forgot-password
  - Private routes: /home, /chat, /rooms, /api-keys, /widget-config, /settings

- Create `/apps/dashboard/src/providers/AuthProvider.tsx`
  - Wrap app with Auth.js SessionProvider
  - Provide user context globally

---

## **STAGE 2: Meeting App Restructure** (Day 3)

### **2.1 Remove Create Room Feature**
- Modify `/apps/meeting/src/pages/LobbyPage.tsx`
  - **DELETE** entire "Create New Room" Card (lines 125-191)
  - Keep only "Join Meeting" Card
  - Update header description: "Enter a room ID to join"
  - Simplify layout to single centered card

### **2.2 Route-Based Rendering**
- Update `/apps/meeting/src/App.tsx` routing:
  ```tsx
  {
    path: '/',
    element: <LobbyPage /> // Join view only
  },
  {
    path: '/:roomId', // Direct room link
    element: <RoomRedirect /> // Auto-join with room ID
  },
  {
    path: '/room/:roomId',
    element: <MeetingRoom />
  }
  ```

- Create `/apps/meeting/src/pages/RoomRedirect.tsx`
  - Extract roomId from URL params
  - Prompt for display name if not in session
  - Auto-navigate to `/room/:roomId`

### **2.3 UI Improvements**
- Update MeetingRoom UI to match Google Meet:
  - Grid layout for participants
  - Bottom control bar (mic, camera, screen share, leave)
  - Sidebar for chat (collapsible)
  - Top bar with room name and participant count

---

## **STAGE 3: Dashboard Room Management** (Days 4-5)

### **3.1 Rooms Page**
- Create `/apps/dashboard/src/pages/RoomsPage.tsx`
  - **Create Room Section**:
    - Input for room name/description
    - "Create Room" button → calls `livekit.createRoom`
    - Auto-generate shareable link: `https://meet.platform.com/{roomId}`
    - Copy link button with toast notification

  - **Active Rooms Table**:
    - Columns: Room Name, Room ID, Created Date, Participants, Actions
    - Actions: Copy Link, View Details, Delete
    - Use `livekit.listRooms` tRPC query

  - **Room Details Modal**:
    - Room ID, creation date, metadata
    - Shareable link (public)
    - Active participants list
    - Delete room button (with confirmation)

### **3.2 Integration**
- Add "Rooms" link to DashboardLayout sidebar
- Update navigation with room count badge
- Add tRPC hooks: `useCreateRoom`, `useListRooms`, `useDeleteRoom`

---

## **STAGE 4: Dashboard API Key & Widget Config** (Days 6-7)

### **4.1 API Keys Page**
- Create `/apps/dashboard/src/pages/ApiKeysPage.tsx`
  - **Generate API Key**:
    - Button triggers key generation
    - Display key ONCE with copy button
    - Security warning: "Save this key, it won't be shown again"

  - **API Keys Table**:
    - Columns: Key Name, Key Prefix (last 4 chars), Created Date, Actions
    - Actions: Regenerate, Delete (with confirmation)
    - Use `apiKeys.list`, `apiKeys.create`, `apiKeys.delete` tRPC queries

### **4.2 Widget Configuration Page**
- Create `/apps/dashboard/src/pages/WidgetConfigPage.tsx`
  - **Configuration Form**:
    - API Key selection (dropdown from user's keys)
    - Position: bottom-right/bottom-left/top-right/top-left
    - Theme: light/dark/auto
    - Primary color picker
    - Welcome message text
    - Privacy mode toggle

  - **Live Preview**:
    - Real-time widget preview with config changes
    - Uses actual @platform/widget-sdk package

  - **Embed Code Generator**:
    - NPM install instructions
    - CDN script tag with user's API key
    - React/Vue/Angular code snippets
    - Copy button for each snippet

### **4.3 Chat Testing Area**
- Add to `/apps/dashboard/src/pages/ChatPage.tsx`
  - New tab: "Widget Preview"
  - Embedded widget using actual SDK
  - Side-by-side comparison: AI Chat vs Widget Chat
  - Test API key integration
  - Verify room creation from widget

---

## **STAGE 5: Production Readiness** (Day 8)

### **5.1 Remove Placeholders**
- Search and replace all "placeholder", "mock", "TODO" comments
- Remove all console.log statements (except errors)
- Replace hardcoded values with environment variables
- Update all port references to production URLs

### **5.2 Validation Checklist**
- [ ] Run `pnpm typecheck` → all packages pass
- [ ] Run `pnpm lint` → zero warnings
- [ ] Run `pnpm build` → all apps build successfully
- [ ] Run `pnpm test` → all tests pass
- [ ] Test authentication flow (login/signup/logout)
- [ ] Test room creation from dashboard
- [ ] Test joining room from public link
- [ ] Test API key generation
- [ ] Test widget configuration
- [ ] Test chat in all modes (AI + Real-time + Widget)
- [ ] Browser compatibility check (Chrome, Firefox, Safari)

### **5.3 Documentation Updates**
- Update README.md with authentication setup
- Document room management workflow
- Document API key usage
- Update environment variables guide
- Create staging deployment checklist

---

## **KEY ARCHITECTURAL DECISIONS**

1. **Dashboard = Private (Auth Required)**
   - All dashboard routes protected by Auth.js
   - Tenant context derived from session
   - Room management scoped to tenant

2. **Meeting App = Public (Link-Based Access)**
   - Anyone with room link can join (no auth)
   - Display name prompt if not authenticated
   - Room access via URL parameter

3. **Widget = API Key Auth Only**
   - No user authentication required
   - Widget creates rooms on-demand
   - Tenant identified via API key

4. **Room Creation Workflow**
   - Dashboard: Tenant creates rooms → gets shareable link
   - Widget: Auto-creates rooms when user starts chat
   - Meeting: No creation, join-only

---

## **ESTIMATED EFFORT**

- **Stage 1**: 12-16 hours (authentication system)
- **Stage 2**: 4-6 hours (meeting restructure)
- **Stage 3**: 8-10 hours (room management)
- **Stage 4**: 10-12 hours (API keys + widget config)
- **Stage 5**: 4-6 hours (production readiness)

**Total**: 38-50 hours (~5-6 working days)

---

## **DEPENDENCIES & RISKS**

**Critical Dependencies**:
- Auth.js session provider must be configured first
- tRPC routers for API keys need to be created (if not exist)
- Database schema for api_keys table (check if exists)

**Potential Blockers**:
- CSRF tokens may need to be added to forms
- LiveKit credentials required for room creation testing
- Redis must be running for WebSocket chat

**Mitigation**:
- Use mock data for development if LiveKit not configured
- Add graceful degradation for missing services
- Implement comprehensive error handling

---

## **SUCCESS CRITERIA**

✅ Users can login/signup to dashboard
✅ Tenants can create rooms and get shareable links
✅ Anyone with link can join meeting (no auth required)
✅ Dashboard has working room management UI
✅ API key generation and management functional
✅ Widget configuration with live preview works
✅ All placeholders/mocks removed
✅ Build passes with zero errors
✅ Browser compatibility verified

---

## **POST-IMPLEMENTATION TESTING SCRIPT**

```bash
# 1. Start services
pnpm db:up  # Not using Docker - local PostgreSQL assumed running
pnpm dev:api
pnpm dev:realtime
pnpm dev:dashboard
pnpm dev:meeting

# 2. Test Dashboard (http://localhost:5174)
- Navigate to /login (should show login page)
- Sign up new account
- Login with credentials
- Create new room → get shareable link
- Copy link and open in incognito window

# 3. Test Meeting App (http://localhost:5175)
- Paste room link from dashboard
- Should auto-join without login
- Test video/audio/screen share
- Test AI chat in meeting

# 4. Test Widget Configuration
- Navigate to dashboard /widget-config
- Generate API key
- Configure widget settings
- Copy embed code and test in HTML file

# 5. Validate Production Build
pnpm build
pnpm typecheck
pnpm lint
```
