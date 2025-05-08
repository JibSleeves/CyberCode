
import { NextResponse } from 'next/server';

// Define the structure of the raw model data from Ollama API
interface OllamaApiTagModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaApiTagsResponse {
  models: OllamaApiTagModel[];
}

// Define the structure expected by the frontend
interface FrontendOllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

const OLLAMA_API_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export async function GET() {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add a timeout for the request in case Ollama is not responsive
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    if (!response.ok) {
      let errorBody = 'Failed to fetch models from Ollama.';
      try {
        // Try to parse error from Ollama if available
        const ollamaError = await response.json();
        if (ollamaError && ollamaError.error) {
          errorBody = `Ollama API error: ${ollamaError.error}`;
        } else {
          errorBody = `Failed to fetch models from Ollama. Status: ${response.status} ${response.statusText}`;
        }
      } catch (e) {
        // Fallback if parsing error response fails
        errorBody = `Failed to fetch models from Ollama. Status: ${response.status} ${response.statusText}. Could not parse error response.`;
      }
      console.error(errorBody);
      // Check if the error is due to Ollama not being reachable
      if (response.status === 503 || response.status === 404 || (response.status >= 500 && response.status <=599 && errorBody.toLowerCase().includes("fetch failed")) ) {
         return NextResponse.json({ error: `Ollama API is not reachable at ${OLLAMA_API_URL}. Please ensure Ollama is running.` }, { status: 503 });
      }
      return NextResponse.json({ error: errorBody }, { status: response.status });
    }

    const data: OllamaApiTagsResponse = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
        console.error('Ollama API response does not contain a valid models array:', data);
        return NextResponse.json({ error: 'Invalid response format from Ollama API.' }, { status: 500 });
    }

    const formattedModels: FrontendOllamaModel[] = data.models.map(model => ({
      name: model.name,
      modified_at: model.modified_at,
      size: model.size,
    }));

    return NextResponse.json(formattedModels);
  } catch (error) {
    console.error('Failed to get Ollama models:', error);
    let errorMessage = 'Internal server error while fetching Ollama models.';
    if (error instanceof Error) {
        // Check for specific fetch errors like ECONNREFUSED
        if (error.message.includes('ECONNREFUSED') || error.name === 'TimeoutError' || error.message.toLowerCase().includes('fetch failed')) {
            errorMessage = `Ollama API is not reachable at ${OLLAMA_API_URL}. Please ensure Ollama is running. Details: ${error.message}`;
            return NextResponse.json({ error: errorMessage }, { status: 503 }); // Service Unavailable
        }
        errorMessage = error.message;
    }
    
    return NextResponse.json({ error: `Failed to list Ollama models: ${errorMessage}` }, { status: 500 });
  }
}
