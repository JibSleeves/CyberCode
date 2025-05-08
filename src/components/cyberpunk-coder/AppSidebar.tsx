
"use client";

import { useState, useEffect } from "react";
import type React from 'react';
import { FileText, Folder as FolderIcon, ChevronDown, ChevronRight, Settings, Bot, Loader2, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext, type FileSystemNode } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";

const FileSystemItem: React.FC<{ node: FileSystemNode; level?: number; onFileSelect: (path: string) => void }> = ({ node, level = 0, onFileSelect }) => {
  const [isOpen, setIsOpen] = useState(level < 1); // Auto-open first level

  const handleSelect = () => {
    if (node.type === "file") {
      onFileSelect(node.path);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div>
      <div
        className="flex items-center space-x-1 p-1.5 hover:bg-[hsl(var(--accent)/0.2)] cursor-pointer rounded-sm"
        style={{ paddingLeft: `${level * 1 + 0.375}rem` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelect();}}
        title={node.path}
      >
        {node.type === "folder" && (isOpen ? <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />)}
        {node.type === "folder" ? <FolderIcon className="w-4 h-4 text-[hsl(var(--primary))]" /> : <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === "folder" && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileSystemItem key={child.id} node={child} level={level + 1} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
};


export function AppSidebar() {
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash");
  const { setSelectedFilePath, fileTree, fetchFileTree, isLoadingFileTree, addLogMessage } = useAppContext();

  const handleFileSelect = (path: string) => {
    setSelectedFilePath(path);
    addLogMessage(`Selected file: ${path}`, 'info');
  };

  const handleRefreshTree = () => {
    fetchFileTree();
  };

  return (
    <aside className="w-72 bg-[hsl(var(--sidebar-background))] border-r-2 border-[hsl(var(--sidebar-border))] p-3 flex flex-col space-y-4 shadow-[2px_0_10px_hsl(var(--sidebar-primary)_/_0.7)] overflow-y-auto">
      <div className="flex items-center space-x-2">
        <Bot className="w-5 h-5 text-[hsl(var(--sidebar-primary))] cyber-glow-text-primary" />
        <h2 className="text-lg font-semibold text-[hsl(var(--sidebar-primary))] cyber-glow-text-primary">Model Config</h2>
      </div>
      <Select value={selectedModel} onValueChange={setSelectedModel}>
        <SelectTrigger className="w-full bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))]">
          <SelectValue placeholder="Select LLM Model" />
        </SelectTrigger>
        <SelectContent className="bg-[hsl(var(--popover))] border-[hsl(var(--border))] text-[hsl(var(--popover-foreground))]">
          <SelectItem value="ollama/llama3:8b" className="focus:bg-[hsl(var(--accent)/0.5)]">ollama/llama3:8b</SelectItem>
          <SelectItem value="ollama/codellama:7b-instruct" className="focus:bg-[hsl(var(--accent)/0.5)]">ollama/codellama:7b-instruct</SelectItem>
          <SelectItem value="ollama/gemma:2b" className="focus:bg-[hsl(var(--accent)/0.5)]">ollama/gemma:2b</SelectItem>
          <SelectItem value="google/gemini-2.0-flash" className="focus:bg-[hsl(var(--accent)/0.5)]">google/gemini-2.0-flash</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between space-x-2 mb-2">
          <div className="flex items-center space-x-2">
            <FolderIcon className="w-5 h-5 text-[hsl(var(--sidebar-primary))] cyber-glow-text-primary" />
            <h2 className="text-lg font-semibold text-[hsl(var(--sidebar-primary))] cyber-glow-text-primary">File Explorer (src)</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefreshTree} disabled={isLoadingFileTree} className="h-7 w-7 text-[hsl(var(--sidebar-primary))] hover:text-[hsl(var(--accent))]">
            {isLoadingFileTree ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="sr-only">Refresh File Tree</span>
          </Button>
        </div>
        <ScrollArea className="flex-1 pr-2">
          {isLoadingFileTree && fileTree.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
            </div>
          ) : fileTree.length === 0 && !isLoadingFileTree ? (
             <p className="text-sm text-[hsl(var(--muted-foreground))] p-2">No files found or error loading tree.</p>
          ) : (
            fileTree.map((node) => (
              <FileSystemItem key={node.id} node={node} onFileSelect={handleFileSelect} />
            ))
          )}
        </ScrollArea>
      </div>

      <div className="mt-auto pt-4 border-t border-[hsl(var(--border)/0.3)]">
        <button className="w-full flex items-center justify-center space-x-2 p-2 rounded-sm hover:bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--muted-foreground))]">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
