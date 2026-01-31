import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { MessageSchema, QuoteLineSchema } from "../types/index.js";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";

/**
 * Transform Quote Step
 *
 * Transforms parsed messages into bash.org.pl IRC-style format.
 * Uses the quote-stylist agent for AI-enhanced formatting.
 */
export const transformQuoteStep = createStep({
  id: "transform-quote",
  inputSchema: z.object({
    messages: z.array(MessageSchema),
    source: z.string(),
    sourceUrl: z.string().optional(),
  }),
  outputSchema: z.object({
    lines: z.array(QuoteLineSchema),
    source: z.string(),
    sourceUrl: z.string().optional(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { messages, source, sourceUrl } = inputData;

    // Try to use the quote-stylist agent for AI-enhanced transformation
    const agent = mastra?.getAgent?.("quote-stylist");

    if (agent && hasApiKey()) {
      try {
        // Format messages for the agent
        const conversationText = messages
          .map((m) => `${m.author}: ${m.content}`)
          .join("\n");

        const result = await agent.generate(
          `Transform this conversation into bash.org.pl IRC-style format. Keep it concise and preserve the humor:\n\n${conversationText}`
        );

        // Parse the agent's response into quote lines
        const responseText = result.text || "";
        const lines = parseAgentResponse(responseText);

        if (lines.length > 0) {
          return { lines, source, sourceUrl };
        }
      } catch (error) {
        log.agent.error("quote-stylist", error);
        log.warning("Using basic transform (no AI enhancement)");
      }
    }

    // Fallback: Basic transformation without AI
    const lines = messages.map((msg) => ({
      nickname: msg.author,
      text: msg.content,
    }));

    return { lines, source, sourceUrl };
  },
});

/**
 * Parse agent response into quote lines
 */
function parseAgentResponse(text: string): { nickname: string; text: string }[] {
  const lines: { nickname: string; text: string }[] = [];

  // Try to parse IRC-style format: <nickname> message
  const ircPattern = /<([^>]+)>\s*(.+)/g;
  let match;

  while ((match = ircPattern.exec(text)) !== null) {
    lines.push({
      nickname: match[1].trim(),
      text: match[2].trim(),
    });
  }

  // If no IRC-style lines found, try other patterns
  if (lines.length === 0) {
    // Try: nickname: message format
    const colonPattern = /^([^:]+):\s*(.+)$/gm;
    while ((match = colonPattern.exec(text)) !== null) {
      const nickname = match[1].trim();
      // Skip if it looks like a label rather than a nickname
      if (!nickname.includes(" ") && nickname.length < 20) {
        lines.push({
          nickname,
          text: match[2].trim(),
        });
      }
    }
  }

  return lines;
}
