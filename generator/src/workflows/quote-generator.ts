import { createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { BashQuoteSchema } from "../types/index.js";
import { fetchSourceStep } from "../steps/fetch-source.js";
import { parseContentStep } from "../steps/parse-content.js";
import { transformQuoteStep } from "../steps/transform-quote.js";
import { attachMetadataStep } from "../steps/attach-metadata.js";

/**
 * Quote Generator Workflow (Mode 1)
 *
 * Fetches conversations from various sources (wykop, twitter, mock),
 * parses them, transforms to bash.org.pl format, and attaches metadata.
 *
 * Pipeline:
 * 1. fetchSourceStep - Get raw conversation from source
 * 2. parseContentStep - Normalize and structure the content
 * 3. transformQuoteStep - Convert to IRC-style format (with AI enhancement)
 * 4. attachMetadataStep - Add source links, tags, and IDs
 */
export const quoteGeneratorWorkflow = createWorkflow({
  id: "quote-generator",
  description: "Transforms conversations from various sources into bash.org.pl style quotes",
  inputSchema: z.object({
    source: z.enum(["wykop", "twitter", "mock"]).describe("Source to fetch conversation from"),
    query: z.string().optional().describe("Search query (for wykop/twitter sources)"),
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
  }),
})
  .then(fetchSourceStep)
  .then(parseContentStep)
  .then(transformQuoteStep)
  .then(attachMetadataStep)
  .commit();
