import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trophy, Zap, Timer, Star, Gauge, MessageSquare, BarChart3, RotateCcw, Pause } from "lucide-react";
import confetti from "canvas-confetti";
import { FillerDetector, type FillerEvent } from "@/lib/filler-detector";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const TOPICS = [
  "The future of remote work",
  "Your favorite childhood memory",
  "Why learning to cook is important",
  "The impact of social media on society",
  "A place you'd love to visit and why",
  "The most important skill in life",
  "How technology will change education",
  "Your opinion on space exploration",
  "The power of reading books",
  "What makes a great leader",
  "A lesson you learned the hard way",
  "Why creativity matters in every job",
  "The best advice you've ever received",
  "How music influences your mood",
  "The role of AI in everyday life",
  "A challenge you overcame recently",
  "Why patience is a superpower",
  "The importance of mental health awareness",
  "Your dream career and why",
  "How traveling changes your perspective",
];

type Difficulty = "beginner" | "intermediate" | "expert";

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; seconds: number; icon: string; color: string }> = {
  beginner: { label: "Beginner", seconds: 30, icon: "🌱", color: "bg-success/15 text-success border-success/30" },
  intermediate: { label: "Intermediate", seconds: 60, icon: "🔥", color: "bg-warning/15 text-warning border-warning/30" },
  expert: { label: "Expert", seconds: 120, icon: "⚡", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface TranscriptSegment {
  type: "speech" | "filler" | "pause";
  text: string;
  timestamp: number;
}

interface DrillStats {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  fillerWordsUsed: Record<string, number>;
  totalFillers: number;
  pauseCount: number;
  clarityScore: number;
  segments: TranscriptSegment[];
}

export default function TrainerMode() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [state, setState] = useState<"idle" | "running" | "completed">("idle");
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY_CONFIG.beginner.seconds);
  const [topic, setTopic] = useState(() => TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [flash, setFlash] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const [drillStats, setDrillStats] = useState<DrillStats | null>(null);
  const [fillerAlert, setFillerAlert] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const fillerDetectorRef = useRef<FillerDetector | null>(null);

  // Accumulated data
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  const fillerCountRef = useRef<Record<string, number>>({});
  const totalFillersRef = useRef(0);
  const pauseCountRef = useRef(0);
  const finalizedTextRef = useRef("");
  const stoppedRef = useRef(false);

  const { toast } = useToast();
  const duration = DIFFICULTY_CONFIG[difficulty].seconds;

  const pickNewTopic = () => setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);

  const cleanup = useCallback(() => {
    isListeningRef.current = false;
    stoppedRef.current = true;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (fillerDetectorRef.current) {
      fillerDetectorRef.current.stop();
      fillerDetectorRef.current = null;
    }
  }, []);

  const buildStats = useCallback((): DrillStats => {
    const elapsed = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    const raw = finalizedTextRef.current.trim();
    const words = raw.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const wpm = elapsed > 0 ? Math.round((wordCount / elapsed) * 60) : 0;
    const totalFillers = totalFillersRef.current;
    const fillerRatio = wordCount > 0 ? totalFillers / wordCount : 0;
    const pausePenalty = pauseCountRef.current * 3;
    const clarityScore = Math.max(0, Math.min(100, Math.round(100 - fillerRatio * 400 - pausePenalty)));

    return {
      wordCount,
      durationSeconds: elapsed,
      wpm,
      fillerWordsUsed: { ...fillerCountRef.current },
      totalFillers,
      pauseCount: pauseCountRef.current,
      clarityScore,
      segments: [...segmentsRef.current],
    };
  }, []);

  const finishDrill = useCallback((success: boolean, reason?: string) => {
    if (stoppedRef.current) return;
    cleanup();

    if (!success && reason) {
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
      setRestarts((r) => r + 1);
      toast({ title: "Drill stopped", description: reason, variant: "destructive" });
    }

    const stats = buildStats();
    setDrillStats(stats);
    setState("completed");

    if (success) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#58cc02", "#1cb0f6", "#ff9600"] });
    }
  }, [cleanup, buildStats, toast]);

  const startDrill = useCallback(() => {
    cleanup();
    stoppedRef.current = false;
    setState("running");
    setLiveTranscript("");
    setDrillStats(null);
    setFillerAlert(null);
    setTimeLeft(duration);
    pickNewTopic();

    segmentsRef.current = [];
    fillerCountRef.current = {};
    totalFillersRef.current = 0;
    pauseCountRef.current = 0;
    finalizedTextRef.current = "";

    startTimeRef.current = Date.now();

    // Timer
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = duration - elapsed;
      if (remaining <= 0) {
        finishDrill(true);
      } else {
        setTimeLeft(remaining);
      }
    }, 250);

    // === Audio-based filler detector ===
    const detector = new FillerDetector({
      fillerMinDurationMs: 300,
      silenceThresholdMs: 3000,
      onFiller: (event: FillerEvent) => {
        if (stoppedRef.current) return;
        const ts = Math.round(event.timestamp / 1000);
        segmentsRef.current.push({ type: "filler", text: event.label, timestamp: ts });
        fillerCountRef.current[event.label] = (fillerCountRef.current[event.label] || 0) + 1;
        totalFillersRef.current += 1;

        setFillerAlert(event.label);
        setTimeout(() => setFillerAlert(null), 1500);

        // Show in live transcript
        setLiveTranscript(prev => prev + ` [🔴 "${event.label}"] `);

        finishDrill(false, `Detected filler sound "${event.label}"`);
      },
      onSilence: (event: FillerEvent) => {
        if (stoppedRef.current) return;
        const ts = Math.round(event.timestamp / 1000);
        segmentsRef.current.push({ type: "pause", text: "[pause]", timestamp: ts });
        pauseCountRef.current += 1;

        finishDrill(false, "3-second silence detected — keep speaking!");
      },
    });
    fillerDetectorRef.current = detector;
    detector.start();

    // === Speech Recognition for transcript ===
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Speech Recognition not supported", description: "Please use Chrome or Edge.", variant: "destructive" });
      cleanup();
      setState("idle");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    isListeningRef.current = true;

    recognition.onresult = (event: any) => {
      if (!isListeningRef.current) return;

      let finalText = "";
      let interimText = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalText += text + " ";
        } else {
          interimText += text;
        }
      }

      if (finalText && finalText !== finalizedTextRef.current) {
        const newPart = finalText.slice(finalizedTextRef.current.length).trim();
        if (newPart) {
          const ts = Math.floor((Date.now() - startTimeRef.current) / 1000);
          segmentsRef.current.push({ type: "speech", text: newPart, timestamp: ts });
        }
        finalizedTextRef.current = finalText;
      }

      setLiveTranscript(finalText + interimText);
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        toast({ title: "Microphone access denied", variant: "destructive" });
        cleanup();
        setState("idle");
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
  }, [cleanup, duration, finishDrill, toast]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const stopDrill = () => {
    cleanup();
    setState("idle");
    setTimeLeft(duration);
    setLiveTranscript("");
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  const fillerChartData = drillStats
    ? Object.entries(drillStats.fillerWordsUsed).map(([word, count]) => ({ word, count }))
    : [];

  const wasSuccessful = drillStats && drillStats.totalFillers === 0 && drillStats.pauseCount === 0 && drillStats.durationSeconds >= duration;

  return (
    <div className={`flex flex-col items-center gap-6 pb-8 transition-colors ${flash ? "flash-red" : ""}`}>
      {/* Filler Alert Overlay */}
      {fillerAlert && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <div className="rounded-3xl bg-destructive/90 px-10 py-6 text-center animate-in zoom-in-50 fade-in duration-200">
            <p className="text-3xl font-extrabold text-destructive-foreground">🔴 "{fillerAlert}"</p>
            <p className="text-sm text-destructive-foreground/80 mt-1">Filler detected!</p>
          </div>
        </div>
      )}

      {/* Difficulty Selector */}
      {state !== "completed" && (
        <div className="flex gap-3 flex-wrap justify-center">
          {(Object.keys(DIFFICULTY_CONFIG) as Difficulty[]).map((d) => {
            const cfg = DIFFICULTY_CONFIG[d];
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => { if (state === "idle") { setDifficulty(d); setTimeLeft(cfg.seconds); } }}
                disabled={state === "running"}
                className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-3 text-sm font-semibold transition-all ${
                  active
                    ? cfg.color + " scale-105 shadow-lg"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30"
                } ${state === "running" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span className="text-lg">{cfg.icon}</span>
                <span>{cfg.label}</span>
                <Badge variant="secondary" className="ml-1 text-[10px]">{cfg.seconds}s</Badge>
              </button>
            );
          })}
        </div>
      )}

      {/* Topic Card */}
      {state !== "completed" && (
        <Card className="glass-card glow-primary w-full max-w-2xl rounded-3xl">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Your Topic</p>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">"{topic}"</h2>
          </CardContent>
        </Card>
      )}

      {/* Timer */}
      {state === "running" && (
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none"
                stroke={timeLeft <= 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${progress * 3.267} ${(100 - progress) * 3.267}`}
                className="transition-all duration-300"
              />
            </svg>
            <span className="text-3xl font-extrabold text-foreground">{timeLeft}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-3.5 w-3.5" /> seconds remaining
          </div>
        </div>
      )}

      {/* ===== POST-DRILL SUMMARY ===== */}
      {state === "completed" && drillStats && (
        <div className="w-full max-w-2xl space-y-4">
          <Card className={`glass-card w-full rounded-3xl ${wasSuccessful ? "glow-success" : "glow-accent"}`}>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${wasSuccessful ? "bg-success/15" : "bg-accent/15"}`}>
                {wasSuccessful ? <Trophy className="h-8 w-8 text-success" /> : <RotateCcw className="h-8 w-8 text-accent" />}
              </div>
              <h3 className="text-xl font-extrabold text-foreground">
                {wasSuccessful ? "Amazing! 🎉" : "Almost there! 💪"}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {wasSuccessful
                  ? `You completed ${duration} seconds filler-free!`
                  : `Stopped after ${drillStats.durationSeconds}s. Review your stats below.`}
              </p>
              {restarts > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5" />
                  {wasSuccessful ? `Completed after ${restarts + 1} attempt(s)` : `${restarts} restart(s) so far`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <Card className="glass-card rounded-2xl">
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <Gauge className="h-5 w-5 text-primary" />
                <span className="text-2xl font-extrabold text-foreground">{drillStats.wpm}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">WPM</span>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl">
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <MessageSquare className="h-5 w-5 text-accent" />
                <span className="text-2xl font-extrabold text-foreground">{drillStats.wordCount}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Words</span>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl">
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <BarChart3 className="h-5 w-5 text-warning" />
                <span className="text-2xl font-extrabold text-foreground">{drillStats.totalFillers}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Fillers</span>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl">
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <Pause className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-extrabold text-foreground">{drillStats.pauseCount}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Pauses</span>
              </CardContent>
            </Card>
            <Card className="glass-card rounded-2xl">
              <CardContent className="flex flex-col items-center gap-1 p-4">
                <Star className="h-5 w-5 text-success" />
                <span className="text-2xl font-extrabold text-foreground">{drillStats.clarityScore}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Clarity</span>
              </CardContent>
            </Card>
          </div>

          {/* WPM Gauge */}
          <Card className="glass-card rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-primary" /> Speaking Pace
                </span>
                <span className="text-sm text-muted-foreground">{drillStats.wpm} WPM</span>
              </div>
              <Progress value={Math.min(100, (drillStats.wpm / 200) * 100)} className="h-3" />
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>Too Slow (&lt;100)</span>
                <span className="text-success font-bold">Ideal (120-160)</span>
                <span>Too Fast (&gt;180)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {drillStats.wpm < 100
                  ? "Try speaking a bit faster. Aim for 120-160 WPM for natural conversation."
                  : drillStats.wpm > 180
                  ? "You're speaking quite fast. Try slowing down to let your points land."
                  : "Great pace! You're in the ideal range for clear communication."}
              </p>
            </CardContent>
          </Card>

          {/* Filler Words Chart */}
          {fillerChartData.length > 0 && (
            <Card className="glass-card rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-accent" /> Filler Words Detected
                </span>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={fillerChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="word" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Transcript Timeline */}
          {drillStats.segments.length > 0 && (
            <Card className="glass-card rounded-2xl">
              <CardContent className="p-5 space-y-3">
                <span className="text-sm font-bold text-foreground">Transcript Timeline</span>
                <div className="text-sm leading-relaxed flex flex-wrap items-center gap-1">
                  {drillStats.segments.map((seg, i) => {
                    if (seg.type === "pause") {
                      return (
                        <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">
                          <Pause className="h-3 w-3" /> {seg.timestamp}s
                        </span>
                      );
                    }
                    if (seg.type === "filler") {
                      return (
                        <span key={i} className="inline-flex items-center gap-1 rounded-lg bg-destructive/15 px-2 py-0.5 text-xs font-bold text-destructive">
                          🔴 "{seg.text}" @ {seg.timestamp}s
                        </span>
                      );
                    }
                    return <span key={i} className="text-secondary-foreground">{seg.text}</span>;
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {state === "idle" || state === "completed" ? (
          <Button size="lg" onClick={() => { setRestarts(state === "completed" ? restarts : 0); startDrill(); }}
            className="glow-primary rounded-2xl px-8 text-base font-bold">
            <Play className="mr-2 h-5 w-5" />
            {state === "completed" ? "Try Again" : `Start ${duration}-Second Drill`}
          </Button>
        ) : (
          <Button size="lg" variant="outline" onClick={stopDrill} className="rounded-2xl px-8 text-base font-bold">
            <Square className="mr-2 h-5 w-5" /> Stop
          </Button>
        )}
      </div>

      {/* Live Transcript */}
      {state === "running" && liveTranscript && (
        <Card className="glass-card w-full max-w-2xl rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live Transcript</p>
            <p className="text-sm text-secondary-foreground leading-relaxed">{liveTranscript}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
