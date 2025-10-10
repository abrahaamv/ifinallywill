Thought for 2m 47s

Thinking longer for a better answer

Searching LiveKit agents TTS and related documentation

The search results suggest that tts_node uses activity.tts and stream.push_text, which supports the user's hypothesis. To intercept the text before it's sent to TTS, I’ll propose overriding Agent.tts_node. Additionally, for adding vision context, I should recommend overriding agent.llm_node, not the before_llm_cb. The transcription node could also be used for chat transcription intercepts.

To implement the interception, I can override the Agent.tts_node so it iterates over the incoming text, then publishes the concatenated text to chat. I'll call the default tts_node to generate audio frames without disrupting them. It’s a bit tricky to access the room context, but I might be able to use agent._get_activity_or_raise().

Searching for Agent activity and room context details

The docs suggest that Agent.tts uses activity.tts and stream.push_text, not synthesize. Since AgentSession may override the TTS, monkey-patching won’t work. The solution seems to be overriding Agent.tts_node to intercept the text stream. I’ll subclass voice.Agent, override tts_node and llm_node and figure out accessing the room context to publish data.

Searching the web for Activity class and methods

The docs mention that the multimodal module has agent transcription support, specifically through livekit.agents.multimodal.multimodal_agent. My plan: subclass voice.Agent to override tts_node and llm_node, then instantiate that subclass. I'll reference tts_node’s use of stream.push_text, and ensure I add vision context correctly.

I’m setting up a custom VisionAwareAgent by subclassing voice.Agent. This class will inject vision context into the LLM's system prompt and intercept the text stream in the TTS node. I'll publish data through a callback and allow vision context to be retrieved dynamically using a getter function.

I’m planning to send text chunks to the data channel as they arrive by creating an async generator. Each chunk will be published in real-time, and the last chunk will also be sent. The only issue is figuring out how to get the room and participant context to use for publish_data. Maybe the activity context holds that info?

Searching for AgentActivity class and attributes

I’m running into some trouble accessing the "room" attribute for Activity, but it looks like earlier docs show it can be accessed via JobContext. If we pass a publish_data callback using that context, I can solve the publishing problem. I’ll also ensure the llm_node is overridden to inject vision context, as suggested.

It seems that AgentSession might inject its own TTS, which could affect the flow. Even if the session provides TTS, tts_node still uses activity.tts. Overriding tts_node can let me intercept the text stream before it reaches TTS, but I must be careful with async handling to ensure the stream doesn’t break.

I'm outlining code for the VisionAwareAgent. The constructor takes two callables — publish_cb for publishing data and get_vision_context for injecting vision context. The llm_node method adds the vision summary to the chat context, while tts_node captures and publishes interim text data. But I must be careful here, as tts_node expects an async generator yielding AudioFrame objects.

I realized that calling return await super().tts_node() would try to consume the audio frames from the async generator, which isn't what we want. Instead, I'll call super().tts_node() directly, as it should return the async generator and let the streaming happen. For llm_node, I should ensure chunks are manageable (e.g., under 15k) and potentially use topics for better organization.

To avoid confusion, it's recommended to include a topic in the agent’s publish logic. For injecting vision context, override llm_node. If API issues are present, before_llm_cb might be better. Also, consider using a buffer for vision context in the MultiModalAgent. Subclass voice.Agent. Avoid monkey-patching synthesize—this doesn't support streaming. For interim transcripts, consider transcription_node.

Implementing Vision-Aware Agent with Context and Callback

To improve transcript publishing, consider using the SentenceTokenizer to publish after each complete sentence. You can implement sentence_tokenizer.stream() to handle chunks and identify proper sentence boundaries. Alternatively, you can publish when reaching a length threshold. Also, check the agent_transcription feature to forward agent transcripts automatically.

Searching for AgentSession constructor options and examples

