import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { RawConversationSchema } from "../types/index.js";
import { getRandomMockConversation } from "../data/mock-conversations.js";

/**
 * Fetch Source Step
 *
 * Fetches raw conversation content from various sources.
 * Currently supports mock data with stubs for wykop and twitter.
 */
export const fetchSourceStep = createStep({
  id: "fetch-source",
  inputSchema: z.object({
    source: z.enum(["wykop", "twitter", "mock"]),
    query: z.string().optional(),
  }),
  outputSchema: z.object({
    conversation: RawConversationSchema,
  }),
  execute: async ({ inputData }) => {
    const { source, query } = inputData;

    switch (source) {
      case "mock":
        return {
          conversation: getRandomMockConversation(),
        };

      case "wykop":
        // Stub for wykop.pl integration
        // TODO: Implement actual wykop.pl API/scraping
        console.log(`[wykop] Would fetch with query: ${query}`);
        return {
          conversation: {
            source: "wykop" as const,
            sourceUrl: `https://wykop.pl/search?q=${encodeURIComponent(query || "")}`,
            messages: [
              { author: "wykop_user", content: "[Stub] Wykop content would appear here" },
            ],
            fetchedAt: new Date(),
          },
        };

      case "twitter":
        // Stub for Twitter/X integration
        // TODO: Implement actual Twitter API integration
        console.log(`[twitter] Would fetch with query: ${query}`);
        return {
          conversation: {
            source: "twitter" as const,
            sourceUrl: `https://twitter.com/search?q=${encodeURIComponent(query || "")}`,
            messages: [
              { author: "twitter_user", content: "[Stub] Twitter thread would appear here" },
            ],
            fetchedAt: new Date(),
          },
        };

      default:
        throw new Error(`Unknown source: ${source}`);
    }
  },
});
