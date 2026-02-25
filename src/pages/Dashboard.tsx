import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Target,
  Lightbulb,
  Zap,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface DrillSession {
  id: string;
  created_at: string;
  topic: string;
  difficulty: string;
  duration_seconds: number;
  word_count: number;
  wpm: number;
  total_fillers: number;
  filler_words: Record<string, number>;
  pause_count: number;
  clarity_score: number;
  completed: boolean;
  ai_relevance: number | null;
  ai_coherence: number | null;
  ai_quality: number | null;
  ai_summary: string | null;
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<DrillSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("drill_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) {
        setSessions(data as any as DrillSession[]);
      }
      setLoading(false);
    };
    fetchSessions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const avgWpm = totalSessions > 0 ? Math.round(sessions.reduce((a, s) => a + s.wpm, 0) / totalSessions) : 0;
  const avgClarity = totalSessions > 0 ? Math.round(sessions.reduce((a, s) => a + s.clarity_score, 0) / totalSessions) : 0;
  const totalFillers = sessions.reduce((a, s) => a + s.total_fillers, 0);

  // Calculate streak (consecutive days with at least one session)
  const uniqueDays = new Set(sessions.map(s => new Date(s.created_at).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (uniqueDays.has(d.toDateString())) {
      streak++;
    } else if (i > 0) break; // allow today to not have a session yet
  }

  // WPM over recent sessions (last 7)
  const recentSessions = [...sessions].reverse().slice(-7);
  const paceData = recentSessions.map((s, i) => ({
    session: `#${i + 1}`,
    wpm: s.wpm,
  }));

  // Aggregate filler words across all sessions
  const fillerAgg: Record<string, number> = {};
  sessions.forEach(s => {
    const fw = s.filler_words as Record<string, number>;
    if (fw && typeof fw === "object") {
      Object.entries(fw).forEach(([word, count]) => {
        fillerAgg[word] = (fillerAgg[word] || 0) + (count as number);
      });
    }
  });
  const fillerData = Object.entries(fillerAgg)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  // Insights based on real data
  const insights: { icon: typeof Lightbulb; text: string }[] = [];
  if (totalSessions === 0) {
    insights.push({ icon: Lightbulb, text: "Complete your first drill in Trainer Mode to start tracking your progress!" });
  } else {
    if (totalFillers > 0) {
      const topFiller = Object.entries(fillerAgg).sort((a, b) => b[1] - a[1])[0];
      if (topFiller) {
        insights.push({ icon: Lightbulb, text: `Your most common filler is "${topFiller[0]}" (${topFiller[1]} times). Focus on pausing instead.` });
      }
    }
    if (avgWpm < 100) {
      insights.push({ icon: Target, text: `Your average pace is ${avgWpm} WPM — try speaking a bit faster. Aim for 120-160 WPM.` });
    } else if (avgWpm > 180) {
      insights.push({ icon: Target, text: `Your average pace is ${avgWpm} WPM — that's quite fast. Try slowing down for clarity.` });
    } else {
      insights.push({ icon: Target, text: `Great pace! Your average ${avgWpm} WPM is in the ideal conversational range.` });
    }
    if (avgClarity < 70) {
      insights.push({ icon: Zap, text: `Your clarity score is ${avgClarity}/100. Practice the 60-second drill daily to improve.` });
    } else {
      insights.push({ icon: Zap, text: `Solid clarity at ${avgClarity}/100! Keep pushing toward 90+.` });
    }
  }

  const stats = [
    { label: "Sessions", value: String(totalSessions), icon: Clock, change: `${completedSessions} completed` },
    { label: "Avg WPM", value: String(avgWpm), icon: TrendingUp, change: totalSessions > 0 ? "across all drills" : "—" },
    { label: "Clarity Score", value: String(avgClarity), icon: Target, change: totalSessions > 0 ? "average" : "—" },
    { label: "Streak", value: streak > 0 ? `${streak} day${streak > 1 ? "s" : ""}` : "0", icon: Zap, change: streak > 0 ? "Keep going!" : "Start today!" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xs text-success mt-0.5">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Clarity Score */}
      <Card className="glass-card glow-primary">
        <CardContent className="flex flex-col items-center gap-4 p-8 sm:flex-row sm:gap-8">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${avgClarity * 3.267} ${(100 - avgClarity) * 3.267}`}
              />
            </svg>
            <span className="text-3xl font-bold font-display text-foreground">{avgClarity}</span>
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-display text-xl font-bold text-foreground">Overall Clarity Score</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalSessions === 0
                ? "Complete some drills to see your clarity score here."
                : `Based on ${totalSessions} session${totalSessions > 1 ? "s" : ""}. ${totalFillers} total filler words detected.`}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Progress value={avgClarity} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{avgClarity}/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Pace (WPM) — Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {paceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={paceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="session" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wpm"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No sessions yet. Start a drill to see data here.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Top Filler Words Used</CardTitle>
          </CardHeader>
          <CardContent>
            {fillerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={fillerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="word" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">No filler words detected yet. Great job — or start a drill!</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actionable Insights */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Actionable Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.map((insight, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            >
              <insight.icon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <p className="text-sm text-secondary-foreground">{insight.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
