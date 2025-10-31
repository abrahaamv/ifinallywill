/**
 * Shared Test Helpers - Phase 2 Task 2.2
 *
 * Common test utilities used across all packages.
 */

/**
 * Wait for a specified number of milliseconds
 * Useful for testing async operations with delays
 */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a mock logger that captures log calls
 * Useful for testing logging behavior without console output
 */
export interface MockLogger {
  info: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  debug: ReturnType<typeof vi.fn>;
  child: ReturnType<typeof vi.fn>;
}

export const createMockLogger = (): MockLogger => ({
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(() => createMockLogger()),
});

/**
 * Suppress console output during tests
 * Use in beforeAll/afterAll blocks to avoid polluting test output
 */
export const suppressConsole = () => {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  beforeAll(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();
  });

  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  });
};

/**
 * Create a mock environment variable set
 * Useful for testing environment-dependent behavior
 */
export const withEnv = <T>(
  env: Record<string, string>,
  fn: () => T
): T => {
  const originalEnv = { ...process.env };
  Object.assign(process.env, env);
  try {
    return fn();
  } finally {
    process.env = originalEnv;
  }
};

/**
 * Assert that a function throws with a specific error message
 */
export const expectThrowsAsync = async (
  fn: () => Promise<unknown>,
  expectedMessage?: string
): Promise<void> => {
  let error: Error | null = null;
  try {
    await fn();
  } catch (e) {
    error = e as Error;
  }
  expect(error).toBeTruthy();
  if (expectedMessage && error) {
    expect(error.message).toContain(expectedMessage);
  }
};

/**
 * Create a spy on module exports
 * Useful for mocking imported functions
 */
export const spyOnModule = <T extends Record<string, unknown>>(
  module: T,
  method: keyof T
): ReturnType<typeof vi.spyOn> => {
  return vi.spyOn(module, method as string);
};
