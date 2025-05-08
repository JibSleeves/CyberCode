"use client";

import { Terminal } from "lucide-react";

export function AppHeader() {
  return (
    <header className="p-3 border-b border-[hsl(var(--primary))] shadow-[0_1px_8px_hsl(var(--primary)_/_0.7)] flex items-center space-x-2 bg-[hsl(var(--background))] relative z-10">
      <Terminal className="w-7 h-7 text-[hsl(var(--primary))] cyber-glow-text-primary" />
      <h1 className="text-2xl font-bold text-[hsl(var(--primary))] cyber-glow-text-primary tracking-wider">
        Cyberpunk Coder
      </h1>
    </header>
  );
}
