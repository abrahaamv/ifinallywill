# Knowledge Page Test Scenarios

Test cases for KnowledgePage document viewer and delete functionality.

---

## Test Scenario 1: Upload Documents

### Steps
1. Navigate to `http://localhost:5174/knowledge`
2. Click "Upload Document" button
3. Fill form for each sample document

### Document 1: API Documentation
```
Title: API Documentation v2.0
Category: documentation
File: sample-knowledge-documents/api-documentation.md
```

### Document 2: Troubleshooting Guide
```
Title: Common Troubleshooting Steps
Category: guide
File: sample-knowledge-documents/troubleshooting-guide.md
```

### Document 3: Product Features
```
Title: Product Features Overview
Category: documentation
File: sample-knowledge-documents/product-features.md
```

### Document 4: Company Policies
```
Title: Company Policies & Guidelines
Category: general
File: sample-knowledge-documents/company-policies.md
```

### Expected Behavior
- Upload button shows "Uploading..." during upload
- Success: Modal closes, document list refreshes
- Document appears in "Recent" and "All Documents" tabs
- Stats cards update:
  - Total Documents: +1 for each upload
  - Total Chunks: Increases based on document size
  - Embeddings: Matches chunk count

### Validation
- [ ] All 4 documents uploaded successfully
- [ ] Total Documents shows 4
- [ ] Each document has chunk count > 0
- [ ] No console errors during upload

---

## Test Scenario 2: View Document Content

### Steps
1. Locate any document card in the library
2. Click "View" button with eye icon
3. Inspect document viewer modal

### Expected Behavior
- Modal opens with document content
- Header shows:
  - File icon
  - Document title
  - Category
  - Upload date
- Content area displays:
  - Full markdown content
  - Monospace font
  - Gray background
  - Scrollable if content is long
- Close button works

### Test Case: View API Documentation
```
Expected Header:
  Title: API Documentation v2.0
  Description: documentation • Uploaded [date]

Expected Content:
  Starts with: "# API Documentation"
  Contains: Rate limits, endpoints, authentication
  Scrollable: Yes (content is long)
```

### Test Case: View Short Document
```
Expected Header:
  Title: Company Policies & Guidelines
  Description: general • Uploaded [date]

Expected Content:
  Starts with: "# Company Policies"
  Scrollable: Maybe (shorter content)
```

### Validation
- [ ] Modal opens smoothly
- [ ] Title and category display correctly
- [ ] Upload date formatted properly
- [ ] Content is readable and properly formatted
- [ ] Scroll works for long documents
- [ ] Close button closes modal
- [ ] No "Cannot read properties of undefined" error
- [ ] No missing content

---

## Test Scenario 3: View All Documents

### Steps
1. Click "View" on first document
2. Close modal
3. Click "View" on second document
4. Repeat for all documents

### Expected Behavior
- Each document displays its own unique content
- No content mixing between documents
- Modal state resets properly between views
- Loading skeleton shows briefly while fetching

### Validation
- [ ] All 4 documents viewable individually
- [ ] Content unique for each document
- [ ] No state leakage between views
- [ ] Loading states work correctly

---

## Test Scenario 4: Delete Single Document

### Steps
1. Locate a document card (e.g., "Product Features")
2. Click delete button (trash icon)
3. Observe confirmation dialog

### Expected Confirmation Dialog
```
Title: Delete Document
Message: "Are you sure you want to delete this document?
         This action cannot be undone and will remove all
         associated chunks and embeddings."

Buttons:
  - Cancel (outline)
  - Delete (red/destructive)
```

### Actions

#### Action A: Cancel Deletion
1. Click "Cancel"
2. Dialog closes
3. Document still in list

#### Action B: Confirm Deletion
1. Click "Delete"
2. Button shows "Deleting..."
3. Dialog closes
4. Document removed from list
5. Stats update:
   - Total Documents: -1
   - Total Chunks: Decreases
   - Embeddings: Decreases

### Validation
- [ ] Confirmation dialog appears
- [ ] Cancel keeps document
- [ ] Delete removes document
- [ ] List refreshes automatically
- [ ] Stats update correctly
- [ ] No console errors

---

## Test Scenario 5: Delete Multiple Documents

### Steps
1. Delete "Product Features" document
2. Verify stats update
3. Delete "Troubleshooting Guide" document
4. Verify stats update again

### Expected Stats After Each Delete

#### After Deleting Product Features
```
Total Documents: 3 (was 4)
Total Chunks: [Decreased]
Embeddings: [Decreased]
```

#### After Deleting Troubleshooting Guide
```
Total Documents: 2 (was 3)
Total Chunks: [Decreased further]
Embeddings: [Decreased further]
```

### Validation
- [ ] Each delete works independently
- [ ] Stats accurate after each operation
- [ ] No race conditions
- [ ] UI remains responsive

---

## Test Scenario 6: Search Functionality

### Steps
1. Ensure all 4 documents uploaded
2. Type in search box

### Search Tests

#### Search: "API"
```
Expected Results:
  - API Documentation v2.0 (title match)

Filtered Documents: 1
```

#### Search: "guide"
```
Expected Results:
  - Common Troubleshooting Steps (category match)
  - Company Policies & Guidelines (title match)

Filtered Documents: 2
```

