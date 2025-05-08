
import { NextResponse } from 'next/server';

// In a real application, this endpoint would interact with the Ollama API.
// For example, by running `ollama list` command or calling Ollama's HTTP API.
// This mock implementation provides a static list for UI development.

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

const MOCK_OLLAMA_MODELS: OllamaModel[] = [
  { name: 'llama3:latest', modified_at: '2024-05-01T10:00:00Z', size: 4700000000 },
  { name: 'codellama:7b-instruct', modified_at: '2024-04-25T14:30:00Z', size: 3800000000 },
  { name: 'mistral:latest', modified_at: '2024-05-05T08:15:00Z', size: 4100000000 },
  { name: 'gemma:2b', modified_at: '2024-04-20T12:00:00Z', size: 1400000000 },
  { name: 'phi3:mini', modified_at: '2024-05-10T18:45:00Z', size: 2200000000 },
];

export async function GET() {
  try {
    // Simulate an API call to Ollama
    await new Promise(resolve => setTimeout(resolve, 500));

    // In a real scenario, you would use something like:
    // const ollamaResponse = await fetch('http://localhost:11434/api/tags');
    // if (!ollamaResponse.ok) throw new Error('Failed to fetch models from Ollama');
    // const data = await ollamaResponse.json();
    // const models = data.models;

    return NextResponse.json(MOCK_OLLAMA_MODELS.map(m => ({ name: m.name, modified_at: m.modified_at, size: m.size })));
  } catch (error) {
    console.error('Failed to get Ollama models:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: `Failed to list Ollama models: ${errorMessage}` }, { status: 500 });
  }
}
