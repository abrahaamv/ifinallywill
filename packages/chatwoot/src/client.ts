/**
 * Chatwoot API Client
 *
 * Production-grade TypeScript client for Chatwoot REST API v1.
 * Handles contact sync, conversation creation, and escalation workflows.
 *
 * @example
 * ```typescript
 * const client = new ChatwootClient({
 *   baseUrl: 'http://localhost:3000',
 *   accountId: 1,
 *   apiAccessToken: 'your-token',
 *   inboxId: 1,
 * });
 *
 * // Create contact on first escalation
 * const contact = await client.createOrUpdateContact({
 *   visualkit_user_id: 'user_123',
 *   email: 'john@example.com',
 *   name: 'John Doe',
 * });
 *
 * // Create escalation conversation
 * const conversation = await client.createEscalation({
 *   contactId: contact.id,
 *   context: {
 *     session_id: 'session_456',
 *     ai_summary: 'User needs help with billing...',
 *     ai_confidence: 0.3,
 *     escalation_reason: 'ai_failed',
 *     ai_turn_count: 5,
 *     escalated_at: new Date().toISOString(),
 *   },
 * });
 * ```
 */

import {
	type ChatwootConfig,
	ChatwootConfigSchema,
	type Contact,
	type ContactCreatePayload,
	ContactSchema,
	type Conversation,
	type ConversationCreatePayload,
	ConversationSchema,
	type EscalationContext,
	EscalationContextSchema,
	type Message,
	type MessageCreatePayload,
	MessageSchema,
	type VisualKitContactSync,
	VisualKitContactSyncSchema,
} from "./types.js";

// =============================================================================
// Error Classes
// =============================================================================

export class ChatwootError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly response?: unknown
	) {
		super(message);
		this.name = "ChatwootError";
	}
}

export class ChatwootNotFoundError extends ChatwootError {
	constructor(resource: string, identifier: string) {
		super(`${resource} not found: ${identifier}`, 404);
		this.name = "ChatwootNotFoundError";
	}
}

export class ChatwootValidationError extends ChatwootError {
	constructor(message: string, public readonly errors?: unknown) {
		super(message, 422, errors);
		this.name = "ChatwootValidationError";
	}
}

// =============================================================================
// Client Implementation
// =============================================================================

export class ChatwootClient {
	private readonly config: ChatwootConfig;
	private readonly headers: Record<string, string>;

	constructor(config: ChatwootConfig) {
		this.config = ChatwootConfigSchema.parse(config);
		this.headers = {
			"Content-Type": "application/json",
			api_access_token: this.config.apiAccessToken,
		};
	}

	// ===========================================================================
	// HTTP Methods
	// ===========================================================================

