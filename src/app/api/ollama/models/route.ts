
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

// Construct the Ollama API URL from parts to ensure it's http://localhost:11434
const OLLAMA_PROTOCOL = 'http';
const OLLAMA_HOST = 'localhost'; // This should be 'localhost' or '127.0.0.1' for Ollama
const OLLAMA_PORT = '11434';
const EFFECTIVE_OLLAMA_API_URL = `${OLLAMA_PROTOCOL}://${OLLAMA_HOST}:${OLLAMA_PORT}`;

export async function GET() {
  console.log(`[Ollama API Route] GET request received. Attempting to connect to Ollama at: ${EFFECTIVE_OLLAMA_API_URL}`);

  try {
    const response = await fetch(`${EFFECTIVE_OLLAMA_API_URL}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add a timeout for the request in case Ollama is not responsive
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });

    if (!response.ok) {
      let errorBodyText = `(Could not read error body from Ollama at ${EFFECTIVE_OLLAMA_API_URL})`;
      try {
        // Try to parse error from Ollama if available
        const ollamaError = await response.json();
        if (ollamaError && ollamaError.error) {
          errorBodyText = `Ollama service error: ${ollamaError.error}`;
        } else {
          errorBodyText = `Ollama service returned status ${response.status} ${response.statusText}, but no specific error message in JSON body.`;
        }
      } catch (e) {
        // Fallback if parsing error response fails
        errorBodyText = `Ollama service returned status ${response.status} ${response.statusText}. Additionally, failed to parse its error response body.`;
      }
      
      const fullErrorMsg = `Failed to fetch models from Ollama at ${EFFECTIVE_OLLAMA_API_URL}. Details: ${errorBodyText}`;
      console.error(`[Ollama API Route] Non-OK response from Ollama: ${fullErrorMsg}`);

      // Check if the error is due to Ollama not being reachable or a clear server-side issue with Ollama
      // Distinguish between Ollama being down (likely 503 from our fetch) vs. Ollama itself returning an error status
      if (response.status === 503 || response.status === 404 || response.status >= 500) {
         return NextResponse.json({ error: `Ollama service at ${EFFECTIVE_OLLAMA_API_URL} is likely unavailable or encountered an internal error. Status: ${response.status}. Message: ${errorBodyText}` }, { status: 503 });
      }
      // For other client-side errors from Ollama (e.g., 400, 401)
      return NextResponse.json({ error: `Error from Ollama service at ${EFFECTIVE_OLLAMA_API_URL}. Status: ${response.status}. Message: ${errorBodyText}` }, { status: response.status });
    }

    const data: OllamaApiTagsResponse = await response.json();

    if (!data.models || !Array.isArray(data.models)) {
        const invalidFormatMsg = `Invalid response format from Ollama API at ${EFFECTIVE_OLLAMA_API_URL}. Expected 'models' array.`;
        console.error('[Ollama API Route]', invalidFormatMsg, 'Received:', data);
        return NextResponse.json({ error: invalidFormatMsg }, { status: 500 });
    }

    const formattedModels: FrontendOllamaModel[] = data.models.map(model => ({
      name: model.name,
      modified_at: model.modified_at,
      size: model.size,
    }));
    console.log(`[Ollama API Route] Successfully fetched ${formattedModels.length} models from ${EFFECTIVE_OLLAMA_API_URL}.`);
    return NextResponse.json(formattedModels);

  } catch (error) { // This catch block is for when the fetch TO EFFECTIVE_OLLAMA_API_URL itself fails (e.g. network error, Ollama service not running)
    const fetchErrorDetails = error instanceof Error ? error.message : String(error);
    // This is the most likely error message structure the user is seeing.
    const connectionErrorMessage = `Failed to connect to Ollama at ${EFFECTIVE_OLLAMA_API_URL}. Please ensure Ollama is running locally on the server. Details: ${fetchErrorDetails}`;
    console.error(`[Ollama API Route] Fatal error trying to fetch from Ollama (EFFECTIVE_OLLAMA_API_URL was ${EFFECTIVE_OLLAMA_API_URL}):`, connectionErrorMessage, error); // Log the full error object for more context
    
    // If fetch failed (e.g. ECONNREFUSED, Timeout), it means Ollama isn't running or isn't reachable at that address from the server.
    return NextResponse.json({ error: connectionErrorMessage }, { status: 503 }); // Service Unavailable for Ollama
  }
}
