
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

// Helper to ensure path is within SRC_DIR
function sanitizePath(relativePath: string): string | null {
  const absolutePath = path.join(SRC_DIR, relativePath);
  if (!absolutePath.startsWith(SRC_DIR + path.sep) && absolutePath !== SRC_DIR) {
    // Path traversal attempt or access outside src
    return null; 
  }
  return absolutePath;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const relativePath = searchParams.get('path');

  if (!relativePath) {
    return NextResponse.json({ error: 'File path is required' }, { status: 400 });
  }

  const filePath = sanitizePath(relativePath);
  if (!filePath) {
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(content, { headers: { 'Content-Type': 'text/plain' } });
  } catch (error) {
    console.error(`Failed to read file ${filePath}:`, error);
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to read file: ${err.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: relativePath, content } = body;

    if (!relativePath || typeof content !== 'string') {
      return NextResponse.json({ error: 'File path and content are required' }, { status: 400 });
    }

    const filePath = sanitizePath(relativePath);
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }
    
    // Ensure directory exists
    const dirName = path.dirname(filePath);
    try {
        await fs.mkdir(dirName, { recursive: true });
    } catch (mkdirError) {
        console.error(`Failed to create directory ${dirName}:`, mkdirError);
        const err = mkdirError as NodeJS.ErrnoException;
        return NextResponse.json({ error: `Failed to create directory for file: ${err.message}` }, { status: 500 });
    }


    await fs.writeFile(filePath, content, 'utf-8');
    return NextResponse.json({ message: 'File saved successfully' });
  } catch (error) {
    console.error('Failed to save file:', error);
    const err = error as NodeJS.ErrnoException;
    return NextResponse.json({ error: `Failed to save file: ${err.message}` }, { status: 500 });
  }
}
