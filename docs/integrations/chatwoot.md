# Chatwoot Integration Guide

> **Status:** Production Ready
> **Last Updated:** December 2025
> **Deployment:** Hetzner VPS (178.156.151.139)

## Overview

Chatwoot serves as the **human agent escalation backend** for VisualKit. It does NOT replace our AI-powered widget - instead, it provides a professional support interface for human agents when AI escalation is triggered.

```
Customer → VisualKit Widget (AI) → [escalation] → Chatwoot (Human Agent)
```

**Key Principle:** Tenants embed the VisualKit widget, NOT the Chatwoot widget. Chatwoot is invisible to end-users - it's purely for internal support staff.

---

## Production URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Chatwoot Dashboard | https://support.visualkit.live | Human agents manage escalated conversations |
| Dashboard Embed | https://app.visualkit.live/support | Embedded view with SSO |
| Platform API | https://api.visualkit.live | Handles escalation routing |
| Widget CDN | https://cdn.visualkit.live/v1/widget.js | Customer-facing AI widget |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CUSTOMER WEBSITES                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              VisualKit Widget (cdn.visualkit.live)            │  │
│  │  • AI-powered chat via vk-agent                               │  │
│  │  • Visual capabilities (screen share, image analysis)         │  │
│  │  • Voice support                                              │  │
│  │  • Handles 80%+ of customer queries automatically             │  │
│  └──────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Platform API (api.visualkit.live)                  │
│  • Routes queries to AI agent (vk-agent)                            │
│  • Detects escalation triggers:                                     │
│    - AI confidence < 30%                                            │
│    - User explicitly requests human                                 │
│    - Conversation exceeds time threshold                            │
│    - Duplicate unresolved problem detected                          │
│  • Creates Chatwoot conversation with full AI context               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ (escalation only)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                Chatwoot (support.visualkit.live)                     │
│  • Human agents handle escalated conversations                      │
│  • Full AI conversation transcript provided                         │
│  • Meeting URL for video calls if needed                            │
│  • Webhooks sync resolution back to Platform                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Escalation Flow

### 1. AI Triggers Escalation

When the AI determines it can't resolve an issue:

```typescript
// Platform API creates escalation record
const escalation = await trpc.escalations.create({
  tenantId: session.tenantId,
  sessionId: session.id,
  endUserId: endUser.id,
  escalationType: 'ai_failure', // or 'user_request', 'time_exceeded', 'duplicate_problem'
  reason: 'User requesting refund - requires authorization',
  aiConfidence: 0.25,
  userSentiment: 'frustrated',
});
```

### 2. Sync to Chatwoot

```typescript
// Creates contact and conversation in Chatwoot
await trpc.escalations.syncToChatwoot({
  escalationId: escalation.id,
  chatwootConfig: {
    baseUrl: process.env.CHATWOOT_URL,
    accountId: 1,
    apiAccessToken: process.env.CHATWOOT_API_TOKEN,
    inboxId: 1,
  },
});
```

**What gets synced:**
- Contact created/updated with VisualKit user ID
- Conversation created with AI transcript
- Custom attributes: session_id, ai_confidence, escalation_reason
- Meeting URL for video escalation

### 3. Agent Handles in Chatwoot

Human agent sees:
- Full AI conversation history as first message
- AI summary of the issue
- User sentiment indicator
- Meeting URL button for video call

### 4. Webhooks Update Platform

Chatwoot sends webhooks to `/api/webhooks/chatwoot`:

| Event | Action |
|-------|--------|
| `message_created` | Marks agent as joined |
| `conversation_resolved` | Updates escalation as resolved |

---

## SSO Integration

Dashboard users are automatically logged into Chatwoot via Platform API SSO.

### Flow

```
User visits /support
        │
        ▼
┌───────────────────────────┐
│ Dashboard calls getSSOUrl │
└───────────────────────────┘
        │
        ├── Has chatwoot_user_id? ──► Get SSO URL directly
        │
        ▼ No ID stored
┌───────────────────────────┐
│ 1. Create user via        │
│    Platform API           │
│ 2. Add as agent via       │
│    Account API            │
│ 3. Store chatwoot_user_id │
│ 4. Return SSO URL         │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│ Iframe loads SSO URL      │
│ User auto-logged in!      │
└───────────────────────────┘
```

