# Knowledge Base Upload - Testing Guide

**Priority 2 Implementation** | **Status**: Ready for testing | **Last Updated**: 2025-10-07

## Overview

This document provides comprehensive testing procedures for the Knowledge Base Upload feature implemented in Priority 2. The feature includes document chunking, Voyage AI embeddings generation, vector storage, and semantic search.

## Prerequisites

### 1. Environment Setup

Required environment variables in `.env`:

```bash
# Voyage AI API Key (Required for embeddings)
VOYAGE_API_KEY=pa-your-voyage-api-key-here

# Database (Already configured)
DATABASE_URL=postgresql://platform:platform_dev_password@localhost:5432/platform

# API Server (Default)
API_URL=http://localhost:3001
```

**Get Voyage API Key**: https://www.voyageai.com/

### 2. Services Running

Start all required services:

```bash
# Terminal 1: Database
pnpm db:up

# Terminal 2: API Server (port 3001)
pnpm dev:api

# Terminal 3: Dashboard (port 5174)
pnpm dev:dashboard
```

### 3. Test Users

From Priority 1 implementation:

- **Admin**: admin@acme.com / Test123!@#
- **User**: user@acme.com / Test123!@#

## Test Cases

### Test Case 1: Text File Upload (.txt)

**Objective**: Verify plain text file upload with automatic chunking and embedding generation

**Test Data**: Create `docs/testing/sample-data/test-document-1.txt`:

```
Platform Documentation

Introduction
This is a test document for the Knowledge Base Upload feature. It demonstrates the document chunking and embedding generation process using Voyage Multimodal-3 embeddings.

Features
The platform supports multi-modal AI interactions with real-time communication. Users can upload documents to enhance the AI's knowledge base through RAG (Retrieval-Augmented Generation).

Architecture
The system uses a microservices architecture with separate API and WebSocket servers. The database layer uses PostgreSQL with pgvector extension for efficient vector similarity search.

Performance
The chunking algorithm splits documents into 800-character chunks with 100-character overlap. This ensures semantic coherence while optimizing for embedding quality.

Conclusion
This test document validates the end-to-end upload flow from file selection through chunking, embedding generation, and database storage.
```

**Steps**:

