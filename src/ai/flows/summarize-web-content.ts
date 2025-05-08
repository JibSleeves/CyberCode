
'use server';

/**
 * @fileOverview A web content summarization AI agent.
 *
 * - summarizeWebContent - A function that handles the web content summarization process.
 * - SummarizeWebContentInput - The input type for the summarizeWebContent function.
 * - SummarizeWebContentOutput - The return type for the summarizeWebContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getWebPageContent } from '@/services/web-content-service';

const SummarizeWebContentInputSchema = z.object({
  url: z.string().describe('The URL of the web page to summarize.'),
});
export type SummarizeWebContentInput = z.infer<typeof SummarizeWebContentInputSchema>;

const SummarizeWebContentOutputSchema = z.object({
  summary: z.string().describe('The summary of the web page content.'),
});
export type SummarizeWebContentOutput = z.infer<typeof SummarizeWebContentOutputSchema>;

export async function summarizeWebContent(input: SummarizeWebContentInput): Promise<SummarizeWebContentOutput> {
  return summarizeWebContentFlow(input);
}

// Updated prompt to handle potentially raw HTML content
const prompt = ai.definePrompt({
  name: 'summarizeWebContentPrompt',
  input: { schema: z.object({ content: z.string().describe("The HTML content of the web page.") }) },
  output: {schema: SummarizeWebContentOutputSchema},
  prompt: `You are an expert summarizer. You will be given the HTML content of a web page. Extract the main textual information and summarize it concisely. Ignore HTML tags, scripts, and styles if possible, focusing on the readable content.

Web page HTML content:
\`\`\`html
{{{content}}}
\`\`\`

Summary:`,
});

const summarizeWebContentFlow = ai.defineFlow(
  {
    name: 'summarizeWebContentFlow',
    inputSchema: SummarizeWebContentInputSchema,
    outputSchema: SummarizeWebContentOutputSchema,
  },
  async (input: SummarizeWebContentInput) => {
    const webPageContent = await getWebPageContent(input.url);
    // The LLM will attempt to parse and summarize from the HTML content.
    const {output} = await prompt({ content: webPageContent });
    if (!output) {
        throw new Error("The summarization prompt did not return an output.");
    }
    return output;
  }
);