	private async request<T>(
		method: string,
		path: string,
		body?: unknown
	): Promise<T> {
		const url = `${this.config.baseUrl}/api/v1/accounts/${this.config.accountId}${path}`;

		const response = await fetch(url, {
			method,
			headers: this.headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const errorBody = (await response.json().catch(() => ({}))) as {
				message?: string;
			};

			if (response.status === 404) {
				throw new ChatwootNotFoundError("Resource", path);
			}

			if (response.status === 422) {
				throw new ChatwootValidationError(
					errorBody.message || "Validation failed",
					errorBody
				);
			}

			throw new ChatwootError(
				errorBody.message || `HTTP ${response.status}`,
				response.status,
				errorBody
			);
		}

		return response.json() as Promise<T>;
	}

	private async get<T>(path: string): Promise<T> {
		return this.request<T>("GET", path);
	}

	private async post<T>(path: string, body: unknown): Promise<T> {
		return this.request<T>("POST", path, body);
	}

	private async put<T>(path: string, body: unknown): Promise<T> {
		return this.request<T>("PUT", path, body);
	}

	// Note: patch method available for future use
	// private async patch<T>(path: string, body: unknown): Promise<T> {
	// 	return this.request<T>("PATCH", path, body);
	// }

	// ===========================================================================
	// Contact Operations
	// ===========================================================================

	/**
	 * Search for a contact by identifier (VisualKit user ID).
	 */
	async findContactByIdentifier(identifier: string): Promise<Contact | null> {
		try {
			const result = await this.get<{ payload: Contact[] }>(
				`/contacts/search?q=${encodeURIComponent(identifier)}`
			);

			// Find exact match by identifier field
			const contact = result.payload.find((c) => c.identifier === identifier);
			return contact ? ContactSchema.parse(contact) : null;
		} catch (error) {
			if (error instanceof ChatwootNotFoundError) {
				return null;
			}
			throw error;
		}
	}

	/**
	 * Create a new contact.
	 */
	async createContact(payload: ContactCreatePayload): Promise<Contact> {
		const result = await this.post<{ payload: { contact: Contact } }>(
			"/contacts",
			payload
		);
		return ContactSchema.parse(result.payload.contact);
	}

	/**
	 * Update an existing contact.
	 */
	async updateContact(
		contactId: number,
		payload: Partial<ContactCreatePayload>
	): Promise<Contact> {
		const result = await this.put<Contact>(`/contacts/${contactId}`, payload);
		return ContactSchema.parse(result);
	}

	/**
	 * Create or update contact from VisualKit user data.
	 * Uses `identifier` field to link VisualKit user ID to Chatwoot contact.
	 */
	async createOrUpdateContact(sync: VisualKitContactSync): Promise<Contact> {
		const validated = VisualKitContactSyncSchema.parse(sync);

		// Build custom attributes for Chatwoot
		const customAttributes: Record<string, string | number | boolean | null> =
			{};
		if (validated.dashboard_segment) {
			customAttributes.dashboard_segment = validated.dashboard_segment;
		}
		if (validated.ai_conversation_count !== undefined) {
			customAttributes.ai_conversation_count = validated.ai_conversation_count;
		}
		if (validated.last_ai_resolution) {
			customAttributes.last_ai_resolution = validated.last_ai_resolution;
		}
		if (validated.plan) {
			customAttributes.plan = validated.plan;
		}

		// Check if contact exists
		const existing = await this.findContactByIdentifier(
			validated.visualkit_user_id
		);

		if (existing) {
			// Update existing contact
			return this.updateContact(existing.id, {
				name: validated.name,
				email: validated.email,
				phone_number: validated.phone_number,
				custom_attributes: {
					...existing.custom_attributes,
					...customAttributes,
				},
			});
		}

		// Create new contact
		return this.createContact({
			inbox_id: this.config.inboxId,
			identifier: validated.visualkit_user_id,
			name: validated.name,
			email: validated.email,
			phone_number: validated.phone_number,
			custom_attributes: customAttributes,
		});
	}

	// ===========================================================================
	// Conversation Operations
	// ===========================================================================

	/**
	 * Get a conversation by ID.
	 */
	async getConversation(conversationId: number): Promise<Conversation> {
		const result = await this.get<Conversation>(
			`/conversations/${conversationId}`
		);
		return ConversationSchema.parse(result);
	}

	/**
	 * Create a new conversation.
	 */
	async createConversation(
		payload: ConversationCreatePayload
	): Promise<Conversation> {
		const result = await this.post<Conversation>("/conversations", payload);
		return ConversationSchema.parse(result);
	}

	/**
	 * Toggle conversation status (open, resolved, pending, snoozed).
	 */
	async toggleConversationStatus(
		conversationId: number,
		status: "open" | "resolved" | "pending" | "snoozed"
	): Promise<Conversation> {
		const result = await this.post<Conversation>(
			`/conversations/${conversationId}/toggle_status`,
			{ status }
		);
		return ConversationSchema.parse(result);
	}

	/**
	 * Update conversation custom attributes.
	 */
	async updateConversationAttributes(
		conversationId: number,
		customAttributes: Record<string, unknown>
	): Promise<Conversation> {
		const result = await this.post<Conversation>(
			`/conversations/${conversationId}/custom_attributes`,
			{ custom_attributes: customAttributes }
		);
		return ConversationSchema.parse(result);
	}

	/**
	 * Add labels to a conversation.
	 */
	async addConversationLabels(
		conversationId: number,
		labels: string[]
	): Promise<void> {
		await this.post(`/conversations/${conversationId}/labels`, { labels });
	}

	// ===========================================================================
	// Message Operations
	// ===========================================================================

	/**
	 * Send a message to a conversation.
	 */
	async sendMessage(
		conversationId: number,
		payload: MessageCreatePayload
	): Promise<Message> {
		const result = await this.post<Message>(
			`/conversations/${conversationId}/messages`,
			payload
		);
		return MessageSchema.parse(result);
	}

	/**
	 * Send a private note (internal agent message).
	 */
	async sendPrivateNote(
		conversationId: number,
		content: string
	): Promise<Message> {
		return this.sendMessage(conversationId, {
			content,
			message_type: "outgoing",
			private: true,
		});
	}

	// ===========================================================================
	// Escalation Workflow
	// ===========================================================================

	/**
	 * Create an escalation conversation with full AI context.
	 *
	 * This is the main entry point for VisualKit → Chatwoot escalation.
	 * Creates conversation with AI transcript summary, meeting URL, and metadata.
	 */
	async createEscalation(params: {
		contactId: number;
		context: EscalationContext;
		aiTranscript?: Array<{ role: string; content: string; timestamp: string }>;
	}): Promise<{
		conversation: Conversation;
		summaryMessage: Message;
	}> {
		const { contactId, context, aiTranscript } = params;
		const validatedContext = EscalationContextSchema.parse(context);

		// Generate unique source_id for this escalation
		const sourceId = `visualkit_${validatedContext.session_id}`;

		// Build custom attributes with AI context
		const customAttributes: Record<string, string | number | boolean | null> = {
			visualkit_session_id: validatedContext.session_id,
			escalation_reason: validatedContext.escalation_reason,
			ai_confidence: validatedContext.ai_confidence,
			ai_turn_count: validatedContext.ai_turn_count,
			escalated_at: validatedContext.escalated_at,
		};

		if (validatedContext.user_sentiment) {
			customAttributes.user_sentiment = validatedContext.user_sentiment;
		}
		if (validatedContext.meeting_url) {
			customAttributes.meeting_url = validatedContext.meeting_url;
		}
		if (validatedContext.rag_sources?.length) {
			customAttributes.rag_sources = validatedContext.rag_sources.join(", ");
		}

		// Create conversation with pending status (AI → human handoff)
		const conversation = await this.createConversation({
			source_id: sourceId,
			inbox_id: this.config.inboxId,
			contact_id: contactId,
			status: "pending",
			custom_attributes: customAttributes,
		});

		// Add labels based on escalation type
		const labels = ["ai-escalated"];
		if (validatedContext.escalation_reason === "user_request") {
			labels.push("user-requested");
		}
		if (validatedContext.user_sentiment === "frustrated") {
			labels.push("frustrated-user");
		}
		if (validatedContext.meeting_url) {
			labels.push("meeting-available");
		}
		await this.addConversationLabels(conversation.id, labels);

		// Send AI summary as first private note
		let summaryContent = `## AI Escalation Summary\n\n`;
		summaryContent += `**Reason:** ${this.formatEscalationReason(validatedContext.escalation_reason)}\n`;
		summaryContent += `**AI Confidence:** ${Math.round(validatedContext.ai_confidence * 100)}%\n`;
		summaryContent += `**AI Turns:** ${validatedContext.ai_turn_count}\n`;

		if (validatedContext.user_sentiment) {
			summaryContent += `**User Sentiment:** ${validatedContext.user_sentiment}\n`;
		}

		if (validatedContext.meeting_url) {
			summaryContent += `\n**Join Meeting:** [Click here](${validatedContext.meeting_url})\n`;
		}

		summaryContent += `\n---\n\n${validatedContext.ai_summary}`;

		// Add transcript if provided
		if (aiTranscript?.length) {
			summaryContent += `\n\n---\n\n## Conversation Transcript\n\n`;
			for (const msg of aiTranscript.slice(-10)) {
				// Last 10 messages
				const role = msg.role === "assistant" ? "AI" : "User";
				summaryContent += `**${role}:** ${msg.content}\n\n`;
			}
		}

		const summaryMessage = await this.sendPrivateNote(
			conversation.id,
			summaryContent
		);

		// Toggle to open status to alert agents
		await this.toggleConversationStatus(conversation.id, "open");

		return { conversation, summaryMessage };
	}

	/**
	 * Mark an escalation as resolved.
	 */
	async resolveEscalation(
		conversationId: number,
		resolution?: {
			resolvedBy: "agent" | "ai_followup";
			notes?: string;
		}
	): Promise<Conversation> {
		if (resolution?.notes) {
			await this.sendPrivateNote(
				conversationId,
				`**Resolution Notes:** ${resolution.notes}\n\nResolved by: ${resolution.resolvedBy}`
			);
		}

		return this.toggleConversationStatus(conversationId, "resolved");
	}

	// ===========================================================================
	// Utilities
	// ===========================================================================

	private formatEscalationReason(
		reason: EscalationContext["escalation_reason"]
	): string {
		const reasonMap: Record<string, string> = {
			user_request: "User requested human assistance",
			ai_failed: "AI could not resolve after multiple attempts",
			session_timeout: "Session exceeded time limit",
			duplicate_problem: "Recurring unresolved issue",
			sentiment_frustrated: "User frustration detected",
		};
		return reasonMap[reason] || reason;
	}

	/**
	 * Get the configured inbox ID.
	 */
	get inboxId(): number {
		return this.config.inboxId;
	}

	/**
	 * Get the configured account ID.
	 */
	get accountId(): number {
		return this.config.accountId;
	}

	// ===========================================================================
	// Agent Authentication (SSO)
	// ===========================================================================

	/**
	 * Sign in an agent and get access token.
	 * Used for SSO - dashboard users auto-login to Chatwoot.
	 */
	async signInAgent(email: string, password: string): Promise<{
		access_token: string;
		account_id: number;
		available_name: string;
		email: string;
		id: number;
		name: string;
		role: string;
	}> {
		const url = `${this.config.baseUrl}/api/v1/authentication/sign_in`;

		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({})) as { message?: string };
			throw new ChatwootError(
				errorBody.message || 'Agent sign in failed',
				response.status,
				errorBody
			);
		}

