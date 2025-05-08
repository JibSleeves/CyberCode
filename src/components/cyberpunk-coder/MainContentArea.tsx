
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeAgentPane } from "./CodeAgentPane";
import { WebRAGPane } from "./WebRAGPane";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code2, Globe, Edit3, TerminalSquareIcon, AlertCircle } from "lucide-react";
import { EditableCodeEditor } from "./EditableCodeEditor";
import { useAppContext, type LogMessage as AppLogMessage } from "@/contexts/AppContext";
import { formatDistanceToNow } from 'date-fns';

const LogDisplayPane = () => {
  const { logMessages } = useAppContext();

  const getLogIcon = (type: AppLogMessage['type']) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
      case 'success':
        return <AlertCircle className="w-4 h-4 text-green-500 shrink-0" />; // Using AlertCircle for consistency, could be CheckCircle
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />;
      default:
        return <AlertCircle className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />;
    }
  };
  
  return (
    <div className="h-full flex flex-col p-4 bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] rounded-sm shadow-[0_0_10px_hsl(var(--primary)_/_0.3)]">
      <h3 className="text-lg font-semibold text-[hsl(var(--primary))] mb-2 cyber-glow-text-primary flex items-center">
        <TerminalSquareIcon className="w-5 h-5 mr-2"/> System Logs
      </h3>
      <ScrollArea className="flex-1 bg-[hsl(var(--input))] p-3 rounded-sm border border-[hsl(var(--border)/0.5)]">
        {logMessages.length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">No log messages yet.</p>
        ) : (
          <div className="space-y-2">
            {logMessages.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 text-xs text-[hsl(var(--foreground))]">
                {getLogIcon(log.type)}
                <span className="text-[hsl(var(--muted-foreground))] shrink-0">
                  [{formatDistanceToNow(log.timestamp, { addSuffix: true })}]
                </span>
                <p className="whitespace-pre-wrap break-words">{log.message}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};


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
            <Edit3 className="w-4 h-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger
            value="terminal"
            className="data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] data-[state=active]:shadow-[inset_0_0_5px_hsl(var(--primary-foreground)/0.5)] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent)/0.2)] px-4 py-2 rounded-none text-sm transition-colors duration-150"
          >
            <TerminalSquareIcon className="w-4 h-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="code-agent" className="flex-1 overflow-y-auto p-0 pt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
          <CodeAgentPane />
        </TabsContent>
        <TabsContent value="web-rag" className="flex-1 overflow-y-auto p-0 pt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
          <WebRAGPane />
        </TabsContent>
        <TabsContent value="editor" className="flex-1 overflow-y-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <EditableCodeEditor />
        </TabsContent>
        <TabsContent value="terminal" className="flex-1 overflow-y-auto p-0 focus-visible:ring-0 focus-visible:ring-offset-0">
           <LogDisplayPane />
        </TabsContent>
      </Tabs>
    </main>
  );
}