#### Search: "documentation"
```
Expected Results:
  - API Documentation v2.0 (category match)
  - Product Features Overview (category match)

Filtered Documents: 2
```

#### Search: "xyz123" (no match)
```
Expected Results:
  - Empty state
  - Message: "No documents found"
  - Subtext: "Try a different search term"

Filtered Documents: 0
```

### Validation
- [ ] Search filters by title
- [ ] Search filters by category
- [ ] Case-insensitive search
- [ ] Empty state shows for no results
- [ ] Clear search shows all documents

---

## Test Scenario 7: Tab Navigation

### Steps
1. Click "Recent" tab → Shows first 6 documents
2. Click "Starred" tab → Shows starred documents
3. Click "All Documents" tab → Shows all documents

### Expected Behavior

#### Recent Tab
- Shows up to 6 most recent documents
- Sorted by upload date (newest first)
- If < 6 documents, shows all
- View and Delete buttons work

#### Starred Tab
- Currently shows empty state
- Message: "No starred documents"
- Subtext: "Star documents to find them quickly"
- Star feature: ⚠️ **Not yet implemented**

#### All Documents Tab
- Shows all documents (no limit)
- Same view and delete functionality
- Search works across all

### Validation
- [ ] Tab switching works smoothly
- [ ] Recent tab limited to 6
- [ ] All Documents shows everything
- [ ] Starred tab shows empty state

---

## Test Scenario 8: Edge Cases

### Empty State Test
1. Delete all documents
2. Observe empty state

#### Expected Empty State
```
Icon: BookOpen (large, gray)
Message: "No documents found"
Subtext: "Upload your first document to get started"
Stats: All show 0
```

### Large Document Test
1. Create a document with 10,000+ words
2. Upload it
3. View it

#### Expected Behavior
- Upload succeeds (may take longer)
- View shows full content
- Scroll works smoothly
- Performance acceptable

### Special Characters Test
1. Upload document with special chars in title: "API's & Co's Guide (v2.0)"
2. View it
3. Delete it

#### Expected Behavior
- Title displays correctly
- No encoding issues
- View and delete work normally

---

## Test Scenario 9: Integration with ChatWidget

### Steps
1. Ensure "API Documentation" uploaded
2. Open ChatWidget
3. Ask: "What are our API rate limits?"
4. Expand Developer Info

### Expected RAG Integration
```
RAG Retrieval:
  Chunks: 3-5
  Method: hybrid
  Relevance: high
  Chunks Retrieved:
    - Source: api-documentation.md
    - Score: 0.85-0.95
    - Content: [Rate limit information]
```

### Validation
- [ ] ChatWidget retrieves from uploaded docs
- [ ] RAG chunks show correct source
- [ ] Answer includes knowledge base info
- [ ] High RAGAS context relevancy

---

## Test Scenario 10: Error Handling

### Test: View Deleted Document (Edge Case)
1. Open view modal for Document A
2. In another tab, delete Document A
3. Try to interact with modal

#### Expected Behavior
- Either shows cached content
- Or shows "Document not found" error
- No application crash

### Test: Delete Already Deleted Document
1. Delete Document A
2. Quickly click delete again before refresh

#### Expected Behavior
- Second delete fails gracefully
- Shows error: "Document not found"
- No application crash

### Validation
- [ ] Graceful error handling
- [ ] No console crashes
- [ ] User-friendly error messages

---

## Performance Benchmarks

### Upload Performance
- **Small Document** (< 1KB): < 500ms
- **Medium Document** (1-10KB): 500-2000ms
- **Large Document** (> 10KB): 2-5 seconds

### View Performance
- **Modal Open**: < 200ms
- **Content Load**: < 500ms
- **Scroll Performance**: 60 FPS

### Delete Performance
- **Confirmation Dialog**: < 100ms
- **Deletion**: 500-1500ms
- **List Refresh**: < 300ms

---

## Validation Checklist

### Upload Functionality ✅
- [ ] Upload button works
- [ ] Form validation works
- [ ] File picker accepts .txt and .md
- [ ] Upload progress indicator
- [ ] Success feedback
- [ ] Automatic list refresh

### View Functionality ✅
- [ ] View button clickable
- [ ] Modal opens correctly
- [ ] Title displays
- [ ] Category displays
- [ ] Date formatted
- [ ] Content displays
- [ ] Scroll works
- [ ] Close button works
- [ ] No errors in console

### Delete Functionality ✅
- [ ] Delete button clickable
- [ ] Confirmation dialog appears
- [ ] Warning message clear
- [ ] Cancel works
- [ ] Delete works
- [ ] Loading state during delete
- [ ] List refreshes after delete
- [ ] Stats update correctly

### UI/UX ✅
- [ ] Responsive layout
- [ ] Icons display correctly
- [ ] Hover states work
- [ ] Loading skeletons show
- [ ] Empty states appropriate
- [ ] Error states handled

---

## Bug Report Template

```markdown
### Bug: [Brief Description]

**Test Scenario**: [Number and Name]
**Action**: [What you did]

**Expected**:
- [What should happen]

**Actual**:
- [What actually happened]

**Screenshot**: [Attach screenshot]

**Console Errors**: [Copy any errors]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Environment**:
- Browser: [Chrome/Firefox/etc]
- Knowledge Page URL: http://localhost:5174/knowledge
- Timestamp: [When it occurred]
```
