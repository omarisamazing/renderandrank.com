/**
 * voiceSession.ts — dependency-free browser voice client for the ChatWidget.
 *
 * Drives an in-browser voice conversation with Gemini Live, matching the
 * existing vanilla-JS widget conventions (no framework, no external deps):
 *
 *   1. POST /api/voice-token to mint a single-use ephemeral token + wssUrl.
 *      On failure the server's response body (including any upstream Google
 *      error) is read and logged rather than swallowed behind the status code.
 *   2. Open a WebSocket to wssUrl and send the Gemini Live `setup` message;
 *      wait for `setupComplete`. WebSocket close code + reason and error
 *      events are logged so the exact failure (bad token vs. bad model) shows.
 *   3. Capture the mic through an AudioWorklet (public/voice-capture-worklet.js),
 *      which resamples to 16 kHz PCM16; base64-encode chunks and send them as
 *      realtimeInput.audio (mimeType audio/pcm;rate=16000).
 *   4. Play back the model's 24 kHz PCM16 audio through a dedicated output
 *      AudioContext queue; flush it on barge-in (serverContent.interrupted).
 *   5. Render live transcripts via callbacks and beacon only FINALIZED turns to
 *      /api/voice-transcript (never interim). Turns are finalized immediately on
 *      turnComplete so the assistant responds without waiting on a silence
 *      grace window.
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
  /** Upstream Google error body echoed by the server on failure. */
  detail?: string;
  /** Upstream Google HTTP status echoed by the server on failure. */
  upstreamStatus?: number;
  /** User-facing message returned by the server (e.g. on a 429 rate limit). */
  message?: string;
}

const CID_KEY = 'rr_chat_cid';

// Gemini Live setup payload (dataForAgent). AUDIO out + input/output
// transcription; the model is also pinned by the ephemeral token server-side.
const SETUP_MESSAGE = {
  setup: {
    model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
    generationConfig: { responseModalities: ['AUDIO'] },
    // NOTE: systemInstruction is intentionally NOT sent from the client. The
    // ephemeral token minted by /api/voice-token bakes the persona/config into
    // the server-side bidiGenerateContentSetup, which locks it; a client
    // systemInstruction is ignored/redundant.
    outputAudioTranscription: {},
    inputAudioTranscription: {},
  },
};

const MIC_SAMPLE_RATE = 16000; // matches the worklet's resample target.
const OUTPUT_SAMPLE_RATE = 24000; // Gemini Live model audio rate.

// Auto-stop the session after this much silence/no activity. Kept as a single
// module const so it's easy to tune.
const INACTIVITY_TIMEOUT_MS = 90_000; // 90s.

// One-time greeting the assistant speaks first once setup completes.
const GREETING_TEXT =
  'The user just connected. Greet them briefly as Render and Rank\'s assistant and ask how you can help grow their business.';

export class VoiceSession {
  private cb: VoiceSessionCallbacks;
  private state: VoiceState = 'idle';

  // Networking.
  private ws: WebSocket | null = null;
  private setupComplete = false;

  // One-time greeting guard (assistant speaks first, once per connection).
  private greetingSent = false;

  // Single auto-reconnect guard: the socket may drop unexpectedly while the
  // user still intends to be live (e.g. a transient network blip). We attempt
  // exactly ONE reconnect and never again for the lifetime of this instance,
  // so a persistent failure cannot loop.
  private reconnectedOnce = false;

  // Set true by the user-initiated stop() path so an intentional close is not
  // mistaken for an unexpected drop and does not trigger a reconnect.
  private userStopped = false;

  // Inactivity watchdog: auto-stop the session after INACTIVITY_TIMEOUT_MS of
  // no activity. Handle is a browser timeout id (number).
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;

  // Barge-in guard: true while the assistant is actively speaking (audio
  // playing). When the model reports an interruption mid-utterance we do NOT
  // cut it off immediately; instead we flag pendingFlush and flush only once
  // the current utterance finishes (turnComplete / playback end).
  private assistantSpeaking = false;
  private pendingFlush = false;

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
  // setup message (sessionResumption.handle). Stored here for that future work
  // and exposed via getResumptionHandle().
  private resumptionHandle: string | null = null;

  constructor(callbacks: VoiceSessionCallbacks = {}) {
    this.cb = callbacks;
  }

  getState(): VoiceState {
    return this.state;
  }

