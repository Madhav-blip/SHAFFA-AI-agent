"use client";

import { useEffect, useState, type ReactNode } from "react";
import TopBar from "@/components/shell/TopBar";
import Sidebar from "@/components/shell/Sidebar";
import RightPanel from "@/components/shell/RightPanel";
import CommandBar from "@/components/shell/CommandBar";
import Particles from "@/components/shell/Particles";
import BootSequence from "@/components/shell/BootSequence";
import { useJarvisStore } from "@/lib/store/jarvis";
import { tickAutomations } from "@/lib/automation/runner";

/** Full-screen blue glow while SHAFFA is listening. */
function ListeningFrame() {
  const listening = useJarvisStore((s) => s.coreState === "listening");
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-[95] transition-opacity duration-300 ${
        listening ? "opacity-100" : "opacity-0"
      }`}
    >
      {listening && (
        <div
          className="animate-listen absolute inset-0"
          style={{
            boxShadow:
              "inset 0 0 0 3px rgba(56,189,248,0.85), inset 0 0 28px rgba(56,189,248,0.35), inset 0 0 110px rgba(0,140,255,0.22)",
          }}
        />
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  // Mount gate: stores are persisted to localStorage, so client state differs
  // from the server-rendered empty state — render behind the boot overlay.
  const [mounted, setMounted] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __shaffa?: typeof useJarvisStore }).__shaffa = useJarvisStore;
    }
  }, []);

  // The automation runner — evaluates every enabled automation twice a minute.
  useEffect(() => {
    if (!mounted) return;
    const t = setInterval(tickAutomations, 30_000);
    return () => clearInterval(t);
  }, [mounted]);

  return (
    <div className="relative z-10 flex h-screen flex-col">
      {mounted && !booted && <BootSequence onDone={() => setBooted(true)} />}
      <ListeningFrame />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <Particles />
          <div className="relative flex-1 overflow-y-auto px-6 pt-5 pb-3">{mounted ? children : null}</div>
          <CommandBar />
        </main>
        {mounted && <RightPanel />}
      </div>
    </div>
  );
}