		return response.json() as Promise<{
			access_token: string;
			account_id: number;
			available_name: string;
			email: string;
			id: number;
			name: string;
			role: string;
		}>;
	}

	/**
	 * Create a new agent account.
	 * Used when a dashboard user doesn't have a Chatwoot agent account yet.
	 */
	async createAgent(params: {
		email: string;
		name: string;
		role?: 'agent' | 'administrator';
		availability?: 'online' | 'offline' | 'busy';
	}): Promise<{
		id: number;
		email: string;
		name: string;
		role: string;
		confirmed: boolean;
	}> {
		const result = await this.post<{
			id: number;
			email: string;
			name: string;
			role: string;
			confirmed: boolean;
		}>('/agents', {
			email: params.email,
			name: params.name,
			role: params.role || 'agent',
			availability: params.availability || 'online',
		});
		return result;
	}

	/**
	 * Find an agent by email.
	 */
	async findAgentByEmail(email: string): Promise<{
		id: number;
		email: string;
		name: string;
		role: string;
	} | null> {
		try {
			const result = await this.get<Array<{
				id: number;
				email: string;
				name: string;
				role: string;
			}>>('/agents');

			return result.find(agent => agent.email === email) || null;
		} catch (error) {
			if (error instanceof ChatwootNotFoundError) {
				return null;
			}
			throw error;
		}
	}
}

