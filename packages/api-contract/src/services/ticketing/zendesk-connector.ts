/**
 * Phase 12 Week 6: Zendesk Ticketing Connector
 *
 * Implements Zendesk integration using REST API v2
 * https://developer.zendesk.com/api-reference/ticketing/introduction/
 */

import {
  BaseTicketingConnector,
  type Ticket,
  type TicketUser,
  type TicketComment,
  type CreateTicketInput,
  type UpdateTicketInput,
  type CreateUserInput,
} from './base-connector';

/**
 * Zendesk API response types
 */
interface ZendeskTicket {
  id: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  type: string;
  requester_id: number;
  assignee_id?: number;
  group_id?: number;
  tags: string[];
  custom_fields?: Array<{ id: number; value: any }>;
  created_at: string;
  updated_at: string;
}

interface ZendeskUser {
  id: number;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  organization_id?: number;
  user_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface ZendeskComment {
  id: number;
  type: 'Comment' | 'VoiceComment';
  author_id: number;
  body: string;
  html_body?: string;
  public: boolean;
  attachments?: Array<{
    id: number;
    file_name: string;
    content_type: string;
    size: number;
    content_url: string;
  }>;
  created_at: string;
}

/**
 * Zendesk Ticketing Connector
 */
export class ZendeskConnector extends BaseTicketingConnector {
  /**
   * Get Zendesk API base URL
   */
  private getApiUrl(): string {
    const subdomain = this.config.credentials.subdomain;
    if (!subdomain) {
      throw new Error('Zendesk subdomain required');
    }
    return `https://${subdomain}.zendesk.com/api/v2`;
  }

  /**
   * Get authentication header
   */
  private getAuthHeader(): string {
    const { email, apiToken, apiKey } = this.config.credentials;

    if (email && apiToken) {
      // Basic auth with email + API token (recommended)
      const credentials = Buffer.from(`${email}/token:${apiToken}`).toString('base64');
      return `Basic ${credentials}`;
    }

    if (apiKey) {
      // Bearer token auth (OAuth)
      return `Bearer ${apiKey}`;
    }

    throw new Error('Zendesk credentials required (email + apiToken or apiKey)');
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.getApiUrl()}${endpoint}`;
    const timeout = this.config.options?.timeout || 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || error.description || `Zendesk API error: ${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Test Zendesk connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/users/me.json');
      return true;
    } catch (error) {
      this.logger.error('Zendesk connection test failed', { error });
      return false;
    }
  }

  /**
   * Map Zendesk ticket to Ticket
   */
  private mapTicket(zdTicket: ZendeskTicket, requesterEmail?: string): Ticket {
    const statusMap: Record<string, Ticket['status']> = {
      new: 'new',
      open: 'open',
      pending: 'pending',
      hold: 'hold',
      solved: 'solved',
      closed: 'closed',
    };

    const priorityMap: Record<string, Ticket['priority']> = {
      low: 'low',
      normal: 'normal',
      high: 'high',
      urgent: 'urgent',
    };

    const typeMap: Record<string, Ticket['type']> = {
      question: 'question',
      incident: 'incident',
      problem: 'problem',
      task: 'task',
    };

    // Parse custom fields
    const customFields = this.unmapCustomFields(
      Object.fromEntries(
        (zdTicket.custom_fields || []).map((cf) => [cf.id, cf.value])
      )
    );

    return {
      id: String(zdTicket.id),
      subject: zdTicket.subject,
      description: zdTicket.description,
      status: statusMap[zdTicket.status] || 'new',
      priority: priorityMap[zdTicket.priority] || 'normal',
      type: typeMap[zdTicket.type] || 'question',
      requesterEmail: requesterEmail || '',
      requesterId: String(zdTicket.requester_id),
      assigneeId: zdTicket.assignee_id ? String(zdTicket.assignee_id) : undefined,
      groupId: zdTicket.group_id ? String(zdTicket.group_id) : undefined,
      tags: zdTicket.tags,
      customFields,
      createdAt: new Date(zdTicket.created_at),
      updatedAt: new Date(zdTicket.updated_at),
    };
  }

  /**
   * Map Zendesk user to TicketUser
   */
  private mapUser(zdUser: ZendeskUser): TicketUser {
    const roleMap: Record<string, TicketUser['role']> = {
      'end-user': 'end-user',
      agent: 'agent',
      admin: 'admin',
    };

    return {
      id: String(zdUser.id),
      email: zdUser.email,
      name: zdUser.name,
      phone: zdUser.phone,
      role: roleMap[zdUser.role] || 'end-user',
      organizationId: zdUser.organization_id ? String(zdUser.organization_id) : undefined,
      customFields: zdUser.user_fields,
      createdAt: new Date(zdUser.created_at),
      updatedAt: new Date(zdUser.updated_at),
    };
  }

  /**
   * Map Zendesk comment to TicketComment
   */
  private mapComment(zdComment: ZendeskComment): TicketComment {
    return {
      id: String(zdComment.id),
      ticketId: '', // Will be set by caller
      authorId: String(zdComment.author_id),
      body: zdComment.body,
      htmlBody: zdComment.html_body,
      public: zdComment.public,
      attachments: zdComment.attachments?.map((att) => ({
        id: String(att.id),
        filename: att.file_name,
        contentType: att.content_type,
        size: att.size,
        url: att.content_url,
      })),
      createdAt: new Date(zdComment.created_at),
    };
  }

