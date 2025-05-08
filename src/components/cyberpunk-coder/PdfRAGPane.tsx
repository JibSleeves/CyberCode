
"use client";

import { useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { processPdfAndQuery, type ProcessPdfAndQueryInput } from "@/ai/flows/process-pdf-and-query";
import { Loader2, FileQuestion, UploadCloud, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppContext } from "@/contexts/AppContext";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function PdfRAGPane() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addLogMessage } = useAppContext();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid File Type", description: "Please select a PDF file.", variant: "destructive" });
        addLogMessage("PDF RAG: Invalid file type selected.", "warning");
        setSelectedFile(null);
        setFilePreview(null);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Please select a PDF file smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        addLogMessage(`PDF RAG: File too large selected (${(file.size / (1024*1024)).toFixed(2)}MB).`, "warning");
        setSelectedFile(null);
        setFilePreview(null);
        return;
      }
      setSelectedFile(file);
      setFilePreview(file.name); // Show file name as preview
      addLogMessage(`PDF RAG: Selected file - ${file.name}`, "info");
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast({ title: "No PDF Selected", description: "Please select a PDF file to query.", variant: "destructive" });
      addLogMessage("PDF RAG: Submit attempted without PDF.", "warning");
      return;
    }
    if (!query) {
      toast({ title: "Query Missing", description: "Please enter a question about the PDF.", variant: "destructive" });
      addLogMessage("PDF RAG: Submit attempted without query.", "warning");
      return;
    }

    setIsLoading(true);
    setAiResponse("");
    addLogMessage(`PDF RAG: Processing PDF "${selectedFile.name}" with query "${query.substring(0,50)}..."`, "info");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(selectedFile);
      reader.onloadend = async () => {
        const pdfDataUri = reader.result as string;
        const input: ProcessPdfAndQueryInput = { pdfDataUri, query };
        const result = await processPdfAndQuery(input);
        setAiResponse(result.answer);
        toast({ title: "Query Processed", description: "AI response received for your PDF query." });
        addLogMessage("PDF RAG: Query processed successfully.", "success");
        setIsLoading(false); 
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        throw new Error("Failed to read the PDF file.");
      }
    } catch (error) {
      console.error("Error processing PDF query:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setAiResponse(`Error: Could not process your PDF query. ${errorMessage}`);
      toast({ title: "Error", description: `PDF query failed. ${errorMessage}`, variant: "destructive" });
      addLogMessage(`PDF RAG: Error processing query - ${errorMessage}`, "error");
      setIsLoading(false);
    }
    // Note: setIsLoading(false) is called inside onloadend or catch for async filereader
  };

  return (
    <div className="flex flex-col space-y-4 h-full">
      <Card className="bg-[hsl(var(--card)/0.8)] border-[hsl(var(--border))]">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--primary))] flex items-center space-x-2">
            <FileQuestion className="w-6 h-6" />
            <span>Query PDF (RAG)</span>
          </CardTitle>
          <CardDescription className="text-[hsl(var(--muted-foreground))]">
            Upload a PDF document and ask questions about its content. (Current implementation is a placeholder)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="pdf-upload" className="text-sm font-medium text-[hsl(var(--foreground))]">
              Upload PDF (Max {MAX_FILE_SIZE_MB}MB)
            </label>
            <div className="flex items-center space-x-2">
              <Input
                id="pdf-upload"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))] file:mr-2 file:py-1.5 file:px-3 file:rounded-sm file:border-0 file:text-xs file:font-semibold file:bg-[hsl(var(--primary))] file:text-[hsl(var(--primary-foreground))] hover:file:bg-[hsl(var(--primary)/0.8)]"
              />
               {selectedFile && (
                <Button variant="outline" size="icon" onClick={() => {setSelectedFile(null); setFilePreview(null); (document.getElementById('pdf-upload') as HTMLInputElement).value = ''; }} className="border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent)/0.3)]">
                  <UploadCloud className="w-4 h-4 text-red-500" />
                  <span className="sr-only">Clear file</span>
                </Button>
              )}
            </div>
            {filePreview && <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Selected: {filePreview}</p>}
          </div>
          
          <Textarea
            placeholder="Ask a question about the PDF content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[80px] bg-[hsl(var(--input))] border-[hsl(var(--border))] text-[hsl(var(--foreground))] focus:ring-[hsl(var(--ring))]"
            rows={3}
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !selectedFile || !query}
            className="w-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.8)] focus:ring-[hsl(var(--ring))]"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Process & Ask
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
       {!aiResponse && !isLoading && selectedFile && (
         <div className="flex-1 flex items-center justify-center text-center p-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                PDF selected. Enter your query above and click "Process & Ask".
            </p>
         </div>
        )}
    </div>
  );
}
