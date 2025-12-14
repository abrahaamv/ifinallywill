/**
 * Janus AudioBridge WebRTC Client
 * Connects to Janus Gateway for real-time voice communication with AI agent
 */

const JANUS_URL = 'wss://janus.visualkit.live';
const ROOM_ID = 5679; // Fixed room where Jimmy (AI) lives

interface JanusMessage {
  janus: string;
  transaction?: string;
  session_id?: number;
  sender?: number;
  plugindata?: {
    plugin: string;
    data: Record<string, unknown>;
  };
  jsep?: RTCSessionDescriptionInit;
  [key: string]: unknown;
}

export interface JanusClientOptions {
  displayName: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  onParticipantJoined?: (participant: { id: number; display: string }) => void;
  onParticipantLeft?: (id: number) => void;
  onTalking?: (id: number, talking: boolean) => void;
}

export class JanusClient {
  private ws: WebSocket | null = null;
  private sessionId: number | null = null;
  private handleId: number | null = null;
  private participantId: number | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private options: JanusClientOptions;
  private transactions: Map<string, (msg: JanusMessage) => void> = new Map();
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: JanusClientOptions) {
    this.options = options;
  }

  private generateTransaction(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private send(message: Record<string, unknown>): Promise<JanusMessage> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const transaction = this.generateTransaction();
      const msg = { ...message, transaction };

      this.transactions.set(transaction, (response) => {
        this.transactions.delete(transaction);
        if (response.janus === 'error') {
          reject(new Error(JSON.stringify(response)));
        } else {
          resolve(response);
        }
      });

      this.ws.send(JSON.stringify(msg));

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.transactions.has(transaction)) {
          this.transactions.delete(transaction);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(JANUS_URL, 'janus-protocol');

        this.ws.onopen = async () => {
          console.log('[Janus] WebSocket connected');
          try {
            await this.createSession();
            await this.attachPlugin();
            await this.joinRoom();
            this.startKeepAlive();
            this.options.onConnected?.();
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          const msg: JanusMessage = JSON.parse(event.data);
          this.handleMessage(msg);
        };

        this.ws.onerror = (error) => {
          console.error('[Janus] WebSocket error:', error);
          this.options.onError?.('WebSocket connection failed');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[Janus] WebSocket closed');
          this.cleanup();
          this.options.onDisconnected?.();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(msg: JanusMessage): void {
    // Handle transaction responses
    if (msg.transaction && this.transactions.has(msg.transaction)) {
      const callback = this.transactions.get(msg.transaction);
      callback?.(msg);
      return;
    }

    // Handle events
    if (msg.janus === 'event' && msg.plugindata) {
      const data = msg.plugindata.data as Record<string, unknown>;
      const audiobridge = data.audiobridge as string;

      if (audiobridge === 'joined') {
        // We joined the room
        const participants = data.participants as Array<{ id: number; display: string }>;
        participants?.forEach((p) => {
          this.options.onParticipantJoined?.(p);
        });
      } else if (audiobridge === 'event') {
        // Participant events
        if (data.joining) {
          const joining = data.joining as { id: number; display: string };
          this.options.onParticipantJoined?.(joining);
        }
        if (data.leaving) {
          this.options.onParticipantLeft?.(data.leaving as number);
        }
      } else if (audiobridge === 'talking') {
        this.options.onTalking?.(data.id as number, true);
      } else if (audiobridge === 'stopped-talking') {
        this.options.onTalking?.(data.id as number, false);
      }

      // Handle JSEP (WebRTC offer/answer)
      if (msg.jsep) {
        this.handleJsep(msg.jsep);
      }
    }
  }

  private async createSession(): Promise<void> {
    const response = await this.send({ janus: 'create' });
    const data = response.data as { id: number } | undefined;
    this.sessionId = data?.id ?? null;
    console.log('[Janus] Session created:', this.sessionId);
  }

  private async attachPlugin(): Promise<void> {
    const response = await this.send({
      janus: 'attach',
      session_id: this.sessionId,
      plugin: 'janus.plugin.audiobridge',
    });
    const data = response.data as { id: number } | undefined;
    this.handleId = data?.id ?? null;
    console.log('[Janus] Attached to AudioBridge:', this.handleId);
  }

  private async joinRoom(): Promise<void> {
    // Get microphone access
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (error) {
      console.error('[Janus] Failed to get microphone:', error);
      throw new Error('Microphone access denied');
    }

    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Add local audio track
    this.localStream.getAudioTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });

    // Handle remote audio
    this.pc.ontrack = (event) => {
      console.log('[Janus] Received remote audio track');
      const audio = new Audio();
      audio.srcObject = event.streams[0] || null;
      audio.autoplay = true;
      audio.play().catch((e) => console.error('[Janus] Audio play error:', e));
    };

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise<void>((resolve) => {
      if (this.pc!.iceGatheringState === 'complete') {
        resolve();
      } else {
        this.pc!.onicegatheringstatechange = () => {
          if (this.pc!.iceGatheringState === 'complete') {
            resolve();
          }
        };
      }
    });

    // Send join request with offer
    const response = await this.send({
      janus: 'message',
      session_id: this.sessionId,
      handle_id: this.handleId,
      body: {
        request: 'join',
        room: ROOM_ID,
        display: this.options.displayName,
      },
      jsep: this.pc.localDescription,
    });

    // Handle answer from server
    if (response.jsep) {
      await this.handleJsep(response.jsep);
    }

    this.participantId = (response.plugindata?.data as Record<string, unknown>)?.id as number;
    console.log('[Janus] Joined room as participant:', this.participantId);
  }

  private async handleJsep(jsep: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;

    if (jsep.type === 'answer') {
      await this.pc.setRemoteDescription(new RTCSessionDescription(jsep));
      console.log('[Janus] Set remote description');
    }
  }

  private startKeepAlive(): void {
    this.keepAliveInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.sessionId) {
        this.ws.send(
          JSON.stringify({
            janus: 'keepalive',
            session_id: this.sessionId,
            transaction: this.generateTransaction(),
          })
        );
      }
    }, 25000);
  }

  mute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }

    // Also tell Janus
    if (this.ws && this.sessionId && this.handleId) {
      this.send({
        janus: 'message',
        session_id: this.sessionId,
        handle_id: this.handleId,
        body: {
          request: 'configure',
          muted: muted,
        },
      }).catch(console.error);
    }
  }

  private cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.sessionId = null;
    this.handleId = null;
    this.participantId = null;
  }

  async disconnect(): Promise<void> {
    if (this.ws && this.sessionId && this.handleId) {
      try {
        await this.send({
          janus: 'message',
          session_id: this.sessionId,
          handle_id: this.handleId,
          body: { request: 'leave' },
        });
      } catch (e) {
        // Ignore errors on disconnect
      }
    }

    this.cleanup();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.sessionId !== null;
  }
}
