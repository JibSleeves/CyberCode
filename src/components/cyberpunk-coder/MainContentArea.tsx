"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeAgentPane } from "./CodeAgentPane";
import { WebRAGPane } from "./WebRAGPane";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, Globe, Info } from "lucide-react";

// A mock code editor / terminal output pane
const MockEditorTerminal = ({ content, title }: { content: string; title: string }) => (
  <div className="h-full flex flex-col p-4 bg-[hsl(var(--background))] border-2 border-[hsl(var(--primary))] rounded-md shadow-[0_0_15px_hsl(var(--primary)_/_0.5)]">
    <h3 className="text-lg font-semibold text-[hsl(var(--primary))] mb-2 cyber-glow-text-primary">{title}</h3>
    <ScrollArea className="flex-1 bg-black/50 p-3 rounded-sm">
      <pre className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap">{content}</pre>
    </ScrollArea>
  </div>
);

const placeholderCode = `function greet(name: string) {
  console.log(\`Hello, \${name}!\`);
}

greet("Cyberpunk Coder");
`;

const placeholderTerminalOutput = `> node script.js
Hello, Cyberpunk Coder!
Execution finished.
`;

export function MainContentArea() {
  return (
    <main className="flex-1 p-4 bg-[hsl(var(--background))] overflow-hidden">
      <Tabs defaultValue="code-agent" className="h-full flex flex-col">
        <TabsList className="bg-[hsl(var(--sidebar-background))] border-b-2 border-[hsl(var(--primary))] rounded-none justify-start p-0">
          <TabsTrigger
            value="code-agent"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-4 py-2 rounded-none text-sm"
          >
            <Code2 className="w-4 h-4 mr-2" />
            Code Agent
          </TabsTrigger>
          <TabsTrigger
            value="web-rag"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-4 py-2 rounded-none text-sm"
          >
            <Globe className="w-4 h-4 mr-2" />
            Web RAG
          </TabsTrigger>
           <TabsTrigger
            value="editor"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-4 py-2 rounded-none text-sm"
          >
            <Info className="w-4 h-4 mr-2" />
            Mock Editor
          </TabsTrigger>
          <TabsTrigger
            value="terminal"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] px-4 py-2 rounded-none text-sm"
          >
            <Info className="w-4 h-4 mr-2" />
            Mock Terminal
          </TabsTrigger>
        </TabsList>
        <TabsContent value="code-agent" className="flex-1 overflow-y-auto p-4 mt-0">
          <CodeAgentPane />
        </TabsContent>
        <TabsContent value="web-rag" className="flex-1 overflow-y-auto p-4 mt-0">
          <WebRAGPane />
        </TabsContent>
        <TabsContent value="editor" className="flex-1 overflow-y-auto p-4 mt-0">
          <MockEditorTerminal title="Code Editor (Mock)" content={placeholderCode} />
        </TabsContent>
        <TabsContent value="terminal" className="flex-1 overflow-y-auto p-4 mt-0">
           <MockEditorTerminal title="Terminal Output (Mock)" content={placeholderTerminalOutput} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
