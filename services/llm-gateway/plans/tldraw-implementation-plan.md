# TLDraw Provider Implementation Plan

## Overview
Replace the current tldraw-handler.ts implementation with the proven payload structure from test-tldraw-final.sh that successfully makes the LLM comply with tool call format.

## Current State Analysis

### Issues Found
1. **Duplicate System Prompts**: The code has TWO competing prompts:
   - FSOCIETY AGENT v3.3 (lines 139-478) ✅ Proven to work
   - Old KERNEL.md v2.0 (lines 481-631) ❌ Gets used instead, overwriting v3.3

2. **Incomplete Payload**: Current payload (lines 643-687) is minimal:
   - Only includes: mode, modelName, messages, chatHistory, time
   - Missing: screenshot, viewportBounds, shapes, contextItems, etc.

3. **Logic Flow Problem**: Line 491 overwrites the good v3.3 prompt with old v2.0

### Working Test Script Structure
From test-tldraw-final.sh (lines 375-427):
```python
payload = {
    "mode": {
        "type": "mode",
        "modeType": "working",
        "partTypes": [16 fields],
        "actionTypes": [23 types]
    },
    "debug": {"type": "debug", "logSystemPrompt": False, "logMessages": False},
    "modelName": {"type": "modelName", "modelName": "claude-sonnet-4-5"},
    "messages": {"type": "messages", "agentMessages": [full_message], "requestSource": "user"},
    "data": {"type": "data", "data": []},
    "contextItems": {"type": "contextItems", "items": [], "requestSource": "user"},
    "screenshot": {"type": "screenshot", "screenshot": "data:image/jpeg;base64,..."},
    "userViewportBounds": {"type": "userViewportBounds", "userBounds": {"x": 0, "y": 0, "w": 77, "h": 69}},
    "agentViewportBounds": {"type": "agentViewportBounds", "agentBounds": {"x": 0, "y": 0, "w": 77, "h": 69}},
    "blurryShapes": {"type": "blurryShapes", "shapes": [...]},
    "peripheralShapes": {"type": "peripheralShapes", "clusters": []},
    "selectedShapes": {"type": "selectedShapes", "shapeIds": ["subtitle-1"]},
    "chatHistory": {"type": "chatHistory", "history": [...]},
    "userActionHistory": {"type": "userActionHistory", "added": [], "removed": [], "updated": []},
    "todoList": {"type": "todoList", "items": []},
    "canvasLints": {"type": "canvasLints", "lints": []},
    "time": {"type": "time", "time": datetime.now().strftime("%I:%M:%S %p")}
}
```

## Implementation Steps

### Step 1: Remove Old Code (Lines 480-640)
Delete the entire old KERNEL.md v2.0 logic block:
- Lines 480-631: Old instruction building
- Lines 634-640: Old prompt concatenation logic
- Keep ONLY the FSOCIETY AGENT v3.3 prompt (lines 139-478)

### Step 2: Implement Complete Payload Structure (Lines 643-687)
Replace minimal payload with full structure:

```typescript
return {
  mode: {
    type: "mode",
    modeType: "working",
    partTypes: [
      "mode", "debug", "modelName", "messages", "data", "contextItems",
      "screenshot", "userViewportBounds", "agentViewportBounds", "blurryShapes",
      "peripheralShapes", "selectedShapes", "chatHistory", "userActionHistory",
      "todoList", "canvasLints", "time"
    ],
    actionTypes: [
      "message", "think", "review", "add-detail", "update-todo-list", "setMyView",
      "create", "delete", "update", "label", "move", "place", "bringToFront",
      "sendToBack", "rotate", "resize", "align", "distribute", "stack", "clear",
      "pen", "countryInfo", "count", "unknown"
    ]
  },
  debug: { type: "debug", logSystemPrompt: false, logMessages: false },
  modelName: { type: "modelName", modelName: mapModel(request.model) },
  messages: { 
    type: "messages", 
    agentMessages: [fullMessage], 
    requestSource: "user" 
  },
  data: { type: "data", data: [] },
  contextItems: { type: "contextItems", items: [], requestSource: "user" },
  screenshot: {
    type: "screenshot",
    screenshot: BASE64_PLACEHOLDER_IMAGE
  },
  userViewportBounds: { 
    type: "userViewportBounds", 
    userBounds: { x: 0, y: 0, w: 77, h: 69 } 
  },
  agentViewportBounds: { 
    type: "agentViewportBounds", 
    agentBounds: { x: 0, y: 0, w: 77, h: 69 } 
  },
  blurryShapes: {
    type: "blurryShapes",
    shapes: [{
      x: 30, y: 22, w: 16, h: 24,
      type: "text",
      shapeId: "subtitle-1",
      text: ""
    }]
  },
  peripheralShapes: { type: "peripheralShapes", clusters: [] },
  selectedShapes: { type: "selectedShapes", shapeIds: ["subtitle-1"] },
  chatHistory: {
    type: "chatHistory",
    history: [{
      type: "prompt",
      promptSource: "user",
      agentFacingMessage: fullMessage,
      userFacingMessage: null,
      contextItems: [],
      selectedShapes: [{
        _type: "text",
        anchor: "top-center",
        color: "grey",
        fontSize: 18,
        maxWidth: null,
        note: "",
        shapeId: "subtitle-1",
        text: "",
        x: 433,
        y: 90
      }]
    }]
  },
  userActionHistory: { 
    type: "userActionHistory", 
    added: [], 
    removed: [], 
    updated: [] 
  },
  todoList: { type: "todoList", items: [] },
  canvasLints: { type: "canvasLints", lints: [] },
  time: { 
    type: "time", 
    time: new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    }) 
  }
};
```

