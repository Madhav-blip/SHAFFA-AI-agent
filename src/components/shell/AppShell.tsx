"use client";

import { useEffect, type ReactNode } from "react";
import TopBar from "@/components/shell/TopBar";
import Sidebar from "@/components/shell/Sidebar";
import RightPanel from "@/components/shell/RightPanel";
import CommandBar from "@/components/shell/CommandBar";
import Particles from "@/components/shell/Particles";
import { useJarvisStore } from "@/lib/store/jarvis";

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
  // Dev-only handle for driving the store from the browser console / tests.
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __shaffa?: typeof useJarvisStore }).__shaffa = useJarvisStore;
    }
  }, []);

  return (
    <div className="relative z-10 flex h-screen flex-col">
      <ListeningFrame />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex min-w-0 flex-1 flex-col">
          <Particles />
          <div className="relative flex-1 overflow-y-auto px-6 pt-5 pb-3">{children}</div>
          <CommandBar />
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
