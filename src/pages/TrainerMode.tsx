import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, RotateCcw, Trophy, Zap } from "lucide-react";
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

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so,", "right,"];
const DRILL_DURATION = 60;

export default function TrainerMode() {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DRILL_DURATION);
  const [topic, setTopic] = useState(() => TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  const [transcript, setTranscript] = useState("");
  const [completed, setCompleted] = useState(false);
  const [flash, setFlash] = useState(false);
  const [restarts, setRestarts] = useState(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const pickNewTopic = () => {
    setTopic(TOPICS[Math.floor(Math.random() * TOPICS.length)]);
  };

  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
  };

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (silenceRef.current) clearTimeout(silenceRef.current);
  }, []);

  const restart = useCallback((reason: string) => {
    stopRecognition();
    triggerFlash();
    setRestarts((r) => r + 1);
    toast({
      title: "Restarting drill",
      description: reason,
      variant: "destructive",
    });
    pickNewTopic();
    setTimeLeft(DRILL_DURATION);
    setTranscript("");
    // Restart after a brief pause
    setTimeout(() => startDrill(), 800);
  }, [toast, stopRecognition]);

  const handleSuccess = useCallback(() => {
    stopRecognition();
    setRunning(false);
    setCompleted(true);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#3b82f6", "#8b5cf6", "#22c55e"],
    });
  }, [stopRecognition]);

  const startDrill = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Speech Recognition not supported",
        description: "Please use Chrome or Edge for this feature.",
        variant: "destructive",
      });
      return;
    }

    setRunning(true);
    setCompleted(false);
    setTranscript("");
    setTimeLeft(DRILL_DURATION);

    // Timer
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = DRILL_DURATION - elapsed;
      if (remaining <= 0) {
        handleSuccess();
      } else {
        setTimeLeft(remaining);
      }
    }, 250);

    // Speech Recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    const resetSilenceTimer = () => {
      if (silenceRef.current) clearTimeout(silenceRef.current);
      silenceRef.current = setTimeout(() => {
        restart("3-second silence detected — keep speaking!");
      }, 3000);
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimer();
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      setTranscript(full);

      const lower = full.toLowerCase();
      for (const filler of FILLER_WORDS) {
        if (lower.includes(filler)) {
          restart(`Detected filler word "${filler}"`);
          return;
        }
      }
    };

    recognition.onerror = () => {};
    recognition.onend = () => {
      // Restart recognition if still running
      if (recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    resetSilenceTimer();
  }, [handleSuccess, restart, toast]);

  useEffect(() => {
    return () => stopRecognition();
  }, [stopRecognition]);

  const handleStartStop = () => {
    if (running) {
      stopRecognition();
      setRunning(false);
    } else {
      pickNewTopic();
      setRestarts(0);
      startDrill();
    }
  };

  const progress = ((DRILL_DURATION - timeLeft) / DRILL_DURATION) * 100;

  return (
    <div className={`flex flex-col items-center justify-center min-h-[70vh] gap-8 transition-colors ${flash ? "flash-red" : ""}`}>
      {/* Topic */}
      <Card className="glass-card glow-primary w-full max-w-2xl">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <Zap className="h-8 w-8 text-primary" />
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Your Topic</p>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            "{topic}"
          </h2>
        </CardContent>
      </Card>

      {/* Timer */}
      {running && (
        <div className="flex flex-col items-center gap-2">
          <div className="relative flex h-28 w-28 items-center justify-center">
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
          <p className="text-sm text-muted-foreground">seconds remaining</p>
        </div>
      )}

      {/* Completed */}
      {completed && (
        <Card className="glass-card glow-success w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-3 p-6">
            <Trophy className="h-10 w-10 text-success" />
            <h3 className="font-display text-xl font-bold text-foreground">Congratulations!</h3>
            <p className="text-sm text-muted-foreground text-center">
              You completed 60 seconds without any filler words!
              {restarts > 0 && ` It took ${restarts + 1} attempt(s).`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <Button
        size="lg"
        onClick={handleStartStop}
        className={running ? "bg-destructive hover:bg-destructive/90" : "glow-primary"}
      >
        {running ? (
          <>
            <RotateCcw className="mr-2 h-5 w-5" /> Stop Drill
          </>
        ) : (
          <>
            <Play className="mr-2 h-5 w-5" /> Start 60-Second Drill
          </>
        )}
      </Button>

      {/* Live Transcript */}
      {running && transcript && (
        <Card className="glass-card w-full max-w-2xl">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live Transcript</p>
            <p className="text-sm text-secondary-foreground leading-relaxed">{transcript}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