### Step 3: Define Placeholder Image
Add at the top of the file:
```typescript
const BASE64_PLACEHOLDER_IMAGE = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCABEAEwDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAEE/8QAJhEBAAEBBgcBAQEAAAAAAAAAAAHwESExYYHBQVFxkaGx0fHhAv/aAAwDAQACEQMRAD8AvQaGcPfGtQAANK/axsBW/irwAKquIFeanqAABh6roAAACW7a9L/GMWcbgUACuvfSzC8ACf5363AW632XV32AmvYAAGOVZbTqAAACTZxi3SZ2BQOc1ZH7IAAFYAAYfoGIAAAAE7x/PNgAH7XiwACq96gAAl/OO0/bugKAAABIAAHPYCs9fn24AAAAAAFfQATb1tfGeGYLXL2AB10AqyuW4FldvN1wAAAAAAJM5xHXHHHGLgXCsMgAASL+8x2mzYFABJ4ZztM7AoAJP+YnGPY//9k=";
```

### Step 4: Update TypeScript Types
Add interface for complete payload structure:
```typescript
interface TldrawPayload {
  mode: {
    type: string;
    modeType: string;
    partTypes: string[];
    actionTypes: string[];
  };
  debug: { type: string; logSystemPrompt: boolean; logMessages: boolean };
  modelName: { type: string; modelName: string };
  messages: { type: string; agentMessages: string[]; requestSource: string };
  data: { type: string; data: any[] };
  contextItems: { type: string; items: any[]; requestSource: string };
  screenshot: { type: string; screenshot: string };
  userViewportBounds: { type: string; userBounds: { x: number; y: number; w: number; h: number } };
  agentViewportBounds: { type: string; agentBounds: { x: number; y: number; w: number; h: number } };
  blurryShapes: { type: string; shapes: any[] };
  peripheralShapes: { type: string; clusters: any[] };
  selectedShapes: { type: string; shapeIds: string[] };
  chatHistory: { type: string; history: any[] };
  userActionHistory: { type: string; added: any[]; removed: any[]; updated: any[] };
  todoList: { type: string; items: any[] };
  canvasLints: { type: string; lints: any[] };
  time: { type: string; time: string };
}
```

## Testing Plan

1. **Unit Test**: Compare generated payload with test-tldraw-final.sh payload
2. **Integration Test**: Send actual requests to tldraw API
3. **Verify Tool Calls**: Ensure LLM returns proper tool call format
4. **Regression Test**: Test various prompts that worked with test script

## Expected Outcomes

✅ LLM will consistently emit tool calls in correct format
✅ Payload matches proven working structure from test-tldraw-final.sh
✅ No simulation or meta-commentary from LLM
✅ Direct, action-oriented responses

## Files to Modify

1. `src/routes/tldraw-handler.ts`
   - Delete lines 480-640 (old KERNEL.md v2.0 logic)
   - Replace payload structure at lines 643-687
   - Add BASE64_PLACEHOLDER_IMAGE constant
   - Add TldrawPayload interface

## Risk Mitigation

- Keep backup of original file
- Test with simple prompts first
- Gradual rollout if serving production traffic
- Monitor response quality and tool call compliance

## Success Criteria

1. ✅ Code compiles without errors
2. ✅ Payload structure matches test-tldraw-final.sh exactly
3. ✅ LLM responds with tool calls for file operations
4. ✅ No regression in existing functionality
5. ✅ Cleaner, more maintainable code
