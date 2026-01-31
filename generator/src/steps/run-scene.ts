import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";

// Generated persona schema (from generate-scene)
const GeneratedPersonaSchema = z.object({
  nickname: z.string(),
  personality: z.string(),
  mood: z.string(),
  context: z.string(),
  secret: z.string().optional(),
});

/**
 * Run Scene Step
 *
 * Runs the conversation with LLM-generated personas.
 * Uses a single "actor" agent that plays different roles.
 */
export const runSceneStep = createStep({
  id: "run-scene",
  inputSchema: z.object({
    topic: z.string(),
    personas: z.array(GeneratedPersonaSchema),
    numRounds: z.number(),
  }),
  outputSchema: z.object({
    messages: z.array(z.object({
      author: z.string(),
      content: z.string(),
    })),
    topic: z.string(),
    personas: z.array(GeneratedPersonaSchema),
  }),
  execute: async ({ inputData, mastra }) => {
    const { topic, personas, numRounds } = inputData;
    const messages: { author: string; content: string }[] = [];

    const agent = mastra?.getAgent?.("actor");
    const useApi = agent && hasApiKey();

    // Run conversation rounds
    for (let round = 0; round < numRounds; round++) {
      for (const persona of personas) {
        if (!useApi) {
          messages.push({
            author: persona.nickname,
            content: generateFallbackLine(persona, messages.length),
          });
          continue;
        }

        try {
          const prompt = buildActorPrompt(topic, persona, messages, round, numRounds);
          const result = await agent.generate(prompt);
          const text = extractResponse(result.text || "");

          messages.push({
            author: persona.nickname,
            content: text,
          });
        } catch (error) {
          log.agent.error(persona.nickname, error);
          messages.push({
            author: persona.nickname,
            content: "[error]",
          });
        }
      }
    }

    return { messages, topic, personas };
  },
});

/**
 * Build prompt for actor agent
 */
function buildActorPrompt(
  topic: string,
  persona: { nickname: string; personality: string; mood: string; context: string; secret?: string },
  messages: { author: string; content: string }[],
  round: number,
  totalRounds: number
): string {
  const isFirst = messages.length === 0;
  const isLast = round === totalRounds - 1;

  let prompt = `Wciel się w postać na polskim IRC.

TWOJA POSTAĆ:
- Nick: ${persona.nickname}
- Osobowość: ${persona.personality}
- Nastrój: ${persona.mood}
- Kontekst: ${persona.context}`;

  if (persona.secret) {
    prompt += `\n- Sekret (subtelnie nawiązuj): ${persona.secret}`;
  }

  prompt += `\n\nTEMAT ROZMOWY: "${topic}"\n`;

  if (messages.length > 0) {
    prompt += "\nDOTYCHCZASOWA ROZMOWA:\n";
    messages.slice(-6).forEach((m) => {
      prompt += `<${m.author}> ${m.content}\n`;
    });
  }

  prompt += `\nZASADY:
- KRÓTKA odpowiedź IRC (1-2 zdania max)
- Pisz PO POLSKU
- Bądź w charakterze postaci
- NIE zaczynaj od "haha", "lol", "xD"
- Reaguj na kontekst rozmowy`;

  if (isFirst) {
    prompt += "\n- Zaczynasz rozmowę";
  }
  if (isLast) {
    prompt += "\n- To koniec - spróbuj zakończyć puentą";
  }

  prompt += "\n\nOdpowiedz TYLKO treścią wiadomości (bez nicka, bez cudzysłowów):";

  return prompt;
}

/**
 * Extract clean response
 */
function extractResponse(text: string): string {
  let cleaned = text.trim();
  
  // Remove nickname prefix if added
  cleaned = cleaned.replace(/^<[^>]+>\s*/, "");
  
  // Remove quotes
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Limit length
  if (cleaned.length > 200) {
    cleaned = cleaned.slice(0, 197) + "...";
  }
  
  return cleaned;
}

/**
 * Fallback line generator
 */
function generateFallbackLine(
  persona: { nickname: string; personality: string },
  messageIndex: number
): string {
  const fallbacks = [
    "no nie wiem",
    "ciekawe",
    "a to dobre",
    "hmm",
    "no tak",
    "racja",
    "serio?",
    "nom",
  ];
  return fallbacks[messageIndex % fallbacks.length];
}
