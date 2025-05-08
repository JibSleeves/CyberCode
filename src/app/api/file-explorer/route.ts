
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { FileSystemNode } from '@/contexts/AppContext';

const SRC_DIR = path.join(process.cwd(), 'src');

async function getFileTree(dirPath: string, relativePathBase: string = ''): Promise<FileSystemNode[]> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const nodes: FileSystemNode[] = [];

    for (const entry of entries) {
      // Skip node_modules and .next, .git, etc.
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      // Path relative to SRC_DIR for client-side identification
      const relativePath = path.join(relativePathBase, entry.name); 

      if (entry.isDirectory()) {
        nodes.push({
          id: relativePath,
          name: entry.name,
          type: 'folder',
          path: relativePath,
          children: await getFileTree(fullPath, relativePath),
        });
      } else {
        nodes.push({
          id: relativePath,
          name: entry.name,
          type: 'file',
          path: relativePath,
        });
      }
    }
    // Sort folders first, then files, alphabetically
    return nodes.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    // If a subdirectory is not readable, return empty for that part of the tree
    return []; 
  }
}

export async function GET() {
  try {
    if (!(await fs.stat(SRC_DIR)).isDirectory()) {
        return NextResponse.json({ error: 'src directory not found or is not a directory' }, { status: 500 });
    }
    const fileTree = await getFileTree(SRC_DIR);
    return NextResponse.json(fileTree);
  } catch (error) {
    console.error('Failed to get file tree:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: `Failed to list files: ${errorMessage}` }, { status: 500 });
  }
}
