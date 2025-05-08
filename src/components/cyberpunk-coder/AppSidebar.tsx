"use client";

import { useState } from "react";
import { FileText, Folder, ChevronDown, ChevronRight, Settings, Bot } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileSystemNode {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileSystemNode[];
}

const mockFileTree: FileSystemNode[] = [
  {
    id: "1",
    name: "src",
    type: "folder",
    children: [
      { id: "1.1", name: "app", type: "folder", children: [
        { id: "1.1.1", name: "page.tsx", type: "file" },
        { id: "1.1.2", name: "layout.tsx", type: "file" },
      ]},
      { id: "1.2", name: "components", type: "folder", children: [
        { id: "1.2.1", name: "Button.tsx", type: "file" },
      ]},
      { id: "1.3", name: "index.ts", type: "file" },
    ],
  },
  { id: "2", name: "public", type: "folder", children: [
    { id: "2.1", name: "favicon.ico", type: "file" },
  ]},
  { id: "3", name: "package.json", type: "file" },
  { id: "4", name: "README.md", type: "file" },
];

const FileSystemItem = ({ node, level = 0 }: { node: FileSystemNode; level?: number }) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Auto-open first level

  if (node.type === "folder") {
    return (
      <div>
        <div
          className="flex items-center space-x-1 p-1.5 hover:bg-[hsl(var(--accent)/0.3)] cursor-pointer rounded-sm"
          style={{ paddingLeft: `${level * 1 + 0.375}rem` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
          <Folder className="w-4 h-4 text-[hsl(var(--primary))]" />
          <span>{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <FileSystemItem key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center space-x-1 p-1.5 hover:bg-[hsl(var(--accent)/0.3)] cursor-pointer rounded-sm"
      style={{ paddingLeft: `${level * 1 + 0.375}rem` }}
    >
      <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      <span>{node.name}</span>
    </div>
  );
};


export function AppSidebar() {
  const [selectedModel, setSelectedModel] = useState("ollama-llama3-8b");

  return (
    <aside className="w-72 bg-[hsl(var(--sidebar-background))] border-r-2 border-[hsl(var(--primary))] p-3 flex flex-col space-y-4 shadow-[2px_0_10px_hsl(var(--primary))] overflow-y-auto">
      <div className="flex items-center space-x-2">
        <Bot className="w-5 h-5 text-[hsl(var(--primary))]" />
        <h2 className="text-lg font-semibold text-[hsl(var(--primary))]">Model Configuration</h2>
      </div>
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger className="w-full bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))]">
          <SelectValue placeholder="Select LLM Model" />
        </SelectTrigger>
        <SelectContent className="bg-[hsl(var(--popover))] border-[hsl(var(--border))] text-[hsl(var(--popover-foreground))]">
          <SelectItem value="ollama-llama3-8b" className="focus:bg-[hsl(var(--accent)/0.5)]">Ollama Llama3-8B</SelectItem>
          <SelectItem value="ollama-codellama-7b" className="focus:bg-[hsl(var(--accent)/0.5)]">Ollama CodeLlama-7B</SelectItem>
          <SelectItem value="ollama-gemma-2b" className="focus:bg-[hsl(var(--accent)/0.5)]">Ollama Gemma-2B</SelectItem>
          <SelectItem value="mock-gpt4" className="focus:bg-[hsl(var(--accent)/0.5)]">Mock GPT-4 Turbo</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center space-x-2 mb-2">
          <Folder className="w-5 h-5 text-[hsl(var(--primary))]" />
          <h2 className="text-lg font-semibold text-[hsl(var(--primary))]">File Explorer</h2>
        </div>
        <ScrollArea className="flex-1 pr-2">
          {mockFileTree.map((node) => (
            <FileSystemItem key={node.id} node={node} />
          ))}
        </ScrollArea>
      </div>

      <div className="mt-auto pt-4 border-t border-[hsl(var(--border)/0.5)]">
        <button className="w-full flex items-center justify-center space-x-2 p-2 rounded-md hover:bg-[hsl(var(--accent)/0.3)] text-[hsl(var(--muted-foreground))]">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