  /** Expose the stored resumption handle (see TODO(session-resumption)). */
  getResumptionHandle(): string | null {
    return this.resumptionHandle;
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

  // ---- Inactivity watchdog ------------------------------------------------

  /**
   * (Re)start the inactivity timer. Clears any pending timer and starts a fresh
   * INACTIVITY_TIMEOUT_MS countdown; when it fires, the session is stopped as
   * if the user had ended it (WebSocket closes, mic capture stops, UI resets).
   */
  private resetInactivityTimer(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    this.inactivityTimer = setTimeout(() => {
      this.inactivityTimer = null;
      console.info('Voice session ended due to inactivity.');
      // Reuse the normal stop path so the socket closes, mic capture stops,
      // and onState('idle') updates the UI.
      this.stop();
    }, INACTIVITY_TIMEOUT_MS);
  }

  /** Clear the inactivity timer so it can't fire after the session ends. */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer !== null) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  // ---- Lifecycle ----------------------------------------------------------

  /** Begin a voice session: token → WebSocket → mic. Safe to call once. */
  async start(): Promise<void> {
    if (this.state !== 'idle' && this.state !== 'error') return;
    this.setupComplete = false;
    this.greetingSent = false;
    // A fresh start() (not the auto-reconnect below) is a new user intent, so
    // clear the stop flag. reconnectedOnce is intentionally NOT reset here so
    // the guard survives across a reconnect within the same UI session.
    this.userStopped = false;
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
    } catch (err) {
      // requestToken already logged the status + body; keep the console trace.
      console.error('[voice] start() aborted: token minting failed', String(err));
      this.fail('Could not start the voice session. Please try again in a moment.');
      return;
    }
    if (!tokenData.wssUrl) {
      console.error('[voice] token response had no wssUrl', tokenData);
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
    } catch (err) {
      // openSocket's onclose logs the exact WebSocket close code/reason.
      console.error('[voice] WebSocket failed to open', String(err));
      this.fail('Lost connection to the voice service. Please try again.');
      return;
    }

    // 4) Start streaming the mic once setup completes.
    try {
      await this.startMicCapture();
    } catch (err) {
      console.error('[voice] mic capture failed to start', String(err));
      this.fail('Could not access the microphone stream. Please try again.');
      return;
    }

