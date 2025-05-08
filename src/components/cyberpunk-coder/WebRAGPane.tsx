"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { summarizeWebContent, type SummarizeWebContentInput, type SummarizeWebContentOutput } from "@/ai/flows/summarize-web-content";
import { Loader2, Search, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";

export function WebRAGPane() {
  const [url, setUrl] = useState("");
  const [aiResponse, setAiResponse] = useState<SummarizeWebContentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null); // To store the URL that was processed
  const { toast } = useToast();
  const { addLogMessage } = useAppContext();

  const handleSubmit = async () => {
    if (!url) {
      toast({ title: "URL Missing", description: "Please enter a URL to summarize.", variant: "destructive" });
      addLogMessage("Web RAG: URL missing for summarization.", "warning");
      return;
    }
    try {
      new URL(url); // Basic URL validation
    } catch (_) {
      toast({ title: "Invalid URL", description: "Please enter a valid URL (e.g., https://example.com).", variant: "destructive" });
      addLogMessage(`Web RAG: Invalid URL provided - ${url}`, "warning");
      return;
    }

    setIsLoading(true);
    setAiResponse(null);
    setCurrentUrl(url); // Store the URL being processed
    addLogMessage(`Web RAG: Fetching and summarizing URL - ${url}`, "info");

    try {
      const input: SummarizeWebContentInput = { url };
      const result = await summarizeWebContent(input);
      setAiResponse(result);
      toast({ title: "Content Summarized", description: `Web page content from ${url} has been summarized.` });
      addLogMessage(`Web RAG: Successfully summarized ${url}. Title: ${result.title || 'N/A'}`, "success");
    } catch (error) {
      console.error("Error summarizing web content:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setAiResponse({ summary: `Error: Could not summarize web content. ${errorMessage}` });
      toast({ title: "Summarization Error", description: `Failed to summarize web content. ${errorMessage}`, variant: "destructive" });
      addLogMessage(`Web RAG: Error summarizing ${url} - ${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <Card className="bg-[hsl(var(--card)/0.8)] border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--primary))] flex items-center space-x-2">
            <Search className="w-6 h-6" />
            <span>Web Content Summarizer (RAG)</span>
          </CardTitle>
          <CardDescription className="text-[hsl(var(--muted-foreground))]">
            Enter a public URL to fetch its content and generate a summary using an AI model.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex space-x-2">
            <Input
              type="url"
              placeholder="Enter URL (e.g., https://example.com/article)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))] flex-grow"
              disabled={isLoading}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !url}
              className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.8)] focus:ring-[hsl(var(--ring))] shrink-0"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Fetch & Summarize
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--primary))] mb-4" />
          <p className="text-lg text-[hsl(var(--primary))]">Summarizing content from:</p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] break-all">{currentUrl}</p>
        </div>
      )}

      {!isLoading && aiResponse && (
         <Card className="flex-1 bg-[hsl(var(--card)/0.8)] border-[hsl(var(--border))] flex flex-col">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--primary))]">
              {aiResponse.title ? `Summary of: ${aiResponse.title}` : "Summary"}
            </CardTitle>
            {currentUrl && (
                 <a 
                    href={currentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-[hsl(var(--accent))] hover:underline flex items-center space-x-1"
                >
                    <span>{currentUrl}</span>
                    <ExternalLink className="w-3 h-3"/>
                </a>
            )}
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full w-full rounded-md border border-[hsl(var(--border)/0.5)] p-3 bg-[hsl(var(--input))]">
              <p className="whitespace-pre-wrap text-sm text-[hsl(var(--foreground))]">
                {aiResponse.summary}
              </p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      {!isLoading && !aiResponse && (
         <div className="flex-1 flex items-center justify-center text-center p-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Enter a URL above and click "Fetch & Summarize" to see results.
            </p>
         </div>
      )}
    </div>
  );
}