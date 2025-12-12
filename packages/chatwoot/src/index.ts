/**
 * @platform/chatwoot
 *
 * TypeScript client for Chatwoot REST API integration.
 * Handles human escalation workflow for VisualKit AI platform.
 *
 * @example
 * ```typescript
 * import { ChatwootClient, ChatwootWebhookHandler } from '@platform/chatwoot';
 *
 * // Initialize client
 * const client = new ChatwootClient({
 *   baseUrl: process.env.CHATWOOT_URL!,
 *   accountId: parseInt(process.env.CHATWOOT_ACCOUNT_ID!),
 *   apiAccessToken: process.env.CHATWOOT_API_TOKEN!,
 *   inboxId: parseInt(process.env.CHATWOOT_INBOX_ID!),
 * });
 *
 * // Create escalation
 * const { conversation } = await client.createEscalation({
 *   contactId: 123,
 *   context: {
 *     session_id: 'sess_456',
 *     ai_summary: 'User needs help with...',
 *     ai_confidence: 0.3,
 *     escalation_reason: 'ai_failed',
 *     ai_turn_count: 5,
 *     escalated_at: new Date().toISOString(),
 *   },
 * });
 *
 * // Handle webhooks
 * const webhookHandler = new ChatwootWebhookHandler(process.env.CHATWOOT_WEBHOOK_SECRET);
 * const event = webhookHandler.parse(requestBody);
 * ```
 */

// Client
export { ChatwootClient, ChatwootPlatformClient } from "./client.js";
export {
	ChatwootError,
	ChatwootNotFoundError,
	ChatwootValidationError,
} from "./client.js";

// Webhook handler
export { ChatwootWebhookHandler } from "./webhooks.js";
export {
	isVisualKitEscalation,
	extractAgentResponseForTraining,
} from "./webhooks.js";

// Types - Core Chatwoot
export type {
	Contact,
	ContactCreatePayload,
	ContactUpdatePayload,
	ContactCustomAttributes,
	Conversation,
	ConversationCreatePayload,
	ConversationCustomAttributes,
	ConversationMeta,
	ConversationStatus,
	ConversationPriority,
	Message,
	MessageCreatePayload,
	MessageType,
	MessageContentType,
	MessageAttachment,
	MessageSender,
	Inbox,
	InboxType,
	WebhookEvent,
	ApiError,
} from "./types.js";

// Types - VisualKit Integration
export type {
	EscalationContext,
	VisualKitContactSync,
	ChatwootConfig,
} from "./types.js";

// Types - Webhook Events
export type {
	WebhookPayload,
	ParsedWebhookEvent,
	ConversationCreatedEvent,
	ConversationStatusChangedEvent,
	ConversationResolvedEvent,
	ConversationUpdatedEvent,
	MessageCreatedEvent,
	UnknownEvent,
} from "./webhooks.js";

// Zod Schemas (for runtime validation)
export {
	ContactSchema,
	ContactCreatePayloadSchema,
	ContactUpdatePayloadSchema,
	ContactCustomAttributesSchema,
	ConversationSchema,
	ConversationCreatePayloadSchema,
	ConversationCustomAttributesSchema,
	ConversationStatusEnum,
	ConversationPriorityEnum,
	MessageSchema,
	MessageCreatePayloadSchema,
	MessageTypeEnum,
	MessageContentTypeEnum,
	InboxSchema,
	InboxTypeEnum,
	WebhookEventEnum,
	EscalationContextSchema,
	VisualKitContactSyncSchema,
	ChatwootConfigSchema,
	ApiErrorSchema,
} from "./types.js";
