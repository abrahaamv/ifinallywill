/**
 * Phase 12 Week 5: HubSpot CRM Connector
 *
 * Implements HubSpot integration using REST API
 * https://developers.hubspot.com/docs/api/overview
 */

import {
  BaseCRMConnector,
  type CRMContact,
  type CRMCase,
  type CreateContactInput,
  type UpdateContactInput,
  type CreateCaseInput,
  type UpdateCaseInput,
  type CRMConnectorConfig,
} from './base-connector';

/**
 * HubSpot API response types
 */
interface HubSpotContact {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    createdate: string;
    lastmodifieddate: string;
    [key: string]: any;
  };
}

interface HubSpotTicket {
  id: string;
  properties: {
    subject: string;
    content: string;
    hs_pipeline_stage: string;
    hs_ticket_priority: string;
    createdate: string;
    hs_lastmodifieddate: string;
    [key: string]: any;
  };
  associations?: {
    contacts?: { id: string }[];
  };
}

interface HubSpotSearchResponse<T> {
  total: number;
  results: T[];
}

/**
 * HubSpot CRM Connector
 */
export class HubSpotConnector extends BaseCRMConnector {
  private apiUrl = 'https://api.hubapi.com';

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const apiKey = this.config.credentials.apiKey;
    if (!apiKey) {
      throw new Error('HubSpot API key required');
    }

