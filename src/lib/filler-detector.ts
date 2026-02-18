/**
 * FillerDetector uses the Web Audio API to detect filler sounds (um, uh, ah)
 * by analyzing audio characteristics: sustained low-variation pitch + voiced sound.
 */

export interface FillerEvent {
  type: "filler" | "silence";
  timestamp: number; // ms from start
  duration: number;  // ms
  label: string;
}

interface FillerDetectorOptions {
  onFiller: (event: FillerEvent) => void;
  onSilence: (event: FillerEvent) => void;
  silenceThresholdMs?: number;
  fillerMinDurationMs?: number;
}

export class FillerDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private running = false;
  private startTime = 0;

  // Detection state
  private voicedStartTime = 0;
  private isVoiced = false;
  private pitchHistory: number[] = [];
  private silenceStartTime = 0;
  private isSilent = false;

  private options: Required<FillerDetectorOptions>;

  constructor(opts: FillerDetectorOptions) {
    this.options = {
      silenceThresholdMs: opts.silenceThresholdMs ?? 1500,
      fillerMinDurationMs: opts.fillerMinDurationMs ?? 250,
      onFiller: opts.onFiller,
      onSilence: opts.onSilence,
    };
  }

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      console.warn("FillerDetector: mic access denied");
      return;
    }

    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    this.startTime = Date.now();
    this.running = true;
    this.silenceStartTime = Date.now();
    this.isSilent = false;
    this.isVoiced = false;
    this.pitchHistory = [];

    this.tick();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.source?.disconnect();
    this.audioContext?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioContext = null;
    this.analyser = null;
    this.stream = null;
    this.source = null;
  }

  private tick = () => {
    if (!this.running || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    const timeData = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeData);

    const now = Date.now();

    // 1. Compute RMS volume
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / timeData.length);
    const volume = rms; // 0..~0.5+ range

    // 2. Estimate dominant frequency via autocorrelation
    const dominantFreq = this.estimateFrequency(timeData, this.audioContext!.sampleRate);

    // 3. Check if sound is "voiced" (has clear pitch, moderate volume)
    // Fillers like "um/uh/ah" are voiced sounds typically 80-300 Hz
    const isCurrentlyVoiced = volume > 0.02 && dominantFreq > 60 && dominantFreq < 400;

    // 4. Silence detection
    if (volume < 0.01) {
      if (!this.isSilent) {
        this.isSilent = true;
        this.silenceStartTime = now;
      } else {
        const silenceDuration = now - this.silenceStartTime;
        if (silenceDuration >= this.options.silenceThresholdMs) {
          this.options.onSilence({
            type: "silence",
            timestamp: this.silenceStartTime - this.startTime,
            duration: silenceDuration,
            label: "pause",
          });
          // Reset so we don't fire repeatedly
          this.silenceStartTime = now;
        }
      }
    } else {
      this.isSilent = false;
      this.silenceStartTime = now;
    }

    // 5. Filler detection: sustained voiced sound with low pitch variation
    if (isCurrentlyVoiced) {
      if (!this.isVoiced) {
        this.isVoiced = true;
        this.voicedStartTime = now;
        this.pitchHistory = [dominantFreq];
      } else {
        this.pitchHistory.push(dominantFreq);

        const voicedDuration = now - this.voicedStartTime;

        if (voicedDuration >= this.options.fillerMinDurationMs && this.pitchHistory.length >= 5) {
          // Check pitch stability: fillers have very stable pitch
          const avgPitch = this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length;
          const variance = this.pitchHistory.reduce((a, b) => a + Math.pow(b - avgPitch, 2), 0) / this.pitchHistory.length;
          const stdDev = Math.sqrt(variance);
          const coeffOfVariation = stdDev / avgPitch;

          // Low pitch variation = likely a filler (monotone sustained vowel)
          // Normal speech has much more pitch variation
          if (coeffOfVariation < 0.15 && voicedDuration >= this.options.fillerMinDurationMs) {
            const label = avgPitch < 150 ? "uh" : avgPitch < 250 ? "um" : "ah";

            this.options.onFiller({
              type: "filler",
              timestamp: this.voicedStartTime - this.startTime,
              duration: voicedDuration,
              label,
            });

            // Reset to avoid repeated triggers for same filler
            this.isVoiced = false;
            this.pitchHistory = [];
          }
        }
      }
    } else {
      // If we had a voiced segment that ended, reset
      if (this.isVoiced) {
        this.isVoiced = false;
        this.pitchHistory = [];
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Simple autocorrelation-based pitch estimation
   */
  private estimateFrequency(timeData: Uint8Array, sampleRate: number): number {
    const buf = new Float32Array(timeData.length);
    for (let i = 0; i < timeData.length; i++) {
      buf[i] = (timeData[i] - 128) / 128;
    }

    // Check if there's enough signal
    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.01) return 0;

    // Autocorrelation
    const minLag = Math.floor(sampleRate / 500); // 500 Hz max
    const maxLag = Math.floor(sampleRate / 50);  // 50 Hz min
    let bestCorrelation = 0;
    let bestLag = minLag;

    for (let lag = minLag; lag < maxLag && lag < buf.length / 2; lag++) {
      let correlation = 0;
      for (let i = 0; i < buf.length - lag; i++) {
        correlation += buf[i] * buf[i + lag];
      }
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    return sampleRate / bestLag;
  }
}
