/**
 * WebSocket server for Orchids protocol
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface OrchidsClientHello {
  type: 'client_hello';
  data: {
    isLocal: boolean;
    projectId: string;
    localWorkingDirectory: string;
  };
}

interface OrchidsUserRequest {
  type: 'user_request';
  data: {
    userId: string;
    projectId: string;
    agentMode: 'chat' | 'plan' | 'agent';
    message: string;
  };
  requestId: string;
}

type OrchidsMessage = OrchidsClientHello | OrchidsUserRequest;

export function createOrchidsWSHandler(ws: WebSocket, request: IncomingMessage) {
  let projectId: string | null = null;
  let userId: string | null = null;

  console.log('[WS] Client connected');

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as OrchidsMessage;

      if (message.type === 'client_hello') {
        projectId = message.data.projectId;
        console.log(`[WS] Client hello: projectId=${projectId}`);
        
        ws.send(JSON.stringify({ type: 'hello_ack' }));
        return;
      }

      if (message.type === 'user_request') {
        await handleUserRequest(ws, message as OrchidsUserRequest, projectId);
      }
    } catch (error) {
      console.error('[WS] Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    }
  });

  ws.on('close', () => {
    console.log('[WS] Client disconnected');
  });

  ws.on('error', (error: Error) => {
    console.error('[WS] WebSocket error:', error);
  });
}

async function handleUserRequest(
  ws: WebSocket,
  request: OrchidsUserRequest,
  projectId: string | null
) {
  console.log(`[WS] User request: mode=${request.data.agentMode}, requestId=${request.requestId}`);

  // Transform Orchids format to Anthropic format
  const anthropicRequest = {
    model: 'claude-opus-4-5-20251101',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: request.data.message
      }
    ],
    stream: true
  };

  try {
    // Call our internal /v1/messages endpoint
    const response = await fetch('http://localhost:8080/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'internal'
      },
      body: JSON.stringify(anthropicRequest)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    // Stream response back as agent_message events
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const eventData = line.slice(6);
          
          if (eventData === '[DONE]') continue;

          try {
            const event = JSON.parse(eventData);

            // Transform Anthropic SSE → Orchids WS event
            if (event.type === 'content_block_delta') {
              const content = event.delta?.text || '';
              if (content) {
                ws.send(JSON.stringify({
                  type: 'agent_message',
                  data: { content },
                  requestId: request.requestId
                }));
              }
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    // Send completion
    ws.send(JSON.stringify({
      type: 'agent_complete',
      requestId: request.requestId
    }));

  } catch (error) {
    console.error('[WS] Error handling request:', error);
    ws.send(JSON.stringify({
      type: 'error',
      error: {
        message: error instanceof Error ? error.message : 'Request failed'
      },
      requestId: request.requestId
    }));
  }
}
