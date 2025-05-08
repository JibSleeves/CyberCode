// This is a MOCK service. In a real application, you would use a library like
// axios or the built-in fetch API to get the content of a web page.
// For local development or specific scenarios, you might use puppeteer or similar
// tools if you need to render JavaScript, but for basic HTML content, a simple GET request is often enough.
// DuckDuckGo and LangChain integrations are more complex and would involve using their respective APIs/SDKs.

export async function getWebPageContent(url: string): Promise<string> {
  console.log(`Mock fetching content for URL: ${url}`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Basic validation and mock responses
  if (url.includes("example.com")) {
    return `
      <html>
        <head><title>Example Domain</title></head>
        <body>
          <h1>Example Domain</h1>
          <p>This domain is for use in illustrative examples in documents. You may use this
          domain in literature without prior coordination or asking for permission.</p>
          <p><a href="https://www.iana.org/domains/example">More information...</a></p>
        </body>
      </html>
    `;
  } else if (url.includes("nonexistentpage12345.org")) {
    throw new Error(`Mock Error: Failed to fetch ${url}. Not Found.`);
  } else if (url.includes("mock-ai-blog.com")) {
    return `
      <html>
        <head><title>The Future of AI in Coding</title></head>
        <body>
          <h1>The Future of AI in Coding</h1>
          <p>Artificial Intelligence is rapidly changing the landscape of software development. From code generation to automated testing and debugging, AI tools are becoming indispensable for modern programmers.</p>
          <article>
            <h2>AI-Powered Code Completion</h2>
            <p>Tools like GitHub Copilot and Tabnine offer intelligent code suggestions, significantly speeding up the development process. They learn from vast amountses of code to predict what you're trying to write.</p>
          </article>
          <article>
            <h2>Automated Refactoring</h2>
            <p>AI can analyze code for inefficiencies or anti-patterns and suggest or even perform refactoring automatically. This helps maintain code quality and reduce technical debt.</p>
          </article>
          <footer>
            <p>Published on ${new Date().toLocaleDateString()}.</p>
          </footer>
        </body>
      </html>
    `;
  }

  // Default mock content for other URLs
  return `
    <html>
      <head><title>Mock Web Page: ${url}</title></head>
      <body>
        <h1>Mock Content for ${url}</h1>
        <p>This is placeholder content. In a real application, this would be the actual HTML content of the fetched page.</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        <p>Key features of this page might include: advanced topics, detailed explanations, and interactive examples. Cyberpunk themes often involve neon lights and futuristic technology.</p>
      </body>
    </html>
  `;
}