    const url = `${this.apiUrl}${endpoint}`;
    const timeout = this.config.options?.timeout || 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || `HubSpot API error: ${response.status}`
        );
      }

      // Some endpoints return 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Test HubSpot connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/crm/v3/objects/contacts?limit=1');
      return true;
    } catch (error) {
      this.logger.error('HubSpot connection test failed', { error });
      return false;
    }
  }

  /**
   * Map HubSpot Contact to CRMContact
   */
  private mapContact(hsContact: HubSpotContact): CRMContact {
    const props = hsContact.properties;
    return {
      id: hsContact.id,
      email: props.email,
      firstName: props.firstname,
      lastName: props.lastname,
      company: props.company,
      phone: props.phone,
      customFields: this.unmapCustomFields(
        Object.fromEntries(
          Object.entries(props).filter(
            ([key]) =>
              !['email', 'firstname', 'lastname', 'company', 'phone', 'createdate', 'lastmodifieddate'].includes(
                key
              )
          )
        )
      ),
      createdAt: new Date(props.createdate),
      updatedAt: new Date(props.lastmodifieddate),
    };
  }

  /**
   * Map HubSpot Ticket to CRMCase
   */
  private mapTicket(hsTicket: HubSpotTicket): CRMCase {
    const props = hsTicket.properties;

    // HubSpot uses pipeline stages - map common ones
    const statusMap: Record<string, CRMCase['status']> = {
      '1': 'new', // New
      '2': 'open', // Waiting on contact
      '3': 'open', // Waiting on us
      '4': 'closed', // Closed
    };

    const priorityMap: Record<string, CRMCase['priority']> = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
    };

    const status = statusMap[props.hs_pipeline_stage] || 'new';
    const priority =
      priorityMap[props.hs_ticket_priority?.toUpperCase()] || 'medium';

    // Get associated contact ID
    const contactId = hsTicket.associations?.contacts?.[0]?.id || '';

    return {
      id: hsTicket.id,
      subject: props.subject || '',
      description: props.content || '',
      status,
      priority,
      contactId,
      customFields: this.unmapCustomFields(
        Object.fromEntries(
          Object.entries(props).filter(
            ([key]) =>
              !['subject', 'content', 'hs_pipeline_stage', 'hs_ticket_priority', 'createdate', 'hs_lastmodifieddate'].includes(
                key
              )
          )
        )
      ),
      createdAt: new Date(props.createdate),
      updatedAt: new Date(props.hs_lastmodifieddate),
    };
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string): Promise<CRMContact | null> {
    try {
      const response = await this.request<HubSpotSearchResponse<HubSpotContact>>(
        'POST',
        '/crm/v3/objects/contacts/search',
        {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: 'email',
                  operator: 'EQ',
                  value: email,
                },
              ],
            },
          ],
          limit: 1,
        }
      );

      if (response.results.length === 0) {
        return null;
      }

      return this.mapContact(response.results[0]);
    } catch (error) {
      this.logger.warn('Contact not found by email', { email });
      return null;
    }
  }

  /**
   * Get contact by ID
   */
  async getContact(id: string): Promise<CRMContact | null> {
    try {
      const contact = await this.request<HubSpotContact>(
        'GET',
        `/crm/v3/objects/contacts/${id}`
      );
      return this.mapContact(contact);
    } catch (error) {
      this.logger.warn('Contact not found', { id });
      return null;
    }
  }

  /**
   * Create new contact
   */
  async createContact(input: CreateContactInput): Promise<CRMContact> {
    const properties: Record<string, any> = {
      email: input.email,
      firstname: input.firstName,
      lastname: input.lastName,
      company: input.company,
      phone: input.phone,
      ...this.mapCustomFields(input.customFields || {}),
    };

    // Remove undefined values
    Object.keys(properties).forEach((key) => {
      if (properties[key] === undefined) {
        delete properties[key];
      }
    });

    const response = await this.request<HubSpotContact>(
      'POST',
      '/crm/v3/objects/contacts',
      { properties }
    );

    return this.mapContact(response);
  }

  /**
   * Update existing contact
   */
  async updateContact(
    id: string,
    input: UpdateContactInput
  ): Promise<CRMContact> {
    const properties: Record<string, any> = {
      firstname: input.firstName,
      lastname: input.lastName,
      company: input.company,
      phone: input.phone,
      ...this.mapCustomFields(input.customFields || {}),
    };

    // Remove undefined values
    Object.keys(properties).forEach((key) => {
      if (properties[key] === undefined) {
        delete properties[key];
      }
    });

    const response = await this.request<HubSpotContact>(
      'PATCH',
      `/crm/v3/objects/contacts/${id}`,
      { properties }
    );

    return this.mapContact(response);
  }

  /**
   * Search contacts by query
   */
  async searchContacts(
    query: string,
    limit: number = 10
  ): Promise<CRMContact[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotContact>>(
      'POST',
      '/crm/v3/objects/contacts/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'CONTAINS_TOKEN',
                value: query,
              },
            ],
          },
          {
            filters: [
              {
                propertyName: 'firstname',
                operator: 'CONTAINS_TOKEN',
                value: query,
              },
            ],
          },
          {
            filters: [
              {
                propertyName: 'lastname',
                operator: 'CONTAINS_TOKEN',
                value: query,
              },
            ],
          },
        ],
        limit,
      }
    );

    return response.results.map((record) => this.mapContact(record));
  }

  /**
   * Get ticket by ID
   */
  async getCase(id: string): Promise<CRMCase | null> {
    try {
      const ticket = await this.request<HubSpotTicket>(
        'GET',
        `/crm/v3/objects/tickets/${id}?associations=contacts`
      );
      return this.mapTicket(ticket);
    } catch (error) {
      this.logger.warn('Ticket not found', { id });
      return null;
    }
  }

  /**
   * Create new ticket
   */
  async createCase(input: CreateCaseInput): Promise<CRMCase> {
    const priorityMap: Record<CRMCase['priority'], string> = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      urgent: 'HIGH', // HubSpot doesn't have "urgent"
    };

    const properties: Record<string, any> = {
      subject: input.subject,
      content: input.description,
      hs_pipeline_stage: '1', // New
      hs_ticket_priority: priorityMap[input.priority || 'medium'],
      ...this.mapCustomFields(input.customFields || {}),
    };

    const response = await this.request<HubSpotTicket>(
      'POST',
      '/crm/v3/objects/tickets',
      { properties }
    );

    // Associate ticket with contact
    await this.request(
      'PUT',
      `/crm/v3/objects/tickets/${response.id}/associations/contacts/${input.contactId}/16`
    );

    // Assign owner if provided
    if (input.assigneeId) {
      await this.request<HubSpotTicket>(
        'PATCH',
        `/crm/v3/objects/tickets/${response.id}`,
        {
          properties: {
            hubspot_owner_id: input.assigneeId,
          },
        }
      );
    }

    const created = await this.getCase(response.id);
    if (!created) {
      throw new Error('Ticket created but not found');
    }

    return created;
  }

  /**
   * Update existing ticket
   */
  async updateCase(id: string, input: UpdateCaseInput): Promise<CRMCase> {
    const statusMap: Record<CRMCase['status'], string> = {
      new: '1',
      open: '3', // Waiting on us
      pending: '2', // Waiting on contact
      resolved: '4',
      closed: '4',
    };

    const priorityMap: Record<CRMCase['priority'], string> = {
      low: 'LOW',
      medium: 'MEDIUM',
      high: 'HIGH',
      urgent: 'HIGH',
    };

    const properties: Record<string, any> = {
      subject: input.subject,
      content: input.description,
      hs_pipeline_stage: input.status ? statusMap[input.status] : undefined,
      hs_ticket_priority: input.priority
        ? priorityMap[input.priority]
        : undefined,
      hubspot_owner_id: input.assigneeId,
      ...this.mapCustomFields(input.customFields || {}),
    };

    // Remove undefined values
    Object.keys(properties).forEach((key) => {
      if (properties[key] === undefined) {
        delete properties[key];
      }
    });

    await this.request<HubSpotTicket>(
      'PATCH',
      `/crm/v3/objects/tickets/${id}`,
      { properties }
    );

    const updated = await this.getCase(id);
    if (!updated) {
      throw new Error('Ticket updated but not found');
    }

    return updated;
  }

  /**
   * Get tickets for contact
   */
  async getCasesForContact(
    contactId: string,
    limit: number = 10
  ): Promise<CRMCase[]> {
    const response = await this.request<HubSpotSearchResponse<HubSpotTicket>>(
      'POST',
      '/crm/v3/objects/tickets/search',
      {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'associations.contact',
                operator: 'EQ',
                value: contactId,
              },
            ],
          },
        ],
        sorts: [
          {
            propertyName: 'createdate',
            direction: 'DESCENDING',
          },
        ],
        limit,
      }
    );

    return response.results.map((record) => this.mapTicket(record));
  }

  /**
   * Add note to ticket
   */
  async addCaseComment(caseId: string, comment: string): Promise<void> {
    // Create engagement (note) associated with ticket
    await this.request('POST', '/crm/v3/objects/notes', {
      properties: {
        hs_note_body: comment,
      },
      associations: [
        {
          to: {
            id: caseId,
          },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 214, // Note to Ticket association
            },
          ],
        },
      ],
    });
  }
}
