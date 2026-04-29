import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  BarChart3,
  Zap,
  Monitor,
  BookOpen,
  Mic,
  MicOff,
  ChevronLeft,
  ChevronRight,
  Flame,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  // { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "Trainer", url: "/trainer", icon: Zap },
  // { title: "Teleprompter", url: "/teleprompter", icon: Monitor },
  // { title: "Lessons", url: "/lessons", icon: BookOpen },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  const toggleMic = async () => {
    if (micEnabled) {
      setMicEnabled(false);
      toast({ title: "Microphone disabled" });
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicEnabled(true);
      toast({ title: "Microphone enabled ✅", description: "Ready to capture speech" });
    } catch {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access in your browser settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
      {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-lg font-extrabold text-foreground tracking-tight">
              SpeakFlow
            </span>
          )}
        </div>

        {/* Streak badge */}
        {!collapsed && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-2xl bg-warning/15 px-3 py-2">
            <Star className="h-4 w-4 text-warning" />
            <span className="text-xs font-bold text-warning">7 day streak!</span>
          </div>
        )}

        <nav className="flex-1 space-y-1 p-3 mt-1">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-[1.02]"
              activeClassName="bg-primary/10 text-primary glow-primary"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent rounded-xl"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-56"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 backdrop-blur-xl px-6">
          <h2 className="text-base font-extrabold text-foreground">
            {navItems.find((n) => {
              if (n.url === "/") return location.pathname === "/";
              return location.pathname.startsWith(n.url);
            })?.title ?? "SpeakFlow"}
          </h2>

          <Button
            variant={micEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleMic}
            className={`rounded-xl font-bold ${micEnabled ? "glow-primary" : ""}`}
          >
            {micEnabled ? <Mic className="mr-2 h-4 w-4" /> : <MicOff className="mr-2 h-4 w-4" />}
            {micEnabled ? "Mic On" : "Mic Off"}
          </Button>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