// =============================================================================
// Platform API Client (for SSO)
// =============================================================================

/**
 * Chatwoot Platform API Client
 *
 * Uses the Platform APIs for SSO and user management.
 * Requires a Platform App token created in super_admin/platform_apps.
 *
 * @see https://developers.chatwoot.com/contributing-guide/chatwoot-platform-apis
 */
export class ChatwootPlatformClient {
	private readonly baseUrl: string;
	private readonly headers: Record<string, string>;

	constructor(config: { baseUrl: string; platformToken: string }) {
		this.baseUrl = config.baseUrl;
		this.headers = {
			"Content-Type": "application/json",
			api_access_token: config.platformToken,
		};
	}

	private async request<T>(
		method: string,
		path: string,
		body?: unknown
	): Promise<T> {
		const url = `${this.baseUrl}/platform/api/v1${path}`;

		const response = await fetch(url, {
			method,
			headers: this.headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			const errorBody = (await response.json().catch(() => ({}))) as {
				message?: string;
			};

			if (response.status === 404) {
				throw new ChatwootNotFoundError("Resource", path);
			}

			throw new ChatwootError(
				errorBody.message || `HTTP ${response.status}`,
				response.status,
				errorBody
			);
		}

		return response.json() as Promise<T>;
	}

	// ===========================================================================
	// User Operations
	// ===========================================================================

	/**
	 * Create a user in Chatwoot.
	 * Users are global and can be added to multiple accounts.
	 */
	async createUser(params: {
		name: string;
		email: string;
		password?: string;
		custom_attributes?: Record<string, unknown>;
	}): Promise<{
		id: number;
		name: string;
		email: string;
		type: string;
		custom_attributes: Record<string, unknown>;
	}> {
		return this.request("POST", "/users", params);
	}

	/**
	 * Get user details by ID.
	 */
	async getUser(userId: number): Promise<{
		id: number;
		name: string;
		email: string;
		type: string;
		custom_attributes: Record<string, unknown>;
	}> {
		return this.request("GET", `/users/${userId}`);
	}

	/**
	 * Get SSO login URL for a user.
	 * Returns a one-time URL that automatically logs the user in.
	 *
	 * @see https://developers.chatwoot.com/api-reference/users/get-user-sso-link
	 */
	async getUserSSOLink(userId: number): Promise<{ url: string }> {
		return this.request("GET", `/users/${userId}/login`);
	}

	/**
	 * Find user by email (searches through all users).
	 */
	async findUserByEmail(email: string): Promise<{
		id: number;
		name: string;
		email: string;
	} | null> {
		// Platform API doesn't have a search endpoint, so we need to use accounts
		// This is a limitation - in production you'd want to store the user ID
		try {
			// Try to get user from account users list
			const accounts = await this.request<Array<{ id: number }>>("GET", "/accounts");
			for (const account of accounts) {
				const users = await this.request<Array<{
					id: number;
					name: string;
					email: string;
				}>>("GET", `/accounts/${account.id}/account_users`);
				const user = users.find(u => u.email === email);
				if (user) return user;
			}
			return null;
		} catch {
			return null;
		}
	}

	// ===========================================================================
	// Account Operations
	// ===========================================================================

	/**
	 * Create an account.
	 */
	async createAccount(params: {
		name: string;
	}): Promise<{
		id: number;
		name: string;
	}> {
		return this.request("POST", "/accounts", params);
	}

	/**
	 * Get account details.
	 */
	async getAccount(accountId: number): Promise<{
		id: number;
		name: string;
	}> {
		return this.request("GET", `/accounts/${accountId}`);
	}

	/**
	 * Add a user to an account with a specific role.
	 */
	async addUserToAccount(
		accountId: number,
		userId: number,
		role: "administrator" | "agent"
	): Promise<void> {
		await this.request("POST", `/accounts/${accountId}/account_users`, {
			user_id: userId,
			role,
		});
	}

	/**
	 * Get all users in an account.
	 */
	async getAccountUsers(accountId: number): Promise<Array<{
		id: number;
		name: string;
		email: string;
		role: string;
	}>> {
		return this.request("GET", `/accounts/${accountId}/account_users`);
	}
}
