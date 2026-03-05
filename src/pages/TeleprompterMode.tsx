import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Gauge, Sparkles, Volume2, Type, AlignJustify, Zap } from "lucide-react";

const DEFAULT_TEXT = `Good morning everyone. Today I want to talk about the power of clear communication. In every aspect of our lives, from personal relationships to professional settings, the ability to express our thoughts with clarity and confidence is one of the most valuable skills we can develop.

Think about the last time someone truly captivated you with their words. What made their message stand out? It wasn't just what they said — it was how they said it. The pacing, the pauses, the energy behind every sentence.

Studies show that the most effective speakers use deliberate pauses to emphasize key points. They vary their tone to keep the audience engaged. And most importantly, they practice. Every great speaker you admire has spent countless hours refining their craft.

So today, let's commit to becoming better communicators. Let's practice with intention. Let's embrace the discomfort of growth. And let's remember that every word we speak is an opportunity to connect, inspire, and make a difference.

Thank you.`;

type DisplayMode = "scroll" | "rsvp";

export default function TeleprompterMode() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [playing, setPlaying] = useState(false);
  const [wpm, setWpm] = useState([140]);
  const [fontSize, setFontSize] = useState([22]);
  const [mode, setMode] = useState<DisplayMode>("scroll");

  // Scroll mode state
  const [scrollPos, setScrollPos] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // RSVP mode state
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const rsvpIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const words = text.split(/\s+/).filter(Boolean);

  // Feedback metrics (simulated)
  const [pace, setPace] = useState(50);
  const [clarity, setClarity] = useState(82);
  const [energy, setEnergy] = useState(65);

  // --- Scroll mode ---
  const startScrolling = useCallback(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const pxPerSec = (wpm[0] / 150) * 40;
    intervalRef.current = setInterval(() => {
      setScrollPos((prev) => {
        const next = prev + pxPerSec / 20;
        if (next >= el.scrollHeight - el.clientHeight) {
          setPlaying(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        el.scrollTop = next;
        return next;
      });
    }, 50);
  }, [wpm]);

  const stopScrolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // --- RSVP mode ---
  const startRsvp = useCallback(() => {
    const msPerWord = 60000 / wpm[0];
    rsvpIntervalRef.current = setInterval(() => {
      setCurrentWordIndex((prev) => {
        if (prev >= words.length - 1) {
          setPlaying(false);
          if (rsvpIntervalRef.current) clearInterval(rsvpIntervalRef.current);
          return prev;
        }
        return prev + 1;
      });
    }, msPerWord);
  }, [wpm, words.length]);

  const stopRsvp = () => {
    if (rsvpIntervalRef.current) clearInterval(rsvpIntervalRef.current);
  };

  // --- Unified controls ---
  const togglePlay = () => {
    if (playing) {
      mode === "scroll" ? stopScrolling() : stopRsvp();
      setPlaying(false);
    } else {
      setPlaying(true);
      mode === "scroll" ? startScrolling() : startRsvp();
    }
  };

  const resetAll = () => {
    stopScrolling();
    stopRsvp();
    setPlaying(false);
    setScrollPos(0);
    setCurrentWordIndex(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  // Switch mode resets playback
  const switchMode = (newMode: DisplayMode) => {
    resetAll();
    setMode(newMode);
  };

  // Simulate feedback updates while playing
  useEffect(() => {
    if (!playing) return;
    const sim = setInterval(() => {
      setPace((p) => Math.min(100, Math.max(0, p + (Math.random() - 0.48) * 8)));
      setClarity((c) => Math.min(100, Math.max(60, c + (Math.random() - 0.45) * 5)));
      setEnergy((e) => Math.min(100, Math.max(30, e + (Math.random() - 0.47) * 6)));
    }, 800);
    return () => clearInterval(sim);
  }, [playing]);

  useEffect(() => {
    return () => { stopScrolling(); stopRsvp(); };
  }, []);

  const paceLabel = pace < 35 ? "Too Slow" : pace > 70 ? "Too Fast" : "Perfect";
  const paceColor = pace < 35 ? "text-warning" : pace > 70 ? "text-destructive" : "text-success";
  const energyLabel = energy < 40 ? "Low" : energy > 75 ? "High" : "Good";
  const energyColor = energy < 40 ? "text-warning" : energy > 75 ? "text-primary" : "text-success";

  const rsvpProgress = words.length > 0 ? ((currentWordIndex + 1) / words.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
      {/* Teleprompter — Left */}
      <div className="flex-[7] space-y-4">
        {/* Script Input */}
        <Card className="glass-card">
          <CardContent className="p-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your script here..."
              className="min-h-[100px] resize-none border-none bg-transparent text-sm text-foreground focus-visible:ring-0"
            />
          </CardContent>
        </Card>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "scroll" ? "default" : "outline"}
            onClick={() => switchMode("scroll")}
            className="flex-1"
          >
            <AlignJustify className="mr-2 h-4 w-4" />
            Scroll Mode
          </Button>
          <Button
            variant={mode === "rsvp" ? "default" : "outline"}
            onClick={() => switchMode("rsvp")}
            className="flex-1"
          >
            <Zap className="mr-2 h-4 w-4" />
            Speed Read
          </Button>
        </div>

        {/* Display Area */}
        <Card className="glass-card glow-primary relative overflow-hidden">
          {mode === "scroll" ? (
            <div
              ref={scrollRef}
              className="h-[400px] overflow-hidden p-8"
            >
              <p
                className="whitespace-pre-line leading-relaxed text-foreground/90 font-medium"
                style={{ fontSize: `${fontSize[0]}px` }}
              >
                {text}
              </p>
            </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center p-8 relative">
              <p
                className="font-bold text-foreground text-center transition-all duration-75 select-none"
                style={{ fontSize: `${Math.max(fontSize[0] * 1.8, 36)}px` }}
              >
                {words[currentWordIndex] || "Ready"}
              </p>
              <div className="absolute bottom-4 inset-x-8">
                <Progress value={rsvpProgress} className="h-1.5" />
                <p className="text-xs text-muted-foreground text-center mt-1.5">
                  {currentWordIndex + 1} / {words.length} words
                </p>
              </div>
            </div>
          )}
          {/* Gradient overlay (scroll mode only) */}
          {mode === "scroll" && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-card to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent" />
            </>
          )}
        </Card>

        {/* Controls */}
        <Card className="glass-card">
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={togglePlay} className={playing ? "" : "glow-primary"}>
                {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button variant="outline" onClick={resetAll}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
              <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={wpm}
                  onValueChange={setWpm}
                  min={60}
                  max={600}
                  step={5}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-24 text-right">{wpm[0]} WPM</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Type className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={fontSize}
                onValueChange={setFontSize}
                min={14}
                max={48}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-24 text-right">{fontSize[0]}px</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Feedback — Right */}
      <div className="flex-[3] space-y-4">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Live Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> Pace
                </span>
                <span className={`font-medium ${paceColor}`}>{paceLabel}</span>
              </div>
              <Progress value={pace} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Clarity
                </span>
                <span className="font-medium text-foreground">{Math.round(clarity)}%</span>
              </div>
              <Progress value={clarity} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5" /> Energy
                </span>
                <span className={`font-medium ${energyColor}`}>{energyLabel}</span>
              </div>
              <Progress value={energy} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="glass-card">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Pro Tips</p>
            <ul className="space-y-2 text-sm text-secondary-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                {mode === "rsvp" ? "Focus on the centre — don't move your eyes." : "Breathe at every period."}
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                {mode === "rsvp" ? "Start at 200 WPM, then push higher." : "Look up from the script every 2 sentences."}
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                {mode === "rsvp" ? "Use speed reading to memorise key phrases." : "Slow down on key points."}
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
