# API Integration Guide

## Authentication

All API requests require authentication using JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### Upload Document

**POST** `/api/knowledge/upload`

Request body:

```json
{
  "title": "Document Title",
  "content": "Document content...",
  "category": "guides"
}
```

Response:

```json
{
  "id": "doc_123",
  "processingStats": {
    "chunksCreated": 5,
    "totalTokens": 1200,
    "estimatedCost": 0.00014
  }
}
```

### Search Documents

**POST** `/api/knowledge/search`

Query semantic search with minimum similarity score of 0.7.

## Best Practices

1. **Chunk Size**: Keep documents under 10MB
2. **File Types**: Use .txt, .md, .json, or .csv
3. **Categories**: Organize with consistent category names
4. **Metadata**: Add custom metadata for better filtering
