"use client";

import { Terminal } from "lucide-react";

export function AppHeader() {
  return (
    <header className="p-3 border-b-2 border-[hsl(var(--primary))] shadow-[0_2px_10px_hsl(var(--primary))] flex items-center space-x-2 bg-[hsl(var(--background))] relative z-10">
      <Terminal className="w-7 h-7 text-[hsl(var(--primary))] cyber-glow-text-primary" />
      <h1 className="text-2xl font-bold text-[hsl(var(--primary))] cyber-glow-text-primary tracking-wider">
        Cyberpunk Coder
      </h1>
    </header>
  );
}
