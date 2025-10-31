# Logging Patterns - Production Ready

**Status**: Phase 2 Task 2.4 - Replace Console.log
**Created**: 2025-10-26
**Logger Package**: `@platform/shared`

## Overview

Centralized Pino-based structured logging with automatic sensitive data redaction. Replaces all `console.log` usage across the platform.

## Quick Start

```typescript
import { logger, createModuleLogger } from '@platform/shared';

// Basic logging
logger.info('Server started', { port: 3001 });
logger.error('Database connection failed', { error });

// Module-specific logger
const authLogger = createModuleLogger('auth');
authLogger.info('User logged in', { userId: '123' });
```

## Logger Types

### 1. Global Logger

Use for general application logging:

```typescript
import { logger } from '@platform/shared';

logger.trace('Detailed diagnostic info');
logger.debug('Debugging information');
logger.info('General information');
logger.warn('Warning messages');
logger.error('Error conditions');
logger.fatal('Fatal errors (application crash)');
```

### 2. Module Logger

Create module-specific loggers with automatic context:

```typescript
import { createModuleLogger } from '@platform/shared';

const dbLogger = createModuleLogger('database');
const authLogger = createModuleLogger('auth');
const apiLogger = createModuleLogger('api');

dbLogger.info('Query executed', { query: 'SELECT...', duration: 45 });
authLogger.warn('Failed login attempt', { email: 'user@example.com' });
```

### 3. Request Logger

For HTTP request tracking:

```typescript
import { createRequestLogger } from '@platform/shared';

// Automatic request ID generation
const reqLogger = createRequestLogger();
reqLogger.info('HTTP request', { method: 'POST', path: '/api/users' });

// Or provide custom request ID
const reqLogger2 = createRequestLogger('req-custom-123');
```

### 4. Child Logger

Add contextual information to all log entries:

```typescript
import { createChildLogger } from '@platform/shared';

const sessionLogger = createChildLogger({
  sessionId: 'sess_abc123',
  userId: 'user_xyz789',
  tenantId: 'tenant_001',
});

// All logs will include session context
sessionLogger.info('Action performed');
// Output: { sessionId: 'sess_abc123', userId: 'user_xyz789', tenantId: 'tenant_001', msg: 'Action performed' }
```

### 5. Database Logger

Specialized logger for database operations:

```typescript
import { createDatabaseLogger } from '@platform/shared';

const dbLogger = createDatabaseLogger();
dbLogger.info('Query executed', { table: 'users', operation: 'SELECT', duration: 12 });
```

## Sensitive Data Redaction

The logger automatically redacts 30+ sensitive field patterns:

```typescript
import { logger } from '@platform/shared';

// Sensitive fields are automatically redacted
logger.info('User created', {
  email: 'user@example.com',
  password: 'supersecret123',      // ← Redacted
  apiKey: 'sk-1234567890',         // ← Redacted
  token: 'jwt-token-here',         // ← Redacted
});

// Output: { email: 'user@example.com', password: '[REDACTED]', apiKey: '[REDACTED]', token: '[REDACTED]' }
```

### Redacted Fields

- **Authentication**: password, token, apiKey, secret, sessionToken, csrfToken, bearerToken, oauthToken
- **MFA**: mfaSecret, totpSecret, backupCodes, recoveryCode
- **Payment**: creditCard, cardNumber, cvv, pin, ssn
- **Crypto**: privateKey, encryptionKey, secretKey
- **Headers**: authorization, cookie

## Safe Logging Utility

For explicit redaction control:

```typescript
import { logSafe } from '@platform/shared';

logSafe('info', 'User login', {
  email: 'user@example.com',
  password: 'secret',  // Automatically redacted
});
```

## Migration from console.log

### Before (console.log)

```typescript
console.log('User logged in:', userId);
console.error('Database error:', error);
console.warn('Deprecated API used');
```

### After (Pino logger)

```typescript
import { createModuleLogger } from '@platform/shared';

const logger = createModuleLogger('auth');

logger.info('User logged in', { userId });
logger.error('Database error', { error });
logger.warn('Deprecated API used');
```

## Environment Configuration

### Development

- Pretty-printed colorized output
- Default level: `debug`
- Includes timestamps and readable formatting

### Production

- JSON structured logging
- Default level: `info`
- Machine-readable format for log aggregation

### Custom Log Level

Set via environment variable:

```bash
LOG_LEVEL=debug npm run dev    # Detailed debugging
LOG_LEVEL=info npm start        # Standard production
LOG_LEVEL=warn npm start        # Only warnings and errors
```

