/**
 * Phase 12 Week 8: Slack API Connector
 *
 * Implements Slack Web API for messaging
 * https://api.slack.com/web
 */

import {
  BaseCommunicationConnector,
  type Message,
  type Channel,
  type SendMessageInput,
  type CommunicationConnectorConfig,
} from './base-connector';

/**
 * Slack API response types
 */
interface SlackMessage {
  ts: string;
  channel: string;
  user: string;
  text: string;
  thread_ts?: string;
  files?: Array<{
    id: string;
    name: string;
    url_private: string;
    size: number;
    mimetype: string;
  }>;
  reactions?: Array<{
    name: string;
    count: number;
  }>;
}

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_private: boolean;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  topic?: {
    value: string;
  };
  purpose?: {
    value: string;
  };
}

/**
 * Slack connector using Web API
 */
export class SlackConnector extends BaseCommunicationConnector {
  private apiUrl = 'https://slack.com/api';

  /**
   * Get authentication header
   */
  private getAuthHeader(): string {
    const { accessToken } = this.config.credentials;

    if (!accessToken) {
      throw new Error('Slack access token required');
    }

    return `Bearer ${accessToken}`;
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

      const isFormData = body instanceof FormData;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.getAuthHeader(),
          ...(isFormData ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
        },
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || `Slack API error: ${response.status}`);
      }

      return data as T;
    } catch (error: any) {
      return this.handleError(error, `${method} ${endpoint}`);
    }
  }

  /**
   * Test Slack connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request<{ ok: boolean }>('POST', '/auth.test');
      return true;
    } catch (error) {
      this.logger.error('Slack connection test failed', { error });
      return false;
    }
  }

  /**
   * Send Slack message
   */
  async sendMessage(input: SendMessageInput): Promise<Message> {
    try {
      // Prepare message payload
      const payload: any = {
        channel: input.channelId,
        text: input.content,
        thread_ts: input.threadId,
      };

      // Handle attachments (files)
      let uploadedFiles: any[] = [];
      if (input.attachments && input.attachments.length > 0) {
        for (const attachment of input.attachments) {
          const file = await this.uploadFile(
            input.channelId,
            attachment.name,
            attachment.content,
            input.threadId
          );
          uploadedFiles.push(file);
        }
      }

      // Send message
      const response = await this.request<{
        ok: boolean;
        channel: string;
        ts: string;
        message: SlackMessage;
      }>('POST', '/chat.postMessage', payload);

      // Map to Message format
      return {
        id: response.ts,
        channelId: response.channel,
        threadId: input.threadId || response.ts,
        from: {
          id: 'bot',
          name: this.config.options?.fromName || 'Platform Bot',
        },
        to: input.to.map((t) => ({
          id: t.id || '',
          name: t.name,
          email: t.email,
        })),
        content: input.content,
        contentType: 'text/plain',
        attachments: uploadedFiles.map((f) => ({
          id: f.id,
          name: f.name,
          url: f.url_private,
          size: f.size,
          mimeType: f.mimetype,
        })),
        metadata: input.metadata,
        timestamp: new Date(parseFloat(response.ts) * 1000),
        status: 'sent',
      };
    } catch (error: any) {
      return this.handleError(error, 'sendMessage');
    }
  }

  /**
   * Upload file to Slack
   */
  private async uploadFile(
    channelId: string,
    filename: string,
    content: Buffer | string,
    threadTs?: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append('channels', channelId);
    formData.append('filename', filename);
    formData.append('file', new Blob([Buffer.isBuffer(content) ? content : Buffer.from(content)]));
    if (threadTs) {
      formData.append('thread_ts', threadTs);
    }

    const response = await this.request<{
      ok: boolean;
      file: any;
    }>('POST', '/files.upload', formData);

    return response.file;
  }

  /**
   * Get message by timestamp
   */
  async getMessage(messageId: string): Promise<Message | null> {
    try {
      // messageId format: "channelId:timestamp"
      const [channelId, timestamp] = messageId.split(':');

      const response = await this.request<{
        ok: boolean;
        messages: SlackMessage[];
      }>('GET', '/conversations.history', {
        channel: channelId,
        latest: timestamp,
        inclusive: true,
        limit: 1,
      });

      if (response.messages.length === 0) {
        return null;
      }

      return this.mapMessage(response.messages[0]);
    } catch (error) {
      this.logger.warn('Message not found', { messageId });
      return null;
    }
  }

  /**
   * Map Slack message to unified format
   */
  private mapMessage(slackMessage: SlackMessage): Message {
    return {
      id: `${slackMessage.channel}:${slackMessage.ts}`,
      channelId: slackMessage.channel,
      threadId: slackMessage.thread_ts,
      from: {
        id: slackMessage.user,
      },
      to: [],
      content: slackMessage.text,
      contentType: 'text/plain',
      attachments: slackMessage.files?.map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url_private,
        size: f.size,
        mimeType: f.mimetype,
      })),
      metadata: {
        reactions: slackMessage.reactions,
      },
      timestamp: new Date(parseFloat(slackMessage.ts) * 1000),
      status: 'delivered',
    };
  }

  /**
   * List messages in a channel
   */
  async listMessages(
    channelId: string,
    options?: {
      limit?: number;
      cursor?: string;
      threadId?: string;
      since?: Date;
    }
  ): Promise<{
    messages: Message[];
    nextCursor?: string;
  }> {
    try {
      const endpoint = options?.threadId
        ? '/conversations.replies'
        : '/conversations.history';

      const params: any = {
        channel: channelId,
        limit: options?.limit || 100,
        cursor: options?.cursor,
      };

      if (options?.threadId) {
        params.ts = options.threadId;
      }

      if (options?.since) {
        params.oldest = (options.since.getTime() / 1000).toString();
      }

      const response = await this.request<{
        ok: boolean;
        messages: SlackMessage[];
        response_metadata?: {
          next_cursor: string;
        };
      }>('GET', endpoint, params);

      const messages = response.messages.map((m) => this.mapMessage(m));

      return {
        messages,
        nextCursor: response.response_metadata?.next_cursor,
      };
    } catch (error: any) {
      return this.handleError(error, 'listMessages');
    }
  }

  /**
   * Get channel by ID
   */
  async getChannel(channelId: string): Promise<Channel | null> {
    try {
      const response = await this.request<{
        ok: boolean;
        channel: SlackChannel;
      }>('GET', '/conversations.info', {
        channel: channelId,
      });

      return this.mapChannel(response.channel);
    } catch (error) {
      this.logger.warn('Channel not found', { channelId });
      return null;
    }
  }

  /**
   * Map Slack channel to unified format
   */
  private mapChannel(slackChannel: SlackChannel): Channel {
    return {
      id: slackChannel.id,
      name: slackChannel.name,
      type: 'slack',
      isPrivate: slackChannel.is_private,
      metadata: {
        isChannel: slackChannel.is_channel,
        isGroup: slackChannel.is_group,
        isIM: slackChannel.is_im,
        isArchived: slackChannel.is_archived,
        isGeneral: slackChannel.is_general,
        topic: slackChannel.topic?.value,
        purpose: slackChannel.purpose?.value,
      },
    };
  }

  /**
   * List channels
   */
  async listChannels(options?: {
    limit?: number;
    cursor?: string;
  }): Promise<{
    channels: Channel[];
    nextCursor?: string;
  }> {
    try {
      const response = await this.request<{
        ok: boolean;
        channels: SlackChannel[];
        response_metadata?: {
          next_cursor: string;
        };
      }>('GET', '/conversations.list', {
        limit: options?.limit || 100,
        cursor: options?.cursor,
        types: 'public_channel,private_channel',
      });

      const channels = response.channels.map((c) => this.mapChannel(c));

      return {
        channels,
        nextCursor: response.response_metadata?.next_cursor,
      };
    } catch (error: any) {
      return this.handleError(error, 'listChannels');
    }
  }

  /**
   * Mark as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      // messageId format: "channelId:timestamp"
      const [channelId, timestamp] = messageId.split(':');

      await this.request('POST', '/conversations.mark', {
        channel: channelId,
        ts: timestamp,
      });
    } catch (error: any) {
      return this.handleError(error, 'markAsRead');
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      // messageId format: "channelId:timestamp"
      const [channelId, timestamp] = messageId.split(':');

      await this.request('POST', '/chat.delete', {
        channel: channelId,
        ts: timestamp,
      });
    } catch (error: any) {
      return this.handleError(error, 'deleteMessage');
    }
  }
}
