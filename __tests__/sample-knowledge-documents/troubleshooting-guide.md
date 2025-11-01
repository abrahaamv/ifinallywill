# Troubleshooting Guide

## Common Issues and Solutions

### Authentication Errors

#### Error: "401 Unauthorized"

**Cause**: Invalid or missing API key

**Solutions**:
1. Verify API key is correctly formatted
2. Check that key hasn't expired
3. Ensure key is in Authorization header: `Bearer YOUR_KEY`
4. Regenerate key if necessary from dashboard

#### Error: "403 Forbidden"

**Cause**: Valid key but insufficient permissions

**Solutions**:
1. Check your plan tier and upgrade if needed
2. Verify resource belongs to your tenant
3. Contact support for permission issues

### Rate Limiting

#### Error: "429 Too Many Requests"

**Cause**: Exceeded rate limit for your tier

**Solutions**:
1. Check `X-RateLimit-Reset` header for reset time
2. Implement exponential backoff retry logic
3. Upgrade to higher tier for more requests
4. Optimize request frequency

**Example Backoff Code**:
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### Session Issues

#### Issue: Session ends unexpectedly

**Cause**: Session timeout or server restart

**Solutions**:
1. Implement session reconnection logic
2. Store session ID for resumption
3. Handle `404 Not Found` gracefully
4. Create new session if old one invalid

#### Issue: Messages not appearing in session

**Cause**: Database replication lag or API error

**Solutions**:
1. Wait 1-2 seconds and retry query
2. Check response status codes
3. Verify `sessionId` in request matches
4. Enable debug logging

### AI Response Issues

#### Issue: Slow response times

**Causes**:
- Large knowledge base retrieval
- Complex queries requiring powerful models
- High system load

**Solutions**:
1. Use streaming endpoints for faster perceived response
2. Simplify queries when possible
3. Reduce `topK` in RAG queries (default 5)
4. Cache frequent queries
5. Check status page for incidents

#### Issue: Irrelevant responses

**Causes**:
- Insufficient context in query
- No matching knowledge base content
- Wrong AI model selected

**Solutions**:
1. Provide more context in messages
2. Upload relevant documents to knowledge base
3. Use conversation history for context
4. Adjust RAG `minScore` threshold (default 0.7)

#### Issue: High costs

**Causes**:
- Using expensive models unnecessarily
- Long conversations not being summarized
- Inefficient prompting

**Solutions**:
1. Review model selection in metadata
2. Implement conversation summarization
3. Use system prompts to reduce token usage
4. Monitor cost per session in analytics

### Knowledge Base Issues

#### Issue: Document upload fails

**Causes**:
- File too large (>10MB limit)
- Invalid file format
- Malformed content

**Solutions**:
1. Check file size and compress if needed
2. Ensure file is .txt or .md format
3. Validate content is valid UTF-8
4. Split large documents into chunks

#### Issue: RAG not retrieving relevant chunks

**Causes**:
- Document not yet indexed
- Query doesn't match content
- Embedding model mismatch

**Solutions**:
1. Wait 30-60 seconds after upload for indexing
2. Rephrase query to match document language
3. Check `minScore` threshold (lower if too strict)
4. Verify document content quality

**Debug RAG**:
```javascript
const response = await client.messages.send({
  sessionId,
  content: query,
  debug: true // Includes RAG details in response
});

console.log(response.assistantMessage.metadata.rag);
// {
//   chunksRetrieved: 3,
//   topRelevance: 'high',
//   chunks: [...]
// }
```

### WebSocket Issues

#### Issue: Connection drops frequently

**Causes**:
- Network instability
- Load balancer timeout
- Client-side disconnection

**Solutions**:
1. Implement automatic reconnection
2. Use sticky sessions with load balancer
3. Increase WebSocket ping interval
4. Check network quality

**Reconnection Example**:
```javascript
let ws;

function connect() {
  ws = new WebSocket('wss://api.platform.com/realtime');

  ws.onopen = () => console.log('Connected');
  ws.onclose = () => {
    console.log('Disconnected, reconnecting...');
    setTimeout(connect, 3000);
  };
}

connect();
```

### Performance Degradation

#### Issue: Increasing response times over time

**Diagnostic Steps**:
1. Check system status page
2. Review recent code deployments
3. Analyze slow query logs
4. Monitor database performance

**Solutions**:
1. Clear browser cache
2. Restart sessions periodically
3. Reduce conversation history size
4. Contact support if persistent

## Debugging Tools

### Enable Debug Mode

Set `DEBUG=platform:*` environment variable to see detailed logs:

```bash
DEBUG=platform:* node your-app.js
```

### Check API Health

```bash
curl https://api.platform.com/health
# Expected: {"status":"healthy","version":"1.0.0"}
```

### Validate API Key

```bash
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.platform.com/api/sessions
# 200 OK = valid key
# 401 = invalid key
```

### Monitor Usage

Check dashboard at https://dashboard.platform.com/analytics for:
- Request count
- Error rates
- Response times
- Cost breakdown

## Error Response Format

All errors follow this structure:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "remaining": 0,
      "resetAt": "2024-01-01T01:00:00Z"
    }
  }
}
```

## Getting Help

If issues persist after trying these solutions:

1. **Check Status Page**: https://status.platform.com
2. **Search Documentation**: https://docs.platform.com
3. **Community Forum**: https://community.platform.com
4. **Email Support**: support@platform.com
5. **Live Chat**: Available Mon-Fri 9AM-5PM EST

**When Contacting Support, Include**:
- Error message and full response
- Request ID from response headers
- Steps to reproduce
- Your API version
- Timestamp of issue
