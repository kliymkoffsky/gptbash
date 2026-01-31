import type { Format } from "./formats.js";

/**
 * Prompt for generating scene metadata (NOT the conversation)
 */
export function sceneGeneratorPrompt(topic: string, format: Format): string {
  return `Scene setup. No dialogue.

TOPIC: "${topic}"
FORMAT: ${format.personas} people, ${format.messages} msgs

JSON:
{
  "flavor": "vibe",
  "rules": ["rule"],
  "personas": [{"nickname": "nick", "personality": "style", "situation": "why theyre dumb rn"}]
}

KEY: people should be WRONG, STUPID, or CONFUSED
- someone confidently incorrect
- someone missing the point entirely  
- someone making it worse
- dumb situations = funny

NICKS: internet style (gamer, ironic, cringe)

${format.personas} personas. NO dialogue.

JSON:`;
}
