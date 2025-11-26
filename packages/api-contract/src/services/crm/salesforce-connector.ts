/**
 * Phase 12 Week 5: Salesforce CRM Connector
 *
 * Implements Salesforce integration using REST API
 * https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
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
 * Salesforce API response types
 */
interface SalesforceContact {
  Id: string;
  Email: string;
  FirstName?: string;
  LastName?: string;
  Company?: string;
  Phone?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: any;
}

interface SalesforceCase {
  Id: string;
  Subject: string;
  Description: string;
  Status: string;
  Priority: string;
  ContactId: string;
  OwnerId?: string;
  CreatedDate: string;
  LastModifiedDate: string;
  [key: string]: any;
}

interface SalesforceQueryResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
}

/**
 * Salesforce CRM Connector
 */
export class SalesforceConnector extends BaseCRMConnector {
  private apiVersion = 'v59.0'; // Latest API version as of 2024

  /**
   * Get Salesforce API base URL
   */
  private getApiUrl(): string {
    const instanceUrl =
      this.config.credentials.instanceUrl || 'https://na1.salesforce.com';
    return `${instanceUrl}/services/data/${this.apiVersion}`;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const accessToken = this.config.credentials.accessToken;
    if (!accessToken) {
      throw new Error('Salesforce access token required');
    }

    const url = `${this.getApiUrl()}${endpoint}`;
    const timeout = this.config.options?.timeout || 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.message || `Salesforce API error: ${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Execute SOQL query
   */
  private async query<T>(soql: string): Promise<SalesforceQueryResponse<T>> {
    const encodedQuery = encodeURIComponent(soql);
    return this.request<SalesforceQueryResponse<T>>(
      'GET',
      `/query?q=${encodedQuery}`
    );
  }

  /**
   * Test Salesforce connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request('GET', '/limits');
      return true;
    } catch (error) {
      this.logger.error('Salesforce connection test failed', { error });
      return false;
    }
  }

  /**
   * Map Salesforce Contact to CRMContact
   */
  private mapContact(sfContact: SalesforceContact): CRMContact {
    return {
      id: sfContact.Id,
      email: sfContact.Email,
      firstName: sfContact.FirstName,
      lastName: sfContact.LastName,
      company: sfContact.Company,
      phone: sfContact.Phone,
      customFields: this.unmapCustomFields(
        Object.fromEntries(
          Object.entries(sfContact).filter(
            ([key]) =>
              !['Id', 'Email', 'FirstName', 'LastName', 'Company', 'Phone', 'CreatedDate', 'LastModifiedDate'].includes(
                key
              )
          )
        )
      ),
      createdAt: new Date(sfContact.CreatedDate),
      updatedAt: new Date(sfContact.LastModifiedDate),
    };
  }

  /**
   * Map Salesforce Case to CRMCase
   */
  private mapCase(sfCase: SalesforceCase): CRMCase {
    const statusMap: Record<string, CRMCase['status']> = {
      New: 'new',
      'In Progress': 'open',
      'On Hold': 'pending',
      Escalated: 'open',
      Closed: 'closed',
    };

    const priorityMap: Record<string, CRMCase['priority']> = {
      Low: 'low',
      Medium: 'medium',
      High: 'high',
      Critical: 'urgent',
    };

    return {
      id: sfCase.Id,
      subject: sfCase.Subject,
      description: sfCase.Description || '',
      status: statusMap[sfCase.Status] || 'new',
      priority: priorityMap[sfCase.Priority] || 'medium',
      contactId: sfCase.ContactId,
      assigneeId: sfCase.OwnerId,
      customFields: this.unmapCustomFields(
        Object.fromEntries(
          Object.entries(sfCase).filter(
            ([key]) =>
              !['Id', 'Subject', 'Description', 'Status', 'Priority', 'ContactId', 'OwnerId', 'CreatedDate', 'LastModifiedDate'].includes(
                key
              )
          )
        )
      ),
      createdAt: new Date(sfCase.CreatedDate),
      updatedAt: new Date(sfCase.LastModifiedDate),
    };
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email: string): Promise<CRMContact | null> {
    const soql = `SELECT Id, Email, FirstName, LastName, Company, Phone, CreatedDate, LastModifiedDate FROM Contact WHERE Email = '${email.replace(/'/g, "\\'")}'`;

    const response = await this.query<SalesforceContact>(soql);

    if (response.records.length === 0) {
      return null;
    }

    return this.mapContact(response.records[0]);
  }

  /**
   * Get contact by ID
   */
  async getContact(id: string): Promise<CRMContact | null> {
    try {
      const contact = await this.request<SalesforceContact>(
        'GET',
        `/sobjects/Contact/${id}`
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
    const payload: Record<string, any> = {
      Email: input.email,
      FirstName: input.firstName,
      LastName: input.lastName,
      Company: input.company,
      Phone: input.phone,
      ...this.mapCustomFields(input.customFields || {}),
    };

    const response = await this.request<{ id: string; success: boolean }>(
      'POST',
      '/sobjects/Contact',
      payload
    );

    if (!response.success) {
      throw new Error('Failed to create Salesforce contact');
    }

    const created = await this.getContact(response.id);
    if (!created) {
      throw new Error('Contact created but not found');
    }

    return created;
  }

  /**
   * Update existing contact
   */
  async updateContact(
    id: string,
    input: UpdateContactInput
  ): Promise<CRMContact> {
    const payload: Record<string, any> = {
      FirstName: input.firstName,
      LastName: input.lastName,
      Company: input.company,
      Phone: input.phone,
      ...this.mapCustomFields(input.customFields || {}),
    };

    // Remove undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    await this.request('PATCH', `/sobjects/Contact/${id}`, payload);

    const updated = await this.getContact(id);
    if (!updated) {
      throw new Error('Contact updated but not found');
    }

    return updated;
  }

  /**
   * Search contacts by query
   */
  async searchContacts(
    query: string,
    limit: number = 10
  ): Promise<CRMContact[]> {
    const escapedQuery = query.replace(/'/g, "\\'");
    const soql = `SELECT Id, Email, FirstName, LastName, Company, Phone, CreatedDate, LastModifiedDate FROM Contact WHERE Name LIKE '%${escapedQuery}%' OR Email LIKE '%${escapedQuery}%' LIMIT ${limit}`;

    const response = await this.query<SalesforceContact>(soql);
    return response.records.map((record) => this.mapContact(record));
  }

  /**
   * Get case by ID
   */
  async getCase(id: string): Promise<CRMCase | null> {
    try {
      const sfCase = await this.request<SalesforceCase>(
        'GET',
        `/sobjects/Case/${id}`
      );
      return this.mapCase(sfCase);
    } catch (error) {
      this.logger.warn('Case not found', { id });
      return null;
    }
  }

  /**
   * Create new case/ticket
   */
  async createCase(input: CreateCaseInput): Promise<CRMCase> {
    const priorityMap: Record<CRMCase['priority'], string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Critical',
    };

    const payload: Record<string, any> = {
      Subject: input.subject,
      Description: input.description,
      ContactId: input.contactId,
      Priority: priorityMap[input.priority || 'medium'],
      Status: 'New',
      OwnerId: input.assigneeId,
      ...this.mapCustomFields(input.customFields || {}),
    };

    const response = await this.request<{ id: string; success: boolean }>(
      'POST',
      '/sobjects/Case',
      payload
    );

    if (!response.success) {
      throw new Error('Failed to create Salesforce case');
    }

    const created = await this.getCase(response.id);
    if (!created) {
      throw new Error('Case created but not found');
    }

    return created;
  }

  /**
   * Update existing case/ticket
   */
  async updateCase(id: string, input: UpdateCaseInput): Promise<CRMCase> {
    const statusMap: Record<CRMCase['status'], string> = {
      new: 'New',
      open: 'In Progress',
      pending: 'On Hold',
      resolved: 'Closed',
      closed: 'Closed',
    };

    const priorityMap: Record<CRMCase['priority'], string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Critical',
    };

    const payload: Record<string, any> = {
      Subject: input.subject,
      Description: input.description,
      Status: input.status ? statusMap[input.status] : undefined,
      Priority: input.priority ? priorityMap[input.priority] : undefined,
      OwnerId: input.assigneeId,
      ...this.mapCustomFields(input.customFields || {}),
    };

    // Remove undefined values
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    await this.request('PATCH', `/sobjects/Case/${id}`, payload);

    const updated = await this.getCase(id);
    if (!updated) {
      throw new Error('Case updated but not found');
    }

    return updated;
  }

  /**
   * Get cases for contact
   */
  async getCasesForContact(
    contactId: string,
    limit: number = 10
  ): Promise<CRMCase[]> {
    const soql = `SELECT Id, Subject, Description, Status, Priority, ContactId, OwnerId, CreatedDate, LastModifiedDate FROM Case WHERE ContactId = '${contactId}' ORDER BY CreatedDate DESC LIMIT ${limit}`;

    const response = await this.query<SalesforceCase>(soql);
    return response.records.map((record) => this.mapCase(record));
  }

  /**
   * Add note/comment to case
   */
  async addCaseComment(caseId: string, comment: string): Promise<void> {
    await this.request('POST', '/sobjects/CaseComment', {
      ParentId: caseId,
      CommentBody: comment,
      IsPublished: true,
    });
  }
}
