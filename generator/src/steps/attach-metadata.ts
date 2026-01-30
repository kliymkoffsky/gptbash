import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { QuoteLineSchema, BashQuoteSchema } from "../types/index.js";
import { randomUUID } from "crypto";

/**
 * Attach Metadata Step
 *
 * Adds metadata to the transformed quote including source info,
 * timestamps, and generated IDs.
 */
export const attachMetadataStep = createStep({
  id: "attach-metadata",
  inputSchema: z.object({
    lines: z.array(QuoteLineSchema),
    source: z.string(),
    sourceUrl: z.string().optional(),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
  }),
  execute: async ({ inputData }) => {
    const { lines, source, sourceUrl } = inputData;

    // Generate a unique ID for the quote
    const id = generateQuoteId();

    // Extract potential tags from the content
    const tags = extractTags(lines);

    const quote = {
      id,
      lines,
      metadata: {
        source,
        sourceUrl,
        generatedAt: new Date(),
        tags: tags.length > 0 ? tags : undefined,
      },
    };

    return { quote };
  },
});

/**
 * Generate a unique quote ID
 * Uses a short format similar to bash.org.pl IDs
 */
function generateQuoteId(): string {
  // Generate a numeric-like ID (bash.org.pl uses numeric IDs)
  const uuid = randomUUID();
  // Take first 8 characters for a shorter ID
  return uuid.slice(0, 8);
}

/**
 * Extract potential tags from quote content
 */
function extractTags(lines: { nickname: string; text: string }[]): string[] {
  const tags: Set<string> = new Set();
  const allText = lines.map((l) => l.text.toLowerCase()).join(" ");

  // Programming-related tags
  if (/\b(kod|code|program|bug|git|deploy)\b/.test(allText)) {
    tags.add("programming");
  }
  if (/\b(linux|windows|mac|ubuntu|server)\b/.test(allText)) {
    tags.add("tech");
  }
  if (/\b(vim|emacs|vscode|ide)\b/.test(allText)) {
    tags.add("editors");
  }

  // Gaming-related tags
  if (/\b(gra|game|gaming|fps|rpg|mmo)\b/.test(allText)) {
    tags.add("gaming");
  }

  // Work-related tags
  if (/\b(praca|work|biuro|office|meeting|deadline)\b/.test(allText)) {
    tags.add("work");
  }

  // Student-related tags
  if (/\b(studia|student|uczelnia|egzamin|projekt)\b/.test(allText)) {
    tags.add("student");
  }

  return Array.from(tags);
}
