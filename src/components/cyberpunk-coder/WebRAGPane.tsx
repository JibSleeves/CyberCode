"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { summarizeWebContent, type SummarizeWebContentInput } from "@/ai/flows/summarize-web-content";
import { Loader2, Search, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

export function WebRAGPane() {
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!url) {
      toast({
        title: "URL Missing",
        description: "Please enter a URL to summarize.",
        variant: "destructive",
      });
      return;
    }
    // Basic URL validation
    try {
      new URL(url);
    } catch (_) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSummary("");

    try {
      const input: SummarizeWebContentInput = { url };
      const result = await summarizeWebContent(input);
      setSummary(result.summary);
      toast({
        title: "Content Summarized",
        description: "Web page content has been summarized.",
      });
    } catch (error) {
      console.error("Error summarizing web content:", error);
      setSummary("Error: Could not summarize web content. The URL might be inaccessible or the content too large.");
      toast({
        title: "Error",
        description: "Failed to summarize web content. Check console for details.",
        variant: "destructive",
      });
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
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="url"
            placeholder="Enter URL (e.g., https://example.com/article)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))]"
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.8)] focus:ring-[hsl(var(--ring))]"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Fetch & Summarize
          </Button>
        </CardContent>
      </Card>

      {summary && (
         <Card className="flex-1 bg-[hsl(var(--card)/0.8)] border-[hsl(var(--border))] flex flex-col">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--primary))]">Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full w-full rounded-md border border-[hsl(var(--border)/0.5)] p-3 bg-[hsl(var(--input))]">
              <p className="whitespace-pre-wrap text-sm text-[hsl(var(--foreground))]">
                {summary}
              </p>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
