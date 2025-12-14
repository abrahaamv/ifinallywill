/**
 * useJanus Hook
 * Manages Janus AudioBridge WebRTC connection for voice communication
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { JanusClient } from '../lib/janus-client';

export interface Participant {
  id: number;
  display: string;
  talking: boolean;
}

export interface UseJanusReturn {
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  participants: Participant[];
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMute: () => void;
}

export function useJanus(displayName: string): UseJanusReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<JanusClient | null>(null);

  const connect = useCallback(async () => {
    if (clientRef.current || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      const client = new JanusClient({
        displayName,
        onConnected: () => {
          console.log('[useJanus] Connected to Janus');
          setIsConnected(true);
          setIsConnecting(false);
        },
        onDisconnected: () => {
          console.log('[useJanus] Disconnected from Janus');
          setIsConnected(false);
          setParticipants([]);
        },
        onError: (err) => {
          console.error('[useJanus] Error:', err);
          setError(err);
          setIsConnecting(false);
        },
        onParticipantJoined: (p) => {
          console.log('[useJanus] Participant joined:', p);
          setParticipants((prev) => {
            if (prev.find((x) => x.id === p.id)) return prev;
            return [...prev, { ...p, talking: false }];
          });
        },
        onParticipantLeft: (id) => {
          console.log('[useJanus] Participant left:', id);
          setParticipants((prev) => prev.filter((x) => x.id !== id));
        },
        onTalking: (id, talking) => {
          setParticipants((prev) =>
            prev.map((p) => (p.id === id ? { ...p, talking } : p))
          );
        },
      });

      clientRef.current = client;
      await client.connect();
    } catch (err) {
      console.error('[useJanus] Connection failed:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
      clientRef.current = null;
    }
  }, [displayName, isConnecting]);

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setParticipants([]);
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    clientRef.current?.mute(newMuted);
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect();
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    isMuted,
    participants,
    error,
    connect,
    disconnect,
    toggleMute,
  };
}
