import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { MessageSchema, PERSONAS } from "../types/index.js";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";

/**
 * Run Conversation Step (Improv Mode)
 *
 * Orchestrates a ping-pong conversation between multiple persona agents.
 * Each agent takes turns responding based on the conversation context.
 */
export const runConversationStep = createStep({
  id: "run-conversation",
  inputSchema: z.object({
    topic: z.string(),
    selectedPersonas: z.array(z.string()),
    numRounds: z.number(),
  }),
  outputSchema: z.object({
    messages: z.array(MessageSchema),
    topic: z.string(),
    selectedPersonas: z.array(z.string()),
  }),
  execute: async ({ inputData, mastra }) => {
    const { topic, selectedPersonas, numRounds } = inputData;
    const messages: { author: string; content: string }[] = [];

    // Build conversation history for context
    let conversationHistory = `Topic: ${topic}\n\n`;

    // Run conversation rounds
    for (let round = 0; round < numRounds; round++) {
      for (const personaId of selectedPersonas) {
        // Get the agent for this persona
        const agent = mastra?.getAgent?.(personaId);
        const persona = PERSONAS.find((p) => p.id === personaId);
        const nickname = persona?.nickname || personaId;

        // Skip agent call if no API key - use fallback immediately
        if (!agent || !hasApiKey()) {
          messages.push({
            author: nickname,
            content: generateFallbackMessage(topic, messages, nickname),
          });
          continue;
        }

        try {

          // Generate response with conversation context
          const prompt = buildConversationPrompt(
            topic,
            conversationHistory,
            messages,
            round,
            numRounds
          );

          const result = await agent.generate({
            messages: [{ role: "user", content: prompt }],
          });

          const responseText = extractResponseText(result.text || "");

          messages.push({
            author: nickname,
            content: responseText,
          });

          // Update conversation history
          conversationHistory += `<${nickname}> ${responseText}\n`;
        } catch (error) {
          log.agent.error(personaId, error);
          const persona = PERSONAS.find((p) => p.id === personaId);
          messages.push({
            author: persona?.nickname || personaId,
            content: "[Error generating response]",
          });
        }
      }
    }

    return { messages, topic, selectedPersonas };
  },
});

/**
 * Build a prompt for the conversation context
 */
function buildConversationPrompt(
  topic: string,
  history: string,
  messages: { author: string; content: string }[],
  currentRound: number,
  totalRounds: number
): string {
  const isFirstMessage = messages.length === 0;
  const isLastRound = currentRound === totalRounds - 1;

  let prompt = `You are in an IRC chat. The topic is: "${topic}"\n\n`;

  if (messages.length > 0) {
    prompt += "Conversation so far:\n";
    messages.slice(-6).forEach((msg) => {
      prompt += `<${msg.author}> ${msg.content}\n`;
    });
    prompt += "\n";
  }

  prompt += "Respond with a SHORT, witty IRC-style message (1-2 sentences max). ";
  prompt += "Be funny but natural. Don't be too verbose. ";

  if (isFirstMessage) {
    prompt += "You are starting the conversation. ";
  }

  if (isLastRound) {
    prompt += "This is near the end of the conversation, try to land a good punchline or callback. ";
  }

  prompt += "\nRespond with ONLY your message, no nickname prefix.";

  return prompt;
}

/**
 * Extract clean response text from agent output
 */
function extractResponseText(text: string): string {
  let cleaned = text.trim();

  // Remove any nickname prefix the agent might have added
  cleaned = cleaned.replace(/^<[^>]+>\s*/, "");

  // Remove quotes if wrapped
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Limit length for IRC style
  if (cleaned.length > 200) {
    cleaned = cleaned.slice(0, 197) + "...";
  }

  return cleaned;
}

/**
 * Generate a fallback message when no API key is available
 */
function generateFallbackMessage(
  topic: string,
  messages: { author: string; content: string }[],
  nickname: string
): string {
  // Sample responses based on nickname patterns
  const sampleResponses: Record<string, string[]> = {
    devnull: [
      "to brzmi jak O(n²) problem",
      "sprawdziłeś stack overflow?",
      "u mnie działa",
      "może spróbuj wyłączyć i włączyć",
      "to prosty fix, tylko 3 sprinty",
      "kto to pisał? ...ja? niemożliwe",
    ],
    eternal_student: [
      "deadline za 2h, jeszcze mogę pospać",
      "kto by się uczył przed sesją",
      "żyję na samych energetykach",
      "jeszcze tylko 5 lat studiów",
      "a po co mi ta wiedza w życiu",
      "najpierw kawa, potem myślenie",
    ],
    root_cause: [
      "masz backup?",
      "to piątek, czekam na alert",
      "99.9% uptime to i tak za dużo",
      "ja już nic nie czuję",
      "ticket albo się nie stało",
      "restart rozwiązuje 90% problemów",
    ],
    WojciechXP: [
      "A CO TO JEST???",
      "W moich czasach to było prostsze...",
      "To chyba jakiś wirus!",
      "Jak to wyłączyć...",
      "A nie można po prostu zadzwonić?",
      "SYNU POMÓŻ",
    ],
    "xXx_Pr0Gamer_xXx": [
      "ez clap",
      "nie moja wina, lag był",
      "teammate diff",
      "gram od 3 w nocy",
      "CLUTCH OR KICK",
      "git gud",
    ],
  };

  // Find matching responses for this nickname
  const responses = sampleResponses[nickname] || [
    "hmm...",
    "ciekawe",
    "no nie wiem",
    "a to dobre",
    "lol",
  ];

  // Pick a semi-random response based on message count for variety
  const index = messages.length % responses.length;
  return responses[index];
}
