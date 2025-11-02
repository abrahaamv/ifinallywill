/**
 * Chat E2E Tests
 * Tests real-time messaging and AI interactions
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { ChatPage } from '../pages/ChatPage';
import { login } from '../utils/helpers';

test.describe('Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'Test123!@#';
    const baseURL = process.env.BASE_URL || 'http://localhost:5174';
    await login(page, email, password, baseURL);
  });

  test('should load chat interface', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Verify chat interface is loaded
    await expect(page.locator('textarea[name="message"]')).toBeVisible();
    await expect(page.locator('button[data-testid="send-message"]')).toBeVisible();
  });

  test('should send user message', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Send a message
    const message = 'Hello, I need help with my account';
    await chatPage.sendMessage(message);

    // Verify message was sent
    await chatPage.expectMessageSent(message);
  });

  test('should receive AI response', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Send a message
    await chatPage.sendMessage('What are your business hours?');

    // Wait for and verify AI response
    await chatPage.waitForAIResponse();
    await chatPage.expectAIResponseReceived();

    // Verify response has content
    const response = await chatPage.getLastAIResponse();
    expect(response.length).toBeGreaterThan(0);
  });

  test('should maintain message history', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Send multiple messages
    await chatPage.sendMessage('Hello');
    await chatPage.waitForAIResponse();

    await chatPage.sendMessage('How are you?');
    await chatPage.waitForAIResponse();

    // Verify message history
    const messages = await chatPage.getAllMessages();
    expect(messages.length).toBeGreaterThanOrEqual(4); // At least 2 user + 2 AI messages
  });

  test('should start new chat session', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Get initial session ID
    const sessionId1 = await chatPage.getSessionId();

    // Start new chat
    await chatPage.startNewChat();

    // Get new session ID
    const sessionId2 = await chatPage.getSessionId();

    // Verify different session
    expect(sessionId1).not.toBe(sessionId2);
  });

  test('should handle empty message submission', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Try to send empty message
    const sendButton = page.locator('button[data-testid="send-message"]');

    // Button should be disabled for empty input
    await expect(sendButton).toBeDisabled();
  });

  test('should show typing indicator during AI response', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Send message
    await chatPage.sendMessage('Tell me a joke');

    // Verify typing indicator appears
    await expect(page.locator('[data-testid="ai-typing"]')).toBeVisible();

    // Wait for response
    await chatPage.waitForAIResponse();

    // Typing indicator should disappear
    await expect(page.locator('[data-testid="ai-typing"]')).not.toBeVisible();
  });

  test('should handle WebSocket connection', async ({ page }) => {
    // Listen for WebSocket connection
    const wsPromise = page.waitForEvent('websocket');

    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Verify WebSocket connection was established
    const ws = await wsPromise;
    expect(ws.url()).toContain('ws://');
  });

  test('should handle message send failure', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto();

    // Disconnect network to simulate failure
    await page.context().setOffline(true);

    // Try to send message
    await page.locator('textarea[name="message"]').fill('Test message');
    await page.click('button[data-testid="send-message"]');

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // Reconnect
    await page.context().setOffline(false);
  });
});
