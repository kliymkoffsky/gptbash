import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";

// Generated persona schema
const GeneratedPersonaSchema = z.object({
  nickname: z.string(),
  personality: z.string(),
  mood: z.string(),
  context: z.string(),
  secret: z.string().optional(),
});

/**
 * Generate Scene Step
 *
 * Uses LLM to generate the entire scene: unique personas with their situations.
 * Everything is fresh and random each time.
 */
export const generateSceneStep = createStep({
  id: "generate-scene",
  inputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number().min(1).max(5).optional(),
    numRounds: z.number().optional(),
    // Accept from previous steps
    memoryStatus: z.object({
      usedPercent: z.number(),
      allowed: z.boolean(),
    }).optional(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    personas: z.array(GeneratedPersonaSchema),
    numRounds: z.number(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { topic } = inputData;

    // Randomize params
    const numPersonas = inputData.numPersonas ?? Math.floor(Math.random() * 3) + 1; // 1-3
    const numRounds = inputData.numRounds ?? Math.floor(Math.random() * 5) + 3; // 3-7

    log.info(`Generating ${numPersonas} personas, ${numRounds} rounds`);

    // Try LLM generation
    const agent = mastra?.getAgent?.("scene-generator");
    
    if (agent && hasApiKey()) {
      try {
        const personas = await generateSceneWithLLM(agent, topic, numPersonas);
        
        // Log generated personas
        personas.forEach((p) => {
          log.persona.situation(p.nickname, p.mood, p.context);
        });

        return { topic, personas, numRounds };
      } catch (error) {
        log.warning("LLM scene generation failed, using fallbacks");
        console.error(error);
      }
    }

    // Fallback
    const personas = generateFallbackPersonas(numPersonas);
    personas.forEach((p) => {
      log.persona.situation(p.nickname, p.mood, p.context);
    });

    return { topic, personas, numRounds };
  },
});

/**
 * Generate scene with LLM
 */
async function generateSceneWithLLM(
  agent: any,
  topic: string,
  numPersonas: number
): Promise<Array<{
  nickname: string;
  personality: string;
  mood: string;
  context: string;
  secret?: string;
}>> {
  
  const prompt = `Wygeneruj ${numPersonas} UNIKALNYCH postaci do rozmowy IRC na temat: "${topic}"

Dla KAŻDEJ postaci wymyśl:
1. nickname - nick IRC (krótki, kreatywny, może być śmieszny jak xXx_ProGamer_xXx, może być normalny jak Tomek87)
2. personality - osobowość i styl mówienia (10-20 słów)
3. mood - obecny nastrój (5-10 słów)
4. context - co się dzieje w tle (5-10 słów)
5. secret - opcjonalny sekret (5-10 słów, lub null)

ZASADY:
- Postacie muszą być RÓŻNE od siebie
- Mogą być stereotypami: programista, gracz, boomer, student, sysadmin, janusz biznesu, HR, tester, frontend dev, etc
- Ale KAŻDA postać powinna być unikalna i kreatywna
- Nicki mogą być po polsku lub angielsku
- Personality MUSI zawierać styl mówienia (np. "używa dużo anglicyzmów", "pisze capslockiem", "jest sarkastyczny")

PRZYKŁADY (różnorodne):
[
  {"nickname": "rm_minus_rf", "personality": "wypalony sysadmin, mówi krótkimi zdaniami, czarny humor", "mood": "zrezygnowany, czeka na koniec dnia", "context": "piątek 16:55, zaraz wyjdzie", "secret": "planuje rzucić papierami w poniedziałek"},
  {"nickname": "AgnieszkaHR", "personality": "korporacyjna HR, używa buzzwordów, pozytywnie toksyczna", "mood": "entuzjastyczna, organizuje integrację", "context": "rozsyła zaproszenia na team building", "secret": "sama nienawidzi integracji"},
  {"nickname": "TesterManualny", "personality": "dokładny do bólu, znajduje bugi wszędzie, pesymista", "mood": "triumfalny, właśnie znalazł buga", "context": "release jest za godzinę", "secret": null}
]

Odpowiedz TYLKO JSON array (bez markdown):`;

  const result = await agent.generate(prompt);
  const text = result.text || "";
  
  // Parse JSON
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse LLM response as JSON");
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  return parsed.map((item: any) => ({
    nickname: item.nickname || "user" + Math.floor(Math.random() * 1000),
    personality: item.personality || "zwykły user",
    mood: item.mood || "neutralny",
    context: item.context || "zwykły dzień",
    secret: item.secret || undefined,
  }));
}

/**
 * Fallback personas
 */
function generateFallbackPersonas(count: number): Array<{
  nickname: string;
  personality: string;
  mood: string;
  context: string;
  secret?: string;
}> {
  const templates = [
    { nickname: "devnull", personality: "cyniczny programista, suchy humor", mood: "zmęczony deployem", context: "piątek wieczór" },
    { nickname: "xXx_Pr0_xXx", personality: "gracz, gaming slang, pewny siebie", mood: "triumfalny", context: "streamuje na Twitchu" },
    { nickname: "WojciechXP", personality: "boomer, CAPS LOCK, nie rozumie technologii", mood: "zdezorientowany", context: "syn mu nie odpisuje" },
    { nickname: "eternal_student", personality: "wieczny student, prokrastynator", mood: "zestresowany sesją", context: "deadline za 2h" },
    { nickname: "root_cause", personality: "sysadmin, paranoja, czarny humor", mood: "czeka na alert", context: "nocna zmiana" },
  ];

  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
