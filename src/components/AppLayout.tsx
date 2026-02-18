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
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { title: "Dashboard", url: "/", icon: BarChart3 },
  { title: "Trainer Mode", url: "/trainer", icon: Zap },
  { title: "Teleprompter", url: "/teleprompter", icon: Monitor },
  { title: "Micro-Lessons", url: "/lessons", icon: BookOpen },
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
      toast({ title: "Microphone enabled", description: "Ready to capture speech" });
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
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
          <Sparkles className="h-6 w-6 shrink-0 text-primary" />
          {!collapsed && (
            <span className="font-display text-lg font-bold text-foreground">
              SpeakFlow
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeClassName="bg-primary/10 text-primary font-medium glow-primary"
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
            className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`flex flex-1 flex-col transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {navItems.find((n) => {
              if (n.url === "/") return location.pathname === "/";
              return location.pathname.startsWith(n.url);
            })?.title ?? "SpeakFlow"}
          </h2>

          <Button
            variant={micEnabled ? "default" : "outline"}
            size="sm"
            onClick={toggleMic}
            className={micEnabled ? "glow-primary" : ""}
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
