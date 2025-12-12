/**
 * Chatwoot Webhook Handler
 *
 * Parses and validates incoming webhook payloads from Chatwoot.
 * Used for syncing agent responses back to Dashboard for AI learning.
 *
 * @example
 * ```typescript
 * // In Fastify route handler
 * app.post('/webhooks/chatwoot', async (request, reply) => {
 *   const signature = request.headers['x-chatwoot-signature'];
 *   const handler = new ChatwootWebhookHandler(webhookSecret);
 *
 *   if (!handler.verifySignature(request.rawBody, signature)) {
 *     return reply.status(401).send({ error: 'Invalid signature' });
 *   }
 *
 *   const event = handler.parse(request.body);
 *
 *   switch (event.type) {
 *     case 'message_created':
 *       if (event.isAgentMessage) {
 *         // Store agent response for AI training
 *         await storeAgentResponse(event.data);
 *       }
 *       break;
 *     case 'conversation_resolved':
 *       // Update escalation status in Dashboard
 *       await markEscalationResolved(event.data.conversationId);
 *       break;
 *   }
 * });
 * ```
 */

import { createHmac } from "node:crypto";
import { z } from "zod";
import {
	ConversationSchema,
	MessageSchema,
	WebhookEventEnum,
	type Conversation,
	type Message,
} from "./types.js";

// =============================================================================
// Webhook Payload Schemas
// =============================================================================

const WebhookAccountSchema = z.object({
	id: z.number(),
	name: z.string(),
});

const BaseWebhookPayloadSchema = z.object({
	event: WebhookEventEnum,
	account: WebhookAccountSchema,
});

const ConversationCreatedPayloadSchema = BaseWebhookPayloadSchema.extend({
	event: z.literal("conversation_created"),
	conversation: ConversationSchema,
});

const ConversationStatusChangedPayloadSchema = BaseWebhookPayloadSchema.extend({
	event: z.literal("conversation_status_changed"),
	conversation: ConversationSchema,
});

const ConversationUpdatedPayloadSchema = BaseWebhookPayloadSchema.extend({
	event: z.literal("conversation_updated"),
	conversation: ConversationSchema,
	changed_attributes: z
		.array(
			z.object({
				attribute: z.string(),
				previous_value: z.unknown(),
				current_value: z.unknown(),
			})
		)
		.optional(),
});

const ConversationResolvedPayloadSchema = BaseWebhookPayloadSchema.extend({
	event: z.literal("conversation_resolved"),
	conversation: ConversationSchema,
});

const MessageCreatedPayloadSchema = BaseWebhookPayloadSchema.extend({
	event: z.literal("message_created"),
	message: MessageSchema,
	conversation: ConversationSchema,
});

const MessageUpdatedPayloadSchema = BaseWebhookPayloadSchema.extend({
	event: z.literal("message_updated"),
	message: MessageSchema,
	conversation: ConversationSchema,
});

// Union of all webhook payloads
const WebhookPayloadSchema = z.discriminatedUnion("event", [
	ConversationCreatedPayloadSchema,
	ConversationStatusChangedPayloadSchema,
	ConversationUpdatedPayloadSchema,
	ConversationResolvedPayloadSchema,
	MessageCreatedPayloadSchema,
	MessageUpdatedPayloadSchema,
]);

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// =============================================================================
// Parsed Event Types
// =============================================================================

export interface ConversationCreatedEvent {
	type: "conversation_created";
	accountId: number;
	conversationId: number;
	conversation: Conversation;
	/** Whether this is a VisualKit escalation (has visualkit_session_id) */
	isVisualKitEscalation: boolean;
	/** VisualKit session ID if this is an escalation */
	sessionId?: string;
}

export interface ConversationStatusChangedEvent {
	type: "conversation_status_changed";
	accountId: number;
	conversationId: number;
	conversation: Conversation;
	previousStatus?: string;
	newStatus: string;
}

export interface ConversationResolvedEvent {
	type: "conversation_resolved";
	accountId: number;
	conversationId: number;
	conversation: Conversation;
	/** VisualKit session ID if this was an escalation */
	sessionId?: string;
	/** Resolution timestamp */
	resolvedAt: Date;
}

export interface MessageCreatedEvent {
	type: "message_created";
	accountId: number;
	conversationId: number;
	messageId: number;
	message: Message;
	conversation: Conversation;
	/** Whether this message was sent by an agent (not contact) */
	isAgentMessage: boolean;
	/** Whether this is a private note (internal) */
	isPrivateNote: boolean;
	/** VisualKit session ID if this is an escalation conversation */
	sessionId?: string;
}

export interface ConversationUpdatedEvent {
	type: "conversation_updated";
	accountId: number;
	conversationId: number;
	conversation: Conversation;
	changedAttributes: Array<{
		attribute: string;
		previousValue: unknown;
		currentValue: unknown;
	}>;
}

export interface UnknownEvent {
	type: "unknown";
	event: string;
	raw: unknown;
}

export type ParsedWebhookEvent =
	| ConversationCreatedEvent
	| ConversationStatusChangedEvent
	| ConversationResolvedEvent
	| MessageCreatedEvent
	| ConversationUpdatedEvent
	| UnknownEvent;

