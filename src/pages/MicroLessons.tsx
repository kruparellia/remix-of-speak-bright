import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pause,
  Wind,
  Mic2,
  Eye,
  MessageSquare,
  HandMetal,
  Brain,
  Heart,
} from "lucide-react";

const lessons = [
  {
    title: "The Power of the Pause",
    description: "Learn how strategic silence makes your message 3x more impactful.",
    icon: Pause,
    duration: "3 min",
    category: "Delivery",
  },
  {
    title: "Diaphragmatic Breathing",
    description: "Control your breath to project your voice and calm nerves.",
    icon: Wind,
    duration: "5 min",
    category: "Voice",
  },
  {
    title: "Voice Projection",
    description: "Fill the room without shouting — techniques from vocal coaches.",
    icon: Mic2,
    duration: "4 min",
    category: "Voice",
  },
  {
    title: "Eye Contact Mastery",
    description: "The 3-second rule and triangle technique for engaging audiences.",
    icon: Eye,
    duration: "3 min",
    category: "Body Language",
  },
  {
    title: "Eliminating Filler Words",
    description: "Replace 'um' and 'uh' with powerful pauses that command attention.",
    icon: MessageSquare,
    duration: "4 min",
    category: "Clarity",
  },
  {
    title: "Power Gestures",
    description: "Use hand movements to reinforce your message and appear confident.",
    icon: HandMetal,
    duration: "5 min",
    category: "Body Language",
  },
  {
    title: "Structuring Your Thoughts",
    description: "The PREP framework: Point, Reason, Example, Point — on the fly.",
    icon: Brain,
    duration: "6 min",
    category: "Structure",
  },
  {
    title: "Speaking with Empathy",
    description: "Connect emotionally with your audience by reading the room.",
    icon: Heart,
    duration: "4 min",
    category: "Connection",
  },
];

const categoryColors: Record<string, string> = {
  Delivery: "bg-primary/15 text-primary",
  Voice: "bg-accent/15 text-accent",
  "Body Language": "bg-success/15 text-success",
  Clarity: "bg-warning/15 text-warning",
  Structure: "bg-primary/15 text-primary",
  Connection: "bg-accent/15 text-accent",
};

export default function MicroLessons() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Micro-Lessons</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Quick, actionable tips to improve your speaking skills in minutes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {lessons.map((lesson) => (
          <Card
            key={lesson.title}
            className="glass-card group cursor-pointer transition-all duration-300 hover:border-primary/30 hover:glow-primary"
          >
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <lesson.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="secondary" className={`text-[10px] font-medium ${categoryColors[lesson.category] ?? ""}`}>
                  {lesson.category}
                </Badge>
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {lesson.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {lesson.description}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {lesson.duration} read
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
