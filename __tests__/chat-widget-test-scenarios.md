# ChatWidget Test Scenarios

Comprehensive test cases for validating Phase 12 ChatWidget implementation.

---

## Test Scenario 1: Simple Greeting (Fast Tier)

### Question
```
Hi, how are you today?
```

### Expected Behavior
- **Response Time**: 800-1500ms
- **Model**: Gemini Flash-Lite 8B (60% of queries)
- **Complexity Level**: simple
- **RAG Chunks**: 0 (greeting doesn't trigger knowledge retrieval)

### Expected Metadata

#### Model & Routing
```
Model: gemini-2.0-flash-lite-exp-8b
Tier: fast
Provider: google
Reasoning: Selected gemini-2.0-flash-lite-exp-8b based on complexity score simple
Attempt: 1
Escalated: No
Fallbacks available: 2
```

#### Analysis
```
Complexity: simple
Score: 15-25%
Factors:
  - entities=0
  - depth=1
  - technical=0
  - specificity=2-3
  - ambiguity=1-2

Confidence: 85-95%
Indicators:
  - uncertainty=0.05-0.15
  - specificity=0.8-0.9
  - consistency=0.9
  - factuality=0.85
Low confidence: No
```

#### RAG Retrieval
```
Chunks: 0
Method: hybrid
Relevance: none
Reranking: Yes
Latency: ~50-100ms (minimal due to no retrieval)
```

#### RAGAS Quality Metrics
```
Overall: 15-30% (Expected - no factual content)
Faithfulness: 70-80%
Answer Relevancy: 20-40% (greeting response)
Context Relevancy: 10-20% (no context)
Context Precision: 10-20%
Context Recall: 10-20%
```

#### Cost Breakdown
```
Total: $0.00001 - $0.00002
Input: 50-100 tokens
Output: 20-50 tokens
Cache Read: 0
Cache Write: 0
Reranking: $0.00
```

#### Performance
```
Total: 800-1500ms
RAG: 50-100ms
Model: 400-800ms
Reranking: 0ms
```

---

## Test Scenario 2: Technical Question (Balanced Tier)

### Question
```
What are the main differences between REST and GraphQL APIs?
```

### Expected Behavior
- **Response Time**: 1200-2000ms
- **Model**: Gemini Flash (25% of queries) or Claude Sonnet 4.5 (15%)
- **Complexity Level**: moderate
- **RAG Chunks**: 0-2 (may retrieve if API docs exist)

### Expected Metadata

#### Model & Routing
```
Model: gemini-2.5-flash-preview-04 or claude-sonnet-4.5
Tier: balanced or powerful
Provider: google or anthropic
Reasoning: Selected [model] based on complexity score moderate
Attempt: 1 or 2
Escalated: Possibly (if Flash fails)
Fallbacks available: 1-2
```

#### Analysis
```
Complexity: moderate
Score: 45-65%
Factors:
  - entities=2-3 (REST, GraphQL, API)
  - depth=3-4
  - technical=2-3 (API terms)
  - specificity=5-7
  - ambiguity=2-3

Confidence: 75-85%
Indicators:
  - uncertainty=0.15-0.25
  - specificity=0.75-0.85
  - consistency=0.85-0.90
  - factuality=0.80-0.85
Low confidence: No
```

#### RAG Retrieval
```
Chunks: 0-3
Method: hybrid
Relevance: medium (if docs exist)
Reranking: Yes
Latency: 200-400ms
```

#### RAGAS Quality Metrics
```
Overall: 70-85%
Faithfulness: 80-90%
Answer Relevancy: 85-95%
Context Relevancy: 60-75% (if RAG used)
Context Precision: 65-80%
Context Recall: 70-85%
```

#### Cost Breakdown
```
Total: $0.00003 - $0.0002 (depends on model)
Input: 100-200 tokens
Output: 200-400 tokens
```

#### Performance
```
Total: 1200-2000ms
RAG: 200-400ms
Model: 800-1400ms
```

---

## Test Scenario 3: Knowledge-Based Question (RAG Heavy)

### Question
```
What are the API rate limits mentioned in our documentation?
```

### Expected Behavior
- **Response Time**: 1500-2500ms
- **Model**: Varies based on complexity
- **Complexity Level**: moderate to complex
- **RAG Chunks**: 3-5 (should retrieve from api-documentation.md)

### Expected Metadata

#### Model & Routing
```
Model: [Varies]
Tier: balanced or powerful
Provider: google or anthropic
Reasoning: Selected [model] based on complexity score moderate/complex
```

#### Analysis
```
Complexity: moderate or complex
Score: 50-75%
Factors:
  - entities=3-5 (API, rate limits, documentation)
  - depth=4-5
  - technical=3-4
  - specificity=6-8
  - ambiguity=2-4
```

#### RAG Retrieval (CRITICAL)
```
Chunks: 3-5
Method: hybrid
Relevance: high
Reranking: Yes
Latency: 500-1000ms

View Retrieved Chunks:
  Chunk 1:
    Score: 0.85-0.95
    Source: api-documentation.md
    Content: [Rate limit information]

  Chunk 2:
    Score: 0.75-0.85
    Source: api-documentation.md
    Content: [Additional API details]
```

#### RAGAS Quality Metrics (HIGH)
```
Overall: 80-90%
Faithfulness: 85-95% (grounded in docs)
Answer Relevancy: 90-95%
Context Relevancy: 85-95% (highly relevant chunks)
Context Precision: 80-90%
Context Recall: 85-95%
```

#### Prompt Engineering
```
Query Type: factual-lookup
Grounding Applied: Yes
Citations Required: No
Uncertainty Guidance: Yes
System Prompt: [First 500 chars of RAG-enhanced prompt]
```

#### Performance
```
Total: 1500-2500ms
RAG: 500-1000ms (higher due to retrieval)
Model: 800-1400ms
```

---

## Test Scenario 4: Complex Multi-Step Reasoning

### Question
```
How would you design a scalable microservices architecture for an e-commerce platform that needs to handle 100,000 concurrent users with real-time inventory updates?
```

### Expected Behavior
- **Response Time**: 2000-3500ms
- **Model**: Claude Sonnet 4.5 (powerful tier)
- **Complexity Level**: complex
- **RAG Chunks**: 0-3 (may retrieve architecture docs if available)

### Expected Metadata

#### Model & Routing
```
Model: claude-sonnet-4.5
Tier: powerful
Provider: anthropic
Reasoning: Selected claude-sonnet-4.5 based on complexity score complex
Attempt: 1-3 (may escalate from Flash)
Escalated: Possibly Yes
Fallbacks available: 0-1
```

#### Analysis
```
Complexity: complex
Score: 75-90%
Factors:
  - entities=8-12 (microservices, e-commerce, users, inventory, etc.)
  - depth=7-9
  - technical=6-8
  - specificity=8-10
  - ambiguity=3-5

Confidence: 80-90%
Indicators:
  - uncertainty=0.10-0.20
  - specificity=0.85-0.95
  - consistency=0.85-0.90
  - factuality=0.80-0.90
```

#### Cost Breakdown
```
Total: $0.0002 - $0.0005 (Claude Sonnet pricing)
Input: 150-250 tokens
Output: 400-800 tokens
```

#### Performance
```
Total: 2000-3500ms
RAG: 300-600ms
Model: 1500-2500ms (complex reasoning)
```

---

## Test Scenario 5: Ambiguous Question (Confidence Check)

### Question
```
What do you think about it?
```

### Expected Behavior
- **Response**: Request clarification
- **Confidence**: Low (30-50%)
- **Requires Escalation**: Possibly Yes

### Expected Metadata

#### Analysis
```
Complexity: simple (but ambiguous)
Score: 20-35%

Confidence: 30-50% (LOW)
Indicators:
  - uncertainty=0.50-0.70 (high)
  - specificity=0.30-0.50 (low)
  - consistency=0.40-0.60
  - factuality=0.30-0.50
Low confidence: Yes ⚠️
```

---

## Test Scenario 6: Follow-Up Question (Context Check)

### Question 1
```
What is React?
```

### Question 2 (Follow-up)
```
How does its virtual DOM work?
```

### Expected Behavior
- Question 2 should understand "its" refers to React
- Conversation history should show 2+ messages in complexity analysis

### Expected Metadata (Question 2)

#### Complexity Analysis
```
conversationHistory: [
  { role: 'user', content: 'What is React?' },
  { role: 'assistant', content: '...' },
  { role: 'user', content: 'How does its virtual DOM work?' }
]
```

---

## Test Scenario 7: Performance Regression Check

### Multiple Rapid-Fire Questions
```
1. "Hi"
2. "What is TypeScript?"
3. "Explain SOLID principles"
4. "What are our API endpoints?" (RAG)
5. "How do I troubleshoot errors?" (RAG)
```

### Expected Behavior
- Each response within timing benchmarks
- No memory leaks
- Developer Info panel expands for each
- All performance metrics positive (NO NEGATIVES!)

---

## Validation Checklist

For each test scenario, verify:

### UI/UX
- [ ] Message displays immediately after send
- [ ] Loading indicator shows during AI processing
- [ ] Response streams smoothly
- [ ] "Developer Info" button appears under AI response
- [ ] Panel expands/collapses properly
- [ ] All sections render without errors

### Metadata Accuracy
- [ ] Model name matches tier expectation
- [ ] Complexity score reasonable for question
- [ ] Confidence indicators make sense
- [ ] RAG chunks retrieved when expected
- [ ] RAGAS scores in expected range
- [ ] Cost calculation accurate
- [ ] **All timing values POSITIVE** (critical!)

### Performance
- [ ] Response time within benchmark
- [ ] Total = RAG + Model + overhead
- [ ] No timing values are negative
- [ ] UI remains responsive

### Error Handling
- [ ] No console errors
- [ ] Graceful fallback if API fails
- [ ] Proper error messages to user

---

## Bug Report Template

If you encounter issues, use this template:

```markdown
### Bug: [Brief Description]

**Test Scenario**: [Number and Name]
**Question**: [What you asked]

**Expected**:
- [What should happen]

**Actual**:
- [What actually happened]

**Screenshot**: [Attach screenshot of Developer Info panel]

**Console Errors**: [Copy any errors]

**Metadata Dump**:
```json
[Copy metadata from Developer Info]
```

**Environment**:
- Browser: [Chrome/Firefox/etc]
- Dashboard URL: http://localhost:5174
- Timestamp: [When it occurred]
```