// =============================================================================
// Webhook Handler
// =============================================================================

export class ChatwootWebhookHandler {
	constructor(private readonly webhookSecret?: string) {}

	/**
	 * Verify webhook signature using HMAC-SHA256.
	 * Returns true if signature is valid or if no secret is configured.
	 */
	verifySignature(
		payload: string | Buffer,
		signature: string | undefined
	): boolean {
		if (!this.webhookSecret) {
			// No secret configured, skip verification (development mode)
			return true;
		}

		if (!signature) {
			return false;
		}

		const payloadString =
			typeof payload === "string" ? payload : payload.toString("utf-8");

		const expectedSignature = createHmac("sha256", this.webhookSecret)
			.update(payloadString)
			.digest("hex");

		// Constant-time comparison
		if (signature.length !== expectedSignature.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < signature.length; i++) {
			result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
		}
		return result === 0;
	}

	/**
	 * Parse and validate webhook payload.
	 * Returns a typed event object with extracted metadata.
	 */
	parse(payload: unknown): ParsedWebhookEvent {
		// Validate base structure
		const baseResult = BaseWebhookPayloadSchema.safeParse(payload);
		if (!baseResult.success) {
			return {
				type: "unknown",
				event: "invalid",
				raw: payload,
			};
		}

		const event = baseResult.data.event;

		// Parse based on event type
		switch (event) {
			case "conversation_created": {
				const result = ConversationCreatedPayloadSchema.safeParse(payload);
				if (!result.success) {
					return { type: "unknown", event, raw: payload };
				}

				const sessionId = this.extractSessionId(result.data.conversation);
				return {
					type: "conversation_created",
					accountId: result.data.account.id,
					conversationId: result.data.conversation.id,
					conversation: result.data.conversation,
					isVisualKitEscalation: !!sessionId,
					sessionId,
				};
			}

			case "conversation_status_changed": {
				const result =
					ConversationStatusChangedPayloadSchema.safeParse(payload);
				if (!result.success) {
					return { type: "unknown", event, raw: payload };
				}

				return {
					type: "conversation_status_changed",
					accountId: result.data.account.id,
					conversationId: result.data.conversation.id,
					conversation: result.data.conversation,
					newStatus: result.data.conversation.status,
				};
			}

			case "conversation_resolved": {
				const result = ConversationResolvedPayloadSchema.safeParse(payload);
				if (!result.success) {
					return { type: "unknown", event, raw: payload };
				}

				return {
					type: "conversation_resolved",
					accountId: result.data.account.id,
					conversationId: result.data.conversation.id,
					conversation: result.data.conversation,
					sessionId: this.extractSessionId(result.data.conversation),
					resolvedAt: new Date(),
				};
			}

			case "message_created": {
				const result = MessageCreatedPayloadSchema.safeParse(payload);
				if (!result.success) {
					return { type: "unknown", event, raw: payload };
				}

				const { message, conversation } = result.data;
				return {
					type: "message_created",
					accountId: result.data.account.id,
					conversationId: conversation.id,
					messageId: message.id,
					message,
					conversation,
					isAgentMessage:
						message.message_type === "outgoing" &&
						message.sender?.type === "user",
					isPrivateNote: message.private,
					sessionId: this.extractSessionId(conversation),
				};
			}

			case "conversation_updated": {
				const result = ConversationUpdatedPayloadSchema.safeParse(payload);
				if (!result.success) {
					return { type: "unknown", event, raw: payload };
				}

				return {
					type: "conversation_updated",
					accountId: result.data.account.id,
					conversationId: result.data.conversation.id,
					conversation: result.data.conversation,
					changedAttributes: (result.data.changed_attributes || []).map(
						(attr) => ({
							attribute: attr.attribute,
							previousValue: attr.previous_value,
							currentValue: attr.current_value,
						})
					),
				};
			}

			default:
				return {
					type: "unknown",
					event: event as string,
					raw: payload,
				};
		}
	}

	/**
	 * Extract VisualKit session ID from conversation custom attributes.
	 */
	private extractSessionId(conversation: Conversation): string | undefined {
		const sessionId = conversation.custom_attributes?.visualkit_session_id;
		return typeof sessionId === "string" ? sessionId : undefined;
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an event is from a VisualKit escalation.
 */
export function isVisualKitEscalation(event: ParsedWebhookEvent): boolean {
	switch (event.type) {
		case "conversation_created":
			return event.isVisualKitEscalation;
		case "conversation_resolved":
		case "message_created":
			return !!event.sessionId;
		default:
			return false;
	}
}

/**
 * Extract agent responses from message events for AI training.
 */
export function extractAgentResponseForTraining(event: MessageCreatedEvent): {
	sessionId: string;
	agentResponse: string;
	conversationId: number;
	timestamp: Date;
} | null {
	// Only process agent messages (not private notes, not contact messages)
	if (!event.isAgentMessage || event.isPrivateNote || !event.sessionId) {
		return null;
	}

	if (!event.message.content) {
		return null;
	}

	return {
		sessionId: event.sessionId,
		agentResponse: event.message.content,
		conversationId: event.conversationId,
		timestamp: new Date(event.message.created_at * 1000),
	};
}
