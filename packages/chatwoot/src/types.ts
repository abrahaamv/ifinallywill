/**
 * Chatwoot API Types
 *
 * Type definitions for Chatwoot REST API v1 integration.
 * Used for human escalation workflow in VisualKit platform.
 *
 * @see https://www.chatwoot.com/developers/api/
 */

import { z } from "zod";

// =============================================================================
// Enums
// =============================================================================

export const ConversationStatusEnum = z.enum([
	"open",
	"resolved",
	"pending",
	"snoozed",
	"bot",
]);
export type ConversationStatus = z.infer<typeof ConversationStatusEnum>;

export const ConversationPriorityEnum = z.enum([
	"urgent",
	"high",
	"medium",
	"low",
]);
export type ConversationPriority = z.infer<typeof ConversationPriorityEnum>;

export const MessageTypeEnum = z.enum([
	"incoming",
	"outgoing",
	"activity",
	"template",
]);
export type MessageType = z.infer<typeof MessageTypeEnum>;

export const MessageContentTypeEnum = z.enum([
	"text",
	"input_select",
	"cards",
	"form",
]);
export type MessageContentType = z.infer<typeof MessageContentTypeEnum>;

export const InboxTypeEnum = z.enum([
	"Channel::WebWidget",
	"Channel::Api",
	"Channel::Email",
	"Channel::Sms",
	"Channel::Whatsapp",
	"Channel::Telegram",
	"Channel::Line",
	"Channel::Facebook",
]);
export type InboxType = z.infer<typeof InboxTypeEnum>;

export const WebhookEventEnum = z.enum([
	"conversation_created",
	"conversation_status_changed",
	"conversation_updated",
	"conversation_resolved",
	"message_created",
	"message_updated",
	"webwidget_triggered",
]);
export type WebhookEvent = z.infer<typeof WebhookEventEnum>;

// =============================================================================
// Contact Schemas
// =============================================================================

export const ContactCustomAttributesSchema = z.record(
	z.union([z.string(), z.number(), z.boolean(), z.null()])
);
export type ContactCustomAttributes = z.infer<
	typeof ContactCustomAttributesSchema
>;

