// In a real application, you might use a library like Cheerio for more robust HTML parsing on the backend.
// For this service, we'll simply return the raw HTML content.

export async function getWebPageContent(url: string): Promise<string> {
  console.log(`Fetching content for URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CyberpunkCoder/1.0 (+https://example.com/bot)', // Be a good internet citizen
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      // Consider adding a timeout for the fetch request
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}. Status: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || (!contentType.includes('text/html') && !contentType.includes('text/plain'))) {
      // For simplicity, we only try to parse HTML or plain text.
      // In a real app, you might handle other types or use more sophisticated content extraction.
      console.warn(`Received non-HTML/text content type (${contentType}) for ${url}. Returning raw content if possible, or empty string.`);
      // Attempt to read as text anyway, or handle as appropriate
      const textContent = await response.text();
      return textContent || `Could not extract text content from ${url} with content type ${contentType}`;
    }

    const htmlContent = await response.text();

    // Basic text extraction (highly simplified, consider a proper HTML parser for production)
    // This is a very naive way to extract text and will not work well for complex pages.
    // A library like 'jsdom' or 'cheerio' would be better for server-side HTML parsing.
    // However, for Genkit prompts, often raw HTML (or a simplified version) can also be useful.
    // Let's return the HTML content itself, as the LLM might be able to parse it.
    // If pure text is needed, a more robust parsing step is required.
    // For now, we'll return the full HTML to give the LLM more to work with.
    // A simple text extraction might be:
    // const textOnly = htmlContent.replace(/<style[^>]*>.*<\/style>/gs, '') // remove style tags
    //                            .replace(/<script[^>]*>.*<\/script>/gs, '') // remove script tags
    //                            .replace(/<[^>]+>/g, ' ') // remove all other tags
    //                            .replace(/\s\s+/g, ' ') // replace multiple spaces with single
    //                            .trim();
    // return textOnly;

    return htmlContent;

  } catch (error) {
    console.error(`Error fetching web page content for ${url}:`, error);
    if (error instanceof Error) {
      throw new Error(`Error fetching ${url}: ${error.message}`);
    }
    throw new Error(`An unknown error occurred while fetching ${url}`);
  }
}
