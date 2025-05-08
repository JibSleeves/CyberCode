
'use client';

import type React from 'react';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface FileSystemNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string; // Relative path from project src
  children?: FileSystemNode[];
}

export interface LogMessage {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning';
}

interface AppContextType {
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  fileContent: string | null;
  setFileContent: (content: string | null) => void;
  isLoadingFile: boolean;
  fetchFileContent: (path: string) => Promise<void>;
  saveFileContent: (path: string, content: string) => Promise<boolean>;
  logMessages: LogMessage[];
  addLogMessage: (message: string, type?: LogMessage['type']) => void;
  refreshFileTreeSignal: number; // Signal to refresh file tree
  triggerFileTreeRefresh: () => void;
  fileTree: FileSystemNode[];
  fetchFileTree: () => Promise<void>;
  isLoadingFileTree: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedFilePath, setSelectedFilePathState] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);
  const [refreshFileTreeSignal, setRefreshFileTreeSignal] = useState(0);
  const [fileTree, setFileTree] = useState<FileSystemNode[]>([]);
  const [isLoadingFileTree, setIsLoadingFileTree] = useState(false);
  const { toast } = useToast();

  const addLogMessage = useCallback((message: string, type: LogMessage['type'] = 'info') => {
    setLogMessages((prevLogs) => [
      { id: Date.now().toString(), timestamp: new Date(), message, type },
      ...prevLogs,
    ].slice(0, 100)); // Keep last 100 logs
  }, []);

  const fetchFileTree = useCallback(async () => {
    setIsLoadingFileTree(true);
    addLogMessage('Fetching file explorer tree...', 'info');
    try {
      const response = await fetch('/api/file-explorer');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      const data: FileSystemNode[] = await response.json();
      setFileTree(data);
      addLogMessage('File explorer tree loaded.', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch file tree:', error);
      addLogMessage(`Error fetching file tree: ${errorMessage}`, 'error');
      toast({ title: 'File Explorer Error', description: `Could not load file tree: ${errorMessage}`, variant: 'destructive' });
      setFileTree([]);
    } finally {
      setIsLoadingFileTree(false);
    }
  }, [addLogMessage, toast]);

  useEffect(() => {
    fetchFileTree();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshFileTreeSignal]); // Also fetch on signal change

  const setSelectedFilePath = (path: string | null) => {
    setSelectedFilePathState(path);
    if (path) {
      fetchFileContent(path);
    } else {
      setFileContent(null);
    }
  };

  const fetchFileContent = useCallback(async (path: string) => {
    setIsLoadingFile(true);
    addLogMessage(`Fetching content for: ${path}`, 'info');
    try {
      const response = await fetch(`/api/file-content?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}. ${errorText}`);
      }
      const content = await response.text();
      setFileContent(content);
      addLogMessage(`Content loaded for: ${path}`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch file content:', error);
      setFileContent(`Error loading file: ${errorMessage}`);
      addLogMessage(`Error loading file ${path}: ${errorMessage}`, 'error');
      toast({ title: 'File Error', description: `Could not load file ${path}: ${errorMessage}`, variant: 'destructive' });
    } finally {
      setIsLoadingFile(false);
    }
  }, [addLogMessage, toast]);

  const saveFileContent = useCallback(async (path: string, content: string): Promise<boolean> => {
    setIsLoadingFile(true);
    addLogMessage(`Saving content for: ${path}`, 'info');
    try {
      const response = await fetch('/api/file-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save file: ${response.status} ${response.statusText}. ${errorText}`);
      }
      await response.json(); // Assuming server sends back { message: 'File saved' }
      setFileContent(content); // Update local content state
      addLogMessage(`File saved: ${path}`, 'success');
      toast({ title: 'File Saved', description: `${path} has been saved successfully.` });
      triggerFileTreeRefresh(); // Refresh file tree in case of new file creation (though not supported yet)
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to save file content:', error);
      addLogMessage(`Error saving file ${path}: ${errorMessage}`, 'error');
      toast({ title: 'Save Error', description: `Could not save file ${path}: ${errorMessage}`, variant: 'destructive' });
      return false;
    } finally {
      setIsLoadingFile(false);
    }
  }, [addLogMessage, toast]);

  const triggerFileTreeRefresh = () => {
    setRefreshFileTreeSignal(prev => prev + 1);
  };

  return (
    <AppContext.Provider
      value={{
        selectedFilePath,
        setSelectedFilePath,
        fileContent,
        setFileContent,
        isLoadingFile,
        fetchFileContent,
        saveFileContent,
        logMessages,
        addLogMessage,
        refreshFileTreeSignal,
        triggerFileTreeRefresh,
        fileTree,
        fetchFileTree,
        isLoadingFileTree,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