### Configuration

```bash
# Platform API (.env)
CHATWOOT_URL=http://172.17.0.1:3000           # Internal Docker network
CHATWOOT_PROXY_URL=https://support.visualkit.live
CHATWOOT_ACCOUNT_ID=1
CHATWOOT_INBOX_ID=1
CHATWOOT_API_TOKEN=oZ11HLxLr1g1TRg6VeMXDUnR    # From admin profile
CHATWOOT_PLATFORM_TOKEN=kfujZswsgiWmDiuidF6WwEBh  # From super_admin
CHATWOOT_WEBHOOK_SECRET=2d7fdd4449c13baed39f001f7c8c9c7986a6899977c91682948a87af084966b9

# Dashboard (.env)
VITE_CHATWOOT_BASE_URL=https://support.visualkit.live
VITE_CHATWOOT_ACCOUNT_ID=1
```

---

## Production Setup (Hetzner)

### Services Running

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
# chatwoot-chatwoot-1        Up (healthy)
# chatwoot-chatwoot-proxy-1  Up
# chatwoot-chatwoot-sidekiq-1 Up
```

### Caddy Reverse Proxy

```
# /etc/caddy/Caddyfile
support.visualkit.live {
    reverse_proxy localhost:3003
    header -X-Frame-Options  # Allow iframe embedding
}
```

### Chatwoot Credentials

| Item | Value |
|------|-------|
| Super Admin | /super_admin (Rails console access) |
| Account ID | 1 (VisualKit) |
| Admin User | abrahaam@visualkit.live |
| API Inbox | "VisualKit Escalations" (ID: 1) |
| Webhook URL | http://172.17.0.1:3001/api/webhooks/chatwoot |

---

## Features to DISABLE in Chatwoot

These features conflict with VisualKit's architecture or are unused:

### Remove/Disable

| Feature | Reason | How to Disable |
|---------|--------|----------------| 
| **Captain AI** | Conflicts with vk-agent | Settings > Account > Features > Disable AI |
| **Agent Bots** | We use our own AI | Don't configure any |
| **Knowledge Base** | We use RAG system | Settings > Account > Features |
| **Widget SDK** | We use our own widget | Don't deploy Chatwoot widget |
| **Campaigns** | Not our use case | Ignore/hide from nav |
| **Social Channels** | Not needed | Don't configure FB/Twitter/etc |
| **OpenAI Integration** | Conflicts with our AI | Don't configure |
| **Dialogflow** | Conflicts with our AI | Don't configure |

### Keep Enabled

| Feature | Purpose |
|---------|---------|
| Inbox (API type) | Receives escalations |
| Conversations | Agent workspace |
| Canned Responses | Agent efficiency |
| Macros | Workflow automation |
| Teams | Organize agents |
| Agent Reports | Performance tracking |
| CSAT | Post-resolution surveys |
| Webhooks | Platform sync |

---

## Customization Pending

### Branding (TODO)
- [ ] Replace Chatwoot logo with VisualKit
- [ ] Match color scheme (primary: brand colors)
- [ ] Customize email templates

### Features (TODO)
- [ ] Hide unused sidebar items via CSS/feature flags
- [ ] Configure CSAT surveys for escalated conversations
- [ ] Set up agent notification preferences

### To Configure via Rails Console

```ruby
# Access: docker exec -it chatwoot-chatwoot-1 bundle exec rails console

# Disable features account-wide
account = Account.find(1)
account.update(feature_flags: {
  help_center: false,
  campaigns: false,
  agent_bots: false,
})

