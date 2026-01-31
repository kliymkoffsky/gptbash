import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { BashQuoteSchema } from "../types/index.js";

// Generated persona schema
const GeneratedPersonaSchema = z.object({
  nickname: z.string(),
  personality: z.string(),
  mood: z.string(),
  context: z.string(),
  secret: z.string().optional(),
});

/**
 * Format Scene Step
 *
 * Converts conversation messages to bash.org.pl quote format.
 */
export const formatSceneStep = createStep({
  id: "format-scene",
  inputSchema: z.object({
    messages: z.array(z.object({
      author: z.string(),
      content: z.string(),
    })),
    topic: z.string(),
    personas: z.array(GeneratedPersonaSchema),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
    topic: z.string(),
    personas: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { messages, topic, personas } = inputData;

    // Generate quote ID
    const id = Math.random().toString(36).substring(2, 10);

    // Convert messages to quote lines
    const lines = messages.map((msg) => ({
      nickname: msg.author,
      text: msg.content,
    }));

    const quote = {
      id,
      lines,
      metadata: {
        source: "improv",
        generatedAt: new Date(),
        tags: [topic.split(" ")[0].toLowerCase()],
      },
    };

    return { 
      quote, 
      topic, 
      personas: personas.map((p) => p.nickname),
    };
  },
});
