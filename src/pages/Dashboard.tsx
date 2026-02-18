import {
  BarChart3,
  TrendingUp,
  Target,
  Lightbulb,
  Zap,
  Clock,
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

const paceData = [
  { day: "Mon", wpm: 128 },
  { day: "Tue", wpm: 135 },
  { day: "Wed", wpm: 122 },
  { day: "Thu", wpm: 140 },
  { day: "Fri", wpm: 138 },
  { day: "Sat", wpm: 145 },
  { day: "Sun", wpm: 142 },
];

const fillerData = [
  { word: "Um", count: 45 },
  { word: "Uh", count: 22 },
  { word: "Like", count: 15 },
  { word: "You know", count: 12 },
  { word: "So", count: 8 },
];

const insights = [
  {
    icon: Lightbulb,
    text: "You tend to say 'um' when starting a new sentence. Try pausing instead.",
  },
  {
    icon: Target,
    text: "Your speaking pace is improving! Aim for 130-150 WPM for conversational clarity.",
  },
  {
    icon: Zap,
    text: "Practice the 60-second drill daily to reduce filler words by 30% this week.",
  },
];

const stats = [
  { label: "Sessions", value: "24", icon: Clock, change: "+3 this week" },
  { label: "Avg WPM", value: "138", icon: TrendingUp, change: "+8 vs last week" },
  { label: "Clarity Score", value: "85", icon: Target, change: "+5 points" },
  { label: "Streak", value: "7 days", icon: Zap, change: "Personal best!" },
];

export default function Dashboard() {
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
                strokeDasharray={`${85 * 3.267} ${(100 - 85) * 3.267}`}
              />
            </svg>
            <span className="text-3xl font-bold font-display text-foreground">85</span>
          </div>
          <div className="text-center sm:text-left">
            <h3 className="font-display text-xl font-bold text-foreground">Overall Clarity Score</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your communication clarity has improved by 5 points this week. Keep practicing
              to reach your 90-point goal!
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Progress value={85} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">85/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Pace (WPM) — Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={paceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display text-base">Top Filler Words Used</CardTitle>
          </CardHeader>
          <CardContent>
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
