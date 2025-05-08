import { AppHeader } from "@/components/cyberpunk-coder/AppHeader";
import { AppSidebar } from "@/components/cyberpunk-coder/AppSidebar";
import { MainContentArea } from "@/components/cyberpunk-coder/MainContentArea";

export default function CyberpunkCoderPage() {
  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <MainContentArea />
      </div>
    </div>
  );
}
