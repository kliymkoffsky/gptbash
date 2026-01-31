import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";
import { sceneGeneratorPrompt, getRandomFormat, FORMATS } from "../prompts/index.js";
import type { Format, FormatType } from "../prompts/index.js";

const FormatSchema = z.object({
  name: z.string(),
  messages: z.number(),
  personas: z.number(),
  description: z.string(),
});

/**
 * Generate Everything Step
 *
 * Generates scene with a specific format (micro/short/medium/standard)
 */
export const generateEverythingStep = createStep({
  id: "generate-everything",
  inputSchema: z.object({
    topic: z.string(),
    format: z.enum(["micro", "short", "medium", "standard"]).optional(),
    memoryStatus: z.object({
      usedPercent: z.number(),
      allowed: z.boolean(),
    }).optional(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    format: FormatSchema,
    scene: z.object({
      flavor: z.string(),
      rules: z.array(z.string()),
      personas: z.array(z.object({
        nickname: z.string(),
        personality: z.string(),
        situation: z.string(),
      })),
    }),
  }),
  execute: async ({ inputData, mastra }) => {
    const { topic } = inputData;
    
    // Get format - use specified or random
    const format: Format = inputData.format 
      ? FORMATS[inputData.format as FormatType]
      : getRandomFormat();
    
    log.info(`Format: ${format.name} (${format.messages} msgs, ${format.personas} people)`);

    const agent = mastra?.getAgent?.("creative-director");
    
    if (agent && hasApiKey()) {
      try {
        const scene = await generateSceneWithLLM(agent, topic, format);
        
        log.info(`Vibe: ${scene.flavor}`);
        scene.personas.forEach((p) => {
          log.persona.situation(p.nickname, p.personality, p.situation);
        });

        return { topic, format, scene };
      } catch (error) {
        log.warning("LLM generation failed, using fallback");
        console.error(error);
      }
    }

    // Fallback
    const scene = generateFallbackScene(format);
    return { topic, format, scene };
  },
});

async function generateSceneWithLLM(agent: any, topic: string, format: Format) {
  const prompt = sceneGeneratorPrompt(topic, format);
  const result = await agent.generate(prompt);
  const text = result.text || "";
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON");
  }
  
  const parsed = JSON.parse(jsonMatch[0]);

  // Ensure correct number of personas
  let personas = (parsed.personas || []).map((p: any) => ({
    nickname: p.nickname || "user" + Math.floor(Math.random() * 1000),
    personality: p.personality || "default",
    situation: p.situation || "none",
  }));
  
  // Trim or pad to match format
  personas = personas.slice(0, format.personas);
  while (personas.length < format.personas) {
    personas.push({ nickname: `user${personas.length + 1}`, personality: "filler", situation: "here" });
  }

  return {
    flavor: parsed.flavor || "conversation",
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    personas,
  };
}

function generateFallbackScene(format: Format) {
  const personas = [];
  for (let i = 0; i < format.personas; i++) {
    personas.push({ 
      nickname: `user${i + 1}`, 
      personality: i === 0 ? "sarcastic" : "confused", 
      situation: "fallback" 
    });
  }
  
  return {
    flavor: "fallback conversation",
    rules: ["be funny"],
    personas,
  };
}
