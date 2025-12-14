/**
 * VK-Agent API Client
 * Connects to the Voice AI agent for text and visual interactions
 */

const AGENT_URL = 'https://agent.visualkit.live';

export interface AgentStatus {
  state: string;
  running: boolean;
  gemini_speaking: boolean;
  janus: {
    connected: boolean;
    ready: boolean;
  };
  gemini: {
    connected: boolean;
    ready: boolean;
  };
}

export interface AgentHealthResponse {
  status: string;
  version: string;
}

export interface TextResponse {
  success: boolean;
  response?: string;
  error?: string;
}

export interface ScreenResponse {
  success: boolean;
  response?: string;
  error?: string;
}

/**
 * Check if the agent is healthy
 */
export async function checkAgentHealth(): Promise<AgentHealthResponse> {
  const response = await fetch(`${AGENT_URL}/health`);
  if (!response.ok) {
    throw new Error(`Agent health check failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Get detailed agent status
 */
export async function getAgentStatus(): Promise<AgentStatus> {
  const response = await fetch(`${AGENT_URL}/status`);
  if (!response.ok) {
    throw new Error(`Agent status check failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Send text to the agent and get a response
 */
export async function sendText(text: string): Promise<TextResponse> {
  try {
    const response = await fetch(`${AGENT_URL}/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, response: data.response || data.message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send a screen frame to the agent for visual AI analysis
 */
export async function sendScreenFrame(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  prompt?: string
): Promise<ScreenResponse> {
  try {
    const response = await fetch(`${AGENT_URL}/screen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageBase64,
        mime_type: mimeType,
        prompt: prompt || 'What do you see on this screen?',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    return { success: true, response: data.response || data.message };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Capture a frame from a video element and convert to base64
 */
export function captureVideoFrame(video: HTMLVideoElement): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    // Convert to JPEG with 80% quality
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

    // Remove the data URL prefix to get just the base64
    return dataUrl.replace(/^data:image\/jpeg;base64,/, '');
  } catch (error) {
    console.error('Error capturing video frame:', error);
    return null;
  }
}

/**
 * Capture a frame from screen share MediaStream
 */
export async function captureScreenFrame(stream: MediaStream): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;

    video.onloadedmetadata = () => {
      video.play().then(() => {
        // Wait a frame for video to render
        requestAnimationFrame(() => {
          const frame = captureVideoFrame(video);
          video.srcObject = null;
          resolve(frame);
        });
      });
    };

    video.onerror = () => {
      resolve(null);
    };
  });
}
