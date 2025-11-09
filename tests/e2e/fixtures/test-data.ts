/**
 * Test Data Fixtures for E2E Tests
 *
 * Provides reusable test data for authentication and user workflows
 */

export const testUsers = {
  admin: {
    email: 'admin@test.platform.com',
    password: 'AdminPass123!',
    name: 'Admin User',
    organizationName: 'Test Organization',
  },
  user: {
    email: 'user@test.platform.com',
    password: 'UserPass123!',
    name: 'Regular User',
    organizationName: 'User Organization',
  },
  newUser: {
    email: `test-${Date.now()}@platform.com`,
    password: 'NewUser123!',
    name: 'New Test User',
    organizationName: 'New Test Org',
  },
};

export const testMessages = {
  simple: 'Hello, how can I help you?',
  complex: 'I need help troubleshooting a deployment issue with my application',
  withCode: 'How do I implement authentication in my app?',
};

export const testWidgetConfig = {
  name: 'Support Widget',
  position: 'bottom-right' as const,
  primaryColor: '#3B82F6',
  theme: 'light' as const,
};