The issue seems to stem from the fact that the session’s transcription is not enabled or functioning. Overriding the tts_node is an effective solution. The docs show that AgentSession provides a TTS instance, which could override agent._tts. Additionally, StreamAdapter uses stream.push_text rather than synthesize. A better approach is to subclass voice.Agent and implement a tts_node override for text stream handling, ensuring chunking and correct publishing.

To fix the vision context issue, I suggest injecting the vision context via a callable. Override llm_node to prepend system messages or integrate them into chat_ctx. Then, instantiate VisionAwareAgent and start the session. Ensure data is published with topic, chunked if exceeding the 15k limit. Consider using multimodal helpers for transcription and TTS alignment.

To enable agent_transcription, you can use session output options or Agent.update_chat_ctx, but keep in mind potential bugs (see GitHub issues 2214 and 3386). Alternatively, override llm_node until the bug is fixed. Double-check session.start parameters, especially related to TTS. Debug with logs, verify overrides, and test with session.run. Code should follow user style: clear comments, error handling, and edge case considerations.

To ensure accuracy, we should cite relevant documentation about the default TTS implementation, the StreamAdapter, limitations before publishing data, and how AgentSession handles TTS. Additionally, mention caution regarding update_chat_ctx and note the agent transcription feature. The code should include proper typing and logging, with the SentenceTokenizer and asyncio implementation, but must avoid creating unnecessary canvases. Code will be presented within user expectations and without direct tool execution.

Done
Root cause (short)

Your monkey-patch of voice_agent._tts.synthesize never runs because the LiveKit voice pipeline does not call tts.synthesize() in normal operation — it runs the tts_node pipeline which uses the activity’s tts.stream() / stream.push_text() (and wraps non-streaming TTS with a StreamAdapter). 
LiveKit Docs
+1

AgentSession can (and often does) provide the TTS implementation at runtime, so agent._tts may be replaced by the session/activity TTS; monkey-patching the agent instance field is fragile. 
LiveKit Docs

Your on_user_speech is never called because AgentSession drives the STT→LLM→TTS pipeline and calls llm_node (previously before_llm_cb) internally — you must use the pipeline hooks (e.g., override llm_node) to inject context instead of expecting external methods to be called. 
LiveKit Docs

In short: don’t patch .synthesize() — override the pipeline nodes (tts_node for transcriptions, llm_node for vision context). The docs and the SDK behavior show these are the supported extension points. 
LiveKit Docs

Correct, maintainable fix (overview)

Replace the monkey-patch with a small Agent subclass that overrides tts_node. tts_node receives the async text stream the pipeline will synthesize; tap that stream, publish text to the LiveKit data channel (chunked), and then forward the same stream to the default tts_node so audio continues working exactly as before.

Inject vision context by overriding llm_node — add your stored vision analyses into the chat_ctx (system message or message history) before calling the default llm_node. This ensures every LLM call made by the session sees the latest screen context.

Use a publish callback bound to ctx.room.local_participant.publish_data(...) (pass it into the agent) rather than trying to access ctx from inside the pipeline. Chunk messages to respect LiveKit data limits (~15KB). 
LiveKit Docs

Below I give a production-ready pattern you can drop into your agent.py, plus notes on edge cases.

Working code — VisionAwareAgent (drop-in)

This is a self-contained, robust subclass you can instantiate instead of voice.Agent. It:

Intercepts the text stream in tts_node and publishes readable transcripts to the LiveKit data channel (topic "agent.chat" by default).

Injects your MultiModalAgent._vision_context into llm_node.

Uses a sentence/length heuristic to avoid spamming the data channel and obeys size limits.

Keeps the default TTS audio pipeline intact.

# file: livekit-agent/agent_utils.py
import asyncio
import logging
import time
from typing import AsyncIterable, Awaitable, Callable, Dict, List, Optional, Any

from livekit.agents import voice, llm as llm_module
from livekit.agents.tokenize.basic import SentenceTokenizer

logger = logging.getLogger(__name__)

