/**
 * Phase 12 Week 8: WhatsApp Business API Connector
 *
 * Implements WhatsApp Business API for messaging
 * https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import {
  BaseCommunicationConnector,
  type Message,
  type Channel,
  type SendMessageInput,
  type CommunicationConnectorConfig,
} from './base-connector';

/**
 * WhatsApp API response types
 */
interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  context?: {
    from: string;
    id: string;
  };
}

/**
 * WhatsApp connector using Cloud API
 */
export class WhatsAppConnector extends BaseCommunicationConnector {
  private apiUrl = 'https://graph.facebook.com/v18.0';

  /**
   * Get authentication header
   */
  private getAuthHeader(): string {
    const { accessToken } = this.config.credentials;

    if (!accessToken) {
      throw new Error('WhatsApp access token required');
    }

    return `Bearer ${accessToken}`;
  }

  /**
   * Get phone number ID
   */
  private getPhoneNumberId(): string {
    const { phoneNumber } = this.config.credentials;

    if (!phoneNumber) {
      throw new Error('WhatsApp phone number ID required');
    }

    return phoneNumber;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
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
          error.error?.message || `WhatsApp API error: ${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Test WhatsApp connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Get phone number info to verify credentials
      const phoneNumberId = this.getPhoneNumberId();
      await this.request('GET', `/${phoneNumberId}`);
      return true;
    } catch (error) {
      this.logger.error('WhatsApp connection test failed', { error });
      return false;
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(input: SendMessageInput): Promise<Message> {
    try {
      const phoneNumberId = this.getPhoneNumberId();

      // Get recipient phone number
      const recipient = input.to[0];
      if (!recipient.phone) {
        throw new Error('WhatsApp requires phone number in E.164 format');
      }

      // Prepare message payload
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient.phone,
      };

      // Handle text messages
      if (!input.attachments || input.attachments.length === 0) {
        payload.type = 'text';
        payload.text = {
          preview_url: true,
          body: input.content,
        };
      } else {
        // Handle media messages
        const attachment = input.attachments[0];

        if (attachment.mimeType.startsWith('image/')) {
          payload.type = 'image';
          payload.image = {
            link: attachment.content.toString(), // Assume URL
            caption: input.content,
          };
        } else if (attachment.mimeType.startsWith('video/')) {
          payload.type = 'video';
          payload.video = {
            link: attachment.content.toString(),
            caption: input.content,
          };
        } else if (attachment.mimeType === 'application/pdf') {
          payload.type = 'document';
          payload.document = {
            link: attachment.content.toString(),
            caption: input.content,
            filename: attachment.name,
          };
        } else {
          throw new Error(`Unsupported attachment type: ${attachment.mimeType}`);
        }
      }

      // Add reply context if threadId provided
      if (input.threadId) {
        payload.context = {
          message_id: input.threadId,
        };
      }

      // Send message
      const response = await this.request<{
        messaging_product: string;
        contacts: Array<{ input: string; wa_id: string }>;
        messages: Array<{ id: string }>;
      }>('POST', `/${phoneNumberId}/messages`, payload);

      const messageId = response.messages[0].id;
      const waId = response.contacts[0].wa_id;

      // Map to Message format
      return {
        id: messageId,
        channelId: input.channelId,
        threadId: input.threadId,
        from: {
          id: phoneNumberId,
          phone: this.config.options?.fromPhone,
        },
        to: [
          {
            id: waId,
            phone: recipient.phone,
            name: recipient.name,
          },
        ],
        content: input.content,
        contentType: 'text/plain',
        attachments: input.attachments?.map((a, idx) => ({
          id: `${messageId}-${idx}`,
          name: a.name,
          url: a.content.toString(),
          size: Buffer.isBuffer(a.content) ? a.content.length : Buffer.from(a.content).length,
          mimeType: a.mimeType,
        })),
        metadata: input.metadata,
        timestamp: new Date(),
        status: 'sent',
      };
    } catch (error: any) {
      return this.handleError(error, 'sendMessage');
    }
  }

  /**
   * Get message by ID
   */
  async getMessage(messageId: string): Promise<Message | null> {
    try {
      const response = await this.request<WhatsAppMessage>(
        'GET',
        `/${messageId}`
      );

      return this.mapMessage(response);
    } catch (error) {
      this.logger.warn('Message not found', { messageId });
      return null;
    }
  }

  /**
   * Map WhatsApp message to unified format
   */
  private mapMessage(waMessage: WhatsAppMessage): Message {
    let content = '';
    let contentType: 'text/plain' | 'text/html' | 'text/markdown' = 'text/plain';

    if (waMessage.text) {
      content = waMessage.text.body;
    } else if (waMessage.image?.caption) {
      content = waMessage.image.caption;
    }

    return {
      id: waMessage.id,
      channelId: 'whatsapp',
      threadId: waMessage.context?.id,
      from: {
        id: waMessage.from,
        phone: waMessage.from,
      },
      to: [],
      content,
      contentType,
      attachments: waMessage.image
        ? [
            {
              id: waMessage.image.id,
              name: 'image',
              url: '',
              size: 0,
              mimeType: waMessage.image.mime_type,
            },
          ]
        : undefined,
      metadata: {
        type: waMessage.type,
      },
      timestamp: new Date(waMessage.timestamp),
      status: 'delivered',
    };
  }

  /**
   * List messages (not supported by WhatsApp Cloud API)
   */
  async listMessages(
    channelId: string,
    options?: {
      limit?: number;
      cursor?: string;
      since?: Date;
    }
  ): Promise<{
    messages: Message[];
    nextCursor?: string;
  }> {
    // WhatsApp Cloud API doesn't provide message history retrieval
    // Messages are received via webhooks only
    this.logger.warn('listMessages not supported by WhatsApp Cloud API');
    return { messages: [] };
  }

  /**
   * Get channel (WhatsApp conversation)
   */
  async getChannel(channelId: string): Promise<Channel | null> {
    // WhatsApp uses phone numbers as channel identifiers
    return {
      id: channelId,
      name: `WhatsApp: ${channelId}`,
      type: 'whatsapp',
      metadata: {
        phoneNumber: channelId,
      },
    };
  }

  /**
   * List channels (WhatsApp conversations)
   */
  async listChannels(options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{
    channels: Channel[];
    nextCursor?: string;
  }> {
    // WhatsApp Cloud API doesn't provide conversation list
    // Conversations are tracked via webhook events
    this.logger.warn('listChannels not supported by WhatsApp Cloud API');
    return { channels: [] };
  }

  /**
   * Mark as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const phoneNumberId = this.getPhoneNumberId();

      await this.request('POST', `/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });
    } catch (error: any) {
      return this.handleError(error, 'markAsRead');
    }
  }

  /**
   * Delete message (not supported)
   */
  async deleteMessage(messageId: string): Promise<void> {
    // WhatsApp Cloud API doesn't support message deletion
    this.logger.warn('deleteMessage not supported by WhatsApp Cloud API');
  }
}