## Best Practices

### 1. Use Structured Logging

```typescript
// ✅ GOOD - Structured data
logger.info('User created', { userId, email, tenantId });

// ❌ BAD - Unstructured strings
logger.info(`User ${userId} created with email ${email}`);
```

### 2. Include Relevant Context

```typescript
// ✅ GOOD - Rich context
logger.error('Database query failed', {
  query: 'SELECT * FROM users',
  error: error.message,
  duration: 123,
  tenantId,
});

// ❌ BAD - Minimal context
logger.error('Query failed');
```

### 3. Choose Appropriate Log Levels

```typescript
logger.trace('Function entered', { params });           // Extreme detail
logger.debug('Processing step', { step: 1, data });    // Debugging info
logger.info('Request completed', { statusCode: 200 }); // Standard info
logger.warn('Rate limit approaching', { count: 95 });  // Warnings
logger.error('Operation failed', { error });           // Errors
logger.fatal('Server cannot start', { error });        // Fatal crashes
```

### 4. Use Module Loggers

```typescript
// ✅ GOOD - Module context
const authLogger = createModuleLogger('auth');
authLogger.info('Login successful');
// Output: { module: 'auth', msg: 'Login successful' }

// ❌ BAD - No context
logger.info('Login successful');
// Output: { msg: 'Login successful' }
```

### 5. Never Log Sensitive Data Manually

```typescript
// ✅ GOOD - Automatic redaction
logger.info('User authenticated', { password, token });
// Automatically redacted

// ❌ BAD - Manual concatenation (bypasses redaction)
logger.info(`Password: ${password}`);
// NOT redacted!
```

## Integration Examples

### Fastify Server

```typescript
import { createRequestLogger } from '@platform/shared';

fastify.addHook('onRequest', async (request) => {
  const reqLogger = createRequestLogger(request.id);
  request.log = reqLogger;
  reqLogger.info('Request started', {
    method: request.method,
    url: request.url,
  });
});
```

### tRPC Context

```typescript
import { createRequestLogger } from '@platform/shared';

export const createContext = async ({ req, res }: CreateContextOptions) => {
  const logger = createRequestLogger();

  return {
    logger,
    // ... other context
  };
};
```

### Database Operations

```typescript
import { createDatabaseLogger } from '@platform/shared';

const dbLogger = createDatabaseLogger();

async function queryUsers(tenantId: string) {
  const start = Date.now();

  try {
    const results = await db.select().from(users).where(eq(users.tenantId, tenantId));
    const duration = Date.now() - start;

    dbLogger.info('Query successful', {
      table: 'users',
      operation: 'SELECT',
      duration,
      rows: results.length,
    });

    return results;
  } catch (error) {
    dbLogger.error('Query failed', {
      table: 'users',
      operation: 'SELECT',
      error,
    });
    throw error;
  }
}
```

## Allowed console.* Usage

Only `console.error` is allowed for critical startup failures:

```typescript
// ✅ ALLOWED - Critical startup failure
try {
  await startServer();
} catch (error) {
  console.error('Fatal error starting server:', error);
  process.exit(1);
}

// ❌ NOT ALLOWED - Use logger instead
console.log('Server started');  // Use logger.info()
console.warn('Warning');        // Use logger.warn()
```

## ESLint Enforcement

Add to `.eslintrc.json`:

```json
{
  "rules": {
    "no-console": [
      "error",
      {
        "allow": ["error"]
      }
    ]
  }
}
```

## Migration Checklist

- [ ] Replace `console.log()` with `logger.info()`
- [ ] Replace `console.warn()` with `logger.warn()`
- [ ] Replace `console.error()` with `logger.error()` (except critical startup)
- [ ] Replace `console.debug()` with `logger.debug()`
- [ ] Convert string concatenation to structured objects
- [ ] Add relevant context (userId, tenantId, requestId, etc.)
- [ ] Create module-specific loggers for each package
- [ ] Add ESLint rule to prevent future console usage
- [ ] Update documentation with logging patterns

## Performance Considerations

- **Minimal overhead**: Pino is one of the fastest Node.js loggers
- **Lazy evaluation**: Log arguments only evaluated if level is enabled
- **Structured data**: More efficient than string concatenation
- **Production-ready**: Used by major enterprises at scale

## Support

- Package: `@platform/shared`
- Implementation: `packages/shared/src/logger.ts`
- Documentation: This file
- Examples: See integration examples above
