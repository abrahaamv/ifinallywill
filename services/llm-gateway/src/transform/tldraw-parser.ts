/**
 * tldraw Canvas Agent API Parser
 * 
 * Parses the SSE stream format from tldraw agent and converts to readable format
 */

export interface TldrawAction {
  _type: 'think' | 'message' | 'create' | 'update' | 'delete' | 'move' | 
         'label' | 'setMyView' | 'add-detail' | 'review' | 'update-todo-list' |
         'bringToFront' | 'sendToBack' | 'rotate' | 'resize' | 'align' | 
         'distribute' | 'stack' | 'clear' | 'pen' | 'countryInfo' | 'count' | 'unknown';
  text?: string;
  complete?: boolean;
  time?: number;
  [key: string]: any;
}

export interface TldrawRequest {
  mode: {
    modeType: 'working' | 'planning' | 'reviewing';
    partTypes: string[];
    actionTypes: string[];
  };
  modelName: { modelName: string };
  messages: {
    agentMessages: string[];
    requestSource: string;
  };
  screenshot?: { screenshot: string };  // base64 image
  chatHistory: {
    history: Array<{
      type: 'prompt' | 'action';
      promptSource?: string;
      agentFacingMessage?: string;
      action?: TldrawAction;
    }>;
  };
  userViewportBounds: { userBounds: { x: number; y: number; w: number; h: number } };
  agentViewportBounds: { agentBounds: { x: number; y: number; w: number; h: number } };
  selectedShapes: { shapeIds: string[] };
  todoList: { items: any[] };
  time: { time: string };
}

/**
 * Parse SSE stream line into action
 */
export function parseSSELine(line: string): TldrawAction | null {
  if (!line.startsWith('data: ')) return null;
  
  const data = line.slice(6).trim();
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Collect all text content from a stream of actions
 * 
 * Note: tldraw sends incremental updates where each message contains the full text so far.
 * We should only take the LAST complete message, not concatenate all of them.
 */
export function collectTextContent(actions: TldrawAction[]): string {
  const messages = actions.filter(a => a._type === 'message' && a.text && a.complete);
  if (messages.length === 0) return '';
  
  // Return the last complete message (contains full text)
  return messages[messages.length - 1].text || '';
}

/**
 * Collect all thinking/thought process
 */
export function collectThinking(actions: TldrawAction[]): string {
  return actions
    .filter(a => a._type === 'think' && a.text)
    .map(a => a.text)
    .join('');
}

/**
 * Extract canvas operations (create, update, delete, etc.)
 */
export function extractCanvasOperations(actions: TldrawAction[]): TldrawAction[] {
  const canvasTypes = ['create', 'update', 'delete', 'move', 'label', 
                       'bringToFront', 'sendToBack', 'rotate', 'resize', 
                       'align', 'distribute', 'stack', 'clear', 'pen'];
  return actions.filter(a => canvasTypes.includes(a._type));
}

/**
 * Convert tldraw agent response to OpenAI-compatible format
 */
export function toOpenAIFormat(actions: TldrawAction[], model: string = 'tldraw-agent') {
  const text = collectTextContent(actions);
  const thinking = collectThinking(actions);
  const operations = extractCanvasOperations(actions);
  
  return {
    id: `tldraw-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: text || null,
        // Custom fields for tldraw-specific data
        _tldraw_thinking: thinking || undefined,
        _tldraw_operations: operations.length > 0 ? operations : undefined,
      },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: 0,
      completion_tokens: text.length / 4,
      total_tokens: text.length / 4,
    }
  };
}

/**
 * Convert tldraw agent stream to OpenAI SSE format
 */
export function* toOpenAIStream(actions: Iterable<TldrawAction>, model: string = 'tldraw-agent') {
  const id = `tldraw-${Date.now()}`;
  let contentBuffer = '';
  
  for (const action of actions) {
    if (action._type === 'message' && action.text) {
      const newContent = action.text.slice(contentBuffer.length);
      contentBuffer = action.text;
      
      yield {
        id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{
          index: 0,
          delta: { content: newContent },
          finish_reason: null,
        }],
      };
    }
  }
  
  // Final chunk
  yield {
    id,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: 'stop',
    }],
  };
}
