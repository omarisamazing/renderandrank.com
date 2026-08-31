/**
 * voiceSession.ts — dependency-free browser voice client for the ChatWidget.
 *
 * Drives an in-browser voice conversation with Gemini Live, matching the
 * existing vanilla-JS widget conventions (no framework, no external deps):
 *
 *   1. POST /api/voice-token to mint a single-use ephemeral token + wssUrl.
 *   2. Open a WebSocket to wssUrl and send the Gemini Live `setup` message;
 *      wait for `setupComplete`.
 *   3. Capture the mic through an AudioWorklet (public/voice-capture-worklet.js),
 *      which resamples to 16 kHz PCM16; base64-encode chunks and send them as
 *      realtimeInput.audio (mimeType audio/pcm;rate=16000).
 *   4. Play back the model's 24 kHz PCM16 audio through a dedicated output
 *      AudioContext queue; flush it on barge-in (serverContent.interrupted).
 *   5. Render live transcripts via callbacks and beacon only FINALIZED turns to
 *      /api/voice-transcript (never interim).
 *
 * The class is UI-agnostic: it exposes callbacks (onState / onUserTranscript /
 * onAssistantTranscript / onError) and start()/stop(). The widget wires those
 * to addBubble(...) and the toggle indicator.
 */

// ---- Public types ---------------------------------------------------------

export type VoiceState =
  | 'idle'
  | 'requesting-token'
  | 'connecting'
  | 'live'
  | 'closing'
  | 'error';

export interface VoiceSessionCallbacks {
  /** State-machine transitions (idle → requesting-token → connecting → live → closing/error). */
  onState?: (state: VoiceState) => void;
  /** Live user transcript text. `final` marks the finalized turn. */
  onUserTranscript?: (text: string, final: boolean) => void;
  /** Live assistant transcript text. `final` marks the finalized turn. */
  onAssistantTranscript?: (text: string, final: boolean) => void;
  /** Human-readable error message (already safe to show to the user). */
  onError?: (message: string) => void;
}

// Shape returned by POST /api/voice-token.
interface VoiceTokenResponse {
  ok?: boolean;
  token?: string;
  conversationId?: string;
  expireTime?: string;
  wssUrl?: string;
  error?: string;
}

const CID_KEY = 'rr_chat_cid';

// Gemini Live setup payload (dataForAgent). AUDIO out + input/output
// transcription; the model is also pinned by the ephemeral token server-side.
const SETUP_MESSAGE = {
  setup: {
    model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
    generationConfig: { responseModalities: ['AUDIO'] },
    outputAudioTranscription: {},
    inputAudioTranscription: {},
  },
};

const MIC_SAMPLE_RATE = 16000; // matches the worklet's resample target.
const OUTPUT_SAMPLE_RATE = 24000; // Gemini Live model audio rate.

export class VoiceSession {
  private cb: VoiceSessionCallbacks;
  private state: VoiceState = 'idle';

  // Networking.
  private ws: WebSocket | null = null;
  private setupComplete = false;

  // Mic capture graph.
  private micStream: MediaStream | null = null;
  private inputCtx: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;

  // Playback graph (separate context so its rate = 24 kHz).
  private outputCtx: AudioContext | null = null;
  private playHead = 0; // next scheduled start time in outputCtx.currentTime.

  // Transcript accumulation for the in-flight turn.
  private userTurn = '';
  private assistantTurn = '';

  // TODO(session-resumption): the ephemeral token is single-use (uses: 1), so
  // this stored handle cannot be replayed with the same token today. Full
  // resumption needs a fresh token minted with this handle passed back in the
  // setup message (sessionResumption.handle). Stored here for that future work.
  private resumptionHandle: string | null = null;

  constructor(callbacks: VoiceSessionCallbacks = {}) {
    this.cb = callbacks;
  }

  getState(): VoiceState {
    return this.state;
  }

  private setState(next: VoiceState) {
    this.state = next;
    this.cb.onState?.(next);
  }

  private fail(message: string) {
    this.cb.onError?.(message);
    this.setState('error');
    this.teardown();
  }

  // ---- Lifecycle ----------------------------------------------------------

