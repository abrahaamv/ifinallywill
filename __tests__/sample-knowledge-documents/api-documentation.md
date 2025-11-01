# API Documentation

## Overview

Our platform provides a comprehensive REST API for integrating AI assistants into your applications. This documentation covers authentication, rate limits, endpoints, and best practices.

## Authentication

All API requests require authentication using an API key. Include your API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

### Obtaining API Keys

1. Log in to your dashboard
2. Navigate to Settings > API Keys
3. Click "Generate New Key"
4. Copy and securely store your key (it won't be shown again)

## Rate Limits

To ensure fair usage and system stability, we enforce the following rate limits:

### Free Tier
- **100 requests per hour**
- **1,000 requests per day**
- **10,000 requests per month**

### Pro Tier
- **1,000 requests per hour**
- **10,000 requests per day**
- **100,000 requests per month**

### Enterprise Tier
- **10,000 requests per hour**
- **100,000 requests per day**
- **Custom limits available**

### Rate Limit Headers

All responses include rate limit information in headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response.

## Endpoints

### Sessions

#### Create Session
```
POST /api/sessions
```

Creates a new chat session.

**Request Body:**
```json
{
  "mode": "text" | "voice" | "video",
  "metadata": {
    "userAgent": "string",
    "locale": "string"
  }
}
```

**Response:**
```json
{
  "id": "uuid",
  "mode": "text",
  "createdAt": "2024-01-01T00:00:00Z",
  "costUsd": "0.000000"
}
```

#### Get Session
```
GET /api/sessions/:id
```

Retrieves session details.

**Response:**
```json
{
  "id": "uuid",
  "mode": "text",
  "createdAt": "2024-01-01T00:00:00Z",
  "endedAt": null,
  "costUsd": "0.000123",
  "messageCount": 5
}
```

### Messages

#### Send Message
```
POST /api/messages
```

Sends a message and receives AI response.

**Request Body:**
```json
{
  "sessionId": "uuid",
  "content": "Your message here",
  "attachments": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg"
    }
  ]
}
```

**Response:**
```json
{
  "userMessage": {
    "id": "uuid",
    "role": "user",
    "content": "Your message here",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "assistantMessage": {
    "id": "uuid",
    "role": "assistant",
    "content": "AI response here",
    "timestamp": "2024-01-01T00:00:01Z",
    "metadata": {
      "model": "gpt-4o-mini",
      "tokensUsed": 150,
      "costUsd": 0.000023
    }
  },
  "usage": {
    "inputTokens": 50,
    "outputTokens": 100,
    "totalTokens": 150,
    "cost": 0.000023
  }
}
```

### Knowledge Base

#### Upload Document
```
POST /api/knowledge/upload
```

Uploads a document to the knowledge base for RAG.

**Request Body:**
```json
{
  "title": "Product Documentation",
  "content": "Document content here...",
  "category": "documentation"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Product Documentation",
  "category": "documentation",
  "chunkCount": 15,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

#### List Documents
```
GET /api/knowledge/list?limit=50&offset=0
```

Retrieves paginated list of documents.

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Product Documentation",
      "category": "documentation",
      "chunkCount": 15,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid API key |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Best Practices

### Performance Optimization

1. **Reuse Sessions**: Create one session per user conversation
2. **Implement Caching**: Cache responses when appropriate
3. **Batch Requests**: Combine multiple operations when possible
4. **Monitor Rate Limits**: Track headers and implement backoff

### Security

1. **Never expose API keys** in client-side code
2. **Use HTTPS** for all requests
3. **Rotate keys regularly**
4. **Implement IP whitelisting** for production environments
5. **Validate all user input** before sending to API

### Cost Management

1. **Use appropriate models**: Don't use GPT-4 for simple tasks
2. **Implement message limits**: Cap conversations at reasonable length
3. **Monitor usage**: Check dashboard analytics regularly
4. **Set budget alerts**: Configure alerts at 50%, 75%, 90% of budget

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createPlatformClient } from '@platform/sdk';

const client = createPlatformClient({
  apiKey: process.env.PLATFORM_API_KEY
});

// Create session
const session = await client.sessions.create({
  mode: 'text'
});

// Send message
const response = await client.messages.send({
  sessionId: session.id,
  content: 'Hello, how can you help me?'
});

console.log(response.assistantMessage.content);
```

### Python

```python
from platform_sdk import PlatformClient

client = PlatformClient(api_key=os.environ['PLATFORM_API_KEY'])

# Create session
session = client.sessions.create(mode='text')

# Send message
response = client.messages.send(
    session_id=session.id,
    content='Hello, how can you help me?'
)

print(response.assistant_message.content)
```

## Support

For technical support:
- Email: api-support@platform.com
- Documentation: https://docs.platform.com
- Status Page: https://status.platform.com
