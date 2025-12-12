# LiveKit Agent Changelog

## [Unreleased] - 2025-10-10

### Fixed
- **Vision Context Integration**: Fixed `AttributeError: 'ChatContext' object has no attribute 'messages'`
  - Changed from creating new ChatContext and copying messages to adding vision summary directly to existing context
  - Agent can now successfully reference screen share content when asked
  - Implementation follows LiveKit Agents 1.2.14 best practices from official documentation

### Changed
- **LLM Node Override**: Simplified vision context injection in `VisionAwareAgent.llm_node()`
  - Removed message copying loop that was causing AttributeError
  - Now correctly adds vision summary as system message to existing chat_ctx
  - Maintains conversation history without manual message manipulation

### Technical Details
- **File**: `livekit-agent/agent.py` lines 515-563
- **Issue**: LiveKit's ChatContext API doesn't expose a `messages` attribute for iteration
- **Solution**: Use `chat_ctx.add_message(role="system", content=vision_summary)` instead of creating new context
- **Result**: Vision context successfully injected into every LLM call, agent can see and describe screen content

### Verification
- ✅ Vision analysis runs successfully (frame processing, Gemini 2.5 Flash analysis)
- ✅ Vision context buffer stores last 3 analyses with timestamps
- ✅ Vision context injected into LLM calls without errors
- ✅ Agent can reference screen content in responses
- ✅ No more AttributeError crashes

## Previous Changes
See git history for earlier changes to the LiveKit agent implementation.
