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
  private centroidHistory: number[] = [];
  private energyHistory: number[] = [];
  private flatnessHistory: number[] = [];
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
    this.centroidHistory = [];
    this.energyHistory = [];
    this.flatnessHistory = [];
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

    // 3. Compute spectral centroid — center of mass of the spectrum
    //    More stable and reliable than autocorrelation pitch detection
    let weightedSum = 0;
    let totalWeight = 0;
    const sampleRate = this.audioContext!.sampleRate;
    for (let i = 1; i < bufferLength / 2; i++) {
      const freq = (i * sampleRate) / (2 * bufferLength);
      weightedSum += freq * dataArray[i];
      totalWeight += dataArray[i];
    }
    const spectralCentroid = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // 4. Check if sound is voiced — moderate volume + centroid in voice range
    const isCurrentlyVoiced = rms > 0.012 && spectralCentroid > 100 && spectralCentroid < 2000;

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

    // 6. Filler detection using spectral centroid stability
    if (isCurrentlyVoiced) {
      if (!this.isVoiced) {
        this.isVoiced = true;
        this.voicedStartTime = now;
        this.centroidHistory = [spectralCentroid];
        this.energyHistory = [rms];
        this.flatnessHistory = [spectralFlatness];
      } else {
        this.centroidHistory.push(spectralCentroid);
        this.energyHistory.push(rms);
        this.flatnessHistory.push(spectralFlatness);

        // Sliding window
        const WINDOW = 15;
        if (this.centroidHistory.length > WINDOW) {
          this.centroidHistory = this.centroidHistory.slice(-WINDOW);
          this.energyHistory = this.energyHistory.slice(-WINDOW);
          this.flatnessHistory = this.flatnessHistory.slice(-WINDOW);
        }

        const voicedDuration = now - this.voicedStartTime;

        if (voicedDuration >= this.options.fillerMinDurationMs && this.centroidHistory.length >= 6) {
          // Spectral centroid stability
          const avgCentroid = this.centroidHistory.reduce((a, b) => a + b, 0) / this.centroidHistory.length;
          const centroidVar = this.centroidHistory.reduce((a, b) => a + Math.pow(b - avgCentroid, 2), 0) / this.centroidHistory.length;
          const centroidCV = avgCentroid > 0 ? Math.sqrt(centroidVar) / avgCentroid : 1;

          // Energy stability
          const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
          const energyVar = this.energyHistory.reduce((a, b) => a + Math.pow(b - avgEnergy, 2), 0) / this.energyHistory.length;
          const energyCV = avgEnergy > 0 ? Math.sqrt(energyVar) / avgEnergy : 1;

          // Average spectral flatness over window
          const avgFlatness = this.flatnessHistory.reduce((a, b) => a + b, 0) / this.flatnessHistory.length;

          // Filler criteria:
          // 1. Stable spectral centroid (CV < 0.15) — fillers have steady timbre
          // 2. Stable energy (CV < 0.40) — fillers don't fluctuate
          // 3. Tonal quality (avg flatness < 0.75) — vowel-like
          // 4. Low centroid (< 800 Hz) — fillers are low-frequency vowels
          // 5. Cooldown of 1.5s
          const isFiller =
            centroidCV < 0.15 &&
            energyCV < 0.40 &&
            avgFlatness < 0.75 &&
            avgCentroid < 800 &&
            (now - this.lastFillerTime) > 1500;

          if (voicedDuration >= this.options.fillerMinDurationMs) {
            console.log(`[FillerDetector] Voiced ${voicedDuration}ms | centroidCV: ${centroidCV.toFixed(3)} | centroid: ${avgCentroid.toFixed(0)}Hz | energyCV: ${energyCV.toFixed(3)} | flatness: ${avgFlatness.toFixed(3)} | ${isFiller ? '🔴 FILLER' : '✅ speech'}`);
          }

          if (isFiller) {
            const label = avgCentroid < 300 ? "uh" : avgCentroid < 500 ? "um" : "ah";

            this.options.onFiller({
              type: "filler",
              timestamp: this.voicedStartTime - this.startTime,
              duration: voicedDuration,
              label,
            });

            this.lastFillerTime = now;
            this.isVoiced = false;
            this.centroidHistory = [];
            this.energyHistory = [];
            this.flatnessHistory = [];
          }
        }

        // Too long = speech, not filler
        if (voicedDuration > 1500) {
          this.isVoiced = false;
          this.centroidHistory = [];
          this.energyHistory = [];
          this.flatnessHistory = [];
        }
      }
    } else {
      if (this.isVoiced) {
        this.isVoiced = false;
        this.centroidHistory = [];
        this.energyHistory = [];
        this.flatnessHistory = [];
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

}
