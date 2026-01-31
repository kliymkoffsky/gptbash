import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";
import { BashQuoteSchema, VoteSchema } from "../types/index.js";
import { conversationWriterPrompt, judgePrompt, improvePrompt, translatePrompt } from "../prompts/index.js";
import type { Format } from "../prompts/index.js";

const FormatSchema = z.object({
  name: z.string(),
  messages: z.number(),
  personas: z.number(),
  description: z.string(),
});

const SceneSchema = z.object({
  flavor: z.string(),
  rules: z.array(z.string()),
  personas: z.array(z.object({
    nickname: z.string(),
    personality: z.string(),
    situation: z.string(),
  })),
});

const MIN_ITERATIONS = 3;  // Always do at least 3 rounds
const MAX_ITERATIONS = 3;

/**
 * Run and Judge Step with Iteration Loop
 */
export const runAndJudgeStep = createStep({
  id: "run-and-judge",
  inputSchema: z.object({
    topic: z.string(),
    format: FormatSchema,
    scene: SceneSchema,
  }),
  outputSchema: z.object({
    quote: BashQuoteSchema,
    votes: z.array(VoteSchema),
    totalScore: z.number(),
    judgeComments: z.array(z.string()),
    iterations: z.number(),
    format: FormatSchema,
  }),
  execute: async ({ inputData, mastra }) => {
    const { topic, format, scene } = inputData;

    const conversationAgent = mastra?.getAgent?.("conversation-writer");
    const judgeAgent = mastra?.getAgent?.("creative-judge");
    const useApi = conversationAgent && judgeAgent && hasApiKey();

    let messages: { author: string; content: string }[] = [];
    let votes: Array<{ judgeId: string; criteria: string; score: number; reasoning: string }> = [];
    let judgeComments: string[] = [];
    let totalScore = 0;
    let iteration = 0;

    // Initial generation
    if (useApi) {
      try {
        messages = await generateConversation(conversationAgent, topic, scene, format);
      } catch (_e) {
        log.warning("Generation failed");
        messages = generateFallbackConversation(scene, format);
      }
    } else {
      messages = generateFallbackConversation(scene, format);
    }

    // Iteration loop
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      log.info(`Round ${iteration}/${MAX_ITERATIONS}`);

      if (useApi) {
        try {
          const quoteText = messages.map((m) => `<${m.author}> ${m.content}`).join("\n");
          const judging = await judgeConversation(judgeAgent, quoteText, topic, scene.flavor);
          votes = judging.votes;
          judgeComments = judging.comments;
          totalScore = votes.reduce((sum, v) => sum + v.score, 0);

          log.judge.voting();
          votes.forEach((v) => log.judge.vote(v.criteria, v.score));
          log.judge.total(totalScore, votes.length * 10);

          // Always do MIN_ITERATIONS rounds for refinement
          if (iteration < MIN_ITERATIONS) {
            log.info(`Refining (round ${iteration}/${MIN_ITERATIONS})...`);
            // Combine judge reasoning + overall comments for better feedback
            const allFeedback = [
              ...votes.map((v) => `${v.criteria}: ${v.score}/10 - ${v.reasoning}`),
              ...judgeComments,
            ];
            messages = await improveConversation(conversationAgent, quoteText, allFeedback, totalScore, format);
          }
        } catch (_e) {
          log.warning("Judging failed");
          votes = generateFallbackVotes();
          totalScore = votes.reduce((sum, v) => sum + v.score, 0);
          break;
        }
      } else {
        votes = generateFallbackVotes();
        totalScore = votes.reduce((sum, v) => sum + v.score, 0);
        break;
      }
    }

    // Final step: translate to Polish
    if (useApi) {
      try {
        log.info("Translating to Polish...");
        messages = await translateToPolish(conversationAgent, messages);
      } catch (_e) {
        log.warning("Translation failed, keeping original");
      }
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

    return { quote, votes, totalScore, judgeComments, iterations: iteration, format };
  },
});

async function generateConversation(
  agent: any,
  topic: string,
  scene: { flavor: string; personas: Array<{ nickname: string; personality: string; situation: string }> },
  format: Format
): Promise<{ author: string; content: string }[]> {
  const personasList = scene.personas.map((p) => 
    `- ${p.nickname}: ${p.personality} (${p.situation})`
  ).join("\n");

  const prompt = conversationWriterPrompt(topic, scene.flavor, personasList, format);
  const result = await agent.generate(prompt);
  const text = result.text || "";
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array");
  
  let messages = JSON.parse(jsonMatch[0]);
  // Enforce message count
  messages = messages.slice(0, format.messages);
  
  return messages;
}

async function judgeConversation(
  agent: any,
  quoteText: string,
  topic: string,
  flavor: string
): Promise<{
  votes: Array<{ judgeId: string; criteria: string; score: number; reasoning: string }>;
  comments: string[];
}> {
  const prompt = judgePrompt(quoteText, topic, flavor);
  const result = await agent.generate(prompt);
  const text = result.text || "";
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object");
  
  const parsed = JSON.parse(jsonMatch[0]);
  const votes = (parsed.judges || []).map((j: any) => ({
    judgeId: j.name || "judge",
    criteria: j.criteria || "quality",
    score: Math.min(10, Math.max(1, j.score || 5)),
    reasoning: j.reasoning || "",
  }));

  return { votes, comments: parsed.overallComments || [] };
}

async function improveConversation(
  agent: any,
  originalText: string,
  feedback: string[],
  score: number,
  format: Format
): Promise<{ author: string; content: string }[]> {
  const prompt = improvePrompt(originalText, feedback, score) + `\n\nEXACTLY ${format.messages} messages.`;
  const result = await agent.generate(prompt);
  const text = result.text || "";
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array in improvement");
  
  let messages = JSON.parse(jsonMatch[0]);
  messages = messages.slice(0, format.messages);
  
  return messages;
}

function generateFallbackConversation(
  scene: { personas: Array<{ nickname: string }> },
  format: Format
): { author: string; content: string }[] {
  const messages = [];
  for (let i = 0; i < format.messages; i++) {
    const persona = scene.personas[i % scene.personas.length];
    messages.push({ author: persona.nickname, content: `msg ${i + 1}` });
  }
  return messages;
}

async function translateToPolish(
  agent: any,
  messages: { author: string; content: string }[]
): Promise<{ author: string; content: string }[]> {
  const conversation = messages.map((m) => `<${m.author}> ${m.content}`).join("\n");
  const prompt = translatePrompt(conversation);
  const result = await agent.generate(prompt);
  const text = result.text || "";
  
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array in translation");
  
  return JSON.parse(jsonMatch[0]);
}

function generateFallbackVotes() {
  return [
    { judgeId: "Judge1", criteria: "humor", score: 5 + Math.floor(Math.random() * 3), reasoning: "fallback" },
    { judgeId: "Judge2", criteria: "wit", score: 5 + Math.floor(Math.random() * 3), reasoning: "fallback" },
  ];
}
