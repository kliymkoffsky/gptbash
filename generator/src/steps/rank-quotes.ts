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
 * Randomly selects 1-3 personas for the improv conversation.
 * Generates unique situations for each persona.
 */
export const selectPersonasStep = createStep({
  id: "select-personas",
  inputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number().min(1).max(5).optional(),
    numRounds: z.number().optional(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    selectedPersonas: z.array(z.string()),
    situations: z.array(z.object({
      personaId: z.string(),
      mood: z.string(),
      context: z.string(),
      secret: z.string().optional(),
    })),
    numRounds: z.number(),
  }),
  execute: async ({ inputData }) => {
    const { topic } = inputData;

    // Import dependencies
    const { PERSONAS } = await import("../types/index.js");
    const { generateSituation, randomConversationParams } = await import("../data/situations.js");

    // Randomize conversation params if not provided
    const randomParams = randomConversationParams();
    const numPersonas = inputData.numPersonas ?? randomParams.numPersonas;
    const numRounds = inputData.numRounds ?? randomParams.numRounds;

    // Shuffle and select personas
    const shuffled = [...PERSONAS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numPersonas);
    const selectedIds = selected.map((p) => p.id);

    // Generate unique situation for each persona
    const situations = selected.map((p) => ({
      personaId: p.id,
      ...generateSituation(),
    }));

    log.persona.selected(selected.map((p) => p.nickname));
    log.info(`Rounds: ${numRounds}`);
    
    // Log each persona's situation
    situations.forEach((sit) => {
      const persona = selected.find((p) => p.id === sit.personaId);
      if (persona) {
        log.persona.situation(persona.nickname, sit.mood, sit.context);
      }
    });

    return {
      topic,
      selectedPersonas: selectedIds,
      situations,
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
