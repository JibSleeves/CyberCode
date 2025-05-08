"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeAgentPane } from "./CodeAgentPane";
import { WebRAGPane } from "./WebRAGPane";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, Globe, Info, TerminalSquareIcon } from "lucide-react"; // Changed Terminal to TerminalSquareIcon for variety

// A mock code editor / terminal output pane
const MockEditorTerminal = ({ content, title }: { content: string; title: string }) => (
  <div className="h-full flex flex-col p-4 bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] rounded-sm shadow-[0_0_10px_hsl(var(--primary)_/_0.3)]">
    <h3 className="text-lg font-semibold text-[hsl(var(--primary))] mb-2 cyber-glow-text-primary">{title}</h3>
    <ScrollArea className="flex-1 bg-[hsl(var(--input))] p-3 rounded-sm border border-[hsl(var(--border)/0.5)]">
      <pre className="text-sm text-[hsl(var(--foreground))] whitespace-pre-wrap">{content}</pre>
    </ScrollArea>
  </div>
);

const placeholderCode = `function greet(name: string) {
  // Welcome to the Grid, user.
  console.log(\`> Accessing matrix... \${name} online.\`);
}

greet("NetRunner_01");
`;

const placeholderTerminalOutput = `> initialize_system --verbose
System Check: OK
Neural Link: Active
ICE Breaker Suite: Loaded
> run greet_script.js
> Accessing matrix... NetRunner_01 online.
> Execution complete. Standby.
`;

export function MainContentArea() {
  return (
    <main className="flex-1 p-4 bg-[hsl(var(--background))] overflow-hidden">
      <Tabs defaultValue="code-agent" className="h-full flex flex-col">
        <TabsList className="bg-[hsl(var(--sidebar-background))] border-b border-[hsl(var(--primary))] rounded-none justify-start p-0">
          <TabsTrigger
            value="code-agent"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] data-[state=active]:shadow-[inset_0_0_5px_hsl(var(--primary-foreground)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.2)] px-4 py-2 rounded-none text-sm transition-colors duration-150"
          >
            <Code2 className="w-4 h-4 mr-2" />
            Code Agent
          </TabsTrigger>
          <TabsTrigger
            value="web-rag"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] data-[state=active]:shadow-[inset_0_0_5px_hsl(var(--primary-foreground)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.2)] px-4 py-2 rounded-none text-sm transition-colors duration-150"
          >
            <Globe className="w-4 h-4 mr-2" />
            Web RAG
          </TabsTrigger>
           <TabsTrigger
            value="editor"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] data-[state=active]:shadow-[inset_0_0_5px_hsl(var(--primary-foreground)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.2)] px-4 py-2 rounded-none text-sm transition-colors duration-150"
          >
            <Info className="w-4 h-4 mr-2" />
            Mock Editor
          </TabsTrigger>
          <TabsTrigger
            value="terminal"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] data-[state=active]:shadow-[inset_0_0_5px_hsl(var(--primary-foreground)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.2)] px-4 py-2 rounded-none text-sm transition-colors duration-150"
          >
            <TerminalSquareIcon className="w-4 h-4 mr-2" />
            Mock Terminal
          </TabsTrigger>
        </TabsList>
        <TabsContent value="code-agent" className="flex-1 overflow-y-auto p-4 mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <CodeAgentPane />
        </TabsContent>
        <TabsContent value="web-rag" className="flex-1 overflow-y-auto p-4 mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <WebRAGPane />
        </TabsContent>
        <TabsContent value="editor" className="flex-1 overflow-y-auto p-4 mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <MockEditorTerminal title="Code Editor (Mock)" content={placeholderCode} />
        </TabsContent>
        <TabsContent value="terminal" className="flex-1 overflow-y-auto p-4 mt-0 focus-visible:ring-0 focus-visible:ring-offset-0">
           <MockEditorTerminal title="Terminal Output (Mock)" content={placeholderTerminalOutput} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