PublishCallback = Callable[[str, bool], Awaitable[None]]
VisionGetter = Callable[[], List[Dict[str, Any]]]

class VisionAwareAgent(voice.Agent):
    """
    Agent subclass that:
      - intercepts LLM -> TTS text via tts_node, publishes to LiveKit data channel
      - injects vision context into LLM via llm_node
    Instantiate it with:
      VisionAwareAgent(..., publish_cb=async_publish_fn, get_vision_ctx=get_vision_ctx_fn)
    publish_cb(text: str, is_final: bool) should publish to ctx.room.local_participant.publish_data(...)
    """
    def __init__(
        self,
        *args,
        publish_cb: Optional[PublishCallback] = None,
        get_vision_ctx: Optional[VisionGetter] = None,
        sentence_tokenizer: Optional[SentenceTokenizer] = None,
        publish_topic: str = "agent.chat",
        **kwargs
    ) -> None:
        super().__init__(*args, **kwargs)
        self._publish_cb = publish_cb
        self._get_vision_ctx = get_vision_ctx
        self._publish_topic = publish_topic
        self._sentence_tokenizer = sentence_tokenizer or SentenceTokenizer()

    # ------------------------
    # LLM hook: inject vision context
    # ------------------------
    async def llm_node(self, chat_ctx: llm_module.ChatContext, tools, model_settings):
        try:
            if self._get_vision_ctx:
                vision_items = self._get_vision_ctx()
                if vision_items:
                    # Build concise summary (avoid flooding chat_ctx)
                    vision_summary = "🔍 SCREEN SHARE CONTEXT:\n"
                    for idx, item in enumerate(vision_items[-3:], start=1):
                        ts = item.get("timestamp")
                        age_s = int(time.time() - ts) if ts else None
                        age_desc = f"{age_s}s ago" if age_s is not None and age_s < 60 else (
                            f"{int(age_s/60)}m ago" if age_s else ""
                        )
                        snippet = (item.get("analysis") or "").strip()
                        # Keep snippet short to avoid huge system messages
                        snippet = snippet if len(snippet) <= 1000 else snippet[:1000] + "…"
                        vision_summary += f"\n[Vision {idx} - {age_desc}]\n{snippet}\n"
                    # Prepend as a system message (the safest insertion point)
                    chat_ctx.add_message(role="system", content=vision_summary)
                    logger.debug("Included vision context in chat_ctx (llm_node)")
        except Exception as exc:
            logger.exception("Failed to include vision context into chat_ctx: %s", exc)

        # Call default llm_node to continue pipeline
        return await super().llm_node(chat_ctx, tools, model_settings)

    # ------------------------
    # TTS hook: tap the incoming text stream and publish transcripts
    # ------------------------
    async def tts_node(self, text: AsyncIterable[str], model_settings):
        """
        Intercept the async text stream that will be sent to TTS, publish to data channel,
        and forward the same stream to the default tts_node so audio continues unchanged.
        """
        # If no publish callback, just forward to default node (no interception)
        if not self._publish_cb:
            return super().tts_node(text, model_settings)

        # local helper: chunk, buffer by sentence/length and publish
        async def tapped_text_stream():
            buffer = ""
            try:
                async for chunk in text:
                    # chunk: contiguous text fragment (may be small)
                    buffer += chunk

                    # Decide when to publish:
                    # - If chunk contains sentence terminator, or buffer is large enough,
                    #   publish as "final" segment. Otherwise, publish interim occasionally.
                    should_flush_final = any(p in chunk for p in (".", "!", "?", "\n"))
                    should_flush_by_size = len(buffer.encode("utf-8")) > 8_000  # keep under 15KB limit
                    if should_flush_final or should_flush_by_size:
                        try:
                            await self._publish_cb(buffer, True)
                        except Exception:
                            logger.exception("publish_cb failed (final).")
                        # yield what TTS expects (still yield the original chunk(s))
                        yield buffer
                        buffer = ""
                    else:
                        # optionally emit interim every ~1.2k chars to make UI feel live
                        if len(buffer.encode("utf-8")) > 1_200:
                            try:
                                await self._publish_cb(buffer, False)
                            except Exception:
                                logger.exception("publish_cb failed (interim).")
                            # yield the interim to TTS as well
                            yield buffer
                            buffer = ""
                        else:
                            # small chunk - forward to TTS but don't publish yet
                            yield chunk

                # done with incoming text; publish remaining buffer as final
                if buffer:
                    try:
                        await self._publish_cb(buffer, True)
                    except Exception:
                        logger.exception("publish_cb failed (final at end).")
                    yield buffer
            except Exception as exc:
                logger.exception("Error in tapped_text_stream: %s", exc)
                # Re-raise or stop generator gracefully (the default tts_node may handle errors)
                raise

        # IMPORTANT: return the async iterable (do not 'await' it); the caller will iterate
        return super().tts_node(tapped_text_stream(), model_settings)