    this.setState('live');
  }

  /** Tear everything down cleanly: mic, worklet, sockets, audio contexts. */
  stop(): void {
    // Mark this as a user-initiated stop so the socket's onclose does not treat
    // the close as an unexpected drop and try to reconnect.
    this.userStopped = true;
    if (this.state === 'idle') return;
    if (this.state !== 'error') this.setState('closing');
    this.teardown();
    this.setState('idle');
  }

  /**
   * Attempt a SINGLE automatic reconnect after an unexpected socket close while
   * the user still intended to be live. Guarded by reconnectedOnce so it can
   * never loop: a second unexpected drop (or a failed reconnect) falls through
   * to the normal error path instead of retrying again.
   */
  private attemptReconnect(): void {
    // Only reconnect once per instance, and never if the user ended the session.
    if (this.reconnectedOnce || this.userStopped) return;
    this.reconnectedOnce = true;
    console.info('[voice] socket dropped unexpectedly; attempting a single reconnect.');

    // Tear down the current (dead) graph, then reset to idle so start() runs.
    this.teardown();
    this.state = 'idle';

    // start() mints a fresh token (the old one is single-use) and re-opens the
    // socket. Any failure lands on the normal fail() error path inside start().
    void this.start();
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

    // Read the body regardless of status so we can surface the exact server
    // (and upstream Google) error instead of just the HTTP status code.
    const raw = await res.text().catch(() => '');
    let parsed: VoiceTokenResponse = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as VoiceTokenResponse;
      } catch {
        /* non-JSON body; keep parsed empty and fall back to raw text below. */
      }
    }

    if (!res.ok || parsed.ok === false) {
      // Rate limited: surface the server-provided, user-facing message verbatim.
      if (res.status === 429) {
        const rlMessage =
          parsed.message ||
          "You've reached the voice session limit. Please try again later.";
        console.error('[voice] token request rate limited: HTTP 429', rlMessage);
        throw new Error(rlMessage);
      }
      const detail =
        parsed.detail ||
        parsed.error ||
        raw.slice(0, 500) ||
        '(empty response body)';
      const upstream =
        parsed.upstreamStatus !== undefined ? ' (Google HTTP ' + parsed.upstreamStatus + ')' : '';
      console.error('[voice] token request failed: HTTP ' + res.status + upstream, detail);
      throw new Error('token request failed: ' + res.status + upstream + ' — ' + detail);
    }

    return parsed;
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
        try {
          ws.send(JSON.stringify(SETUP_MESSAGE));
        } catch (sendErr) {
          console.error('[voice] failed to send setup frame', String(sendErr));
        }
        // Resolve on open; setupComplete is awaited passively in onmessage.
        resolve();
      };

      ws.onmessage = (event) => {
        void this.handleServerMessage(event.data);
      };

      ws.onerror = () => {
        // The WebSocket error event carries no useful detail per spec; the
        // real cause (bad token vs. bad model) arrives in the onclose code +
        // reason below, which we log there.
        console.error('[voice] WebSocket error event (see close code/reason for cause)');
        if (!opened) reject(new Error('socket error before open'));
        else this.cb.onError?.('The voice connection hit an error.');
      };

      ws.onclose = (event) => {
        // Log the exact close code + reason so we can tell a bad/expired token
        // (Gemini closes 1008 / 1011 with an auth reason) apart from a bad
        // model name or other setup rejection.
        console.error(
          '[voice] WebSocket closed: code=' +
            event.code +
            ' reason=' +
            (event.reason || '(none)') +
            ' wasClean=' +
            event.wasClean
        );
        // If it closes before it ever opened, reject so start() surfaces it.
        if (!opened) {
          reject(new Error('socket closed before open (code ' + event.code + ')'));
          return;
        }
        // A close after we're live/connecting means the turn/session ended.
        if (this.state === 'live' || this.state === 'connecting') {
          // Unexpected drop while the user still intends to be live: try a
          // single guarded reconnect. If it's already been used (or the user
          // ended the session), attemptReconnect() is a no-op and we just mark
          // the session as closing as before.
          if (!this.userStopped && !this.reconnectedOnce) {
            this.setState('closing');
            this.attemptReconnect();
          } else {
            this.setState('closing');
          }
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
      // Session is now active: start the inactivity watchdog...
      this.resetInactivityTimer();
      // ...and have the assistant speak first (exactly once per connection).
      this.sendGreeting();
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

  /**
   * Send a one-time greeting so the assistant speaks first. Fires exactly once
   * per connection (guarded by greetingSent) and only after setupComplete.
   */
  private sendGreeting(): void {
    if (this.greetingSent) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupComplete) return;
    this.greetingSent = true;
    const frame = {
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: GREETING_TEXT }] }],
        turnComplete: true,
      },
    };
    try {
      this.ws.send(JSON.stringify(frame));
    } catch (sendErr) {
      console.error('[voice] failed to send greeting frame', String(sendErr));
    }
  }

  private handleServerContent(sc: any): void {
    // Any incoming assistant content (audio or transcript) counts as activity;
    // postpone the inactivity auto-stop.
    this.resetInactivityTimer();

    // Barge-in: user interrupted. Do NOT cut the assistant off mid-utterance:
    // if it is actively speaking, defer the flush until the utterance finishes
    // (turnComplete / playback end). Only flush immediately when it is silent.
    if (sc.interrupted === true) {
      if (this.assistantSpeaking) {
        this.pendingFlush = true;
      } else {
        this.flush();
      }
    }

    // Model audio chunks arrive as inlineData parts (audio/pcm;rate=24000).
    const parts = sc.modelTurn?.parts;
    if (Array.isArray(parts)) {
      for (const part of parts) {
        const inline = part?.inlineData;
        if (inline?.data && typeof inline.mimeType === 'string' && inline.mimeType.startsWith('audio/pcm')) {
          // Assistant audio is starting to play → it is now speaking.
          this.assistantSpeaking = true;
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

    // Turn finished: finalize + beacon both channels immediately, then reset
    // accumulators.
    if (sc.turnComplete === true) {
      this.completeUtterance();
    }
  }

  /**
   * Finish the current assistant utterance: the assistant is no longer speaking
   * (playback finished), so run the deferred barge-in flush if one is pending
   * and finalize/beacon the turn immediately.
   */
  private completeUtterance(): void {
    this.assistantSpeaking = false;
    if (this.pendingFlush) {
      this.pendingFlush = false;
      this.flush();
    }
    this.finalizeTurn();
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
    // A user mic chunk counts as activity; postpone the inactivity auto-stop.
    this.resetInactivityTimer();
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

    // When this (currently last) scheduled chunk finishes and nothing newer has
    // been queued after it, the assistant utterance has finished playing back:
    // clear assistantSpeaking and run any deferred barge-in flush.
    src.onended = () => {
      if (this.outputCtx && ctx === this.outputCtx && this.playHead <= ctx.currentTime + 0.0001) {
        this.assistantSpeaking = false;
        if (this.pendingFlush) {
          this.pendingFlush = false;
          this.flush();
        }
      }
    };
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
    // Stop the inactivity watchdog first so it can't fire mid-teardown.
    this.clearInactivityTimer();
    // Reset barge-in flags so a fresh session starts clean.
    this.assistantSpeaking = false;
    this.pendingFlush = false;

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
    this.greetingSent = false;
    // NOTE: reconnectedOnce and userStopped are deliberately NOT reset here.
    // teardown() runs both for an intentional stop() and for the single
    // auto-reconnect; the reconnect guard must survive teardown so it can only
    // ever fire once, and userStopped is (re)set explicitly by stop()/start().
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
