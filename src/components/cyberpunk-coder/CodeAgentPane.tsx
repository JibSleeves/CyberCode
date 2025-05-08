
"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { askCodeQuestion, type AskCodeQuestionInput } from "@/ai/flows/ask-code-question";
import { Loader2, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";

export function CodeAgentPane() {
  const [taskDescription, setTaskDescription] = useState("");
  const [codeContext, setCodeContext] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addLogMessage } = useAppContext();

  const handleSubmit = async () => {
    if (!taskDescription) {
      toast({
        title: "Task Description Missing",
        description: "Please describe the code task you want to perform.",
        variant: "destructive",
      });
      addLogMessage("Code Agent: Task description missing.", "warning");
      return;
    }

    setIsLoading(true);
    setAiResponse("");
    addLogMessage(`Code Agent: Executing task - "${taskDescription.substring(0,50)}..."`, "info");

    try {
      const input: AskCodeQuestionInput = {
        question: taskDescription,
        codebaseContext: codeContext || "No specific code provided, answering based on general knowledge or the question itself.",
      };
      const result = await askCodeQuestion(input);
      setAiResponse(result.answer);
      toast({
        title: "Task Executed",
        description: "AI response received.",
      });
      addLogMessage("Code Agent: Task executed successfully, response received.", "success");
    } catch (error) {
      console.error("Error executing code agent task:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setAiResponse(`Error: Could not get response from AI agent. ${errorMessage}`);
      toast({
        title: "Error",
        description: `Failed to get response from AI agent. ${errorMessage}`,
        variant: "destructive",
      });
      addLogMessage(`Code Agent: Error executing task - ${errorMessage}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <Card className="bg-[hsl(var(--card)/0.8)] border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--primary))] flex items-center space-x-2">
            <Wand2 className="w-6 h-6" />
            <span>Code Task Agent</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Describe your code task (e.g., 'Analyze this code for bugs', 'Refactor this function for readability', 'Explain this regex')..."
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            className="min-h-[100px] bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))]"
            rows={4}
          />
          <Textarea
            placeholder="Paste relevant code here (optional)..."
            value={codeContext}
            onChange={(e) => setCodeContext(e.target.value)}
            className="min-h-[150px] bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))] font-mono"
            rows={8}
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.8)] focus:ring-[hsl(var(--ring))]"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Execute Task
          </Button>
        </CardContent>
      </Card>

      {aiResponse && (
        <Card className="flex-1 bg-[hsl(var(--card)/0.8)] border-[hsl(var(--border))] flex flex-col">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--primary))]">AI Response</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0">
            <ScrollArea className="h-full w-full rounded-md border border-[hsl(var(--border)/0.5)] p-3 bg-[hsl(var(--input))]">
              <pre className="whitespace-pre-wrap text-sm text-[hsl(var(--foreground))]">
                {aiResponse}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