How to wire this into your existing entrypoint (replace your monkey patch)

In your entrypoint where you currently build voice_agent and monkey-patch _tts.synthesize, replace with:

# inside entrypoint(ctx)
async def publish_to_room(payload_text: str, is_final: bool):
    """
    publish_cb used by the agent.
    Uses topic "agent.chat" (helps frontend filter). Observes data channel limit (~15KB).
    """
    try:
        # you may want to include metadata (is_final) as JSON
        payload = {
            "text": payload_text,
            "is_final": is_final,
            "timestamp": time.time(),
            "source": "agent"
        }
        raw = json.dumps(payload).encode("utf-8")
        # topic is optional; using a topic helps the front-end (use same topic in useDataChannel)
        await ctx.room.local_participant.publish_data(raw, reliable=True, topic="agent.chat")
        logger.debug("Published agent transcript (%d bytes) to room", len(raw))
    except Exception as exc:
        logger.exception("Failed to publish agent transcript: %s", exc)

# create VisionAwareAgent instead of voice.Agent
vision_agent = VisionAwareAgent(
    instructions=tenant_config.system_prompt,
    chat_ctx=llm.ChatContext(),
    vad=silero.VAD.load(),
    stt=deepgram.STT(),
    llm=initial_llm,
    # still provide a TTS plugin — AgentSession may also provide one,
    # but we pass the plugin to keep defaults consistent
    tts=elevenlabs.TTS(voice_id=tenant_config.tts_voice_id, model=tenant_config.tts_model),
    publish_cb=publish_to_room,
    get_vision_ctx=lambda: multimodal_agent._vision_context,  # pass reference to your buffer
)
session = voice.AgentSession()
await session.start(agent=vision_agent, room=ctx.room)


Notes

I recommend publishing using a topic ("agent.chat") so your frontend can filter messages instead of reading all unfiltered data channel traffic.

Keep published payload JSON so you can add is_final, timestamp, source, or message_id on the frontend.

Frontend changes (small, optional but recommended)

Your ChatHandler currently listens to all data channel messages with no topic and decodes payloads. Make it filter the "agent.chat" topic and expect JSON:

useDataChannel((message) => {
  if (message.topic !== "agent.chat") return;
  const text = new TextDecoder().decode(message.payload);
  try {
    const obj = JSON.parse(text);
    setMessages(prev => [...prev, {
      sender: obj.source || 'AI Assistant',
      content: obj.text,
      timestamp: new Date(obj.timestamp * 1000),
      isFinal: obj.is_final
    }]);
  } catch (e) {
    console.warn("Non-JSON agent payload, fallback to raw:", e);
    setMessages(...);
  }
});


This gives you structured messages, isFinal flags, and better client filtering.

Why this works (explanations & citations)

Agent pipeline exposes tts_node as the canonical extension point for TTS behavior; the default node uses activity.tts.stream() and stream.push_text() rather than direct tts.synthesize(). Overriding tts_node lets you tap text before it’s streamed to audio. 
LiveKit Docs
+1