  /**
   * Get ticket by ID
   */
  async getTicket(id: string): Promise<Ticket | null> {
    try {
      const response = await this.request<{ ticket: ZendeskTicket }>(
        'GET',
        `/tickets/${id}.json`
      );

      // Fetch requester to get email
      const requester = await this.getUser(String(response.ticket.requester_id));

      return this.mapTicket(response.ticket, requester?.email);
    } catch (error) {
      this.logger.warn('Ticket not found', { id });
      return null;
    }
  }

  /**
   * Create new ticket
   */
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    // Get or create user first
    const user = await this.getOrCreateUser({
      email: input.requesterEmail,
    });

    const customFields = input.customFields
      ? Object.entries(this.mapCustomFields(input.customFields)).map(([id, value]) => ({
          id: Number(id),
          value,
        }))
      : undefined;

    const response = await this.request<{ ticket: ZendeskTicket }>(
      'POST',
      '/tickets.json',
      {
        ticket: {
          subject: input.subject,
          comment: { body: input.description },
          requester_id: Number(user.id),
          priority: input.priority || 'normal',
          type: input.type || 'question',
          assignee_id: input.assigneeId ? Number(input.assigneeId) : undefined,
          group_id: input.groupId ? Number(input.groupId) : undefined,
          tags: input.tags,
          custom_fields: customFields,
        },
      }
    );

    return this.mapTicket(response.ticket, user.email);
  }

  /**
   * Update existing ticket
   */
  async updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
    const customFields = input.customFields
      ? Object.entries(this.mapCustomFields(input.customFields)).map(([id, value]) => ({
          id: Number(id),
          value,
        }))
      : undefined;

    const updateData: any = {
      subject: input.subject,
      status: input.status,
      priority: input.priority,
      type: input.type,
      assignee_id: input.assigneeId ? Number(input.assigneeId) : undefined,
      group_id: input.groupId ? Number(input.groupId) : undefined,
      tags: input.tags,
      custom_fields: customFields,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Add comment if description provided
    if (input.description) {
      updateData.comment = { body: input.description };
    }

    const response = await this.request<{ ticket: ZendeskTicket }>(
      'PUT',
      `/tickets/${id}.json`,
      { ticket: updateData }
    );

    // Fetch requester to get email
    const requester = await this.getUser(String(response.ticket.requester_id));

    return this.mapTicket(response.ticket, requester?.email);
  }

  /**
   * Search tickets
   */
  async searchTickets(query: string, limit: number = 10): Promise<Ticket[]> {
    const response = await this.request<{ results: ZendeskTicket[] }>(
      'GET',
      `/search.json?query=${encodeURIComponent(query)}&type=ticket&per_page=${limit}`
    );

    // Fetch requester emails for all tickets
    const tickets = await Promise.all(
      response.results.map(async (ticket) => {
        const requester = await this.getUser(String(ticket.requester_id));
        return this.mapTicket(ticket, requester?.email);
      })
    );

    return tickets;
  }

  /**
   * Get tickets for requester email
   */
  async getTicketsByRequester(email: string, limit: number = 10): Promise<Ticket[]> {
    const user = await this.getOrCreateUser({ email });

    const response = await this.request<{ tickets: ZendeskTicket[] }>(
      'GET',
      `/users/${user.id}/tickets/requested.json?per_page=${limit}`
    );

    return response.tickets.map((ticket) => this.mapTicket(ticket, email));
  }

  /**
   * Add comment/reply to ticket
   */
  async addComment(
    ticketId: string,
    body: string,
    isPublic: boolean = true
  ): Promise<TicketComment> {
    const response = await this.request<{ ticket: ZendeskTicket }>(
      'PUT',
      `/tickets/${ticketId}.json`,
      {
        ticket: {
          comment: {
            body,
            public: isPublic,
          },
        },
      }
    );

    // Zendesk doesn't return the comment in the response, so we construct it
    const me = await this.request<{ user: ZendeskUser }>('GET', '/users/me.json');

    return {
      id: String(Date.now()), // Temporary ID
      ticketId,
      authorId: String(me.user.id),
      body,
      public: isPublic,
      createdAt: new Date(),
    };
  }

  /**
   * Get comments for ticket
   */
  async getComments(ticketId: string): Promise<TicketComment[]> {
    const response = await this.request<{ comments: ZendeskComment[] }>(
      'GET',
      `/tickets/${ticketId}/comments.json`
    );

    return response.comments.map((comment) => {
      const mapped = this.mapComment(comment);
      mapped.ticketId = ticketId;
      return mapped;
    });
  }

  /**
   * Get or create user by email
   */
  async getOrCreateUser(input: CreateUserInput): Promise<TicketUser> {
    // Search for existing user
    const searchResponse = await this.request<{ users: ZendeskUser[] }>(
      'GET',
      `/users/search.json?query=${encodeURIComponent(input.email)}`
    );

    if (searchResponse.users.length > 0) {
      return this.mapUser(searchResponse.users[0]);
    }

    // Create new user
    const response = await this.request<{ user: ZendeskUser }>(
      'POST',
      '/users.json',
      {
        user: {
          email: input.email,
          name: input.name || input.email.split('@')[0],
          phone: input.phone,
          role: input.role || 'end-user',
          organization_id: input.organizationId ? Number(input.organizationId) : undefined,
          user_fields: input.customFields,
        },
      }
    );

    return this.mapUser(response.user);
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<TicketUser | null> {
    try {
      const response = await this.request<{ user: ZendeskUser }>(
        'GET',
        `/users/${id}.json`
      );
      return this.mapUser(response.user);
    } catch (error) {
      this.logger.warn('User not found', { id });
      return null;
    }
  }
}
