import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";
import { BashQuoteSchema } from "../types/index.js";
import { FORMATS, getRandomFormat } from "../prompts/formats.js";
import type { Format, FormatType } from "../prompts/formats.js";
import { oneShotPrompt } from "../prompts/one-shot.js";

const FormatSchema = z.object({
  name: z.string(),
  messages: z.number(),
  personas: z.number(),
  description: z.string(),
});

/**
 * One Shot Step
 * 
 * Single LLM call generates the entire quote in Polish.
 * No iteration, no translation, no complexity.
 */
export const oneShotStep = createStep({
  id: "one-shot",
  inputSchema: z.object({
    topic: z.string(),
    format: z.enum(["micro", "short", "medium", "standard"]).optional(),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
    format: FormatSchema,
  }),
  execute: async ({ inputData, mastra }) => {
    const { topic } = inputData;
    
    const format: Format = inputData.format 
      ? FORMATS[inputData.format as FormatType]
      : getRandomFormat();
    
    log.info(`Format: ${format.name} (${format.messages} msgs)`);

    const agent = mastra?.getAgent?.("conversation-writer");
    let messages: { author: string; content: string }[] = [];
    
    if (agent && hasApiKey()) {
      try {
        const prompt = oneShotPrompt(topic, format);
        const result = await agent.generate(prompt);
        const text = result.text || "";
        
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          messages = JSON.parse(jsonMatch[0]);
          messages = messages.slice(0, format.messages);
        }
      } catch (_e) {
        log.warning("Generation failed");
      }
    }
    
    // Fallback
    if (messages.length === 0) {
      messages = [
        { author: "user1", content: "coś się zepsuło" },
        { author: "user2", content: "no widać" },
      ];
    }

    const quoteId = Math.random().toString(36).substring(2, 10);
    const quote = {
      id: quoteId,
      lines: messages.map((m) => ({ nickname: m.author, text: m.content })),
      metadata: {
        source: "improv",
        generatedAt: new Date(),
        tags: [topic.split(" ")[0].toLowerCase()],
      },
    };

    return { quote, format };
  },
});
