/**
 * Prompt for translating conversation to Polish
 */
export function translatePrompt(conversation: string): string {
  return `Translate to Polish. Keep the vibe.

ORIGINAL:
${conversation}

RULES:
- natural Polish internet slang
- keep typos/errors style (translate them too)
- keep lowercase/CAPS as-is
- keep stupidity and wrong takes
- same message count

[{"author": "nick", "content": "polish text"}]

JSON:`;
}
