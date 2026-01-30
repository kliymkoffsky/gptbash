import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { RawConversationSchema, MessageSchema } from "../types/index.js";

/**
 * Parse Content Step
 *
 * Parses and normalizes raw conversation content into a structured format.
 * Handles different source formats and extracts speakers/messages.
 */
export const parseContentStep = createStep({
  id: "parse-content",
  inputSchema: z.object({
    conversation: RawConversationSchema,
  }),
  outputSchema: z.object({
    messages: z.array(MessageSchema),
    source: z.string(),
    sourceUrl: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    const { conversation } = inputData;

    // Normalize messages based on source
    const normalizedMessages = conversation.messages.map((msg) => {
      // Clean up author names
      let author = msg.author.trim();
      // Remove common prefixes/suffixes
      author = author.replace(/^@/, ""); // Remove @ prefix
      author = author.replace(/[:\s]+$/, ""); // Remove trailing colons/spaces

      // Clean up content
      let content = msg.content.trim();
      // Remove excessive whitespace
      content = content.replace(/\s+/g, " ");

      return {
        author,
        content,
        timestamp: msg.timestamp,
      };
    });

    // Filter out empty messages
    const filteredMessages = normalizedMessages.filter(
      (msg) => msg.content.length > 0
    );

    return {
      messages: filteredMessages,
      source: conversation.source,
      sourceUrl: conversation.sourceUrl,
    };
  },
});