  /** Begin a voice session: token → WebSocket → mic. Safe to call once. */
  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'error') return;
    this.setupComplete = false;
    this.userTurn = '';
    this.assistantTurn = '';

    // 1) Acquire the mic first so a permission denial fails fast and cheaply.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      this.fail('Microphone access was blocked. Enable it in your browser to talk.');
      return;
    }
    this.micStream = stream;

    // 2) Mint the ephemeral token.
    this.setState('requesting-token');
    let tokenData: VoiceTokenResponse;
    try {
      tokenData = await this.requestToken();
    } catch {
      this.fail('Could not start the voice session. Please try again in a moment.');
      return;
    }
    if (!tokenData.wssUrl) {
      this.fail('The voice service is unavailable right now. Please try again later.');
      return;
    }

    // Persist a freshly-minted conversation id so text + voice thread together.
    if (tokenData.conversationId) {
      try {
        if (!sessionStorage.getItem(CID_KEY)) {
          sessionStorage.setItem(CID_KEY, tokenData.conversationId);
        }
      } catch {
        /* sessionStorage may be unavailable; threading still works in-memory. */
      }
    }

    // 3) Open the WebSocket.
    this.setState('connecting');
    try {
      await this.openSocket(tokenData.wssUrl);
    } catch {
      this.fail('Lost connection to the voice service. Please try again.');
      return;
    }

    // 4) Start streaming the mic once setup completes.
    try {
      await this.startMicCapture();
    } catch {
      this.fail('Could not access the microphone stream. Please try again.');
      return;
    }

    this.setState('live');
  }

  /** Tear everything down cleanly: mic, worklet, sockets, audio contexts. */
  stop(): void {
    if (this.state === 'idle') return;
    if (this.state !== 'error') this.setState('closing');
    this.teardown();
    this.setState('idle');
  }

  // ---- Step 1: token ------------------------------------------------------

  private async requestToken(): Promise<VoiceTokenResponse> {
    // Include conversationId only when we already have one (spec: omit if absent).
    const body: Record<string, string> = {};
    let cid: string | null = null;
    try {
      cid = sessionStorage.getItem(CID_KEY);
    } catch {
      cid = null;
    }
    if (cid) body.conversationId = cid;

    const res = await fetch('/api/voice-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('token request failed: ' + res.status);
    return (await res.json()) as VoiceTokenResponse;
  }

  // ---- Step 2: WebSocket + setup handshake --------------------------------

  private openSocket(wssUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let opened = false;
      const ws = new WebSocket(wssUrl);
      ws.binaryType = 'arraybuffer';
      this.ws = ws;

      ws.onopen = () => {
        opened = true;
        // The very first frame must be the setup message.
        ws.send(JSON.stringify(SETUP_MESSAGE));
        // Resolve on open; setupComplete is awaited passively in onmessage.
        resolve();
      };

      ws.onmessage = (event) => {
        this.handleServerMessage(event.data);
      };

      ws.onerror = () => {
        if (!opened) reject(new Error('socket error before open'));
        else this.cb.onError?.('The voice connection hit an error.');
      };

      ws.onclose = () => {
        // A close after we're live means the turn/session ended.
        if (this.state === 'live' || this.state === 'connecting') {
          this.setState('closing');
        }
      };
    });
  }

  /** Parse a server frame (Gemini Live sends JSON, possibly as a Blob/AB). */
  private async handleServerMessage(data: unknown): Promise<void> {
    let text: string;
    if (typeof data === 'string') {
      text = data;
    } else if (data instanceof ArrayBuffer) {
      text = new TextDecoder().decode(data);
    } else if (typeof Blob !== 'undefined' && data instanceof Blob) {
      text = await data.text();
    } else {
      return;
    }

    let msg: any;
    try {
      msg = JSON.parse(text);
    } catch {
      return; // ignore non-JSON frames
    }

    // Setup handshake.
    if (msg.setupComplete !== undefined) {
      this.setupComplete = true;
      return;
    }

    // Lifecycle: server is about to close the session soon.
    if (msg.goAway !== undefined) {
      this.setState('closing');
      return;
    }

    // Session resumption handle (stored for future full-resumption; see TODO).
    if (msg.sessionResumptionUpdate?.newHandle) {
      this.resumptionHandle = msg.sessionResumptionUpdate.newHandle;
      return;
    }

    if (msg.serverContent) {
      this.handleServerContent(msg.serverContent);
    }
  }

  private handleServerContent(sc: any): void {
    // Barge-in: user interrupted → drop any queued/playing model audio.
    if (sc.interrupted === true) {
      this.flush();
    }

    // Model audio chunks arrive as inlineData parts (audio/pcm;rate=24000).
    const parts = sc.modelTurn?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const inline = part?.inlineData;
        if (inline?.data && typeof inline.mimeType === 'string' && inline.mimeType.startsWith('audio/pcm')) {
          this.enqueuePlayback(inline.data);
        }
      }
    }

    // Interim transcripts: render live, never beacon.
    if (sc.inputTranscription?.text) {
      this.userTurn += sc.inputTranscription.text;
      this.cb.onUserTranscript?.(this.userTurn, false);
    }
    if (sc.outputTranscription?.text) {
      this.assistantTurn += sc.outputTranscription.text;
      this.cb.onAssistantTranscript?.(this.assistantTurn, false);
    }

    // Turn finished: finalize + beacon both channels, then reset accumulators.
    if (sc.turnComplete === true) {
      this.finalizeTurn();
    }
  }

  /** Finalize the current turn: emit final callbacks and beacon persisted turns. */
  private finalizeTurn(): void {
    if (this.userTurn.trim()) {
      const text = this.userTurn.trim();
      this.cb.onUserTranscript?.(text, true);
      this.beaconTranscript('user', text);
    }
    if (this.assistantTurn.trim()) {
      const text = this.assistantTurn.trim();
      this.cb.onAssistantTranscript?.(text, true);
      this.beaconTranscript('assistant', text);
    }
    this.userTurn = '';
    this.assistantTurn = '';
  }

  /** POST a finalized transcript turn. Best-effort; failures are non-fatal. */
  private beaconTranscript(role: 'user' | 'assistant', text: string): void {
    let conversationId: string | null = null;
    try {
      conversationId = sessionStorage.getItem(CID_KEY);
    } catch {
      conversationId = null;
    }
    if (!conversationId) return; // nothing to thread against

    const payload = JSON.stringify({ conversationId, channel: 'voice', role, text, final: true });
    // Prefer sendBeacon so an in-flight turn survives a page unload.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/voice-transcript', new Blob([payload], { type: 'application/json' }));
        return;
      }
    } catch {
      /* fall through to fetch */
    }
    fetch('/api/voice-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* best-effort */
    });
  }

  // ---- Step 3: mic capture ------------------------------------------------

  private async startMicCapture(): Promise<void> {
    if (!this.micStream) throw new Error('no mic stream');

    // Input context runs at the mic's native rate; the worklet resamples to 16k.
    const AC: typeof AudioContext =
      (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    this.inputCtx = new AC();
    await this.inputCtx.audioWorklet.addModule('/voice-capture-worklet.js');

    this.micSource = this.inputCtx.createMediaStreamSource(this.micStream);
    this.worklet = new AudioWorkletNode(this.inputCtx, 'voice-capture-processor');

    // The worklet posts raw 16 kHz PCM16 ArrayBuffers; base64-encode and send.
    this.worklet.port.onmessage = (event) => {
      const data = event.data;
      if (!data || data.type !== 'audio') return;
      this.sendAudioChunk(data.buffer as ArrayBuffer);
    };

    // Connect mic → worklet. No connection to destination (we don't monitor
    // the raw mic), but keep the graph alive.
    this.micSource.connect(this.worklet);
  }

  private sendAudioChunk(buffer: ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupComplete) return;
    const base64 = bytesToBase64(new Uint8Array(buffer));
    // Current Live API expects a single `audio` blob under realtimeInput.
    const frame = {
      realtimeInput: {
        audio: { data: base64, mimeType: 'audio/pcm;rate=' + MIC_SAMPLE_RATE },
      },
    };
    this.ws.send(JSON.stringify(frame));
  }

  // ---- Step 4: playback ---------------------------------------------------

  private ensureOutputCtx(): AudioContext {
    if (!this.outputCtx) {
      const AC: typeof AudioContext =
        (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      // Fix the context to 24 kHz so scheduled buffers play at the right pitch.
      this.outputCtx = new AC({ sampleRate: OUTPUT_SAMPLE_RATE });
      this.playHead = this.outputCtx.currentTime;
    }
    return this.outputCtx;
  }

  /** Decode a base64 24 kHz PCM16 chunk and schedule it after the queue tail. */
  private enqueuePlayback(base64: string): void {
    const ctx = this.ensureOutputCtx();
    const bytes = base64ToBytes(base64);

    // Interpret bytes as signed 16-bit LE PCM → Float32 in [-1, 1].
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    if (sampleCount === 0) return;

    const audioBuffer = ctx.createBuffer(1, sampleCount, OUTPUT_SAMPLE_RATE);
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      const int16 = view.getInt16(i * 2, true /* little-endian */);
      channel[i] = int16 / 0x8000; // normalize to [-1, 1)
    }

    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(ctx.destination);

    // Schedule sequentially: never earlier than "now" (avoid overlap after gaps).
    const startAt = Math.max(this.playHead, ctx.currentTime);
    src.start(startAt);
    this.playHead = startAt + audioBuffer.duration;
  }

  /** Barge-in: stop and discard all queued/playing model audio immediately. */
  flush(): void {
    if (!this.outputCtx) return;
    // Closing and recreating the context is the simplest reliable way to drop
    // every already-scheduled BufferSource without tracking each node.
    const ctx = this.outputCtx;
    this.outputCtx = null;
    this.playHead = 0;
    ctx.close().catch(() => {
      /* ignore */
    });
  }

  // ---- Teardown -----------------------------------------------------------

  private teardown(): void {
    // Tell the worklet to stop, then dismantle the mic graph.
    try {
      this.worklet?.port.postMessage({ type: 'stop' });
    } catch {
      /* ignore */
    }
    try {
      this.worklet?.disconnect();
    } catch {
      /* ignore */
    }
    this.worklet = null;

    try {
      this.micSource?.disconnect();
    } catch {
      /* ignore */
    }
    this.micSource = null;

    if (this.micStream) {
      for (const track of this.micStream.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
      this.micStream = null;
    }

    if (this.inputCtx) {
      this.inputCtx.close().catch(() => {
        /* ignore */
      });
      this.inputCtx = null;
    }

    this.flush(); // closes the output context.

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch {
        /* ignore */
      }
      this.ws = null;
    }

    this.setupComplete = false;
  }
}

// ---- base64 helpers (dependency-free, binary-safe) ------------------------

/** Encode raw bytes to base64 without spreading huge arrays onto the stack. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000; // 32 KB chunks keep String.fromCharCode safe.
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

/** Decode base64 to raw bytes. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
