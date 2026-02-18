/**
 * FillerDetector uses the Web Audio API to detect filler sounds (um, uh, ah)
 * by analyzing audio characteristics: sustained low-variation pitch + voiced sound.
 * 
 * Key: fillers are distinguished from normal speech by being:
 * - Longer duration (>500ms of sustained monotone)
 * - Extremely low pitch variation (coefficient of variation < 0.06)
 * - Lower energy than normal articulated speech
 * - No consonant transitions (steady state)
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
  private energyHistory: number[] = [];
  private silenceStartTime = 0;
  private isSilent = false;
  private lastFillerTime = 0; // cooldown

  private options: Required<FillerDetectorOptions>;

  constructor(opts: FillerDetectorOptions) {
    this.options = {
      silenceThresholdMs: opts.silenceThresholdMs ?? 1500,
      fillerMinDurationMs: opts.fillerMinDurationMs ?? 500, // 500ms minimum
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
    this.analyser.smoothingTimeConstant = 0.85;

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);

    this.startTime = Date.now();
    this.running = true;
    this.silenceStartTime = Date.now();
    this.isSilent = false;
    this.isVoiced = false;
    this.pitchHistory = [];
    this.energyHistory = [];
    this.lastFillerTime = 0;

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

    // 2. Compute spectral flatness — fillers have more "pure tone" quality
    //    (energy concentrated in narrow band vs spread across spectrum)
    let specSum = 0;
    let specLogSum = 0;
    let specCount = 0;
    for (let i = 2; i < bufferLength / 4; i++) { // focus on low frequencies
      const val = Math.max(dataArray[i], 1);
      specSum += val;
      specLogSum += Math.log(val);
      specCount++;
    }
    const arithmeticMean = specSum / specCount;
    const geometricMean = Math.exp(specLogSum / specCount);
    const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 1;
    // Lower spectral flatness = more tonal (filler-like)
    // Higher = more noisy/consonant-rich (normal speech)

    // 3. Estimate dominant frequency
    const dominantFreq = this.estimateFrequency(timeData, this.audioContext!.sampleRate);

    // 4. Check if sound is voiced — must be moderate volume, in voice range
    const isCurrentlyVoiced = rms > 0.015 && dominantFreq > 70 && dominantFreq < 350;

    // 5. Silence detection
    if (rms < 0.008) {
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
          this.silenceStartTime = now;
        }
      }
    } else {
      this.isSilent = false;
      this.silenceStartTime = now;
    }

    // 6. Filler detection with strict criteria
    if (isCurrentlyVoiced) {
      if (!this.isVoiced) {
        this.isVoiced = true;
        this.voicedStartTime = now;
        this.pitchHistory = [dominantFreq];
        this.energyHistory = [rms];
      } else {
        this.pitchHistory.push(dominantFreq);
        this.energyHistory.push(rms);

        const voicedDuration = now - this.voicedStartTime;

        // Need at least 500ms of data and 10+ samples
        if (voicedDuration >= this.options.fillerMinDurationMs && this.pitchHistory.length >= 10) {
          const avgPitch = this.pitchHistory.reduce((a, b) => a + b, 0) / this.pitchHistory.length;
          const variance = this.pitchHistory.reduce((a, b) => a + Math.pow(b - avgPitch, 2), 0) / this.pitchHistory.length;
          const stdDev = Math.sqrt(variance);
          const coeffOfVariation = stdDev / avgPitch;

          // Energy stability — fillers have very stable energy too
          const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
          const energyVariance = this.energyHistory.reduce((a, b) => a + Math.pow(b - avgEnergy, 2), 0) / this.energyHistory.length;
          const energyStdDev = Math.sqrt(energyVariance);
          const energyCV = avgEnergy > 0 ? energyStdDev / avgEnergy : 1;

          // Strict criteria for filler detection:
          // 1. Very low pitch variation (< 0.05 CV) — fillers are extremely monotone
          // 2. Low energy variation (< 0.3 CV) — fillers have steady volume
          // 3. Tonal quality (spectralFlatness < 0.4) — fillers are vowel-like
          // 4. Moderate-low volume — fillers tend to be quieter than articulated speech
          // 5. Cooldown: at least 2 seconds between detections
          const isFiller =
            coeffOfVariation < 0.05 &&
            energyCV < 0.3 &&
            spectralFlatness < 0.4 &&
            avgEnergy < 0.15 &&
            (now - this.lastFillerTime) > 2000;

          if (isFiller) {
            const label = avgPitch < 140 ? "uh" : avgPitch < 220 ? "um" : "ah";

            this.options.onFiller({
              type: "filler",
              timestamp: this.voicedStartTime - this.startTime,
              duration: voicedDuration,
              label,
            });

            this.lastFillerTime = now;
            this.isVoiced = false;
            this.pitchHistory = [];
            this.energyHistory = [];
          }
        }

        // If voiced segment is too long (>1.5s), it's definitely speech, not a filler — reset
        if (voicedDuration > 1500) {
          this.isVoiced = false;
          this.pitchHistory = [];
          this.energyHistory = [];
        }
      }
    } else {
      if (this.isVoiced) {
        this.isVoiced = false;
        this.pitchHistory = [];
        this.energyHistory = [];
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private estimateFrequency(timeData: Uint8Array, sampleRate: number): number {
    const buf = new Float32Array(timeData.length);
    for (let i = 0; i < timeData.length; i++) {
      buf[i] = (timeData[i] - 128) / 128;
    }

    let rms = 0;
    for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / buf.length);
    if (rms < 0.01) return 0;

    // Autocorrelation
    const minLag = Math.floor(sampleRate / 500);
    const maxLag = Math.floor(sampleRate / 50);
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
