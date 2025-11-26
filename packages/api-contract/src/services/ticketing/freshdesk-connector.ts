/**
 * Phase 12 Week 6: Freshdesk Ticketing Connector
 *
 * Implements Freshdesk integration using REST API v2
 * https://developers.freshdesk.com/api/
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
 * Freshdesk API response types
 */
interface FreshdeskTicket {
  id: number;
  subject: string;
  description: string;
  description_text: string;
  status: number;
  priority: number;
  type: string;
  requester_id: number;
  responder_id?: number;
  group_id?: number;
  tags: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface FreshdeskContact {
  id: number;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface FreshdeskConversation {
  id: number;
  body: string;
  body_text: string;
  incoming: boolean;
  private: boolean;
  user_id: number;
  attachments?: Array<{
    id: number;
    name: string;
    content_type: string;
    size: number;
    attachment_url: string;
  }>;
  created_at: string;
  updated_at: string;
}

/**
 * Freshdesk Ticketing Connector
 */
export class FreshdeskConnector extends BaseTicketingConnector {
  /**
   * Get Freshdesk API base URL
   */
  private getApiUrl(): string {
    const subdomain = this.config.credentials.subdomain;
    if (!subdomain) {
      throw new Error('Freshdesk subdomain required');
    }
    return `https://${subdomain}.freshdesk.com/api/v2`;
  }

  /**
   * Get authentication header
   */
  private getAuthHeader(): string {
    const { apiKey } = this.config.credentials;

    if (!apiKey) {
      throw new Error('Freshdesk API key required');
    }

    // Freshdesk uses Basic auth with API key as username and "X" as password
    const credentials = Buffer.from(`${apiKey}:X`).toString('base64');
    return `Basic ${credentials}`;
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
          error.description || error.message || `Freshdesk API error: ${response.status}`
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Test Freshdesk connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/tickets?per_page=1');
      return true;
    } catch (error) {
      this.logger.error('Freshdesk connection test failed', { error });
      return false;
    }
  }

  /**
   * Map Freshdesk ticket to Ticket
   */
  private mapTicket(fdTicket: FreshdeskTicket, requesterEmail?: string): Ticket {
    // Freshdesk status codes: 2=Open, 3=Pending, 4=Resolved, 5=Closed
    const statusMap: Record<number, Ticket['status']> = {
      2: 'open',
      3: 'pending',
      4: 'solved',
      5: 'closed',
    };

    // Freshdesk priority: 1=Low, 2=Medium, 3=High, 4=Urgent
    const priorityMap: Record<number, Ticket['priority']> = {
      1: 'low',
      2: 'normal',
      3: 'high',
      4: 'urgent',
    };

    const typeMap: Record<string, Ticket['type']> = {
      Question: 'question',
      Incident: 'incident',
      Problem: 'problem',
      'Feature Request': 'task',
    };

    return {
      id: String(fdTicket.id),
      subject: fdTicket.subject,
      description: fdTicket.description_text || fdTicket.description,
      status: statusMap[fdTicket.status] || 'new',
      priority: priorityMap[fdTicket.priority] || 'normal',
      type: typeMap[fdTicket.type] || 'question',
      requesterEmail: requesterEmail || '',
      requesterId: String(fdTicket.requester_id),
      assigneeId: fdTicket.responder_id ? String(fdTicket.responder_id) : undefined,
      groupId: fdTicket.group_id ? String(fdTicket.group_id) : undefined,
      tags: fdTicket.tags,
      customFields: this.unmapCustomFields(fdTicket.custom_fields || {}),
      createdAt: new Date(fdTicket.created_at),
      updatedAt: new Date(fdTicket.updated_at),
    };
  }

  /**
   * Map Freshdesk contact to TicketUser
   */
  private mapContact(fdContact: FreshdeskContact): TicketUser {
    return {
      id: String(fdContact.id),
      email: fdContact.email,
      name: fdContact.name,
      phone: fdContact.phone || fdContact.mobile,
      role: 'end-user', // Freshdesk contacts are always end-users
      customFields: fdContact.custom_fields,
      createdAt: new Date(fdContact.created_at),
      updatedAt: new Date(fdContact.updated_at),
    };
  }

  /**
   * Map Freshdesk conversation to TicketComment
   */
  private mapConversation(fdConv: FreshdeskConversation, ticketId: string): TicketComment {
    return {
      id: String(fdConv.id),
      ticketId,
      authorId: String(fdConv.user_id),
      body: fdConv.body_text || fdConv.body,
      htmlBody: fdConv.body,
      public: !fdConv.private,
      attachments: fdConv.attachments?.map((att) => ({
        id: String(att.id),
        filename: att.name,
        contentType: att.content_type,
        size: att.size,
        url: att.attachment_url,
      })),
      createdAt: new Date(fdConv.created_at),
    };
  }

  /**
   * Get ticket by ID
   */
  async getTicket(id: string): Promise<Ticket | null> {
    try {
      const ticket = await this.request<FreshdeskTicket>(
        'GET',
        `/tickets/${id}?include=requester`
      );

      // Fetch requester to get email
      const requester = await this.getUser(String(ticket.requester_id));

      return this.mapTicket(ticket, requester?.email);
    } catch (error) {
      this.logger.warn('Ticket not found', { id });
      return null;
    }
  }

  /**
   * Create new ticket
   */
  async createTicket(input: CreateTicketInput): Promise<Ticket> {
    // Get or create contact first
    const contact = await this.getOrCreateUser({
      email: input.requesterEmail,
    });

    // Map priority
    const priorityMap: Record<Ticket['priority'], number> = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4,
    };

    // Map type
    const typeMap: Record<string, string> = {
      question: 'Question',
      incident: 'Incident',
      problem: 'Problem',
      task: 'Feature Request',
    };

    const ticket = await this.request<FreshdeskTicket>(
      'POST',
      '/tickets',
      {
        subject: input.subject,
        description: input.description,
        requester_id: Number(contact.id),
        priority: priorityMap[input.priority || 'normal'],
        type: typeMap[input.type || 'question'],
        status: 2, // Open
        responder_id: input.assigneeId ? Number(input.assigneeId) : undefined,
        group_id: input.groupId ? Number(input.groupId) : undefined,
        tags: input.tags,
        custom_fields: input.customFields ? this.mapCustomFields(input.customFields) : undefined,
      }
    );

    return this.mapTicket(ticket, contact.email);
  }