# Hide sidebar items (requires frontend customization)
# See: app/javascript/dashboard/routes/
```

---

## Webhook Integration

### Incoming (Chatwoot → Platform)

**Endpoint:** `POST /api/webhooks/chatwoot`

**Events handled:**
- `conversation_created` - Log escalation received
- `message_created` - Track agent responses
- `conversation_resolved` - Mark escalation resolved

**Security:** HMAC signature validation with `CHATWOOT_WEBHOOK_SECRET`

### Outgoing (Platform → Chatwoot)

**Endpoints used:**
- `POST /api/v1/accounts/{id}/conversations` - Create escalation
- `POST /api/v1/accounts/{id}/conversations/{id}/messages` - Send context
- `POST /api/v1/accounts/{id}/contacts` - Create/update contact
- `GET /platform/api/v1/users/{id}/login` - Get SSO URL

---

## Database Schema

### Platform Tables

```sql
-- Escalations table (packages/db)
escalations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  session_id UUID NOT NULL,
  end_user_id UUID,
  escalation_type VARCHAR(50),  -- ai_failure, user_request, etc.
  reason TEXT,
  chatwoot_conversation_id INTEGER,  -- Linked Chatwoot conversation
  chatwoot_contact_id INTEGER,
  meeting_url TEXT,
  meeting_token VARCHAR(100),
  human_agent_id UUID,
  human_agent_joined_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP
);

-- Users table addition
users (
  ...
  chatwoot_user_id INTEGER  -- Cached for SSO
);
```

### Chatwoot Tables (Reference)

- `contacts` - Customer records (identifier = visualkit_user_id)
- `conversations` - Support threads
- `messages` - Individual messages
- `custom_attribute_definitions` - Schema for custom fields
- `users` - Agent accounts

---

## Troubleshooting

### SSO Not Working

1. Check Platform Token: `CHATWOOT_PLATFORM_TOKEN`
2. Check API Token: `CHATWOOT_API_TOKEN`
3. Verify user exists in Chatwoot
4. Check `chatwoot_user_id` in platform.users table

### Webhooks Not Received

1. Check webhook URL in Chatwoot inbox settings
2. Verify `CHATWOOT_WEBHOOK_SECRET` matches
3. Check Platform API logs: `docker logs platform-api`

### Iframe Not Loading

1. Verify Caddy removes X-Frame-Options
2. Check browser console for CSP errors
3. Ensure `CHATWOOT_PROXY_URL` uses HTTPS

### Escalation Not Creating Conversation

1. Check `CHATWOOT_API_TOKEN` permissions
2. Verify inbox ID exists and is API type
3. Check Platform API logs for Chatwoot errors

---

## API Reference

### Create Escalation (Platform)

```typescript
// packages/api-contract/src/routers/escalations.ts
trpc.escalations.create.mutate({
  tenantId: string,
  sessionId: string,
  endUserId?: string,
  escalationType: 'ai_failure' | 'time_exceeded' | 'duplicate_problem' | 'user_request',
  reason: string,
  withinServiceHours?: boolean,
  aiConfidence?: number,
  userSentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated',
});
```

### Sync to Chatwoot (Platform)

```typescript
trpc.escalations.syncToChatwoot.mutate({
  escalationId: string,
  chatwootConfig: {
    baseUrl: string,
    accountId: number,
    apiAccessToken: string,
    inboxId: number,
  },
});
```

### Get SSO URL (Platform)

```typescript
trpc.chatwoot.getSSOUrl.mutate();
// Returns: { success: true, ssoUrl: string }
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `packages/api-contract/src/routers/escalations.ts` | Escalation management |
| `packages/api-contract/src/routers/chatwoot.ts` | SSO and status |
| `packages/chatwoot/src/client.ts` | Chatwoot API client |
| `packages/chatwoot/src/webhooks.ts` | Webhook handlers |
| `apps/dashboard/src/pages/SupportPage.tsx` | Embedded Chatwoot view |
| `packages/db/src/schema/end-user-engagement.ts` | Escalations schema |

---

## Tenant Experience Summary

**What tenants see:**
1. Embed VisualKit widget on their site
2. AI handles customer conversations
3. When escalation needed, agent sees in dashboard (`/support`)
4. Full AI context available to agent
5. Resolution syncs back to analytics

**What tenants DON'T see:**
- Chatwoot widget (only VisualKit widget)
- Chatwoot branding (white-labeled)
- Direct Chatwoot URL (use dashboard embed)

**What end-users DON'T see:**
- Chatwoot at all (transparent escalation)
- Difference between AI and human (seamless handoff)