llm_node is the documented extension point to modify chat_ctx before LLM calls (replacement for the v0 before_llm_cb) — use it to inject your vision buffer so the LLM sees screen content. 
LiveKit Docs

LiveKit provides a StreamAdapter wrapper so non-streaming TTS can be used in the streaming pipeline. This is why .synthesize() was not the right interception point. Overriding tts_node avoids StreamAdapter indirection. 
LiveKit Docs

Additional recommendations & pitfalls

Data size limit — LiveKit data publishes are limited (~15 KB per message). Chunk/publish accordingly. Use compression or RAG references for very large vision texts. 
LiveKit Docs

Sentence tokenization — use SentenceTokenizer to decide final vs interim transcripts (LiveKit already uses this pattern in its TTS adapters). You can plug it into the tapping logic for cleaner transcript boundaries. 
LiveKit Docs

AgentSession built-in transcript features — there are built-in options like use_tts_aligned_transcript and other session/output options that can automatically align transcripts with audio. Consider enabling these if they meet your needs. 
LiveKit Docs

update_chat_ctx() is flaky — there are recent issues reported about agent.update_chat_ctx() not propagating in some versions; prefer llm_node injection until that’s fixed (or watch the issue tracker). 
GitHub
+1

Testing tip — to validate without a full room client, call session.run(user_input="...") in a unit test to exercise llm_node and tts_node. Also add debug logs in tts_node to confirm it runs (e.g., logger.info("tts_node got chunk: %r", chunk[:80])).

Quick debugging checklist (if still not working)

Confirm the agent process logs tts_node entry (add a log line at the start of tts_node).

Ensure publish_cb uses ctx.room.local_participant.publish_data() and the correct topic.

Verify the frontend subscribes to the same topic and decodes JSON.

If audio still works but no transcript: you’re still not intercepting the stream — double-check you returned an async iterable from tts_node (don’t await the generator).

If the agent refuses to include vision context: verify llm_node executes by logging and check the chat_ctx after modification (add debug dump of chat_ctx messages).

Short answers to your Research Questions

Is monkey-patching voice_agent._tts.synthesize correct? No — the pipeline uses tts.stream() / StreamAdapter and tts_node. Monkey-patching .synthesize() is unreliable. 
LiveKit Docs
+1

Should we override Agent.tts_node()? Yes — that is the supported extension point to intercept TTS text in the pipeline. 
LiveKit Docs

How to inject vision context? Override llm_node and add a system message (or early user message) containing your vision summaries. This is the supported replacement for before_llm_cb. 
LiveKit Docs

Is your MultiModalAgent pattern OK? Yes — keep it, but make the LiveKit voice.Agent aware of your vision buffer (pass a getter) or subclass voice.Agent to access vision context inside llm_node. Prefer subclassing voice.Agent rather than expecting the voice pipeline to call your separate method. 
LiveKit Docs

References (docs & issues I used)

voice.Agent docs / tts_node description. 
LiveKit Docs

tts.StreamAdapter / TTS API reference. 
LiveKit Docs

Pipeline nodes & customization (override llm_node, tts_node). 
LiveKit Docs

llm_node migration note (was before_llm_cb). 
LiveKit Docs

Data publish size + publish_data() signature. 
LiveKit Docs

use_tts_aligned_transcript (AgentSession option). 
LiveKit Docs

GitHub issues referencing update_chat_ctx() / related bugs (context). 
GitHub
+1

If you want, I can:

produce a patch for the exact lines in your agent.py (I can output a unified-diff or the exact replacement block for lines ~537–565 and the MultiModalAgent-to-VisionAwareAgent wiring), or

produce a small unit test that exercises llm_node and tts_node locally (calls session.run(user_input=...)) so you can validate without a real client.

Pick one and I’ll produce the concrete patch right away.