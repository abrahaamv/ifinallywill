/**
 * Chat Page Object Model
 * Encapsulates chat interface interactions
 */

import { Page, expect } from '@playwright/test';
import { fillField, waitForElement, waitForText } from '../utils/helpers';

export class ChatPage {
  constructor(private page: Page) {}

  // Selectors
  private selectors = {
    messageInput: 'textarea[name="message"]',
    sendButton: 'button[data-testid="send-message"]',
    messageList: '[data-testid="message-list"]',
    userMessage: '[data-testid="user-message"]',
    aiMessage: '[data-testid="ai-message"]',
    loadingIndicator: '[data-testid="ai-typing"]',
    newChatButton: 'button[data-testid="new-chat"]',
    sessionId: '[data-testid="session-id"]',
  };

  /**
   * Navigate to chat page
   */
  async goto() {
    await this.page.goto('/chat');
    await waitForElement(this.page, this.selectors.messageInput);
  }

  /**
   * Send a message
   */
  async sendMessage(message: string) {
    await fillField(this.page, this.selectors.messageInput, message);
    await this.page.click(this.selectors.sendButton);
  }

  /**
   * Wait for AI response
   */
  async waitForAIResponse(timeout = 30000) {
    // Wait for typing indicator
    await waitForElement(this.page, this.selectors.loadingIndicator, 5000);

    // Wait for response to appear
    await this.page.waitForSelector(this.selectors.aiMessage, {
      state: 'visible',
      timeout,
    });

    // Wait for typing indicator to disappear
    await this.page.waitForSelector(this.selectors.loadingIndicator, {
      state: 'hidden',
      timeout: 5000,
    });
  }

  /**
   * Get last AI response text
   */
  async getLastAIResponse(): Promise<string> {
    const messages = await this.page.locator(this.selectors.aiMessage).all();
    const lastMessage = messages[messages.length - 1];
    return await lastMessage.textContent() || '';
  }

  /**
   * Get all messages
   */
  async getAllMessages(): Promise<Array<{ role: 'user' | 'ai'; content: string }>> {
    const messages: Array<{ role: 'user' | 'ai'; content: string }> = [];

    // Get user messages
    const userMessages = await this.page.locator(this.selectors.userMessage).all();
    for (const msg of userMessages) {
      const content = await msg.textContent();
      if (content) messages.push({ role: 'user', content });
    }

    // Get AI messages
    const aiMessages = await this.page.locator(this.selectors.aiMessage).all();
    for (const msg of aiMessages) {
      const content = await msg.textContent();
      if (content) messages.push({ role: 'ai', content });
    }

    return messages;
  }

  /**
   * Start new chat session
   */
  async startNewChat() {
    await this.page.click(this.selectors.newChatButton);
    await waitForElement(this.page, this.selectors.messageInput);
  }

  /**
   * Get current session ID
   */
  async getSessionId(): Promise<string> {
    const element = await this.page.locator(this.selectors.sessionId);
    return await element.textContent() || '';
  }

  /**
   * Expect message to be sent
   */
  async expectMessageSent(message: string) {
    await waitForText(this.page, message);
    const userMessages = await this.page.locator(this.selectors.userMessage).all();
    const lastMessage = userMessages[userMessages.length - 1];
    await expect(lastMessage).toContainText(message);
  }

  /**
   * Expect AI response received
   */
  async expectAIResponseReceived() {
    await waitForElement(this.page, this.selectors.aiMessage);
    const messages = await this.page.locator(this.selectors.aiMessage).all();
    expect(messages.length).toBeGreaterThan(0);
  }
}
