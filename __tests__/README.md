# Dashboard Manual Testing Framework

Complete testing guide for Phase 12 implementation validation.

## Overview

This testing framework validates:
- **ChatWidget** with comprehensive Phase 12 metadata
- **MessageDebugPanel** displaying all developer information
- **KnowledgePage** document viewer and delete functionality
- **RAG Integration** with knowledge base
- **Three-Tier AI Routing** (Gemini Flash-Lite 8B → Gemini Flash → Claude Sonnet 4.5)
- **RAGAS Quality Metrics** (faithfulness, relevancy, precision, recall)

## Test Structure

```
__tests__/
├── README.md                           # This file
├── chat-widget-test-scenarios.md       # ChatWidget test cases
├── knowledge-page-test-scenarios.md    # KnowledgePage test cases
├── expected-metadata-examples.json     # Expected metadata structures
└── sample-knowledge-documents/         # Sample MD files for upload
    ├── api-documentation.md
    ├── troubleshooting-guide.md
    ├── product-features.md
    └── company-policies.md
```

## Quick Start

### 1. Prerequisites

```bash
# Ensure all services are running
cd /home/abrahaam/Documents/GitHub/platform
pnpm dev

# Services should be running on:
# - Dashboard: http://localhost:5174
# - API Server: http://localhost:3001
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### 2. Upload Knowledge Documents

1. Navigate to Knowledge Base page: `http://localhost:5174/knowledge`
2. Click "Upload Document"
3. Upload each file from `sample-knowledge-documents/`:
   - `api-documentation.md` (category: documentation)
   - `troubleshooting-guide.md` (category: guide)
   - `product-features.md` (category: documentation)
   - `company-policies.md` (category: general)

### 3. Test ChatWidget

1. Open Dashboard home page: `http://localhost:5174`
2. Click floating chat button (bottom-right)
3. Follow test scenarios from `chat-widget-test-scenarios.md`
4. For each response, expand "Developer Info" panel
5. Validate metadata against expected values

### 4. Test Knowledge Page

1. Navigate to Knowledge Base page: `http://localhost:5174/knowledge`
2. Follow test scenarios from `knowledge-page-test-scenarios.md`
3. Test View and Delete functionality

## Test Execution Checklist

### Phase 1: Knowledge Base Setup ✅
- [ ] Upload all 4 sample documents
- [ ] Verify document count (should show 4)
- [ ] Verify total chunks count
- [ ] Verify embeddings count

### Phase 2: ChatWidget Functionality ✅
- [ ] Open chat widget
- [ ] Send simple question (Test Scenario 1)
- [ ] Verify message displays
- [ ] Verify "Developer Info" button appears under AI response
- [ ] Expand developer info panel

### Phase 3: Metadata Validation ✅
- [ ] Model & Routing section displays
- [ ] Complexity & Confidence scores present
- [ ] RAG Retrieval shows chunks retrieved
- [ ] RAGAS Quality Metrics calculated
- [ ] Cost Breakdown accurate
- [ ] Performance timings positive (no negatives!)
- [ ] Prompt Engineering details shown

### Phase 4: RAG Integration ✅
- [ ] Ask knowledge-based question (Test Scenario 3)
- [ ] Verify RAG chunks retrieved > 0
- [ ] Verify chunks displayed in Developer Info
- [ ] Verify answer uses knowledge base content
- [ ] Check RAGAS context relevancy > 0.7

### Phase 5: Model Routing ✅
- [ ] Simple question → Fast tier (Gemini Flash-Lite 8B)
- [ ] Complex question → Powerful tier (Claude Sonnet 4.5)
- [ ] Verify model routing reasoning in metadata

### Phase 6: Knowledge Page ✅
- [ ] View button displays document content
- [ ] Delete button shows confirmation dialog
- [ ] Delete removes document from list
- [ ] Document list refreshes after delete

## Expected Performance Metrics

### Timing Benchmarks
- **Simple Query**: 800-1500ms total
  - RAG: 200-500ms
  - Model: 400-800ms

- **Complex Query**: 1500-3000ms total
  - RAG: 400-800ms
  - Model: 900-2000ms

- **Knowledge-Based Query**: 1000-2500ms total
  - RAG: 500-1000ms (higher due to retrieval)
  - Model: 400-1200ms

### Cost Benchmarks
- **Simple Query**: $0.00001 - $0.00005 (Gemini Flash-Lite)
- **Complex Query**: $0.0001 - $0.0005 (Claude Sonnet)
- **With RAG**: Add $0.00001 for embeddings

### Quality Benchmarks
- **RAGAS Overall**: 0.65 - 0.85 (good range)
- **Faithfulness**: 0.70 - 0.90
- **Answer Relevancy**: 0.75 - 0.95
- **Context Relevancy**: 0.60 - 0.85

## Common Issues & Solutions

### Issue: Negative Timing Values
**Solution**: ✅ Fixed in latest implementation - all timings should be positive

### Issue: RAGAS Scores Very Low (<0.3)
**Cause**: Greeting messages or simple responses without knowledge context
**Expected**: This is normal for "Hi", "Hello", etc.

### Issue: No RAG Chunks Retrieved
**Cause**: Question doesn't match knowledge base content
**Expected**: System falls back to general knowledge

### Issue: Document Viewer Shows "Cannot read properties of undefined"
**Solution**: ✅ Fixed - API response structure corrected

### Issue: Delete Button Not Working
**Cause**: Missing confirmation
**Expected**: Should show confirmation dialog first

## Testing Tips

1. **Clear Browser Cache**: Before testing, clear cache to ensure fresh state
2. **Check Console**: Open DevTools Console for detailed logs
3. **Network Tab**: Monitor API calls in Network tab
4. **Database State**: Check PostgreSQL for data persistence
5. **Screenshot Everything**: Capture screenshots of metadata panels for documentation

## Success Criteria

✅ All test scenarios pass
✅ All metadata fields populated correctly
✅ Performance within benchmarks
✅ No console errors
✅ Proper error handling
✅ UI responsive and intuitive

## Next Steps After Testing

1. Document any bugs found
2. Create GitHub issues for improvements
3. Update test scenarios based on findings
4. Prepare for automated testing implementation
5. Performance optimization if needed

## Support

For questions or issues during testing:
1. Check `chat-widget-test-scenarios.md` for detailed test cases
2. Review `expected-metadata-examples.json` for metadata structures
3. Check browser console for error messages
4. Verify all services are running properly
