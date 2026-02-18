import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trophy, Zap, Timer, Star, Gauge, MessageSquare, BarChart3, RotateCcw } from "lucide-react";
import confetti from "canvas-confetti";
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

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "literally", "actually"];

type Difficulty = "beginner" | "intermediate" | "expert";

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; seconds: number; icon: string; color: string }> = {
  beginner: { label: "Beginner", seconds: 30, icon: "🌱", color: "bg-success/15 text-success border-success/30" },
  intermediate: { label: "Intermediate", seconds: 60, icon: "🔥", color: "bg-warning/15 text-warning border-warning/30" },
  expert: { label: "Expert", seconds: 120, icon: "⚡", color: "bg-destructive/15 text-destructive border-destructive/30" },
};

interface DrillStats {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  fillerWordsUsed: Record<string, number>;
  totalFillers: number;
  clarityScore: number;
  transcript: string;
}

function computeStats(transcript: string, elapsedSeconds: number): DrillStats {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const wpm = elapsedSeconds > 0 ? Math.round((wordCount / elapsedSeconds) * 60) : 0;

  const lower = transcript.toLowerCase();
  const fillerWordsUsed: Record<string, number> = {};
  let totalFillers = 0;
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler.replace(/ /g, "\\s+")}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches && matches.length > 0) {
      fillerWordsUsed[filler] = matches.length;
      totalFillers += matches.length;
    }
  }

  const fillerRatio = wordCount > 0 ? totalFillers / wordCount : 0;
  const clarityScore = Math.max(0, Math.min(100, Math.round(100 - fillerRatio * 500)));

  return { wordCount, durationSeconds: elapsedSeconds, wpm, fillerWordsUsed, totalFillers, clarityScore, transcript };
}

export default function TrainerMode() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [state, setState] = useState<"idle" | "running" | "completed">("idle");
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY_CONFIG.beginner.seconds);
  const [topic, setTopic] = useState(() => TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  const [transcript, setTranscript] = useState("");
  const [flash, setFlash] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const [drillStats, setDrillStats] = useState<DrillStats | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const transcriptRef = useRef("");
  const { toast } = useToast();

  const duration = DIFFICULTY_CONFIG[difficulty].seconds;

  const pickNewTopic = () => {
    setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  };

  const cleanup = useCallback(() => {
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
  }, []);

  const handleSuccess = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    cleanup();
    const stats = computeStats(transcriptRef.current, elapsed);
    setDrillStats(stats);
    setState("completed");
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#58cc02", "#1cb0f6", "#ff9600"] });
  }, [cleanup]);

  const restartDrill = useCallback((reason: string) => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    cleanup();
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    setRestarts((r) => r + 1);

    // Compute stats for the failed attempt
    const stats = computeStats(transcriptRef.current, elapsed);
    setDrillStats(stats);

    toast({ title: "Restarting drill", description: reason, variant: "destructive" });

    pickNewTopic();
    setTimeLeft(duration);
    setTranscript("");
    transcriptRef.current = "";
    setState("completed"); // Show stats instead of going straight to idle
  }, [cleanup, toast, duration]);

  const startDrill = useCallback(() => {
    cleanup();
    setState("running");
    setTranscript("");
    transcriptRef.current = "";
    setDrillStats(null);
    setTimeLeft(duration);
    pickNewTopic();

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = duration - elapsed;
      if (remaining <= 0) {
        handleSuccess();
      } else {
        setTimeLeft(remaining);
      }
    }, 250);

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

    const resetSilenceTimer = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => {
        if (isListeningRef.current) {
          restartDrill("3-second silence detected — keep speaking!");
        }
      }, 3000);
    };

    recognition.onresult = (event: any) => {
      if (!isListeningRef.current) return;
      resetSilenceTimer();
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full);
      transcriptRef.current = full;

      const lower = full.toLowerCase();
      for (const filler of FILLER_WORDS) {
        if (lower.includes(filler)) {
          restartDrill(`Detected filler word "${filler}"`);
          return;
        }
      }
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
    resetSilenceTimer();
  }, [cleanup, duration, handleSuccess, restartDrill, toast]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const stopDrill = () => {
    cleanup();
    setState("idle");
    setTimeLeft(duration);
    setTranscript("");
    transcriptRef.current = "";
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  const fillerChartData = drillStats
    ? Object.entries(drillStats.fillerWordsUsed).map(([word, count]) => ({ word, count }))
    : [];

  const wasSuccessful = drillStats && drillStats.totalFillers === 0 && drillStats.durationSeconds >= duration;

  return (
    <div className={`flex flex-col items-center gap-6 pb-8 transition-colors ${flash ? "flash-red" : ""}`}>
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

      {/* Topic Card — show in idle and running */}
      {state !== "completed" && (
        <Card className="glass-card glow-primary w-full max-w-2xl rounded-3xl">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Your Topic</p>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
              "{topic}"
            </h2>
          </CardContent>
        </Card>
      )}

      {/* Timer */}
      {state === "running" && (
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-32 w-32 items-center justify-center">
            <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={timeLeft <= 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${progress * 3.267} ${(100 - progress) * 3.267}`}
                className="transition-all duration-300"
              />
            </svg>
            <span className="text-3xl font-extrabold text-foreground">{timeLeft}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            seconds remaining
          </div>
        </div>
      )}

      {/* ===== POST-DRILL SUMMARY ===== */}
      {state === "completed" && drillStats && (
        <div className="w-full max-w-2xl space-y-4">
          {/* Header */}
          <Card className={`glass-card w-full rounded-3xl ${wasSuccessful ? "glow-success" : "glow-accent"}`}>
            <CardContent className="flex flex-col items-center gap-3 p-8">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${wasSuccessful ? "bg-success/15" : "bg-accent/15"}`}>
                {wasSuccessful
                  ? <Trophy className="h-8 w-8 text-success" />
                  : <RotateCcw className="h-8 w-8 text-accent" />
                }
              </div>
              <h3 className="text-xl font-extrabold text-foreground">
                {wasSuccessful ? "Amazing! 🎉" : "Almost there! 💪"}
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                {wasSuccessful
                  ? `You completed ${duration} seconds filler-free!`
                  : `You were stopped after ${drillStats.durationSeconds}s. Review your stats and try again.`
                }
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
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
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
                  : "Great pace! You're in the ideal range for clear communication."
                }
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
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {drillStats.transcript && (
            <Card className="glass-card rounded-2xl">
              <CardContent className="p-5 space-y-2">
                <span className="text-sm font-bold text-foreground">Your Transcript</span>
                <p className="text-sm text-secondary-foreground leading-relaxed">{drillStats.transcript}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {state === "idle" || state === "completed" ? (
          <Button
            size="lg"
            onClick={() => { setRestarts(state === "completed" ? restarts : 0); startDrill(); }}
            className="glow-primary rounded-2xl px-8 text-base font-bold"
          >
            <Play className="mr-2 h-5 w-5" />
            {state === "completed" ? "Try Again" : `Start ${duration}-Second Drill`}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            onClick={stopDrill}
            className="rounded-2xl px-8 text-base font-bold"
          >
            <Square className="mr-2 h-5 w-5" /> Stop
          </Button>
        )}
      </div>

      {/* Live Transcript */}
      {state === "running" && transcript && (
        <Card className="glass-card w-full max-w-2xl rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live Transcript</p>
            <p className="text-sm text-secondary-foreground leading-relaxed">{transcript}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
