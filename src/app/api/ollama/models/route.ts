
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

// Explicitly define the hardcoded local Ollama URL the backend server will attempt to connect to.
const ACTUAL_OLLAMA_BACKEND_TARGET_URL = 'http://localhost:11434';

export async function GET() {
  console.log(`[Ollama API Route] GET request received. Backend attempting to connect to Ollama at: ${ACTUAL_OLLAMA_BACKEND_TARGET_URL}`);

  try {
    const response = await fetch(`${ACTUAL_OLLAMA_BACKEND_TARGET_URL}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add a timeout for the request in case Ollama is not responsive
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    if (!response.ok) {
      let errorBodyText = `(Could not read error body from Ollama at ${ACTUAL_OLLAMA_BACKEND_TARGET_URL})`;
      try {
        // Try to parse error from Ollama if available
        const ollamaError = await response.json();
        if (ollamaError && ollamaError.error) {
          errorBodyText = `Ollama service error: ${ollamaError.error}`;
        } else {
          errorBodyText = `Ollama service at ${ACTUAL_OLLAMA_BACKEND_TARGET_URL} returned status ${response.status} ${response.statusText}, but no specific error message in JSON body.`;
        }
      } catch (e) {
        // Fallback if parsing error response fails
        errorBodyText = `Ollama service at ${ACTUAL_OLLAMA_BACKEND_TARGET_URL} returned status ${response.status} ${response.statusText}. Additionally, failed to parse its error response body.`;
      }
      
      const fullErrorMsg = `Failed to fetch models from Ollama at ${ACTUAL_OLLAMA_BACKEND_TARGET_URL}. Details: ${errorBodyText}`;
      console.error(`[Ollama API Route] Non-OK response from Ollama (target: ${ACTUAL_OLLAMA_BACKEND_TARGET_URL}): ${fullErrorMsg}`);

      if (response.status === 503 || response.status === 404 || response.status >= 500) {
         return NextResponse.json({ error: `Ollama service at ${ACTUAL_OLLAMA_BACKEND_TARGET_URL} is likely unavailable or encountered an internal error. Status: ${response.status}. Message: ${errorBodyText}` }, { status: 503 });
      }
      return NextResponse.json({ error: `Error from Ollama service at ${ACTUAL_OLLAMA_BACKEND_TARGET_URL}. Status: ${response.status}. Message: ${errorBodyText}` }, { status: response.status });
    }

    const data: OllamaApiTagsResponse = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
        const invalidFormatMsg = `Invalid response format from Ollama API at ${ACTUAL_OLLAMA_BACKEND_TARGET_URL}. Expected 'models' array.`;
        console.error('[Ollama API Route]', invalidFormatMsg, 'Received:', data);
        return NextResponse.json({ error: invalidFormatMsg }, { status: 500 });
    }

    const formattedModels: FrontendOllamaModel[] = data.models.map(model => ({
      name: model.name,
      modified_at: model.modified_at,
      size: model.size,
    }));
    console.log(`[Ollama API Route] Successfully fetched ${formattedModels.length} models from ${ACTUAL_OLLAMA_BACKEND_TARGET_URL}.`);
    return NextResponse.json(formattedModels);

  } catch (error) { 
    const fetchErrorDetails = error instanceof Error ? error.message : String(error);
    // This is the most crucial error message for diagnosing the persistent issue.
    const connectionErrorMessage = `BACKEND_CONNECTION_ATTEMPT_FAILED: The Next.js backend API route attempted to connect to Ollama at the URL: '${ACTUAL_OLLAMA_BACKEND_TARGET_URL}'. This connection failed. Please ensure Ollama is running on the same server as the Next.js application and is accessible at this specific URL from the backend process. Raw fetch error details from backend: ${fetchErrorDetails}`;
    
    console.error(`[Ollama API Route] Fatal error trying to fetch from Ollama. Backend used URL: '${ACTUAL_OLLAMA_BACKEND_TARGET_URL}'. Full Error Message: ${connectionErrorMessage}`, error); 
    
    return NextResponse.json({ error: connectionErrorMessage }, { status: 503 }); // Service Unavailable for Ollama
  }
}

