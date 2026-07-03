"use client";

import type { ReactNode } from "react";
import TopBar from "@/components/shell/TopBar";
import Sidebar from "@/components/shell/Sidebar";
import RightPanel from "@/components/shell/RightPanel";
import CommandBar from "@/components/shell/CommandBar";
import Particles from "@/components/shell/Particles";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 flex h-screen flex-col">
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
