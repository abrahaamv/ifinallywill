/**
 * WebSocket passthrough to real Orchids server
 * Routes Orchids CLI → Our Proxy → Real Orchids Server
 */

import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';

const REAL_ORCHIDS_URL = 'wss://orchids-server.calmstone-6964e08a.westeurope.azurecontainerapps.io/agent/ws';

export function createOrchidsPassthrough(clientWs: WebSocket, request: IncomingMessage) {
  console.log('[Passthrough] Client connected, establishing connection to real Orchids server...');

  // TODO: Extract token from Orchids config or environment
  const authToken = process.env.ORCHIDS_AUTH_TOKEN || '';
  const apiVersion = '1.0';
  
  const serverUrl = authToken 
    ? `${REAL_ORCHIDS_URL}?token=${encodeURIComponent(authToken)}&orchids_api_version=${apiVersion}`
    : REAL_ORCHIDS_URL;

  const serverWs = new WebSocket(serverUrl);

  // Forward messages: Client → Server
  clientWs.on('message', (data: Buffer) => {
    if (serverWs.readyState === WebSocket.OPEN) {
      console.log('[Passthrough] Client → Server:', data.toString().substring(0, 100));
      serverWs.send(data);
    }
  });

  // Forward messages: Server → Client
  serverWs.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      console.log('[Passthrough] Server → Client:', data.toString().substring(0, 100));
      clientWs.send(data);
    }
  });

  // Handle server connection
  serverWs.on('open', () => {
    console.log('[Passthrough] Connected to real Orchids server');
  });

  serverWs.on('error', (error: Error) => {
    console.error('[Passthrough] Server error:', error.message);
    clientWs.send(JSON.stringify({
      type: 'error',
      error: { message: `Orchids server error: ${error.message}` }
    }));
  });

  serverWs.on('close', () => {
    console.log('[Passthrough] Server connection closed');
    clientWs.close();
  });

  // Handle client disconnection
  clientWs.on('close', () => {
    console.log('[Passthrough] Client disconnected');
    serverWs.close();
  });

  clientWs.on('error', (error: Error) => {
    console.error('[Passthrough] Client error:', error.message);
    serverWs.close();
  });
}
