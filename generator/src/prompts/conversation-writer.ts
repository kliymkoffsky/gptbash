import type { Format } from "./formats.js";

/**
 * Prompt for writing the actual conversation
 */
export function conversationWriterPrompt(
  topic: string,
  flavor: string,
  personasList: string,
  format: Format
): string {
  return `${format.messages} messages. SHORT.

TOPIC: "${topic}"
VIBE: ${flavor}

PEOPLE:
${personasList}

STYLE - vary these:
- typos and errors (teh, becuase, ur, u)
- all lowercase lazy typing
- random CAPS for emphasis
- wrong facts confidently stated
- people being DUMB and WRONG is funny

HUMOR = stupidity, wrong takes, bad logic

LENGTH: 3-12 words max

[{"author": "nick", "content": "text"}]

JSON:`;
}
