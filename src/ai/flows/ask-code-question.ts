// 'use server'
'use server';

/**
 * @fileOverview A flow that allows developers to ask a question about their codebase and get an answer from a GenAI model.
 *
 * - askCodeQuestion - A function that handles the process of asking a question about code.
 * - AskCodeQuestionInput - The input type for the askCodeQuestion function.
 * - AskCodeQuestionOutput - The return type for the askCodeQuestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskCodeQuestionInputSchema = z.object({
  codebaseContext: z
    .string()
    .describe("The codebase context to ask a question about, as a string."),
  question: z.string().describe('The question to ask about the codebase.'),
});
export type AskCodeQuestionInput = z.infer<typeof AskCodeQuestionInputSchema>;

const AskCodeQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about the codebase.'),
});
export type AskCodeQuestionOutput = z.infer<typeof AskCodeQuestionOutputSchema>;

export async function askCodeQuestion(input: AskCodeQuestionInput): Promise<AskCodeQuestionOutput> {
  return askCodeQuestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askCodeQuestionPrompt',
  input: {schema: AskCodeQuestionInputSchema},
  output: {schema: AskCodeQuestionOutputSchema},
  prompt: `You are an expert software developer. You will answer questions about a codebase provided in the context.

Codebase Context: {{{codebaseContext}}}

Question: {{{question}}}

Answer: `,
});

const askCodeQuestionFlow = ai.defineFlow(
  {
    name: 'askCodeQuestionFlow',
    inputSchema: AskCodeQuestionInputSchema,
    outputSchema: AskCodeQuestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