export const ContactSchema = z.object({
	id: z.number(),
	name: z.string().nullable(),
	email: z.string().nullable(),
	phone_number: z.string().nullable(),
	identifier: z.string().nullable(),
	thumbnail: z.string().nullable(),
	custom_attributes: ContactCustomAttributesSchema,
	additional_attributes: z.record(z.unknown()).default({}),
	created_at: z.number(),
	last_activity_at: z.number().nullable(),
	availability_status: z.enum(["online", "offline"]).nullable(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const ContactCreatePayloadSchema = z.object({
	inbox_id: z.number(),
	name: z.string().optional(),
	email: z.string().email().optional(),
	phone_number: z.string().optional(),
	identifier: z.string().optional(),
	custom_attributes: ContactCustomAttributesSchema.optional(),
	avatar_url: z.string().url().optional(),
});
export type ContactCreatePayload = z.infer<typeof ContactCreatePayloadSchema>;

export const ContactUpdatePayloadSchema = z.object({
	name: z.string().optional(),
	email: z.string().email().optional(),
	phone_number: z.string().optional(),
	identifier: z.string().optional(),
	custom_attributes: ContactCustomAttributesSchema.optional(),
	avatar_url: z.string().url().optional(),
});
export type ContactUpdatePayload = z.infer<typeof ContactUpdatePayloadSchema>;

// =============================================================================
// Conversation Schemas
// =============================================================================

export const ConversationCustomAttributesSchema = z.record(
	z.union([z.string(), z.number(), z.boolean(), z.null()])
);
export type ConversationCustomAttributes = z.infer<
	typeof ConversationCustomAttributesSchema
>;

export const ConversationMetaSchema = z.object({
	sender: ContactSchema.optional(),
	channel: z.string().optional(),
	assignee: z
		.object({
			id: z.number(),
			name: z.string(),
			email: z.string(),
			thumbnail: z.string().nullable(),
			availability_status: z.string().nullable(),
		})
		.nullable()
		.optional(),
	team: z
		.object({
			id: z.number(),
			name: z.string(),
		})
		.nullable()
		.optional(),
});
export type ConversationMeta = z.infer<typeof ConversationMetaSchema>;

export const ConversationSchema = z.object({
	id: z.number(),
	account_id: z.number(),
	inbox_id: z.number(),
	status: ConversationStatusEnum,
	priority: ConversationPriorityEnum.nullable().optional(),
	muted: z.boolean().default(false),
	waiting_since: z.number().nullable().optional(),
	snoozed_until: z.number().nullable().optional(),
	custom_attributes: ConversationCustomAttributesSchema.default({}),
	additional_attributes: z.record(z.unknown()).default({}),
	meta: ConversationMetaSchema.optional(),
	labels: z.array(z.string()).default([]),
	unread_count: z.number().default(0),
	first_reply_created_at: z.number().nullable().optional(),
	agent_last_seen_at: z.number().nullable().optional(),
	contact_last_seen_at: z.number().nullable().optional(),
	timestamp: z.number().nullable().optional(),
	created_at: z.number(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationCreatePayloadSchema = z.object({
	source_id: z.string(),
	inbox_id: z.number(),
	contact_id: z.number(),
	additional_attributes: z.record(z.unknown()).optional(),
	custom_attributes: ConversationCustomAttributesSchema.optional(),
	status: ConversationStatusEnum.optional(),
	assignee_id: z.number().optional(),
	team_id: z.number().optional(),
});
export type ConversationCreatePayload = z.infer<
	typeof ConversationCreatePayloadSchema
>;

// =============================================================================
// Message Schemas
// =============================================================================

export const MessageAttachmentSchema = z.object({
	id: z.number(),
	message_id: z.number(),
	file_type: z.string(),
	account_id: z.number(),
	extension: z.string().nullable(),
	data_url: z.string(),
	thumb_url: z.string(),
	file_size: z.number(),
});
export type MessageAttachment = z.infer<typeof MessageAttachmentSchema>;

export const MessageSenderSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string().nullable(),
	type: z.enum(["contact", "user"]),
	thumbnail: z.string().nullable(),
});
export type MessageSender = z.infer<typeof MessageSenderSchema>;

export const MessageSchema = z.object({
	id: z.number(),
	content: z.string().nullable(),
	content_type: MessageContentTypeEnum,
	content_attributes: z.record(z.unknown()).default({}),
	message_type: MessageTypeEnum,
	created_at: z.number(),
	private: z.boolean().default(false),
	source_id: z.string().nullable(),
	attachments: z.array(MessageAttachmentSchema).default([]),
	sender: MessageSenderSchema.nullable(),
	conversation_id: z.number(),
});
export type Message = z.infer<typeof MessageSchema>;

export const MessageCreatePayloadSchema = z.object({
	content: z.string(),
	message_type: z.enum(["outgoing", "incoming"]).optional(),
	private: z.boolean().optional(),
	content_type: MessageContentTypeEnum.optional(),
	content_attributes: z.record(z.unknown()).optional(),
	template_params: z.record(z.unknown()).optional(),
});
export type MessageCreatePayload = z.infer<typeof MessageCreatePayloadSchema>;

// =============================================================================
// Inbox Schemas
// =============================================================================

export const InboxSchema = z.object({
	id: z.number(),
	name: z.string(),
	channel_id: z.number(),
	channel_type: InboxTypeEnum,
	greeting_enabled: z.boolean(),
	greeting_message: z.string().nullable(),
	working_hours_enabled: z.boolean(),
	enable_email_collect: z.boolean(),
	csat_survey_enabled: z.boolean(),
	enable_auto_assignment: z.boolean(),
	out_of_office_message: z.string().nullable(),
	timezone: z.string().nullable(),
	callback_webhook_url: z.string().nullable(),
	allow_messages_after_resolved: z.boolean(),
	widget_color: z.string().nullable(),
	website_url: z.string().nullable(),
	website_token: z.string().nullable(),
	hmac_mandatory: z.boolean(),
});
export type Inbox = z.infer<typeof InboxSchema>;

// =============================================================================
// API Response Schemas
// =============================================================================

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
	z.object({
		payload: z.array(itemSchema),
		meta: z.object({
			count: z.number(),
			current_page: z.number(),
		}),
	});

export const ApiErrorSchema = z.object({
	success: z.boolean(),
	error: z.string(),
	message: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// =============================================================================
// VisualKit Integration Types
// =============================================================================

/**
 * AI context passed to Chatwoot on escalation.
 * Stored in conversation custom_attributes.
 */
export const EscalationContextSchema = z.object({
	/** VisualKit session ID */
	session_id: z.string(),
	/** AI conversation summary */
	ai_summary: z.string(),
	/** AI confidence score (0-1) */
	ai_confidence: z.number().min(0).max(1),
	/** Escalation reason code */
	escalation_reason: z.enum([
		"user_request",
		"ai_failed",
		"session_timeout",
		"duplicate_problem",
		"sentiment_frustrated",
	]),
	/** Detected user sentiment */
	user_sentiment: z
		.enum(["positive", "neutral", "negative", "frustrated"])
		.optional(),
	/** Number of AI turns before escalation */
	ai_turn_count: z.number().int().min(0),
	/** RAG sources used (document titles) */
	rag_sources: z.array(z.string()).optional(),
	/** User's query that triggered escalation */
	escalation_query: z.string().optional(),
	/** Meeting URL for live handoff */
	meeting_url: z.string().url().optional(),
	/** ISO timestamp of escalation */
	escalated_at: z.string().datetime(),
});
export type EscalationContext = z.infer<typeof EscalationContextSchema>;

/**
 * Contact sync payload: Dashboard → Chatwoot.
 * Uses `identifier` field for cross-system linking.
 */
export const VisualKitContactSyncSchema = z.object({
	/** VisualKit user ID (maps to Chatwoot identifier) */
	visualkit_user_id: z.string(),
	/** User email */
	email: z.string().email().optional(),
	/** User name */
	name: z.string().optional(),
	/** User phone */
	phone_number: z.string().optional(),
	/** Dashboard segment */
	dashboard_segment: z.string().optional(),
	/** Total AI conversations */
	ai_conversation_count: z.number().int().optional(),
	/** Last AI resolution timestamp */
	last_ai_resolution: z.string().datetime().optional(),
	/** User plan/tier */
	plan: z.string().optional(),
});
export type VisualKitContactSync = z.infer<typeof VisualKitContactSyncSchema>;

/**
 * Chatwoot client configuration
 */
export const ChatwootConfigSchema = z.object({
	/** Chatwoot base URL (e.g., http://localhost:3000) */
	baseUrl: z.string().url(),
	/** Chatwoot account ID */
	accountId: z.number(),
	/** API access token */
	apiAccessToken: z.string(),
	/** Inbox ID for VisualKit escalations */
	inboxId: z.number(),
	/** Webhook secret for signature verification */
	webhookSecret: z.string().optional(),
});
export type ChatwootConfig = z.infer<typeof ChatwootConfigSchema>;
