
'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export function EditableCodeEditor() {
  const {
    selectedFilePath,
    fileContent,
    isLoadingFile,
    saveFileContent,
    fetchFileContent, // Added to allow re-fetching
    addLogMessage,
  } = useAppContext();
  const [editableContent, setEditableContent] = useState<string>('');

  useEffect(() => {
    if (fileContent !== null) {
      setEditableContent(fileContent);
    } else {
      setEditableContent('');
    }
  }, [fileContent]);

  const handleSave = async () => {
    if (selectedFilePath) {
      const success = await saveFileContent(selectedFilePath, editableContent);
      if (success) {
        addLogMessage(`Successfully saved ${selectedFilePath}`, 'success');
      } else {
        addLogMessage(`Failed to save ${selectedFilePath}`, 'error');
      }
    }
  };

  const handleRefresh = () => {
    if (selectedFilePath) {
      addLogMessage(`Refreshing content for ${selectedFilePath}`, 'info');
      fetchFileContent(selectedFilePath);
    }
  }

  if (!selectedFilePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] rounded-sm text-[hsl(var(--muted-foreground))]">
        <AlertTriangle className="w-12 h-12 mb-4 text-[hsl(var(--primary))]" />
        <p className="text-lg">No file selected.</p>
        <p>Please select a file from the explorer to view or edit its content.</p>
      </div>
    );
  }

  if (isLoadingFile && fileContent === null) { // Show loader only on initial load
    return (
      <div className="flex items-center justify-center h-full p-4 bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] rounded-sm">
        <Loader2 className="w-12 h-12 animate-spin text-[hsl(var(--primary))]" />
        <p className="ml-4 text-lg text-[hsl(var(--primary))]">Loading file...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 bg-[hsl(var(--card)/0.8)] border border-[hsl(var(--border))] rounded-sm shadow-[0_0_10px_hsl(var(--primary)_/_0.3)]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-[hsl(var(--primary))] cyber-glow-text-primary truncate" title={selectedFilePath}>
          Editor: {selectedFilePath}
        </h3>
        <div className="space-x-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isLoadingFile}
            className="border-[hsl(var(--border))] hover:bg-[hsl(var(--accent)/0.3)]"
          >
            Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoadingFile || editableContent === fileContent}
            size="sm"
            className="bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary)/0.8)]"
          >
            {isLoadingFile && editableContent !== fileContent ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 bg-[hsl(var(--input))] rounded-sm border border-[hsl(var(--border)/0.5)]">
        <Textarea
          value={editableContent}
          onChange={(e) => setEditableContent(e.target.value)}
          className="w-full h-full p-3 font-mono text-sm text-[hsl(var(--foreground))] bg-transparent border-0 focus:ring-0 resize-none"
          placeholder="File content will appear here..."
          spellCheck="false"
        />
      </ScrollArea>
    </div>
  );
}