  /**
   * Update existing ticket
   */
  async updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
    // Map status
    const statusMap: Record<Ticket['status'], number> = {
      new: 2,
      open: 2,
      pending: 3,
      hold: 3,
      solved: 4,
      closed: 5,
    };

    // Map priority
    const priorityMap: Record<Ticket['priority'], number> = {
      low: 1,
      normal: 2,
      high: 3,
      urgent: 4,
    };

    // Map type
    const typeMap: Record<string, string> = {
      question: 'Question',
      incident: 'Incident',
      problem: 'Problem',
      task: 'Feature Request',
    };

    const updateData: any = {
      subject: input.subject,
      status: input.status ? statusMap[input.status] : undefined,
      priority: input.priority ? priorityMap[input.priority] : undefined,
      type: input.type ? typeMap[input.type] : undefined,
      responder_id: input.assigneeId ? Number(input.assigneeId) : undefined,
      group_id: input.groupId ? Number(input.groupId) : undefined,
      tags: input.tags,
      custom_fields: input.customFields ? this.mapCustomFields(input.customFields) : undefined,
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const ticket = await this.request<FreshdeskTicket>(
      'PUT',
      `/tickets/${id}`,
      updateData
    );

    // Add note if description provided
    if (input.description) {
      await this.addComment(id, input.description, true);
    }

    // Fetch requester to get email
    const requester = await this.getUser(String(ticket.requester_id));

    return this.mapTicket(ticket, requester?.email);
  }

  /**
   * Search tickets
   */
  async searchTickets(query: string, limit: number = 10): Promise<Ticket[]> {
    // Freshdesk search query format: "(subject:'query' OR description:'query')"
    const searchQuery = `"(subject:'${query}' OR description:'${query}')"`;

    const response = await this.request<{ results: Array<{ id: number }> }>(
      'GET',
      `/search/tickets?query=${encodeURIComponent(searchQuery)}`
    );

    // Fetch full ticket details for each result
    const tickets = await Promise.all(
      response.results.slice(0, limit).map((result) => this.getTicket(String(result.id)))
    );

    return tickets.filter((t): t is Ticket => t !== null);
  }

  /**
   * Get tickets for requester email
   */
  async getTicketsByRequester(email: string, limit: number = 10): Promise<Ticket[]> {
    const contact = await this.getOrCreateUser({ email });

    const response = await this.request<FreshdeskTicket[]>(
      'GET',
      `/tickets?requester_id=${contact.id}&per_page=${limit}`
    );

    return response.map((ticket) => this.mapTicket(ticket, email));
  }

  /**
   * Add comment/reply to ticket
   */
  async addComment(
    ticketId: string,
    body: string,
    isPublic: boolean = true
  ): Promise<TicketComment> {
    const conversation = await this.request<FreshdeskConversation>(
      'POST',
      `/tickets/${ticketId}/notes`,
      {
        body,
        private: !isPublic,
      }
    );

    return this.mapConversation(conversation, ticketId);
  }

  /**
   * Get comments for ticket
   */
  async getComments(ticketId: string): Promise<TicketComment[]> {
    const response = await this.request<FreshdeskConversation[]>(
      'GET',
      `/tickets/${ticketId}/conversations`
    );

    return response.map((conv) => this.mapConversation(conv, ticketId));
  }

  /**
   * Get or create user by email
   */
  async getOrCreateUser(input: CreateUserInput): Promise<TicketUser> {
    // Search for existing contact
    try {
      const response = await this.request<{ results: Array<{ id: number }> }>(
        'GET',
        `/search/contacts?query="email:'${input.email}'"`
      );

      if (response.results.length > 0) {
        const contactId = response.results[0].id;
        const contact = await this.request<FreshdeskContact>(
          'GET',
          `/contacts/${contactId}`
        );
        return this.mapContact(contact);
      }
    } catch (error) {
      // Contact not found, create new one
    }

    // Create new contact
    const contact = await this.request<FreshdeskContact>(
      'POST',
      '/contacts',
      {
        name: input.name || input.email.split('@')[0],
        email: input.email,
        phone: input.phone,
        custom_fields: input.customFields,
      }
    );

    return this.mapContact(contact);
  }

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<TicketUser | null> {
    try {
      const contact = await this.request<FreshdeskContact>(
        'GET',
        `/contacts/${id}`
      );
      return this.mapContact(contact);
    } catch (error) {
      this.logger.warn('Contact not found', { id });
      return null;
    }
  }
}
