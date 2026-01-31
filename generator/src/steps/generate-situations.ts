import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { log } from "../utils/logger.js";
import { hasApiKey } from "../utils/api-check.js";

// Situation schema
const SituationSchema = z.object({
  personaId: z.string(),
  nickname: z.string(),
  mood: z.string(),
  context: z.string(),
  secret: z.string().optional(),
});

/**
 * Generate Situations Step
 *
 * Uses LLM to generate unique, creative situations for each persona.
 * This adds randomness and variety to conversations.
 */
export const generateSituationsStep = createStep({
  id: "generate-situations",
  inputSchema: z.object({
    topic: z.string(),
    numPersonas: z.number().min(1).max(5).optional(),
    numRounds: z.number().optional(),
    // Accept memoryStatus from previous step (ignored, just passed through)
    memoryStatus: z.object({
      usedPercent: z.number(),
      allowed: z.boolean(),
    }).optional(),
  }),
  outputSchema: z.object({
    topic: z.string(),
    selectedPersonas: z.array(z.string()),
    situations: z.array(SituationSchema),
    numRounds: z.number(),
  }),
  execute: async ({ inputData, mastra }) => {
    const { topic } = inputData;

    // Import dependencies
    const { PERSONAS } = await import("../types/index.js");

    // Randomize conversation params
    const numPersonas = inputData.numPersonas ?? Math.floor(Math.random() * 3) + 1; // 1-3
    const numRounds = inputData.numRounds ?? Math.floor(Math.random() * 5) + 3; // 3-7

    // Shuffle and select personas
    const shuffled = [...PERSONAS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, numPersonas);
    const selectedIds = selected.map((p) => p.id);

    log.persona.selected(selected.map((p) => p.nickname));
    log.info(`Rounds: ${numRounds}`);

    // Try to generate situations via LLM
    const agent = mastra?.getAgent?.("situation-generator");
    
    if (agent && hasApiKey()) {
      try {
        const situations = await generateSituationsWithLLM(agent, topic, selected);
        
        // Log generated situations
        situations.forEach((sit) => {
          log.persona.situation(sit.nickname, sit.mood, sit.context);
        });

        return {
          topic,
          selectedPersonas: selectedIds,
          situations,
          numRounds,
        };
      } catch (error) {
        log.warning("LLM situation generation failed, using fallbacks");
      }
    }

    // Fallback to random static situations
    const situations = selected.map((p) => ({
      personaId: p.id,
      nickname: p.nickname,
      ...generateFallbackSituation(),
    }));

    situations.forEach((sit) => {
      log.persona.situation(sit.nickname, sit.mood, sit.context);
    });

    return {
      topic,
      selectedPersonas: selectedIds,
      situations,
      numRounds,
    };
  },
});

/**
 * Generate situations using LLM
 */
async function generateSituationsWithLLM(
  agent: any,
  topic: string,
  personas: Array<{ id: string; nickname: string }>
): Promise<Array<{ personaId: string; nickname: string; mood: string; context: string; secret?: string }>> {
  
  const personaList = personas.map((p) => `- ${p.nickname} (id: ${p.id})`).join("\n");
  
  const prompt = `Wygeneruj unikalne sytuacje dla rozmowy IRC na temat: "${topic}"

Uczestnicy:
${personaList}

Dla KAŻDEGO uczestnika wygeneruj:
1. mood - obecny nastrój/stan emocjonalny (krótko, 5-10 słów)
2. context - co się właśnie dzieje w tle (krótko, 5-10 słów)  
3. secret - opcjonalny sekret który może subtelnie wpływać na wypowiedzi (5-10 słów, lub puste)

Bądź KREATYWNY i ABSURDALNY. To ma być zabawne!
Przykłady mood: "właśnie zjadł za dużo kebaba", "udaje że pracuje", "ma flashbacki z poprzedniej pracy"
Przykłady context: "szef patrzy mu przez ramię", "za 5 minut ma rozmowę rekrutacyjną", "pralka właśnie zalewa mieszkanie"
Przykłady secret: "to on wczoraj usunął produkcyjną bazę", "ogląda seriale podczas daily", "ma CV na LinkedInie ustawione na 'open to work'"

Odpowiedz w formacie JSON (bez markdown):
[
  {"personaId": "...", "nickname": "...", "mood": "...", "context": "...", "secret": "..."},
  ...
]`;

  const result = await agent.generate(prompt);
  const text = result.text || "";
  
  // Parse JSON response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Could not parse LLM response as JSON");
  }
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate and return
  return parsed.map((item: any, index: number) => ({
    personaId: personas[index]?.id || item.personaId,
    nickname: personas[index]?.nickname || item.nickname,
    mood: item.mood || "neutralny",
    context: item.context || "zwykły dzień",
    secret: item.secret || undefined,
  }));
}

/**
 * Fallback situation generator (static arrays)
 */
function generateFallbackSituation(): { mood: string; context: string; secret?: string } {
  const moods = [
    "zdenerwowany bo właśnie coś się zepsuło",
    "zmęczony, nie spał całą noc",
    "na kacu",
    "głodny, czeka na pizzę",
    "ukrywa się przed szefem",
    "właśnie dostał awans",
    "próbuje wyglądać na zajętego",
    "w trakcie rozmowy z supportem",
  ];

  const contexts = [
    "jest piątek 17:00",
    "jest poniedziałek 8:00",
    "jest 3 w nocy",
    "trwa awaria produkcji",
    "szef stoi za plecami",
    "kawa się skończyła",
    "deploy poszedł nie tak",
    "ktoś właśnie pushnął na maina",
  ];

  const secrets = [
    "to on zepsuł produkcję ale nikt nie wie",
    "gra w grę podczas pracy",
    "szuka nowej pracy",
    "udaje że wie o czym mowa",
    null,
    null,
  ];

  return {
    mood: moods[Math.floor(Math.random() * moods.length)],
    context: contexts[Math.floor(Math.random() * contexts.length)],
    secret: secrets[Math.floor(Math.random() * secrets.length)] || undefined,
  };
}
