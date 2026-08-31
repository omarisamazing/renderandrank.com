/**
 * voice-capture-worklet.js — AudioWorklet processor for the ChatWidget voice mode.
 *
 * Loaded on the main thread via:
 *   audioContext.audioWorklet.addModule('/voice-capture-worklet.js')
 * and instantiated as `new AudioWorkletNode(ctx, 'voice-capture-processor')`.
 *
 * Responsibility: take the mic's Float32 mono frames (whatever the browser's
 * native AudioContext sample rate is — commonly 44100 or 48000 Hz), resample
 * them down to 16 kHz, convert to 16-bit little-endian PCM, and post the raw
 * bytes back to the main thread. The main thread base64-encodes them and sends
 * them to Gemini Live as realtimeInput.audio chunks (mimeType audio/pcm;rate=16000).
 *
 * Everything here is dependency-free and runs in the AudioWorkletGlobalScope
 * (no window / DOM). Audio math is commented because it is non-obvious.
 */

const TARGET_SAMPLE_RATE = 16000; // Gemini Live expects 16 kHz mic input.

class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Carry-over fractional read position between process() calls so that
    // resampling is continuous across the 128-sample render quanta (otherwise
    // we'd get periodic clicks at every block boundary).
    this._resamplePos = 0;
    this._active = true;

    // The main thread can tell us to stop by posting { type: 'stop' }.
    this.port.onmessage = (event) => {
      if (event.data && event.data.type === 'stop') {
        this._active = false;
      }
    };
  }

  /**
   * Called by the audio engine ~every 128 samples. `inputs[0][0]` is the first
   * input's first channel (mono). We linearly resample from the context rate
   * (`sampleRate`, a global in the worklet scope) down to 16 kHz, then quantize
   * to signed 16-bit PCM.
   */
  process(inputs) {
    if (!this._active) return false; // returning false ends the processor.

    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    // Ratio of how many source samples map to one output sample.
    // e.g. at 48000 Hz -> 48000 / 16000 = 3 source samples per output sample.
    const ratio = sampleRate / TARGET_SAMPLE_RATE;

    // Upper bound on how many output samples this block can yield.
    const outLength = Math.max(0, Math.floor((channel.length - this._resamplePos) / ratio) + 1);
    if (outLength <= 0) {
      // Keep the fractional position relative to the next block.
      this._resamplePos -= channel.length;
      return true;
    }

    // 16-bit PCM => 2 bytes per sample.
    const pcm = new DataView(new ArrayBuffer(outLength * 2));
    let written = 0;
    let pos = this._resamplePos;

    while (pos < channel.length && written < outLength) {
      // Linear interpolation between neighbouring source samples for a smoother
      // downsample than nearest-neighbour.
      const idx = Math.floor(pos);
      const frac = pos - idx;
      const s0 = channel[idx];
      const s1 = idx + 1 < channel.length ? channel[idx + 1] : s0;
      let sample = s0 + (s1 - s0) * frac;

      // Clamp to [-1, 1] then scale to signed 16-bit range.
      sample = Math.max(-1, Math.min(1, sample));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      pcm.setInt16(written * 2, int16, true /* little-endian */);

      written += 1;
      pos += ratio;
    }

    // Preserve the leftover fractional read offset for the next block so the
    // resampler stays phase-continuous.
    this._resamplePos = pos - channel.length;

    if (written > 0) {
      const bytes = pcm.buffer.slice(0, written * 2);
      // Transfer the ArrayBuffer (zero-copy) to the main thread.
      this.port.postMessage({ type: 'audio', buffer: bytes }, [bytes]);
    }

    return true;
  }
}

registerProcessor('voice-capture-processor', VoiceCaptureProcessor);
