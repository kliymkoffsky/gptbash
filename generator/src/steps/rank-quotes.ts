import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { BashQuoteSchema, VoteSchema, ImprovSessionOutputSchema } from "../types/index.js";
import { log } from "../utils/logger.js";

/**
 * Rank Quotes Step (Improv Mode)
 *
 * Aggregates votes from all judges and calculates the total score.
 * Prepares the final output for the improv session.
 */
export const rankQuotesStep = createStep({
  id: "rank-quotes",
  inputSchema: z.object({
    quote: BashQuoteSchema,
    votes: z.array(VoteSchema),
    topic: z.string().optional(),
    personas: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
    votes: z.array(VoteSchema),
    totalScore: z.number(),
    topic: z.string().optional(),
    personas: z.array(z.string()).optional(),
  }),
  execute: async ({ inputData }) => {
    const { quote, votes, topic, personas } = inputData;

    // Calculate total score (sum of all judge scores)
    const totalScore = votes.reduce((sum, vote) => sum + vote.score, 0);

    // Calculate average for logging
    const averageScore = votes.length > 0 ? totalScore / votes.length : 0;

    // Log the results (now handled by parent)

    return {
      quote,
      votes,
      totalScore,
      topic,
      personas,
    };
  },
});

/**
 * Select Personas Step
 *
 * Randomly selects personas for the improv conversation.
 */
export const selectPersonasStep = createStep({
  id: "select-personas",
  inputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number().min(2).max(5),
    numRounds: z.number(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    selectedPersonas: z.array(z.string()),
    numRounds: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { topic, numPersonas, numRounds } = inputData;

    // Import personas list
    const { PERSONAS } = await import("../types/index.js");

    // Shuffle and select personas
    const shuffled = [...PERSONAS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numPersonas);
    const selectedIds = selected.map((p) => p.id);

    log.persona.selected(selected.map((p) => p.nickname));

    return {
      topic,
      selectedPersonas: selectedIds,
      numRounds,
    };
  },
});

/**
 * Format Quote Step
 *
 * Formats the conversation messages into a bash.org.pl style quote.
 * Passes through topic and personas for storage.
 */
export const formatQuoteStep = createStep({
  id: "format-quote",
  inputSchema: z.object({
    messages: z.array(
      z.object({
        author: z.string(),
        content: z.string(),
      })
    ),
    topic: z.string(),
    selectedPersonas: z.array(z.string()).optional(),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
    topic: z.string(),
    personas: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    const { messages, topic, selectedPersonas = [] } = inputData;

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

    return { quote, topic, personas: selectedPersonas };
  },
});