1. Login to Dashboard at http://localhost:5174/login
2. Navigate to Knowledge Base page (http://localhost:5174/knowledge)
3. Click "Upload Document" form
4. Fill in:
   - **Title**: Platform Documentation
   - **Category**: documentation
   - **File**: Select `test-document-1.txt`
5. Click "Upload Document" button
6. Observe upload progress:
   - "Reading file..." (immediate)
   - "Uploading and processing..." (5-10 seconds)
7. Success message appears with statistics

**Expected Results**:

- ✅ File uploads successfully
- ✅ Success message shows: "Document uploaded successfully! Created [X] chunks with [Y] tokens"
- ✅ Estimated chunks: 2-3 chunks (document ~850 chars)
- ✅ Estimated tokens: ~200-250 tokens
- ✅ Document appears in library list with title "Platform Documentation"
- ✅ Category shows "documentation"
- ✅ Created date shows current date

**Validation Queries**:

```sql
-- Check document record
SELECT id, title, category, LENGTH(content) as content_length, created_at
FROM knowledge_documents
WHERE title = 'Platform Documentation';

-- Check chunks created
SELECT
  kc.id,
  kc.position,
  LENGTH(kc.content) as chunk_length,
  array_length(kc.embedding, 1) as embedding_dimensions
FROM knowledge_chunks kc
INNER JOIN knowledge_documents kd ON kc.document_id = kd.id
WHERE kd.title = 'Platform Documentation'
ORDER BY kc.position;
```

**Expected Database Results**:

- 1 document record in `knowledge_documents`
- 2-3 chunk records in `knowledge_chunks`
- Each chunk has 1024-dimensional embedding vector
- Chunks ordered by position (0, 1, 2...)

### Test Case 2: Markdown File Upload (.md)

**Objective**: Verify markdown file upload with formatting preservation

**Test Data**: Create `docs/testing/sample-data/api-guide.md`:

```markdown
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
```

**Steps**:

1. Login to Dashboard
2. Navigate to Knowledge Base
3. Upload markdown file:
   - **Title**: API Integration Guide
   - **Category**: guides
   - **File**: `api-guide.md`
4. Click Upload
5. Verify success

**Expected Results**:

- ✅ Markdown formatting preserved in content
- ✅ Code blocks included in chunks
- ✅ Estimated chunks: 3-4 chunks (~1000 chars)
- ✅ Estimated tokens: ~250-300 tokens
- ✅ Document listed in library

### Test Case 3: Large File Upload (Edge Case)

**Objective**: Test chunking algorithm with larger document

**Test Data**: Create `docs/testing/sample-data/large-document.txt` (2000+ characters)

```
Enterprise AI Platform - Complete System Overview

Executive Summary
The Enterprise AI Platform is a comprehensive solution for multi-modal AI interactions, real-time collaboration, and knowledge management. This document provides detailed technical specifications, architecture diagrams, and implementation guidelines for enterprise deployments.

[Continue with 1500+ more characters of technical content about architecture, security, deployment, monitoring, etc.]
```

**Expected Results**:

- ✅ Creates 5-8 chunks (depending on content)
- ✅ Each chunk approximately 800 characters
- ✅ 100-character overlap between consecutive chunks
- ✅ Sentence boundaries preserved
- ✅ Total tokens: 500-600

### Test Case 4: File Type Validation

**Objective**: Verify only supported file types are accepted

**Test Steps**:

1. Attempt to upload `.pdf` file
2. Attempt to upload `.docx` file
3. Attempt to upload `.exe` file

**Expected Results**:

- ❌ Error message: "Unsupported file type: [type]. Only text-based files are supported."
- ✅ Upload form remains functional
- ✅ No partial data stored in database

### Test Case 5: File Size Validation

**Objective**: Verify 10MB file size limit

**Test Steps**:

1. Create file larger than 10MB (e.g., 15MB text file)
2. Attempt upload

**Expected Results**:

- ❌ Error message: "File size must be less than 10MB"
- ✅ No upload occurs
- ✅ Form allows retry with smaller file

### Test Case 6: Empty File Validation

**Objective**: Verify empty files are rejected

**Test Steps**:

1. Create empty `.txt` file (0 bytes)
2. Attempt upload

**Expected Results**:

- ❌ Error message: "Document is empty or could not be chunked"
- ✅ No document or chunks created

### Test Case 7: Document Deletion

**Objective**: Verify document and associated chunks are deleted

**Test Steps**:

1. Upload test document
2. Verify document appears in list
3. Click "Delete" button
4. Confirm deletion in dialog
5. Check database

**Expected Results**:

- ✅ Confirmation dialog appears
- ✅ Document removed from list immediately
- ✅ Database cascade deletes all chunks
- ✅ List updates without page refresh

**Validation Query**:

```sql
-- Should return 0 rows
SELECT COUNT(*) FROM knowledge_chunks
WHERE document_id = 'deleted_document_id';
```

### Test Case 8: Category Filtering (Future)

**Objective**: Prepare for category-based search filtering

**Test Steps**:

1. Upload 3 documents:
   - Category: "documentation"
   - Category: "guides"
   - Category: "faq"
2. Verify all appear in library
3. Check database category values

**Expected Results**:

- ✅ Each document has correct category
- ✅ Categories stored as strings in database
- ✅ Ready for search filter implementation

### Test Case 9: Vector Semantic Search

**Objective**: Verify vector similarity search works

**Prerequisites**: Documents uploaded with various content

**Test API Request** (using curl or Postman):

```bash
curl -X POST http://localhost:3001/trpc/knowledge.search \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_session=YOUR_SESSION_COOKIE" \
  -d '{
    "query": "How do I upload documents to the knowledge base?",
    "limit": 5,
    "minScore": 0.7
  }'
```

**Expected Response**:

```json
{
  "results": [
    {
      "id": "chunk_123",
      "documentId": "doc_456",
      "documentTitle": "Platform Documentation",
      "content": "Users can upload documents to enhance the AI's knowledge base...",
      "similarityScore": "0.8542",
      "relevance": "high"
    }
  ],
  "total": 1,
  "query": "How do I upload documents to the knowledge base?",
  "minScore": 0.7
}
```

**Validation**:

- ✅ Similarity scores between 0.7 and 1.0
- ✅ Results ordered by relevance (highest first)
- ✅ Relevance labels correct (high: ≥0.85, medium: ≥0.7)
- ✅ Query embedding generated successfully

### Test Case 10: Concurrent Uploads

**Objective**: Test system under concurrent load

**Test Steps**:

1. Open 2-3 browser tabs with Dashboard
2. Upload different files simultaneously
3. Verify all complete successfully

**Expected Results**:

- ✅ All uploads complete without errors
- ✅ No database conflicts or race conditions
- ✅ All chunks created with correct embeddings
- ✅ Document list updates correctly in all tabs

## Performance Benchmarks

Expected performance metrics:

| Metric | Target | Notes |
|--------|--------|-------|
| Upload API latency | <10s | For 1000-char document |
| Chunking time | <100ms | For 5000-char document |
| Embedding generation | 2-5s | Batch of 5 chunks |
| Database insert | <500ms | Document + chunks |
| Search query | <1s | Vector similarity search |
| UI responsiveness | <100ms | Form interactions |

## Error Handling Tests

### Test Case 11: Missing VOYAGE_API_KEY

**Steps**:

1. Remove `VOYAGE_API_KEY` from `.env`
2. Restart API server
3. Attempt document upload

**Expected Results**:

- ❌ Error: "Semantic search not configured. VOYAGE_API_KEY required."
- ✅ User-friendly error message in UI
- ✅ No partial data in database

### Test Case 12: Invalid API Key

**Steps**:

1. Set invalid `VOYAGE_API_KEY=invalid-key-123`
2. Restart API server
3. Attempt upload

**Expected Results**:

- ❌ Error: "Embedding generation failed: Voyage API error (401): Unauthorized"
- ✅ Document record not created
- ✅ Clear error message to user

### Test Case 13: Network Timeout

**Steps**:

1. Simulate slow network (browser dev tools: Network throttling)
2. Upload large file
3. Observe timeout behavior

**Expected Results**:

- ⏳ Upload progress shows "Uploading and processing..."
- ✅ Request timeout handled gracefully
- ✅ Retry option available

## Integration Test Checklist

- [ ] Text file upload (.txt) works
- [ ] Markdown file upload (.md) works
- [ ] JSON file upload (.json) works
- [ ] CSV file upload (.csv) works
- [ ] Chunking creates correct number of chunks
- [ ] Embeddings are 1024-dimensional
- [ ] Vector search returns relevant results
- [ ] Document list displays correctly
- [ ] Delete removes document and chunks
- [ ] Category filtering works
- [ ] Error messages are user-friendly
- [ ] Upload progress updates in real-time
- [ ] Form validation prevents invalid uploads
- [ ] File size limit enforced (10MB)
- [ ] Unsupported file types rejected
- [ ] Concurrent uploads work correctly
- [ ] Database constraints enforced
- [ ] Multi-tenant isolation working
- [ ] Cost estimation accurate

## Known Issues

None currently identified. Document any issues found during testing here.

## Next Steps

After successful testing:

1. Mark Priority 2 as complete
2. Update phase documentation
3. Prepare for Priority 3: RAG Query Integration
4. Consider performance optimizations for large files
5. Implement search UI in frontend

## Testing Tools

- **Browser**: Chrome/Firefox with DevTools
- **API Testing**: Postman or curl
- **Database**: pgAdmin or psql CLI
- **Monitoring**: Check API server logs for errors

## Success Criteria

Priority 2 is complete when:

- ✅ All 13 test cases pass
- ✅ No critical bugs identified
- ✅ Performance benchmarks met
- ✅ Error handling robust
- ✅ Documentation updated
- ✅ Code passes typecheck and lint
