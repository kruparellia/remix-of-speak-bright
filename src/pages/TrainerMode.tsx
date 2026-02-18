import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trophy, Zap, Timer, Star } from "lucide-react";
import confetti from "canvas-confetti";

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

export default function TrainerMode() {
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [state, setState] = useState<"idle" | "running" | "completed">("idle");
  const [timeLeft, setTimeLeft] = useState(DIFFICULTY_CONFIG.beginner.seconds);
  const [topic, setTopic] = useState(() => TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  const [transcript, setTranscript] = useState("");
  const [flash, setFlash] = useState(false);
  const [restarts, setRestarts] = useState(0);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
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
    cleanup();
    setState("completed");
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#58cc02", "#1cb0f6", "#ff9600"] });
  }, [cleanup]);

  const restartDrill = useCallback((reason: string) => {
    cleanup();
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    setRestarts((r) => r + 1);
    toast({ title: "Restarting drill", description: reason, variant: "destructive" });

    // Reset state but stay in running — user must press Start again
    pickNewTopic();
    setTimeLeft(duration);
    setTranscript("");
    setState("idle");
  }, [cleanup, toast, duration]);

  const startDrill = useCallback(() => {
    cleanup();
    setState("running");
    setTranscript("");
    setTimeLeft(duration);
    pickNewTopic();

    // Timer
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

    // Speech Recognition
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
      // "no-speech" is handled by onend restart
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
  };

  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className={`flex flex-col items-center gap-6 pb-8 transition-colors ${flash ? "flash-red" : ""}`}>
      {/* Difficulty Selector */}
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

      {/* Topic Card */}
      <Card className="glass-card glow-primary w-full max-w-2xl rounded-3xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your Topic</p>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            "{topic}"
          </h2>
        </CardContent>
      </Card>

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
            <span className="font-display text-3xl font-bold text-foreground">{timeLeft}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            seconds remaining
          </div>
        </div>
      )}

      {/* Completed */}
      {state === "completed" && (
        <Card className="glass-card glow-success w-full max-w-md rounded-3xl">
          <CardContent className="flex flex-col items-center gap-3 p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <Trophy className="h-8 w-8 text-success" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">Amazing! 🎉</h3>
            <p className="text-sm text-muted-foreground text-center">
              You completed {duration} seconds without any filler words!
            </p>
            {restarts > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Star className="h-3.5 w-3.5" />
                Completed after {restarts + 1} attempt(s)
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        {state === "idle" || state === "completed" ? (
          <Button
            size="lg"
            onClick={() => { setRestarts(0); startDrill(); }}
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
